from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.config import MODELS_DIR
from src.data_audit import clean_column_names

MODEL_PATH = MODELS_DIR / "final_model_random_forest.joblib"
app = FastAPI(title="Cyber-Attack Intrusion Profiler API", version="1.0.0")


class PredictionRequest(BaseModel):
    records: list[dict[str, Any]]


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "Cyber-Attack Intrusion Profiler API",
        "status": "ok",
        "model_path": str(MODEL_PATH),
        "model_exists": MODEL_PATH.exists(),
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_exists": MODEL_PATH.exists(),
    }


@app.post("/predict")
def predict(request: PredictionRequest) -> dict[str, Any]:
    if not request.records:
        raise HTTPException(status_code=400, detail="Request body must include at least one record.")

    model = load_model()
    df = pd.DataFrame(request.records)
    prepared = prepare_features(df)

    predictions = model.predict(prepared)
    probability_matrix = model.predict_proba(prepared) if hasattr(model, "predict_proba") else None

    classes = list(getattr(model, "classes_", ["Benign", "Attack"]))
    attack_index = classes.index("Attack") if "Attack" in classes else (1 if len(classes) > 1 else 0)

    results: list[dict[str, Any]] = []
    for index, prediction in enumerate(predictions):
        probability = float(probability_matrix[index, attack_index]) if probability_matrix is not None else 0.0
        severity = classify_severity(str(prediction), probability)
        results.append(
            {
                "row_index": index,
                "prediction": str(prediction),
                "attack_probability": round(float(probability), 4),
                "severity": severity,
            }
        )

    return {
        "count": len(results),
        "predictions": results,
    }


def load_model() -> Any:
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=500, detail=f"Model not found at {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def prepare_features(data: pd.DataFrame) -> pd.DataFrame:
    df = clean_column_names(data.copy())
    label_columns = ["Label", "BinaryLabel", "target"]
    for column in label_columns:
        if column in df.columns:
            df = df.drop(columns=[column])

    if df.empty:
        raise HTTPException(status_code=400, detail="No feature columns are available after dropping labels.")

    df = df.apply(pd.to_numeric, errors="coerce")
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    return df


def classify_severity(label: str, probability: float) -> str:
    if label == "Attack":
        if probability >= 0.90:
            return "Critical"
        if probability >= 0.75:
            return "High"
        if probability >= 0.55:
            return "Medium"
        return "Low"
    return "Normal"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=False)
