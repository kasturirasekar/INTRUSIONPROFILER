import argparse
import json
from pathlib import Path

import joblib
import pandas as pd

try:
    from data_loading import load_processed_split
    from evaluation import train_and_evaluate_binary_model
    from models import explain_baseline_model_choices, get_baseline_models
    from config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
except ModuleNotFoundError:
    from .data_loading import load_processed_split
    from .evaluation import train_and_evaluate_binary_model
    from .models import explain_baseline_model_choices, get_baseline_models
    from .config import METRICS_DIR, MODELS_DIR, RANDOM_SEED


def sample_split(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    max_train_rows: int | None,
    max_test_rows: int | None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    if max_train_rows is not None and len(X_train) > max_train_rows:
        train_sample = y_train.groupby(y_train).sample(
            n=None,
            frac=max_train_rows / len(y_train),
            random_state=RANDOM_SEED,
        ).index
        X_train = X_train.loc[train_sample]
        y_train = y_train.loc[train_sample]

    if max_test_rows is not None and len(X_test) > max_test_rows:
        test_sample = y_test.groupby(y_test).sample(
            n=None,
            frac=max_test_rows / len(y_test),
            random_state=RANDOM_SEED,
        ).index
        X_test = X_test.loc[test_sample]
        y_test = y_test.loc[test_sample]

    return X_train, X_test, y_train, y_test


def model_file_name(model_name: str) -> str:
    return model_name.lower().replace(" ", "_").replace("-", "").replace("__", "_")


def run_baseline_training(
    selected_models: list[str] | None = None,
    max_train_rows: int | None = None,
    max_test_rows: int | None = None,
    save_models: bool = True,
) -> dict:
    X_train, X_test, y_train, y_test = load_processed_split("binary")
    X_train, X_test, y_train, y_test = sample_split(
        X_train,
        X_test,
        y_train,
        y_test,
        max_train_rows=max_train_rows,
        max_test_rows=max_test_rows,
    )

    feature_columns = X_train.columns.tolist()
    models = get_baseline_models(feature_columns)
    if selected_models:
        models = {name: model for name, model in models.items() if name in selected_models}
        missing = set(selected_models) - set(models)
        if missing:
            raise ValueError(f"Unknown model names: {sorted(missing)}")

    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    results = {}
    print("Baseline model training started.", flush=True)
    print(f"Train rows: {len(X_train):,}; test rows: {len(X_test):,}", flush=True)

    for name, model in models.items():
        print(f"\nTraining {name}...", flush=True)
        metrics = train_and_evaluate_binary_model(model, X_train, y_train, X_test, y_test)
        results[name] = metrics
        print(
            f"{name}: accuracy={metrics['accuracy']:.4f}, "
            f"attack_recall={metrics['recall_attack']:.4f}, "
            f"attack_f1={metrics['f1_attack']:.4f}, "
            f"train_time={metrics['training_time_seconds']:.2f}s",
            flush=True,
        )

        if save_models:
            joblib.dump(model, MODELS_DIR / f"baseline_{model_file_name(name)}.joblib")

        comparison = pd.DataFrame.from_dict(results, orient="index")
        comparison.index.name = "model"
        comparison.reset_index(inplace=True)
        comparison.to_csv(METRICS_DIR / "baseline_model_comparison_partial.csv", index=False)

    comparison = pd.DataFrame.from_dict(results, orient="index")
    comparison.index.name = "model"
    comparison.reset_index(inplace=True)
    comparison.to_csv(METRICS_DIR / "baseline_model_comparison.csv", index=False)

    output = {
        "task": "binary",
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "model_choices": explain_baseline_model_choices(),
        "results": results,
    }
    with (METRICS_DIR / "baseline_model_results.json").open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved comparison to: {METRICS_DIR / 'baseline_model_comparison.csv'}", flush=True)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Train baseline binary IDS models.")
    parser.add_argument(
        "--models",
        nargs="*",
        default=None,
        help="Optional exact model names to train.",
    )
    parser.add_argument("--max-train-rows", type=int, default=None)
    parser.add_argument("--max-test-rows", type=int, default=None)
    parser.add_argument("--no-save-models", action="store_true")
    args = parser.parse_args()

    run_baseline_training(
        selected_models=args.models,
        max_train_rows=args.max_train_rows,
        max_test_rows=args.max_test_rows,
        save_models=not args.no_save_models,
    )


if __name__ == "__main__":
    main()
