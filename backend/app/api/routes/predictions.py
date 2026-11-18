from __future__ import annotations

import io
import json
from typing import Any
import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ...schemas.prediction import (
    BatchPredictionRequest,
    PredictionResponse,
    SinglePredictionRequest,
    InteractivePredictionRequest,
    InteractivePredictionResponse,
    PredictionSchemaResponse,
)
from ...services.prediction_service import prediction_service

router = APIRouter(prefix="/predict", tags=["Predictions"])

@router.get("/schema", response_model=PredictionSchemaResponse)
def get_prediction_schema() -> PredictionSchemaResponse:
    """Returns the exact 78-feature schema, categories, tooltips, and sample flows."""
    return prediction_service.get_feature_schema()

@router.post("/interactive", response_model=InteractivePredictionResponse)
def predict_interactive(request: InteractivePredictionRequest) -> InteractivePredictionResponse:
    """Predicts a single network flow with strict feature validation against the trained ensemble."""
    return prediction_service.predict_single_interactive(request.record)

@router.post("", response_model=PredictionResponse)
def predict_single(request: SinglePredictionRequest) -> PredictionResponse:
    return prediction_service.predict_records([request.record])

@router.post("/batch", response_model=PredictionResponse)
def predict_batch(request: BatchPredictionRequest) -> PredictionResponse:
    return prediction_service.predict_records(request.records)

@router.post("/upload-csv", response_model=PredictionResponse)
async def predict_file(file: UploadFile = File(...)) -> PredictionResponse:
    filename = (file.filename or "").lower()
    is_json = filename.endswith(".json")
    if not (filename.endswith(".csv") or filename.endswith(".csv.gz") or is_json):
        raise HTTPException(status_code=400, detail="Upload a .json, .csv, or .csv.gz flow file.")

    content = await file.read()
    try:
        if is_json:
            payload = json.loads(content.decode("utf-8-sig"))
            if isinstance(payload, dict) and "records" in payload:
                records = payload["records"]
            elif isinstance(payload, dict) and "record" in payload:
                records = [payload["record"]]
            elif isinstance(payload, dict):
                records = [payload]
            elif isinstance(payload, list):
                records = payload
            else:
                raise ValueError("JSON must contain a flow object, a 'record' object, or a 'records' array.")

            if not isinstance(records, list) or not records:
                raise ValueError("JSON must contain at least one flow record.")
            if any(not isinstance(record, dict) for record in records):
                raise ValueError("Every JSON flow record must be an object of feature names and values.")
            records = records[:5000]
        elif filename.endswith(".gz"):
            df = pd.read_csv(io.BytesIO(content), compression="gzip", nrows=5000)
        else:
            text_content = content.decode("utf-8-sig", errors="replace")
            try:
                df = pd.read_csv(io.StringIO(text_content), nrows=5000)
            except Exception:
                # Fallback to python engine in case of irregular separators
                df = pd.read_csv(io.StringIO(text_content), sep=None, engine="python", nrows=5000)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as e:
        kind = "JSON" if is_json else "CSV"
        raise HTTPException(status_code=400, detail=f"Failed to parse {kind} flow file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if not is_json:
        if df.empty:
            raise HTTPException(status_code=400, detail="The uploaded CSV file contains no data rows.")

        records = df.to_dict(orient="records")
    return prediction_service.predict_records(records)
