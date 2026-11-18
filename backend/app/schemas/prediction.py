from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field, model_validator

class SinglePredictionRequest(BaseModel):
    record: dict[str, Any]

class BatchPredictionRequest(BaseModel):
    records: list[dict[str, Any]]

class InteractivePredictionRequest(BaseModel):
    record: dict[str, Any]

    @model_validator(mode="before")
    @classmethod
    def unify_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "record" in data and isinstance(data["record"], dict):
                return {"record": data["record"]}
            if "features" in data and isinstance(data["features"], dict):
                return {"record": data["features"]}
            return {"record": data}
        return data

class InteractivePredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    predicted_label: str
    verdict_title: str
    status: str
    is_attack: bool
    confidence: float | None = None
    attack_probability: float | None = None
    benign_probability: float | None = None
    probabilities: dict[str, float] = Field(default_factory=dict)
    model_name: str
    model_architecture: str
    feature_count_used: int

    verdict: str | None = None
    risk_severity: str | None = None
    probability_attack: float | None = None
    ensemble_consensus: list[dict[str, Any]] = Field(default_factory=list)
    contributing_features: list[dict[str, Any]] = Field(default_factory=list)
    counterfactual: dict[str, Any] | None = None

class FeatureFieldMeta(BaseModel):
    name: str
    label: str
    category: str
    description: str
    data_type: str = "float"
    default_value: float = 0.0

class FeatureGroupMeta(BaseModel):
    category_id: str
    title: str
    description: str
    features: list[FeatureFieldMeta]

class PredictionSchemaResponse(BaseModel):
    feature_names: list[str]
    feature_count: int
    groups: list[FeatureGroupMeta]
    classes: list[str]
    sample_benign: dict[str, float]
    sample_attack: dict[str, float]

class FlowPredictionItem(BaseModel):
    flow_id: int
    prediction: str
    is_attack: bool
    attack_probability: float | None = None
    confidence: float | None = None
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
