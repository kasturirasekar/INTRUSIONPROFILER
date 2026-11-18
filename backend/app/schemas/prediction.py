from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

class SinglePredictionRequest(BaseModel):
    record: dict[str, Any]

class BatchPredictionRequest(BaseModel):
    records: list[dict[str, Any]]

class FlowPredictionItem(BaseModel):
    flow_id: int
    prediction: str
    is_attack: bool
    attack_probability: float
    confidence: float
    severity: str
    top_risk_features: list[str] = Field(default_factory=list)
    flow_metadata: dict[str, Any] = Field(default_factory=dict)

class PredictionResponse(BaseModel):
    total_processed: int
    attack_count: int
    benign_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    results: list[FlowPredictionItem]
