from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

class ModelBenchmarkRow(BaseModel):
    model: str
    accuracy: float
    precision_attack: float
    recall_attack: float
    f1_attack: float
    roc_auc: float | None = None
    average_precision: float | None = None
    training_time_seconds: float
    prediction_time_seconds: float
    confusion_matrix: list[list[int]] | None = None
    is_ensemble: bool

class FeatureImportanceDetail(BaseModel):
    feature: str
    importance: float
    rank: int
    category: str

class ModelPerformanceResponse(BaseModel):
    active_model_name: str
    model_type: str
    feature_count: int
    models_compared: list[ModelBenchmarkRow]
    practical_model_metadata: dict[str, Any]
    feature_importances: list[FeatureImportanceDetail]
    confusion_matrix_active: dict[str, Any]
