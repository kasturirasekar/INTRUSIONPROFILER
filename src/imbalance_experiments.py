import argparse
import json

import pandas as pd
from imblearn.over_sampling import RandomOverSampler, SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.under_sampling import RandomUnderSampler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

try:
    from config import METRICS_DIR, RANDOM_SEED
    from data_loading import load_processed_split
    from evaluation import train_and_evaluate_binary_model
    from preprocessing import build_scaled_preprocessor, build_tree_preprocessor
    from train_baselines import sample_split
except ModuleNotFoundError:
    from .config import METRICS_DIR, RANDOM_SEED
    from .data_loading import load_processed_split
    from .evaluation import train_and_evaluate_binary_model
    from .preprocessing import build_scaled_preprocessor, build_tree_preprocessor
    from .train_baselines import sample_split


def get_imbalance_models(feature_columns: list[str]) -> dict[str, ImbPipeline]:
    scaled_preprocessor = build_scaled_preprocessor(feature_columns)
    tree_preprocessor = build_tree_preprocessor(feature_columns)

    lr_default = LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)
    lr_balanced = LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        random_state=RANDOM_SEED,
    )
    rf_balanced = RandomForestClassifier(
        n_estimators=100,
        class_weight="balanced",
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )

    return {
        "Logistic Regression - No Balancing": ImbPipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("model", lr_default),
            ]
        ),
        "Logistic Regression - Class Weight": ImbPipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("model", lr_balanced),
            ]
        ),
        "Logistic Regression - Random Undersampling": ImbPipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("sampler", RandomUnderSampler(random_state=RANDOM_SEED)),
                ("model", LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)),
            ]
        ),
        "Logistic Regression - Random Oversampling": ImbPipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("sampler", RandomOverSampler(random_state=RANDOM_SEED)),
                ("model", LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)),
            ]
        ),
        "Logistic Regression - SMOTE": ImbPipeline(
            steps=[
                ("preprocess", scaled_preprocessor),
                ("sampler", SMOTE(random_state=RANDOM_SEED, k_neighbors=5)),
                ("model", LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)),
            ]
        ),
        "Random Forest - Class Weight": ImbPipeline(
            steps=[
                ("preprocess", tree_preprocessor),
                ("model", rf_balanced),
            ]
        ),
    }


def run_imbalance_experiments(
    max_train_rows: int | None = None,
    max_test_rows: int | None = None,
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

    models = get_imbalance_models(X_train.columns.tolist())
    results = {}
    METRICS_DIR.mkdir(parents=True, exist_ok=True)

    print("Class imbalance experiments started.", flush=True)
    print(f"Train rows: {len(X_train):,}; test rows: {len(X_test):,}", flush=True)

    for name, model in models.items():
        print(f"\nTraining {name}...", flush=True)
        metrics = train_and_evaluate_binary_model(model, X_train, y_train, X_test, y_test)
        results[name] = metrics
        print(
            f"{name}: accuracy={metrics['accuracy']:.4f}, "
            f"attack_precision={metrics['precision_attack']:.4f}, "
            f"attack_recall={metrics['recall_attack']:.4f}, "
            f"attack_f1={metrics['f1_attack']:.4f}",
            flush=True,
        )

        comparison = pd.DataFrame.from_dict(results, orient="index")
        comparison.index.name = "experiment"
        comparison.reset_index(inplace=True)
        comparison.to_csv(METRICS_DIR / "imbalance_experiment_comparison_partial.csv", index=False)

    comparison.to_csv(METRICS_DIR / "imbalance_experiment_comparison.csv", index=False)
    output = {
        "task": "binary",
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "note": "Samplers are inside pipelines, so they are fitted only on training data.",
        "results": results,
    }
    with (METRICS_DIR / "imbalance_experiment_results.json").open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved comparison to: {METRICS_DIR / 'imbalance_experiment_comparison.csv'}", flush=True)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare imbalance handling strategies.")
    parser.add_argument("--max-train-rows", type=int, default=None)
    parser.add_argument("--max-test-rows", type=int, default=None)
    args = parser.parse_args()
    run_imbalance_experiments(
        max_train_rows=args.max_train_rows,
        max_test_rows=args.max_test_rows,
    )


if __name__ == "__main__":
    main()
