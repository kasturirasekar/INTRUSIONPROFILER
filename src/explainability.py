import json

import joblib
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance

try:
    from config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
    from data_loading import load_processed_split
except ModuleNotFoundError:
    from .config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
    from .data_loading import load_processed_split


def get_model_path() -> str:
    preferred = [
        MODELS_DIR / "baseline_random_forest.joblib",
        MODELS_DIR / "tuned_random_forest.joblib",
        MODELS_DIR / "ensemble_stacking.joblib",
    ]
    for path in preferred:
        if path.exists():
            return str(path)
    raise FileNotFoundError("No trained model found for explainability.")


def global_feature_importance(model, feature_columns: list[str]) -> pd.DataFrame:
    estimator = model.named_steps["model"] if hasattr(model, "named_steps") else model
    if hasattr(estimator, "feature_importances_"):
        return pd.DataFrame(
            {
                "feature": feature_columns,
                "importance": estimator.feature_importances_,
                "method": "model_feature_importance",
            }
        ).sort_values("importance", ascending=False)

    raise ValueError("Selected model does not expose feature_importances_.")


def permutation_importance_sample(model, X_test: pd.DataFrame, y_test: pd.Series) -> pd.DataFrame:
    sample_size = min(5_000, len(X_test))
    sample_index = y_test.groupby(y_test).sample(
        frac=sample_size / len(y_test),
        random_state=RANDOM_SEED,
    ).index
    X_sample = X_test.loc[sample_index]
    y_sample = y_test.loc[sample_index]
    result = permutation_importance(
        model,
        X_sample,
        y_sample,
        scoring="f1_macro",
        n_repeats=5,
        random_state=RANDOM_SEED,
        n_jobs=1,
    )
    return pd.DataFrame(
        {
            "feature": X_test.columns,
            "permutation_importance_mean": result.importances_mean,
            "permutation_importance_std": result.importances_std,
        }
    ).sort_values("permutation_importance_mean", ascending=False)


def example_prediction_explanations(
    model,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    top_features: list[str],
) -> list[dict]:
    predictions = pd.Series(model.predict(X_test), index=X_test.index)
    probabilities = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X_test)
        classes = list(model.classes_)
        if "Attack" in classes:
            probabilities = pd.Series(proba[:, classes.index("Attack")], index=X_test.index)

    train_medians = X_train[top_features].median(numeric_only=True)
    examples = []
    desired_cases = [
        ("true_attack_detected", (y_test == "Attack") & (predictions == "Attack")),
        ("true_benign_detected", (y_test == "Benign") & (predictions == "Benign")),
        ("false_negative_attack_missed", (y_test == "Attack") & (predictions == "Benign")),
        ("false_positive_false_alarm", (y_test == "Benign") & (predictions == "Attack")),
    ]

    for case_name, mask in desired_cases:
        indices = y_test[mask].index
        if len(indices) == 0:
            continue
        idx = indices[0]
        row = X_test.loc[idx, top_features]
        deviations = ((row - train_medians).abs() / (train_medians.abs() + 1)).sort_values(
            ascending=False
        )
        important_values = []
        for feature in deviations.head(8).index:
            important_values.append(
                {
                    "feature": feature,
                    "value": float(row[feature]),
                    "training_median": float(train_medians[feature]),
                    "relative_deviation": float(deviations[feature]),
                }
            )
        examples.append(
            {
                "case": case_name,
                "actual_label": y_test.loc[idx],
                "predicted_label": predictions.loc[idx],
                "attack_probability": float(probabilities.loc[idx]) if probabilities is not None else None,
                "top_deviating_important_features": important_values,
            }
        )
    return examples


def run_explainability() -> dict:
    X_train, X_test, y_train, y_test = load_processed_split("binary")
    model_path = get_model_path()
    model = joblib.load(model_path)
    feature_columns = X_train.columns.tolist()

    global_importance = global_feature_importance(model, feature_columns)
    global_importance.to_csv(METRICS_DIR / "explainability_global_importance.csv", index=False)
    top_features = global_importance.head(20)["feature"].tolist()

    permutation = permutation_importance_sample(model, X_test, y_test)
    permutation.to_csv(METRICS_DIR / "explainability_permutation_importance.csv", index=False)

    examples = example_prediction_explanations(model, X_train, X_test, y_test, top_features)
    output = {
        "model_path": model_path,
        "model_type": "Random Forest",
        "global_explainability_method": "Random Forest impurity-based feature importance",
        "local_explanation_note": (
            "Example explanations use globally important features and compare each flow's feature values "
            "with training medians. This is an interpretable proxy, not a SHAP value."
        ),
        "top_20_features": top_features,
        "example_predictions": examples,
        "shap_note": "SHAP was not required for this run; it can be added later if runtime and package support are available.",
    }
    with (METRICS_DIR / "explainability_summary.json").open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print("Explainability complete.")
    print("Top 10 global features:")
    for i, feature in enumerate(top_features[:10], start=1):
        print(f"{i}. {feature}")
    return output


if __name__ == "__main__":
    run_explainability()
