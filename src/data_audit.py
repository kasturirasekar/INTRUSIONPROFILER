import json
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

try:
    from config import CIC_IDS_2017_FILES, DATA_DIR, LABEL_COLUMN, METRICS_DIR
except ModuleNotFoundError:
    from .config import CIC_IDS_2017_FILES, DATA_DIR, LABEL_COLUMN, METRICS_DIR


def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """CIC-IDS-2017 CSVs commonly contain leading spaces in column names."""
    df = df.copy()
    df.columns = df.columns.str.strip()
    return df


def clean_label_values(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip()


def audit_single_file(path: Path) -> dict:
    df = pd.read_csv(path, low_memory=False)
    raw_columns = list(df.columns)
    df = clean_column_names(df)

    if LABEL_COLUMN not in df.columns:
        raise ValueError(f"{path.name} does not contain a '{LABEL_COLUMN}' column.")

    df[LABEL_COLUMN] = clean_label_values(df[LABEL_COLUMN])
    numeric_df = df.select_dtypes(include=[np.number])

    missing_by_column = df.isna().sum()
    infinite_by_column = pd.Series(0, index=df.columns, dtype="int64")
    if not numeric_df.empty:
        infinite_by_column.loc[numeric_df.columns] = np.isinf(numeric_df).sum()

    duplicate_rows = int(df.duplicated().sum())
    label_counts = df[LABEL_COLUMN].value_counts().sort_index()
    suspicious_labels = sorted(
        label for label in label_counts.index.tolist() if "\ufffd" in label
    )

    return {
        "file": path.name,
        "size_mb": round(path.stat().st_size / (1024 * 1024), 2),
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "raw_first_columns": raw_columns[:10],
        "clean_first_columns": list(df.columns[:10]),
        "duplicate_rows": duplicate_rows,
        "missing_total": int(missing_by_column.sum()),
        "infinite_total": int(infinite_by_column.sum()),
        "columns_with_missing": missing_by_column[missing_by_column > 0].to_dict(),
        "columns_with_infinite": infinite_by_column[infinite_by_column > 0].to_dict(),
        "label_counts": label_counts.to_dict(),
        "suspicious_labels": suspicious_labels,
        "dtype_counts": df.dtypes.astype(str).value_counts().to_dict(),
    }


def combined_audit(paths: list[Path], chunksize: int = 100_000) -> dict:
    label_counter: Counter = Counter()
    row_counter = 0
    missing_counter: Counter = Counter()
    infinite_counter: Counter = Counter()
    row_hash_counter: Counter = Counter()
    reference_columns = None
    column_mismatches = {}
    suspicious_labels = set()

    for path in paths:
        for chunk in pd.read_csv(path, chunksize=chunksize, low_memory=False):
            chunk = clean_column_names(chunk)
            if reference_columns is None:
                reference_columns = list(chunk.columns)
            elif list(chunk.columns) != reference_columns:
                column_mismatches[path.name] = {
                    "expected": reference_columns,
                    "found": list(chunk.columns),
                }

            chunk[LABEL_COLUMN] = clean_label_values(chunk[LABEL_COLUMN])
            row_counter += len(chunk)
            label_counter.update(chunk[LABEL_COLUMN].value_counts().to_dict())
            suspicious_labels.update(
                label for label in chunk[LABEL_COLUMN].unique().tolist() if "\ufffd" in label
            )

            missing = chunk.isna().sum()
            missing_counter.update(missing[missing > 0].to_dict())

            numeric_chunk = chunk.select_dtypes(include=[np.number])
            if not numeric_chunk.empty:
                infinite = np.isinf(numeric_chunk).sum()
                infinite_counter.update(infinite[infinite > 0].to_dict())

            row_hashes = pd.util.hash_pandas_object(chunk, index=False)
            row_hash_counter.update(row_hashes.astype(str).tolist())

    duplicate_estimate = sum(count - 1 for count in row_hash_counter.values() if count > 1)

    return {
        "total_rows": int(row_counter),
        "total_columns": len(reference_columns) if reference_columns else 0,
        "combined_label_counts": dict(sorted(label_counter.items())),
        "combined_missing_by_column": dict(sorted(missing_counter.items())),
        "combined_infinite_by_column": dict(sorted(infinite_counter.items())),
        "combined_duplicate_rows_estimate": int(duplicate_estimate),
        "suspicious_labels": sorted(suspicious_labels),
        "column_mismatches": column_mismatches,
    }


def run_audit() -> dict:
    paths = [DATA_DIR / file_name for file_name in CIC_IDS_2017_FILES]
    missing_files = [str(path) for path in paths if not path.exists()]
    if missing_files:
        raise FileNotFoundError(f"Missing dataset files: {missing_files}")

    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    file_audits = [audit_single_file(path) for path in paths]
    combined = combined_audit(paths)

    audit = {
        "dataset": "CIC-IDS-2017",
        "data_dir": str(DATA_DIR),
        "file_audits": file_audits,
        "combined_audit": combined,
    }

    output_path = METRICS_DIR / "dataset_audit.json"
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(audit, f, indent=2)

    return audit


def print_audit_summary(audit: dict) -> None:
    print("\nCIC-IDS-2017 DATASET AUDIT SUMMARY")
    print("=" * 40)

    for item in audit["file_audits"]:
        print(f"\n{item['file']}")
        print(f"  Rows x Columns: {item['rows']:,} x {item['columns']}")
        print(f"  Size: {item['size_mb']} MB")
        print(f"  Duplicate rows: {item['duplicate_rows']:,}")
        print(f"  Missing values: {item['missing_total']:,}")
        print(f"  Infinite values: {item['infinite_total']:,}")
        print(f"  Labels: {item['label_counts']}")

    combined = audit["combined_audit"]
    print("\nCombined dataset")
    print(f"  Total rows: {combined['total_rows']:,}")
    print(f"  Total columns: {combined['total_columns']}")
    print(f"  Duplicate rows estimate: {combined['combined_duplicate_rows_estimate']:,}")
    print("  Label distribution:")
    for label, count in combined["combined_label_counts"].items():
        pct = 100 * count / combined["total_rows"]
        print(f"    {label}: {count:,} ({pct:.4f}%)")

    print(f"\nAudit saved to: {METRICS_DIR / 'dataset_audit.json'}")


if __name__ == "__main__":
    print_audit_summary(run_audit())
