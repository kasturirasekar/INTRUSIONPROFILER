import argparse
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import SelectKBest, f_classif, mutual_info_classif
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

try:
    from config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
    from data_loading import load_processed_split
    from evaluation import train_and_evaluate_binary_model
    from preprocessing import build_tree_preprocessor
    from train_baselines import sample_split
except ModuleNotFoundError:
    from .config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
    from .data_loading import load_processed_split
    from .evaluation import train_and_evaluate_binary_model
    from .preprocessing import build_tree_preprocessor
    from .train_baselines import sample_split


def encode_binary_target(y: pd.Series) -> pd.Series:
    return (y == "Attack").astype(int)


def get_random_forest_importance(
    X_train: pd.DataFrame,
    y_train: pd.Series,
) -> pd.DataFrame:
    model_path = MODELS_DIR / "baseline_random_forest.joblib"
    if model_path.exists():
        rf_pipeline = joblib.load(model_path)
    else:
        rf_pipeline = Pipeline(
            steps=[
                ("preprocess", build_tree_preprocessor(X_train.columns.tolist())),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=100,
                        random_state=RANDOM_SEED,
                        n_jobs=-1,
                    ),
                ),
            ]
        )
        rf_pipeline.fit(X_train, y_train)

    importances = rf_pipeline.named_steps["model"].feature_importances_
    return pd.DataFrame(
        {
            "feature": X_train.columns,
            "rf_importance": importances,
        }
    ).sort_values("rf_importance", ascending=False)


def get_mutual_information_scores(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    max_rows: int = 60_000,
) -> pd.DataFrame:
    X_sample, _, y_sample, _ = sample_split(
        X_train,
        X_train.iloc[:1].copy(),
        y_train,
        y_train.iloc[:1].copy(),
        max_train_rows=max_rows,
        max_test_rows=None,
    )
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X_sample)
    mi_scores = mutual_info_classif(
        X_imputed,
        encode_binary_target(y_sample),
        random_state=RANDOM_SEED,
        discrete_features=False,
    )
    return pd.DataFrame(
        {
            "feature": X_train.columns,
            "mutual_information": mi_scores,
        }
    ).sort_values("mutual_information", ascending=False)


def get_selectkbest_scores(X_train: pd.DataFrame, y_train: pd.Series) -> pd.DataFrame:
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X_train)
    selector = SelectKBest(score_func=f_classif, k="all")
    selector.fit(X_imputed, encode_binary_target(y_train))
    return pd.DataFrame(
        {
            "feature": X_train.columns,
            "selectkbest_f_score": selector.scores_,
        }
    ).sort_values("selectkbest_f_score", ascending=False)


def compare_reduced_feature_model(
    top_features: list[str],
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
) -> dict:
    model = Pipeline(
        steps=[
            ("preprocess", build_tree_preprocessor(top_features)),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=100,
                    random_state=RANDOM_SEED,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    return train_and_evaluate_binary_model(
        model,
        X_train[top_features],
        y_train,
        X_test[top_features],
        y_test,
    )


def run_feature_selection(top_k: int = 20) -> dict:
    X_train, X_test, y_train, y_test = load_processed_split("binary")
    METRICS_DIR.mkdir(parents=True, exist_ok=True)

    print("Feature selection started.", flush=True)
    rf_importance = get_random_forest_importance(X_train, y_train)
    print("Random Forest feature importance complete.", flush=True)
    mi_scores = get_mutual_information_scores(X_train, y_train)
    print("Mutual Information scores complete.", flush=True)
    selectk_scores = get_selectkbest_scores(X_train, y_train)
    print("SelectKBest scores complete.", flush=True)

    merged = rf_importance.merge(mi_scores, on="feature").merge(selectk_scores, on="feature")
    merged["rf_rank"] = merged["rf_importance"].rank(ascending=False, method="min")
    merged["mi_rank"] = merged["mutual_information"].rank(ascending=False, method="min")
    merged["selectkbest_rank"] = merged["selectkbest_f_score"].rank(ascending=False, method="min")
    merged["average_rank"] = merged[["rf_rank", "mi_rank", "selectkbest_rank"]].mean(axis=1)
    merged.sort_values("average_rank", inplace=True)
    merged.to_csv(METRICS_DIR / "feature_selection_scores.csv", index=False)

    top_features = merged.head(top_k)["feature"].tolist()
    print(f"Training reduced-feature model with top {top_k} features...", flush=True)
    reduced_metrics = compare_reduced_feature_model(top_features, X_train, X_test, y_train, y_test)

    output = {
        "top_k": top_k,
        "top_features": top_features,
        "reduced_random_forest_metrics": reduced_metrics,
        "note": "Feature selectors are fitted using the training set only.",
    }
    with (METRICS_DIR / "feature_selection_summary.json").open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print("Top features:")
    for i, feature in enumerate(top_features, start=1):
        print(f"{i}. {feature}")
    print(
        f"Reduced RF: accuracy={reduced_metrics['accuracy']:.4f}, "
        f"attack_recall={reduced_metrics['recall_attack']:.4f}, "
        f"attack_f1={reduced_metrics['f1_attack']:.4f}",
        flush=True,
    )
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Run feature selection experiments.")
    parser.add_argument("--top-k", type=int, default=20)
    args = parser.parse_args()
    run_feature_selection(top_k=args.top_k)


if __name__ == "__main__":
    main()
