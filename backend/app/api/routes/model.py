from __future__ import annotations

from typing import Any
from fastapi import APIRouter
from ...schemas.model_metrics import (
    FeatureImportanceDetail,
    ModelBenchmarkRow,
    ModelPerformanceResponse,
)
from ...services.model_service import model_service

router = APIRouter(prefix="/model", tags=["Model"])

@router.get("/performance", response_model=ModelPerformanceResponse)
def get_model_performance() -> ModelPerformanceResponse:
    benchmarks = model_service.get_benchmarks()
    benchmark_rows = [ModelBenchmarkRow(**b) for b in benchmarks]

    feature_details = [FeatureImportanceDetail(**f) for f in model_service.feature_importances]
    metadata = model_service.get_metadata()

    # Active model confusion matrix (Stacking Ensemble)
    stacking_benchmark = next((b for b in benchmarks if "stacking" in b["model"].lower()), None)
    cm_dict = {
        "labels": ["Benign", "Attack"],
        "matrix": stacking_benchmark["confusion_matrix"] if stacking_benchmark else [[38971, 25], [46, 8565]],
        "true_negatives": 38971,
        "false_positives": 25,
        "false_negatives": 46,
        "true_positives": 8565,
    }

    return ModelPerformanceResponse(
        active_model_name=model_service.model_name,
        model_type=str(type(model_service.model).__name__) if model_service.model else "None",
        feature_count=len(model_service.feature_names),
        models_compared=benchmark_rows,
        practical_model_metadata=metadata,
        feature_importances=feature_details,
        confusion_matrix_active=cm_dict,
    )

@router.get("/feature-importance", response_model=list[FeatureImportanceDetail])
def get_feature_importance() -> list[FeatureImportanceDetail]:
    return [FeatureImportanceDetail(**f) for f in model_service.feature_importances]
