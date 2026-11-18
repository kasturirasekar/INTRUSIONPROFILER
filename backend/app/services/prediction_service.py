from __future__ import annotations

import logging
from typing import Any
import numpy as np
import pandas as pd
from fastapi import HTTPException

from ..core.config import settings
from .model_service import model_service
from ..schemas.prediction import FlowPredictionItem, PredictionResponse

logger = logging.getLogger(__name__)

class PredictionService:
    def __init__(self) -> None:
        self.model_service = model_service

    def clean_column_names(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df.columns = df.columns.str.strip()
        return df

    def prepare_dataframe(self, df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
        """
        Cleans data and aligns features to what the model pipeline expects.
        Returns:
            prepared_features: DataFrame matching model feature schema
            raw_data: Cleaned original data for metadata inspection
        """
        raw = self.clean_column_names(df)
        prepared = raw.copy()

        # Remove ground truth labels and non-feature metadata if present in predictions / exports
        metadata_cols = [
            "Flow ID", "flow_id", "id", "Label", "BinaryLabel", "target",
            "predicted_label", "Prediction", "prediction", "attack_probability",
            "Attack Probability", "severity", "Threat Severity", "Is Malicious",
            "is_attack", "Simulated Timestamp", "timestamp_simulated", "timestamp",
            "Timestamp"
        ]
        for col in metadata_cols:
            if col in prepared.columns:
                prepared = prepared.drop(columns=[col])

        # Handle duration alias if exported with (ms) suffix
        if "Flow Duration (ms)" in prepared.columns and "Flow Duration" not in prepared.columns:
            prepared["Flow Duration"] = pd.to_numeric(prepared["Flow Duration (ms)"], errors="coerce") * 1000.0
            prepared = prepared.drop(columns=["Flow Duration (ms)"])

        # If model has known feature names, ensure all exist
        expected_features = self.model_service.feature_names
        if expected_features:
            present_features = [f for f in expected_features if f in prepared.columns]
            if not present_features:
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded CSV does not contain valid network flow features. Expected CIC-IDS columns such as 'Destination Port', 'Flow Duration', 'Total Fwd Packets', etc."
                )
            for feat in expected_features:
                if feat not in prepared.columns:
                    prepared[feat] = np.nan
            # Reorder columns exactly as model expects
            prepared = prepared[expected_features]

        # Convert to numeric and coerce infinities to NaN
        prepared = prepared.apply(pd.to_numeric, errors="coerce")
        prepared = prepared.replace([np.inf, -np.inf], np.nan)

        return prepared, raw

    def classify_severity(self, label: str, probability: float) -> str:
        if label == "Attack":
            if probability >= settings.SEVERITY_CRITICAL:
                return "Critical"
            if probability >= settings.SEVERITY_HIGH:
                return "High"
            if probability >= settings.SEVERITY_MEDIUM:
                return "Medium"
            return "Low"
        return "Normal"

    def predict_records(self, records: list[dict[str, Any]]) -> PredictionResponse:
        if not self.model_service.is_loaded or self.model_service.model is None:
            raise HTTPException(status_code=503, detail="Machine learning model is not loaded or unavailable.")

        if not records:
            raise HTTPException(status_code=400, detail="No records provided for prediction.")

        df = pd.DataFrame(records)
        prepared, raw = self.prepare_dataframe(df)

        try:
            predictions = self.model_service.model.predict(prepared)
            probability_matrix = (
                self.model_service.model.predict_proba(prepared)
                if hasattr(self.model_service.model, "predict_proba")
                else None
            )
        except Exception as e:
            logger.error("Inference failed: %s", e)
            raise HTTPException(status_code=500, detail=f"Model inference failed: {str(e)}")

        classes = list(getattr(self.model_service.model, "classes_", ["Attack", "Benign"]))
        attack_idx = classes.index("Attack") if "Attack" in classes else (0 if len(classes) > 1 else 0)

        items: list[FlowPredictionItem] = []
        critical_count = high_count = medium_count = low_count = 0
        attack_count = benign_count = 0

        # Calculate top risk features for attacks
        for i, pred in enumerate(predictions):
            label = str(pred)
            prob = float(probability_matrix[i, attack_idx]) if probability_matrix is not None else (1.0 if label == "Attack" else 0.0)
            conf = prob if label == "Attack" else (1.0 - prob)
            sev = self.classify_severity(label, prob)
            is_attack = label == "Attack"

            if is_attack:
                attack_count += 1
                if sev == "Critical":
                    critical_count += 1
                elif sev == "High":
                    high_count += 1
                elif sev == "Medium":
                    medium_count += 1
                else:
                    low_count += 1
            else:
                benign_count += 1

            # Top 3 largest values from the row to explain this record
            row_vals = prepared.iloc[i].dropna()
            top_features = list(row_vals.nlargest(3).index) if not row_vals.empty else []

            metadata = {}
            for col in ["Destination Port", "Flow Duration", "Total Fwd Packets", "Total Backward Packets", "Protocol"]:
                if col in raw.columns and pd.notna(raw.iloc[i][col]):
                    value = raw.iloc[i][col]
                    metadata[col] = value.item() if isinstance(value, np.generic) else value

            items.append(
                FlowPredictionItem(
                    flow_id=i + 1,
                    prediction=label,
                    is_attack=is_attack,
                    attack_probability=round(prob, 4),
                    confidence=round(conf, 4),
                    severity=sev,
                    top_risk_features=top_features,
                    flow_metadata=metadata,
                )
            )

        return PredictionResponse(
            total_processed=len(items),
            attack_count=attack_count,
            benign_count=benign_count,
            critical_count=critical_count,
            high_count=high_count,
            medium_count=medium_count,
            low_count=low_count,
            results=items,
        )

prediction_service = PredictionService()
