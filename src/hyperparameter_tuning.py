import argparse
import json
import time

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import make_scorer, f1_score, recall_score
from sklearn.model_selection import RandomizedSearchCV
from sklearn.pipeline import Pipeline

try:
    from config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
    from data_loading import load_processed_split
    from evaluation import evaluate_binary_model
    from model_selection import get_stratified_cv
    from preprocessing import build_scaled_preprocessor, build_tree_preprocessor
    from train_baselines import sample_split
except ModuleNotFoundError:
    from .config import METRICS_DIR, MODELS_DIR, RANDOM_SEED
    from .data_loading import load_processed_split
    from .evaluation import evaluate_binary_model
    from .model_selection import get_stratified_cv
    from .preprocessing import build_scaled_preprocessor, build_tree_preprocessor
    from .train_baselines import sample_split


def get_search_spaces(feature_columns: list[str]) -> dict:
    return {
        "Tuned Logistic Regression": {
            "pipeline": Pipeline(
                steps=[
                    ("preprocess", build_scaled_preprocessor(feature_columns)),
                    ("model", LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)),
                ]
            ),
            "params": {
                "model__C": [0.01, 0.1, 1.0, 10.0],
                "model__class_weight": [None, "balanced"],
                "model__solver": ["lbfgs"],
            },
            "n_iter": 8,
        },
        "Tuned Random Forest": {
            "pipeline": Pipeline(
                steps=[
                    ("preprocess", build_tree_preprocessor(feature_columns)),
                    (
                        "model",
                        RandomForestClassifier(
                            random_state=RANDOM_SEED,
                            n_jobs=-1,
                        ),
                    ),
                ]
            ),
            "params": {
                "model__n_estimators": [80, 120, 160],
                "model__max_depth": [None, 12, 20],
                "model__min_samples_split": [2, 5, 10],
                "model__max_features": ["sqrt", "log2", None],
                "model__class_weight": [None, "balanced"],
            },
            "n_iter": 10,
        },
        "Tuned Gradient Boosting": {
            "pipeline": Pipeline(
                steps=[
                    ("preprocess", build_tree_preprocessor(feature_columns)),
                    ("model", GradientBoostingClassifier(random_state=RANDOM_SEED)),
                ]
            ),
            "params": {
                "model__n_estimators": [50, 80, 120],
                "model__learning_rate": [0.05, 0.1, 0.2],
                "model__max_depth": [2, 3, 5],
                "model__subsample": [0.7, 0.9, 1.0],
            },
            "n_iter": 8,
        },
    }


def run_tuning(max_train_rows: int = 60_000, max_test_rows: int | None = None) -> dict:
    X_train, X_test, y_train, y_test = load_processed_split("binary")
    X_train, X_test, y_train, y_test = sample_split(
        X_train,
        X_test,
        y_train,
        y_test,
        max_train_rows=max_train_rows,
        max_test_rows=max_test_rows,
    )

    scoring = {
        "attack_f1": make_scorer(f1_score, pos_label="Attack", zero_division=0),
        "attack_recall": make_scorer(recall_score, pos_label="Attack", zero_division=0),
    }
    cv = get_stratified_cv(n_splits=3)
    searches = get_search_spaces(X_train.columns.tolist())
    results = {}

    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    print("Hyperparameter tuning started.", flush=True)
    print(f"CV train rows: {len(X_train):,}; final test rows: {len(X_test):,}", flush=True)

    for name, config in searches.items():
        print(f"\nTuning {name}...", flush=True)
        search = RandomizedSearchCV(
            estimator=config["pipeline"],
            param_distributions=config["params"],
            n_iter=config["n_iter"],
            scoring=scoring,
            refit="attack_f1",
            cv=cv,
            random_state=RANDOM_SEED,
            n_jobs=1,
            verbose=0,
        )
        start = time.perf_counter()
        search.fit(X_train, y_train)
        tuning_time = time.perf_counter() - start
        test_metrics = evaluate_binary_model(search.best_estimator_, X_test, y_test)
        test_metrics["tuning_time_seconds"] = tuning_time
        test_metrics["best_cv_attack_f1"] = float(search.best_score_)
        test_metrics["best_params"] = search.best_params_
        results[name] = test_metrics
        joblib.dump(search.best_estimator_, MODELS_DIR / f"{name.lower().replace(' ', '_')}.joblib")
        print(
            f"{name}: best_cv_f1={search.best_score_:.4f}, "
            f"test_attack_recall={test_metrics['recall_attack']:.4f}, "
            f"test_attack_f1={test_metrics['f1_attack']:.4f}, "
            f"tuning_time={tuning_time:.2f}s",
            flush=True,
        )

        pd.DataFrame.from_dict(results, orient="index").to_csv(
            METRICS_DIR / "hyperparameter_tuning_results_partial.csv",
            index_label="model",
        )

    pd.DataFrame.from_dict(results, orient="index").to_csv(
        METRICS_DIR / "hyperparameter_tuning_results.csv",
        index_label="model",
    )
    output = {
        "train_rows_used_for_cv": int(len(X_train)),
        "test_rows_used_for_final_evaluation": int(len(X_test)),
        "cv_folds": 3,
        "refit_metric": "attack_f1",
        "results": results,
    }
    with (METRICS_DIR / "hyperparameter_tuning_summary.json").open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Run lightweight hyperparameter tuning.")
    parser.add_argument("--max-train-rows", type=int, default=60_000)
    parser.add_argument("--max-test-rows", type=int, default=None)
    args = parser.parse_args()
    run_tuning(max_train_rows=args.max_train_rows, max_test_rows=args.max_test_rows)


if __name__ == "__main__":
    main()
