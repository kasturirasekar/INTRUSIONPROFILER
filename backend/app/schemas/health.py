from __future__ import annotations

from typing import Any
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    version: str
    model_loaded: bool
    model_name: str
    model_type: str
    feature_count: int
    dataset_available: bool
    sample_dataset_path: str
    active_features_sample: list[str]
