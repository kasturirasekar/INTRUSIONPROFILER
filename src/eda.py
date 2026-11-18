import json
import os
from pathlib import Path

import numpy as np
import pandas as pd

try:
    from config import CIC_IDS_2017_FILES, DATA_DIR, FIGURES_DIR, LABEL_COLUMN, METRICS_DIR, PROJECT_ROOT, RANDOM_SEED, WEB_LABEL_FIXES
    from data_audit import clean_column_names, clean_label_values
except ModuleNotFoundError:
    from .config import CIC_IDS_2017_FILES, DATA_DIR, FIGURES_DIR, LABEL_COLUMN, METRICS_DIR, PROJECT_ROOT, RANDOM_SEED, WEB_LABEL_FIXES
    from .data_audit import clean_column_names, clean_label_values

os.environ.setdefault("MPLCONFIGDIR", str(PROJECT_ROOT / ".matplotlib_cache"))
os.environ.setdefault("XDG_CACHE_HOME", str(PROJECT_ROOT / ".cache"))

import matplotlib

matplotlib.use("Agg", force=True)

import matplotlib.pyplot as plt
import seaborn as sns


def normalize_labels(series: pd.Series) -> pd.Series:
    labels = clean_label_values(series)
    return labels.replace(WEB_LABEL_FIXES)


def load_audit() -> dict:
    path = METRICS_DIR / "dataset_audit.json"
    if not path.exists():
        raise FileNotFoundError("Run `python3 src/data_audit.py` before EDA.")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_sample(target_rows: int = 120_000, chunksize: int = 100_000) -> pd.DataFrame:
    audit = load_audit()
    total_rows = audit["combined_audit"]["total_rows"]
    sample_frac = min(1.0, target_rows / total_rows)
    sampled_chunks = []
    seed = RANDOM_SEED

    for file_name in CIC_IDS_2017_FILES:
        path = DATA_DIR / file_name
        for chunk in pd.read_csv(path, chunksize=chunksize, low_memory=False):
            chunk = clean_column_names(chunk)
            chunk[LABEL_COLUMN] = normalize_labels(chunk[LABEL_COLUMN])
            chunk = chunk.sample(frac=sample_frac, random_state=seed)
            sampled_chunks.append(chunk)
            seed += 1

    sample = pd.concat(sampled_chunks, ignore_index=True)
    sample.replace([np.inf, -np.inf], np.nan, inplace=True)
    sample["BinaryLabel"] = np.where(sample[LABEL_COLUMN].eq("BENIGN"), "Benign", "Attack")
    sample["IsAttack"] = np.where(sample[LABEL_COLUMN].eq("BENIGN"), 0, 1)
    return sample


def save_plot(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(path, dpi=200, bbox_inches="tight")
    plt.close()


def plot_multiclass_distribution(audit: dict) -> None:
    counts = pd.Series(audit["combined_audit"]["combined_label_counts"])
    counts.index = normalize_labels(pd.Series(counts.index)).tolist()
    counts = counts.groupby(level=0).sum().sort_values(ascending=True)

    plt.figure(figsize=(10, 7))
    ax = counts.plot(kind="barh", color="#2f6f73")
    ax.set_xscale("log")
    ax.set_title("CIC-IDS-2017 Class Distribution (Log Scale)")
    ax.set_xlabel("Number of flows (log scale)")
    ax.set_ylabel("Traffic label")
    save_plot(FIGURES_DIR / "class_distribution_multiclass.png")

    counts.to_csv(METRICS_DIR / "class_distribution_multiclass.csv", header=["count"])


def plot_binary_distribution(audit: dict) -> None:
    counts = pd.Series(audit["combined_audit"]["combined_label_counts"])
    benign = int(counts.get("BENIGN", 0))
    attack = int(counts.sum() - benign)
    binary_counts = pd.Series({"Benign": benign, "Attack": attack})

    plt.figure(figsize=(6, 4))
    ax = binary_counts.plot(kind="bar", color=["#4c78a8", "#c44e52"], rot=0)
    ax.set_title("Binary Class Distribution")
    ax.set_xlabel("Binary label")
    ax.set_ylabel("Number of flows")
    for i, value in enumerate(binary_counts):
        ax.text(i, value, f"{value:,}", ha="center", va="bottom", fontsize=9)
    save_plot(FIGURES_DIR / "class_distribution_binary.png")

    binary_counts.to_csv(METRICS_DIR / "class_distribution_binary.csv", header=["count"])


def plot_data_quality(audit: dict) -> None:
    rows = []
    for item in audit["file_audits"]:
        rows.append(
            {
                "file": item["file"].replace(".pcap_ISCX.csv", "").replace("-WorkingHours", ""),
                "duplicates": item["duplicate_rows"],
                "missing": item["missing_total"],
                "infinite": item["infinite_total"],
            }
        )
    quality = pd.DataFrame(rows).set_index("file")

    plt.figure(figsize=(12, 5))
    ax = quality.plot(kind="bar", figsize=(12, 5), color=["#8064a2", "#dd8452", "#55a868"])
    ax.set_title("Data Quality Issues by File")
    ax.set_xlabel("Dataset file")
    ax.set_ylabel("Count")
    ax.tick_params(axis="x", rotation=35)
    save_plot(FIGURES_DIR / "data_quality_issues.png")

    quality.to_csv(METRICS_DIR / "data_quality_issues.csv")


def plot_correlation_heatmap(sample: pd.DataFrame, top_k: int = 20) -> None:
    numeric = sample.select_dtypes(include=[np.number]).dropna()
    if "IsAttack" not in numeric.columns:
        raise ValueError("Sample does not contain IsAttack.")

    correlations = numeric.corr(numeric_only=True)["IsAttack"].drop("IsAttack").abs()
    top_features = correlations.sort_values(ascending=False).head(top_k).index.tolist()
    corr_matrix = numeric[top_features].corr()

    plt.figure(figsize=(12, 9))
    sns.heatmap(corr_matrix, cmap="vlag", center=0, square=False, linewidths=0.2)
    plt.title(f"Correlation Heatmap of Top {top_k} Attack-Correlated Features")
    save_plot(FIGURES_DIR / "correlation_heatmap_top_features.png")

    correlations.sort_values(ascending=False).to_csv(
        METRICS_DIR / "feature_attack_correlation.csv",
        header=["abs_correlation_with_attack"],
        index_label="feature",
    )


def plot_feature_distributions(sample: pd.DataFrame) -> None:
    candidate_features = [
        "Destination Port",
        "Flow Duration",
        "Flow Bytes/s",
        "Flow Packets/s",
        "Packet Length Mean",
        "SYN Flag Count",
    ]
    features = [feature for feature in candidate_features if feature in sample.columns]
    plot_df = sample[[LABEL_COLUMN, "BinaryLabel", *features]].copy()
    plot_df.dropna(inplace=True)

    fig, axes = plt.subplots(2, 3, figsize=(14, 8))
    axes = axes.flatten()

    for ax, feature in zip(axes, features):
        temp = plot_df[["BinaryLabel", feature]].copy()
        temp[feature] = pd.to_numeric(temp[feature], errors="coerce")
        temp.dropna(inplace=True)
        temp[f"log1p_{feature}"] = np.log1p(temp[feature].clip(lower=0))
        sns.boxplot(
            data=temp,
            x="BinaryLabel",
            y=f"log1p_{feature}",
            hue="BinaryLabel",
            ax=ax,
            palette=["#4c78a8", "#c44e52"],
            legend=False,
        )
        ax.set_title(feature)
        ax.set_xlabel("")
        ax.set_ylabel("log1p(value)")

    for ax in axes[len(features):]:
        ax.axis("off")

    fig.suptitle("Selected Feature Distributions: Benign vs Attack", y=1.02)
    save_plot(FIGURES_DIR / "selected_feature_distributions.png")


def run_eda() -> None:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    METRICS_DIR.mkdir(parents=True, exist_ok=True)

    sns.set_theme(style="whitegrid")
    audit = load_audit()

    plot_multiclass_distribution(audit)
    plot_binary_distribution(audit)
    plot_data_quality(audit)

    sample = load_sample()
    sample.to_csv(METRICS_DIR / "eda_sample.csv", index=False)
    plot_correlation_heatmap(sample)
    plot_feature_distributions(sample)

    print("EDA complete.")
    print(f"Figures saved to: {FIGURES_DIR}")
    print(f"EDA sample saved to: {METRICS_DIR / 'eda_sample.csv'}")


if __name__ == "__main__":
    run_eda()
