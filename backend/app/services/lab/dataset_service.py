from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import HTTPException
from sklearn.model_selection import train_test_split

from ...core.config import METRICS_DIR, PROCESSED_DATA_DIR, SAMPLES_DATA_DIR
from ...schemas.lab import (
    DatasetMetadataResponse,
    DatasetPreviewResponse,
    DatasetSelectionConfig,
)

logger = logging.getLogger(__name__)

BINARY_SAMPLE = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
MULTI_SAMPLE = SAMPLES_DATA_DIR / "sample_cic_multiclass.csv"

BINARY_TRAIN = BINARY_SAMPLE if BINARY_SAMPLE.exists() else (PROCESSED_DATA_DIR / "binary_train.csv.gz")
BINARY_TEST = BINARY_SAMPLE if BINARY_SAMPLE.exists() else (PROCESSED_DATA_DIR / "binary_test.csv.gz")
MULTI_TRAIN = MULTI_SAMPLE if MULTI_SAMPLE.exists() else (PROCESSED_DATA_DIR / "multiclass_train.csv.gz")
MULTI_TEST = MULTI_SAMPLE if MULTI_SAMPLE.exists() else (PROCESSED_DATA_DIR / "multiclass_test.csv.gz")

class DatasetService:
    def get_metadata(self) -> DatasetMetadataResponse:
        # Report the actual packaged dataset size instead of the benchmark's old
        # hard-coded total, which made the UI suggest flows that were not present.
        sample_df = pd.read_csv(BINARY_SAMPLE if BINARY_SAMPLE.exists() else BINARY_TEST)
        feature_names = [col for col in sample_df.columns if col not in ["target", "Label", "BinaryLabel"]]
        binary_classes = {
            str(label): int(count)
            for label, count in sample_df["target"].value_counts().items()
        } if "target" in sample_df else {}

        multiclass_df = pd.read_csv(MULTI_SAMPLE if MULTI_SAMPLE.exists() else MULTI_TEST)
        multiclass_counts = multiclass_df["target"].value_counts() if "target" in multiclass_df else pd.Series(dtype=int)

        category_metadata = [
            {"id": 0, "category": "BENIGN", "test_samples": 38997, "severity": "Normal"},
            {"id": 4, "category": "DoS Hulk", "test_samples": 3160, "severity": "Critical"},
            {"id": 8, "category": "PortScan", "test_samples": 2591, "severity": "High"},
            {"id": 2, "category": "DDoS", "test_samples": 2243, "severity": "Critical"},
            {"id": 3, "category": "DoS GoldenEye", "test_samples": 179, "severity": "High"},
            {"id": 7, "category": "FTP-Patator", "test_samples": 112, "severity": "High"},
            {"id": 6, "category": "DoS slowloris", "test_samples": 97, "severity": "Medium"},
            {"id": 5, "category": "DoS Slowhttptest", "test_samples": 89, "severity": "Medium"},
            {"id": 9, "category": "SSH-Patator", "test_samples": 70, "severity": "High"},
            {"id": 1, "category": "Bot", "test_samples": 33, "severity": "High"},
            {"id": 10, "category": "Web Attack - Brute Force", "test_samples": 23, "severity": "Medium"},
            {"id": 11, "category": "Web Attack - XSS", "test_samples": 13, "severity": "Medium"},
        ]
        mc_classes = [
            {**item, "test_samples": int(multiclass_counts.get(item["category"], 0))}
            for item in category_metadata
            if int(multiclass_counts.get(item["category"], 0)) > 0
        ]

        return DatasetMetadataResponse(
            name="CIC-IDS-2017 (Canadian Institute for Cybersecurity)",
            description="Comprehensive network intrusion benchmark capturing 5 days of benign traffic and contemporary attack vectors (DoS, DDoS, PortScan, Infiltration, Web Attacks, Brute Force).",
            total_records=len(sample_df),
            feature_count=len(feature_names),
            task_type="binary / multiclass",
            binary_classes=binary_classes,
            multiclass_categories=mc_classes,
            feature_names=feature_names,
        )

    def load_dataset_split(
        self, config: DatasetSelectionConfig
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        train_file = MULTI_TRAIN if config.task_type == "multiclass" else BINARY_TRAIN
        test_file = MULTI_TEST if config.task_type == "multiclass" else BINARY_TEST

        if not train_file.exists() or not test_file.exists():
            raise HTTPException(status_code=500, detail="Processed dataset files not found on server.")

        if train_file.resolve() == test_file.resolve():
            # Packaged samples are a single source file, not independent train
            # and test sets. Split once so every row is used exactly once and no
            # flow appears on both sides of evaluation.
            dataset = pd.read_csv(train_file)
            if "target" not in dataset.columns:
                raise HTTPException(status_code=500, detail=f"Dataset {train_file.name} is missing its target column.")
            y_all = dataset["target"]
            X_all = dataset.drop(columns=["target"])
            requested_total = max(1, config.train_rows + config.test_rows)
            test_fraction = min(0.5, max(0.1, config.test_rows / requested_total))
            stratify = y_all if y_all.nunique() > 1 and y_all.value_counts().min() >= 2 else None
            try:
                X_train, X_test, y_train, y_test = train_test_split(
                    X_all,
                    y_all,
                    test_size=test_fraction,
                    random_state=config.random_seed,
                    stratify=stratify if config.stratified else None,
                )
            except ValueError:
                X_train, X_test, y_train, y_test = train_test_split(
                    X_all,
                    y_all,
                    test_size=test_fraction,
                    random_state=config.random_seed,
                )
            X_train, X_test = X_train.reset_index(drop=True), X_test.reset_index(drop=True)
            y_train, y_test = y_train.reset_index(drop=True), y_test.reset_index(drop=True)
        else:
            # Already partitioned datasets have separate files; retain those
            # official train/test boundaries.
            df_train = pd.read_csv(train_file)
            df_test = pd.read_csv(test_file)
            y_train = df_train["target"]
            X_train = df_train.drop(columns=["target"])
            y_test = df_test["target"]
            X_test = df_test.drop(columns=["target"])

        # Stratified row sampling
        if config.train_rows and len(X_train) > config.train_rows:
            if config.stratified and y_train.nunique() > 1:
                train_idx = y_train.groupby(y_train).sample(
                    frac=min(1.0, config.train_rows / len(y_train)),
                    random_state=config.random_seed,
                ).index
            else:
                train_idx = X_train.sample(n=config.train_rows, random_state=config.random_seed).index
            X_train = X_train.loc[train_idx].reset_index(drop=True)
            y_train = y_train.loc[train_idx].reset_index(drop=True)

        if config.test_rows and len(X_test) > config.test_rows:
            if config.stratified and y_test.nunique() > 1:
                test_idx = y_test.groupby(y_test).sample(
                    frac=min(1.0, config.test_rows / len(y_test)),
                    random_state=config.random_seed,
                ).index
            else:
                test_idx = X_test.sample(n=config.test_rows, random_state=config.random_seed).index
            X_test = X_test.loc[test_idx].reset_index(drop=True)
            y_test = y_test.loc[test_idx].reset_index(drop=True)

        return X_train, X_test, y_train, y_test

    def preview_dataset(self, config: DatasetSelectionConfig) -> DatasetPreviewResponse:
        X_train, X_test, y_train, y_test = self.load_dataset_split(config)

        dist = y_train.value_counts().to_dict()
        dist_str = {str(k): int(v) for k, v in dist.items()}

        sample_rows = []
        preview_df = pd.concat([X_train.head(10), y_train.head(10).rename("target")], axis=1)
        for _, r in preview_df.iterrows():
            row_dict = {}
            for col in list(preview_df.columns)[:8] + ["target"]:
                val = r[col]
                row_dict[col] = float(val) if isinstance(val, (int, float)) and not np.isnan(val) else str(val)
            sample_rows.append(row_dict)

        return DatasetPreviewResponse(
            task_type=config.task_type,
            train_count=len(X_train),
            test_count=len(X_test),
            class_distribution=dist_str,
            features_sample=list(X_train.columns[:10]),
            sample_rows=sample_rows,
        )

dataset_service = DatasetService()
