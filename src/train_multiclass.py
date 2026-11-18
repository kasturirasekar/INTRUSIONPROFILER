import argparse
import json
import time

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

try:
    from config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
    from data_loading import load_processed_split
    from preprocessing import build_tree_preprocessor
except ModuleNotFoundError:
    from .config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
    from .data_loading import load_processed_split
    from .preprocessing import build_tree_preprocessor


def get_multiclass_models(feature_columns: list[str]) -> dict[str, Pipeline]:
    return {
        "Multiclass Decision Tree": Pipeline(
            steps=[
                ("preprocess", build_tree_preprocessor(feature_columns)),
                ("model", DecisionTreeClassifier(random_state=RANDOM_SEED)),
            ]
        ),
        "Multiclass Random Forest": Pipeline(
            steps=[
                ("preprocess", build_tree_preprocessor(feature_columns)),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=100,
                        random_state=RANDOM_SEED,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
    }


def run_multiclass_training() -> dict:
    X_train, X_test, y_train, y_test = load_processed_split("multiclass")
    feature_columns = X_train.columns.tolist()
    models = get_multiclass_models(feature_columns)
    summary_path = METRICS_DIR / "preprocessing_summary_multiclass.json"
    label_classes = None
    if summary_path.exists():
        with summary_path.open("r", encoding="utf-8") as f:
            label_classes = json.load(f).get("label_classes")

    results = {}
    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    print("Optional multiclass training started.", flush=True)
    print(f"Train rows: {len(X_train):,}; test rows: {len(X_test):,}", flush=True)

    for name, model in models.items():
        print(f"\nTraining {name}...", flush=True)
        start = time.perf_counter()
        model.fit(X_train, y_train)
        training_time = time.perf_counter() - start
        start = time.perf_counter()
        y_pred = model.predict(X_test)
        prediction_time = time.perf_counter() - start

        report = classification_report(y_test, y_pred, zero_division=0, output_dict=True)
        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "macro_f1": f1_score(y_test, y_pred, average="macro", zero_division=0),
            "weighted_f1": f1_score(y_test, y_pred, average="weighted", zero_division=0),
            "training_time_seconds": training_time,
            "prediction_time_seconds": prediction_time,
            "classification_report": report,
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        }
        results[name] = metrics
        joblib.dump(model, MODELS_DIR / f"{name.lower().replace(' ', '_')}.joblib")
        print(
            f"{name}: accuracy={metrics['accuracy']:.4f}, "
            f"macro_f1={metrics['macro_f1']:.4f}, weighted_f1={metrics['weighted_f1']:.4f}",
            flush=True,
        )

    comparison = pd.DataFrame.from_dict(
        {
            name: {
                "accuracy": metrics["accuracy"],
                "macro_f1": metrics["macro_f1"],
                "weighted_f1": metrics["weighted_f1"],
                "training_time_seconds": metrics["training_time_seconds"],
                "prediction_time_seconds": metrics["prediction_time_seconds"],
            }
            for name, metrics in results.items()
        },
        orient="index",
    )
    comparison.to_csv(METRICS_DIR / "multiclass_model_comparison.csv", index_label="model")
    output = {
        "note": "Optional multiclass experiment on development sample; ultra-rare classes may be excluded by preprocessing.",
        "label_classes": label_classes,
        "results": results,
    }
    with (METRICS_DIR / "multiclass_model_results.json").open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Train optional multiclass models.")
    parser.parse_args()
    run_multiclass_training()


if __name__ == "__main__":
    main()
