import ast
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import PrecisionRecallDisplay, RocCurveDisplay, ConfusionMatrixDisplay

try:
    from config import FIGURES_DIR, METRICS_DIR, MODELS_DIR, PROJECT_ROOT
    from data_loading import load_processed_split
    from evaluation import get_positive_scores
except ModuleNotFoundError:
    from .config import FIGURES_DIR, METRICS_DIR, MODELS_DIR, PROJECT_ROOT
    from .data_loading import load_processed_split
    from .evaluation import get_positive_scores

os.environ.setdefault("MPLCONFIGDIR", str(PROJECT_ROOT / ".matplotlib_cache"))
os.environ.setdefault("XDG_CACHE_HOME", str(PROJECT_ROOT / ".cache"))

import matplotlib

matplotlib.use("Agg", force=True)

import matplotlib.pyplot as plt


def read_metric_file(path):
    return pd.read_csv(path) if path.exists() else pd.DataFrame()


def combined_model_results() -> pd.DataFrame:
    files = [
        ("baseline", METRICS_DIR / "baseline_model_comparison.csv"),
        ("ensemble", METRICS_DIR / "ensemble_model_comparison.csv"),
        ("tuned", METRICS_DIR / "hyperparameter_tuning_results.csv"),
    ]
    frames = []
    for group, path in files:
        df = read_metric_file(path)
        if df.empty:
            continue
        if "model" not in df.columns:
            df.rename(columns={df.columns[0]: "model"}, inplace=True)
        df["group"] = group
        frames.append(df)
    return pd.concat(frames, ignore_index=True)


def plot_metric_comparison(df: pd.DataFrame) -> None:
    metrics = ["accuracy", "precision_attack", "recall_attack", "f1_attack"]
    plot_df = df[["model", *metrics]].copy()
    plot_df.sort_values("f1_attack", ascending=False, inplace=True)

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    for ax, metric in zip(axes.flatten(), metrics):
        ax.barh(plot_df["model"], plot_df[metric], color="#3f7f8f")
        ax.set_xlim(0, 1.02)
        ax.set_title(metric.replace("_", " ").title())
        ax.invert_yaxis()
    fig.suptitle("Model Performance Comparison", y=1.01)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "model_performance_comparison.png", dpi=200, bbox_inches="tight")
    plt.close()


def plot_time_comparison(df: pd.DataFrame) -> None:
    plot_df = df[["model", "training_time_seconds", "prediction_time_seconds"]].copy()
    plot_df.sort_values("training_time_seconds", ascending=True, inplace=True)

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    axes[0].barh(plot_df["model"], plot_df["training_time_seconds"], color="#8064a2")
    axes[0].set_title("Training Time")
    axes[0].set_xlabel("Seconds")
    axes[1].barh(plot_df["model"], plot_df["prediction_time_seconds"], color="#dd8452")
    axes[1].set_title("Prediction Time")
    axes[1].set_xlabel("Seconds")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "training_prediction_time_comparison.png", dpi=200, bbox_inches="tight")
    plt.close()


def plot_confusion_matrices(df: pd.DataFrame) -> None:
    selected = [
        "Logistic Regression",
        "Decision Tree",
        "Random Forest",
        "Random Forest Bagging",
        "Stacking",
        "Tuned Random Forest",
    ]
    plot_df = df[df["model"].isin(selected)].copy()
    rows = int(np.ceil(len(plot_df) / 3))
    fig, axes = plt.subplots(rows, 3, figsize=(13, 4 * rows))
    axes = np.array(axes).reshape(-1)

    for ax, (_, row) in zip(axes, plot_df.iterrows()):
        matrix = ast.literal_eval(row["confusion_matrix"]) if isinstance(row["confusion_matrix"], str) else row["confusion_matrix"]
        display = ConfusionMatrixDisplay(confusion_matrix=np.array(matrix), display_labels=["Benign", "Attack"])
        display.plot(ax=ax, colorbar=False, cmap="Blues")
        ax.set_title(row["model"])

    for ax in axes[len(plot_df):]:
        ax.axis("off")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "confusion_matrices_major_models.png", dpi=200, bbox_inches="tight")
    plt.close()


def plot_curves() -> None:
    X_train, X_test, y_train, y_test = load_processed_split("binary")
    model_paths = {
        "Logistic Regression": MODELS_DIR / "baseline_logistic_regression.joblib",
        "Random Forest": MODELS_DIR / "baseline_random_forest.joblib",
        "Stacking": MODELS_DIR / "ensemble_stacking.joblib",
        "Tuned Random Forest": MODELS_DIR / "tuned_random_forest.joblib",
    }
    y_binary = (y_test == "Attack").astype(int)

    plt.figure(figsize=(8, 6))
    ax = plt.gca()
    for name, path in model_paths.items():
        if not path.exists():
            continue
        model = joblib.load(path)
        scores = get_positive_scores(model, X_test)
        if scores is not None:
            RocCurveDisplay.from_predictions(y_binary, scores, name=name, ax=ax)
    ax.set_title("ROC Curves")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "roc_curves_major_models.png", dpi=200, bbox_inches="tight")
    plt.close()

    plt.figure(figsize=(8, 6))
    ax = plt.gca()
    for name, path in model_paths.items():
        if not path.exists():
            continue
        model = joblib.load(path)
        scores = get_positive_scores(model, X_test)
        if scores is not None:
            PrecisionRecallDisplay.from_predictions(y_binary, scores, name=name, ax=ax)
    ax.set_title("Precision-Recall Curves")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "precision_recall_curves_major_models.png", dpi=200, bbox_inches="tight")
    plt.close()


def plot_feature_importance() -> None:
    path = METRICS_DIR / "feature_selection_scores.csv"
    if not path.exists():
        return
    df = pd.read_csv(path).sort_values("rf_importance", ascending=True).tail(20)
    plt.figure(figsize=(10, 8))
    plt.barh(df["feature"], df["rf_importance"], color="#4c78a8")
    plt.title("Top 20 Random Forest Feature Importances")
    plt.xlabel("Importance")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "top_20_rf_feature_importance.png", dpi=200, bbox_inches="tight")
    plt.close()


def run_visualizations() -> None:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    df = combined_model_results()
    df.to_csv(METRICS_DIR / "combined_model_results.csv", index=False)
    plot_metric_comparison(df)
    plot_time_comparison(df)
    plot_confusion_matrices(df)
    plot_curves()
    plot_feature_importance()
    print(f"Result visualizations saved to: {FIGURES_DIR}")


if __name__ == "__main__":
    run_visualizations()
