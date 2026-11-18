import argparse
import json
from collections import Counter

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler

try:
    from config import (
        BINARY_LABEL_COLUMN,
        CIC_IDS_2017_FILES,
        DATA_DIR,
        LABEL_COLUMN,
        METRICS_DIR,
        PROCESSED_DIR,
        RANDOM_SEED,
        WEB_LABEL_FIXES,
    )
    from data_audit import clean_column_names, clean_label_values
except ModuleNotFoundError:
    from .config import (
        BINARY_LABEL_COLUMN,
        CIC_IDS_2017_FILES,
        DATA_DIR,
        LABEL_COLUMN,
        METRICS_DIR,
        PROCESSED_DIR,
        RANDOM_SEED,
        WEB_LABEL_FIXES,
    )
    from .data_audit import clean_column_names, clean_label_values


def normalize_labels(series: pd.Series) -> pd.Series:
    labels = clean_label_values(series)
    return labels.replace(WEB_LABEL_FIXES)


def create_binary_target(labels: pd.Series) -> pd.Series:
    return np.where(labels.eq("BENIGN"), "Benign", "Attack")


def load_clean_dataset(sample_rows: int | None = None, random_state: int = RANDOM_SEED) -> pd.DataFrame:
    frames = []
    total_rows = _count_raw_rows()
    sample_frac = 1.0 if sample_rows is None else min(1.0, sample_rows / total_rows)
    seed = random_state

    for file_name in CIC_IDS_2017_FILES:
        path = DATA_DIR / file_name
        df = pd.read_csv(path, low_memory=False)
        df = clean_column_names(df)
        df[LABEL_COLUMN] = normalize_labels(df[LABEL_COLUMN])
        df.replace([np.inf, -np.inf], np.nan, inplace=True)

        if sample_frac < 1.0:
            df = df.sample(frac=sample_frac, random_state=seed)
            seed += 1

        frames.append(df)

    data = pd.concat(frames, ignore_index=True)
    rows_before_cleaning = len(data)
    data.dropna(inplace=True)
    rows_after_dropna = len(data)
    data.drop_duplicates(inplace=True)
    rows_after_duplicates = len(data)
    data[BINARY_LABEL_COLUMN] = create_binary_target(data[LABEL_COLUMN])

    data.attrs["cleaning_summary"] = {
        "rows_before_cleaning": int(rows_before_cleaning),
        "rows_removed_missing_or_infinite": int(rows_before_cleaning - rows_after_dropna),
        "rows_removed_duplicates": int(rows_after_dropna - rows_after_duplicates),
        "rows_after_cleaning": int(rows_after_duplicates),
        "sample_rows_requested": sample_rows,
    }
    return data


def _count_raw_rows() -> int:
    total = 0
    for file_name in CIC_IDS_2017_FILES:
        path = DATA_DIR / file_name
        total += sum(1 for _ in path.open("r", encoding="utf-8", errors="replace")) - 1
    return total


def split_features_target(
    data: pd.DataFrame,
    task: str = "binary",
    test_size: float = 0.2,
    random_state: int = RANDOM_SEED,
    drop_rare_classes_min: int | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, LabelEncoder | None]:
    if task not in {"binary", "multiclass"}:
        raise ValueError("task must be either 'binary' or 'multiclass'.")

    target_column = BINARY_LABEL_COLUMN if task == "binary" else LABEL_COLUMN
    drop_columns = [LABEL_COLUMN, BINARY_LABEL_COLUMN]
    X = data.drop(columns=[column for column in drop_columns if column in data.columns])
    X = X.apply(pd.to_numeric, errors="coerce")
    y = data[target_column]

    if task == "multiclass":
        min_required_for_split = max(2, int(np.ceil(1 / test_size)))
        class_counts = y.value_counts()
        rare_classes = class_counts[class_counts < min_required_for_split]
        if not rare_classes.empty and drop_rare_classes_min is None:
            raise ValueError(
                "Multiclass stratified evaluation needs enough rows for each class to appear in train and test. "
                f"Rare classes found: {rare_classes.to_dict()}. "
                f"Use a larger sample, `--full`, or `--drop-rare-classes-min {min_required_for_split}` "
                "for development only."
            )
        if drop_rare_classes_min is not None:
            effective_min = max(drop_rare_classes_min, min_required_for_split)
            keep_classes = class_counts[class_counts >= effective_min].index
            keep_mask = y.isin(keep_classes)
            X = X.loc[keep_mask]
            y = y.loc[keep_mask]

    label_encoder = None
    if task == "multiclass":
        label_encoder = LabelEncoder()
        y = pd.Series(label_encoder.fit_transform(y), index=y.index, name=target_column)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )
    return X_train, X_test, y_train, y_test, label_encoder


def build_scaled_preprocessor(feature_columns: list[str]) -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    return ColumnTransformer(
        transformers=[("numeric", numeric_pipeline, feature_columns)],
        remainder="drop",
    )


def build_tree_preprocessor(feature_columns: list[str]) -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )
    return ColumnTransformer(
        transformers=[("numeric", numeric_pipeline, feature_columns)],
        remainder="drop",
    )


def summarize_split(
    y_train: pd.Series,
    y_test: pd.Series,
    label_encoder: LabelEncoder | None = None,
) -> dict:
    if label_encoder is not None:
        y_train = pd.Series(label_encoder.inverse_transform(y_train), index=y_train.index)
        y_test = pd.Series(label_encoder.inverse_transform(y_test), index=y_test.index)

    train_counts = Counter(y_train)
    test_counts = Counter(y_test)
    return {
        "train_size": int(len(y_train)),
        "test_size": int(len(y_test)),
        "train_distribution": dict(sorted(train_counts.items())),
        "test_distribution": dict(sorted(test_counts.items())),
    }


def save_preprocessed_splits(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    task: str,
) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    train = X_train.copy()
    test = X_test.copy()
    train["target"] = y_train
    test["target"] = y_test
    train.to_csv(PROCESSED_DIR / f"{task}_train.csv.gz", index=False, compression="gzip")
    test.to_csv(PROCESSED_DIR / f"{task}_test.csv.gz", index=False, compression="gzip")


def run_preprocessing(
    task: str = "binary",
    sample_rows: int | None = 250_000,
    save_splits: bool = True,
    drop_rare_classes_min: int | None = None,
) -> dict:
    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    data = load_clean_dataset(sample_rows=sample_rows)
    cleaning_summary = data.attrs.get("cleaning_summary", {})
    X_train, X_test, y_train, y_test, label_encoder = split_features_target(
        data,
        task=task,
        drop_rare_classes_min=drop_rare_classes_min,
    )

    summary = {
        "task": task,
        "cleaning_summary": cleaning_summary,
        "feature_count": int(X_train.shape[1]),
        "split_summary": summarize_split(y_train, y_test, label_encoder=label_encoder),
        "label_classes": label_encoder.classes_.tolist() if label_encoder is not None else None,
        "drop_rare_classes_min": drop_rare_classes_min,
        "leakage_note": (
            "Cleaning removes invalid rows and exact duplicates before splitting. "
            "Imputation, scaling, feature selection, and oversampling must be fitted only on training data."
        ),
    }

    with (METRICS_DIR / f"preprocessing_summary_{task}.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    if save_splits:
        save_preprocessed_splits(X_train, X_test, y_train, y_test, task=task)

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare CIC-IDS-2017 train/test data.")
    parser.add_argument("--task", choices=["binary", "multiclass"], default="binary")
    parser.add_argument("--sample-rows", type=int, default=250_000)
    parser.add_argument("--full", action="store_true", help="Use the full cleaned dataset.")
    parser.add_argument("--no-save-splits", action="store_true")
    parser.add_argument(
        "--drop-rare-classes-min",
        type=int,
        default=None,
        help="Development-only option for multiclass samples that contain too few examples of rare classes.",
    )
    args = parser.parse_args()

    sample_rows = None if args.full else args.sample_rows
    summary = run_preprocessing(
        task=args.task,
        sample_rows=sample_rows,
        save_splits=not args.no_save_splits,
        drop_rare_classes_min=args.drop_rare_classes_min,
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
