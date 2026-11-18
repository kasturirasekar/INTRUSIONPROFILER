import argparse
import json

import numpy as np
import pandas as pd

try:
    from config import METRICS_DIR, PROCESSED_DIR
except ModuleNotFoundError:
    from .config import METRICS_DIR, PROCESSED_DIR


def read_split(task: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    train_path = PROCESSED_DIR / f"{task}_train.csv.gz"
    test_path = PROCESSED_DIR / f"{task}_test.csv.gz"
    if not train_path.exists() or not test_path.exists():
        raise FileNotFoundError(
            f"Missing processed files for task '{task}'. Run preprocessing first."
        )
    return pd.read_csv(train_path), pd.read_csv(test_path)


def distribution(series: pd.Series) -> dict:
    counts = series.value_counts().sort_index()
    percentages = (counts / counts.sum() * 100).round(4)
    return {
        label: {"count": int(counts[label]), "percentage": float(percentages[label])}
        for label in counts.index
    }


def count_train_test_overlap(train: pd.DataFrame, test: pd.DataFrame) -> int:
    train_hashes = pd.util.hash_pandas_object(train, index=False)
    test_hashes = pd.util.hash_pandas_object(test, index=False)
    return int(test_hashes.isin(set(train_hashes.tolist())).sum())


def count_invalid_values(df: pd.DataFrame) -> dict:
    feature_df = df.drop(columns=["target"])
    numeric = feature_df.select_dtypes(include=[np.number])
    return {
        "missing_values": int(feature_df.isna().sum().sum()),
        "infinite_values": int(np.isinf(numeric).sum().sum()) if not numeric.empty else 0,
    }


def validate_split(task: str = "binary") -> dict:
    train, test = read_split(task)
    if "target" not in train.columns or "target" not in test.columns:
        raise ValueError("Processed split files must contain a target column.")

    train_features = train.drop(columns=["target"]).columns.tolist()
    test_features = test.drop(columns=["target"]).columns.tolist()
    same_feature_order = train_features == test_features

    summary = {
        "task": task,
        "train_shape": list(train.shape),
        "test_shape": list(test.shape),
        "feature_count": len(train_features),
        "same_feature_order": same_feature_order,
        "train_distribution": distribution(train["target"]),
        "test_distribution": distribution(test["target"]),
        "train_invalid_values": count_invalid_values(train),
        "test_invalid_values": count_invalid_values(test),
        "exact_train_test_overlap_rows": count_train_test_overlap(train, test),
    }

    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = METRICS_DIR / f"split_validation_{task}.json"
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate prepared train/test split.")
    parser.add_argument("--task", choices=["binary", "multiclass"], default="binary")
    args = parser.parse_args()
    print(json.dumps(validate_split(args.task), indent=2))


if __name__ == "__main__":
    main()
