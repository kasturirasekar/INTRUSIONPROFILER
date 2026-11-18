from __future__ import annotations

import io
import json
import logging
import uuid
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import HTTPException, UploadFile

from ...core.config import PROCESSED_DATA_DIR, SAMPLES_DATA_DIR
from ...schemas.studio import DataQualitySummary, DatasetUploadResponse, DatasetMetadataResponse

logger = logging.getLogger(__name__)

UPLOADS_DIR = Path("backend/data/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

CIC_MULTICLASS_MAP = {
    0: "BENIGN",
    1: "Bot",
    2: "DDoS",
    3: "DoS GoldenEye",
    4: "DoS Hulk",
    5: "DoS Slowhttptest",
    6: "DoS slowloris",
    7: "FTP-Patator",
    8: "PortScan",
    9: "SSH-Patator",
    10: "Web Attack - Brute Force",
    11: "Web Attack - XSS",
}

class StudioDatasetManager:
    def __init__(self) -> None:
        self._meta_cache: dict[str, dict[str, Any]] = {}
        self._df_cache: dict[str, pd.DataFrame] = {}

    def _assess_quality(self, df: pd.DataFrame) -> DataQualitySummary:
        total_rows = len(df)
        total_columns = len(df.columns)
        missing_cells = int(df.isna().sum().sum())
        duplicate_rows = int(df.duplicated().sum())

        numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        categorical_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]

        # Check infinite values in numeric columns
        inf_count = 0
        for col in numeric_cols:
            inf_count += int(np.isinf(df[col]).sum())

        # Auto-detect potential target column
        detected_target = None
        has_labels = False
        target_dist = None

        candidate_names = [
            "target", "label", "prediction", "is malicious", "is_malicious", 
            "is_attack", "attack", "threat severity", "class", "binarylabel", 
            "attack_cat", "category"
        ]
        for col in df.columns:
            if col.strip().lower() in candidate_names:
                detected_target = col
                has_labels = True
                break

        # Fallback: check if any categorical column has <= 15 unique values
        if not detected_target:
            for col in categorical_cols:
                unique_cnt = df[col].nunique()
                if 2 <= unique_cnt <= 15:
                    detected_target = col
                    has_labels = True
                    break

        if detected_target:
            val_counts = df[detected_target].value_counts().head(10).to_dict()
            target_dist = {str(k): int(v) for k, v in val_counts.items()}

        return DataQualitySummary(
            total_rows=total_rows,
            total_columns=total_columns,
            missing_cells=missing_cells,
            duplicate_rows=duplicate_rows,
            infinite_values=inf_count,
            numeric_columns_count=len(numeric_cols),
            categorical_columns_count=len(categorical_cols),
            has_labels=has_labels,
            detected_target_column=detected_target,
            target_class_distribution=target_dist,
        )

    def save_uploaded_csv(self, file: UploadFile, content: bytes) -> DatasetUploadResponse:
        dataset_id = f"ds_{uuid.uuid4().hex[:12]}"
        dest_path = UPLOADS_DIR / f"{dataset_id}.csv"

        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse CSV file: {str(e)}")

        if len(df) == 0:
            raise HTTPException(status_code=400, detail="The uploaded CSV file contains zero records.")

        # Save to disk
        df.to_csv(dest_path, index=False)

        quality = self._assess_quality(df)
        preview_rows = df.head(15).replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict(orient="records")

        meta = {
            "dataset_id": dataset_id,
            "filename": file.filename or f"{dataset_id}.csv",
            "file_size_bytes": len(content),
            "record_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "suggested_target": quality.detected_target_column,
            "is_sample_dataset": False,
        }
        self._meta_cache[dataset_id] = meta

        return DatasetUploadResponse(
            dataset_id=dataset_id,
            filename=meta["filename"],
            file_size_bytes=meta["file_size_bytes"],
            record_count=meta["record_count"],
            column_count=meta["column_count"],
            columns=meta["columns"],
            suggested_target=quality.detected_target_column,
            quality_summary=quality,
            preview_rows=preview_rows,
            is_sample_dataset=False,
        )

    def load_sample_dataset(self, task_type: str = "binary", max_rows: int = 5000) -> DatasetUploadResponse:
        dataset_id = f"sample_cic_ids_{task_type}"
        if task_type == "lightweight":
            sample_file = SAMPLES_DATA_DIR / "sample_lightweight_network_flows.csv"
        else:
            sample_file = SAMPLES_DATA_DIR / f"sample_cic_{task_type}.csv"
            if not sample_file.exists():
                sample_file = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
            if not sample_file.exists():
                sample_file = PROCESSED_DATA_DIR / f"{task_type}_test.csv.gz"

        if not sample_file.exists():
            raise HTTPException(status_code=404, detail="Sample benchmark dataset not found on disk.")

        df = pd.read_csv(sample_file, nrows=max_rows)
        if task_type == "multiclass" and "target" in df.columns:
            if df["target"].dtype in [int, np.int64, np.int32]:
                df["target"] = df["target"].map(CIC_MULTICLASS_MAP).fillna("Other")

        self._df_cache[dataset_id] = df
        quality = self._assess_quality(df)
        preview_rows = df.head(15).replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict(orient="records")

        meta = {
            "dataset_id": dataset_id,
            "filename": f"CIC-IDS-2017 ({task_type.capitalize()} Benchmark Sample)",
            "file_size_bytes": int(sample_file.stat().st_size),
            "record_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "suggested_target": quality.detected_target_column,
            "is_sample_dataset": True,
        }
        self._meta_cache[dataset_id] = meta

        return DatasetUploadResponse(
            dataset_id=dataset_id,
            filename=meta["filename"],
            file_size_bytes=meta["file_size_bytes"],
            record_count=meta["record_count"],
            column_count=meta["column_count"],
            columns=meta["columns"],
            suggested_target=quality.detected_target_column,
            quality_summary=quality,
            preview_rows=preview_rows,
            is_sample_dataset=True,
        )

    def get_dataset_df(self, dataset_id: str) -> pd.DataFrame:
        if dataset_id in self._df_cache:
            return self._df_cache[dataset_id].copy()

        # Check sample datasets directory
        if dataset_id.startswith("sample_cic_ids_"):
            task_type = "multiclass" if "multiclass" in dataset_id else "binary"
            sample_file = SAMPLES_DATA_DIR / f"sample_cic_{task_type}.csv"
            if not sample_file.exists():
                sample_file = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
            if sample_file.exists():
                df = pd.read_csv(sample_file, nrows=5000)
                if task_type == "multiclass" and "target" in df.columns:
                    if df["target"].dtype in [int, np.int64, np.int32]:
                        df["target"] = df["target"].map(CIC_MULTICLASS_MAP).fillna("Other")
                self._df_cache[dataset_id] = df
                return df.copy()

        # Check specific samples
        sample_direct = SAMPLES_DATA_DIR / f"{dataset_id}.csv"
        if sample_direct.exists():
            df = pd.read_csv(sample_direct)
            self._df_cache[dataset_id] = df
            return df.copy()

        dest_path = UPLOADS_DIR / f"{dataset_id}.csv"
        if not dest_path.exists():
            # Check if any upload matches by name
            alt_path = UPLOADS_DIR / f"{dataset_id}"
            if alt_path.exists():
                dest_path = alt_path
            else:
                # Fallback to binary sample if requested dataset is missing
                sample_fallback = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
                if sample_fallback.exists():
                    logger.warning(f"Dataset {dataset_id} not found, falling back to sample_cic_binary.csv")
                    df = pd.read_csv(sample_fallback)
                    self._df_cache[dataset_id] = df
                    return df.copy()
                raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found.")

        df = pd.read_csv(dest_path)
        self._df_cache[dataset_id] = df
        return df.copy()

    def get_preview(self, dataset_id: str, limit: int = 20) -> dict[str, Any]:
        df = self.get_dataset_df(dataset_id)
        quality = self._assess_quality(df)
        preview = df.head(limit).replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict(orient="records")
        return {
            "dataset_id": dataset_id,
            "columns": list(df.columns),
            "record_count": len(df),
            "quality": quality.model_dump(),
            "preview_rows": preview,
        }

dataset_manager = StudioDatasetManager()
