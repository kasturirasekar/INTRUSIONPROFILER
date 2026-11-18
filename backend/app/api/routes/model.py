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

    active_name = model_service.model_name.lower()
    active_benchmark = next(
        (b for b in benchmarks if b["model"].lower() in active_name or active_name in b["model"].lower()),
        next((b for b in benchmarks if b.get("is_ensemble")), None),
    )
    matrix = active_benchmark.get("confusion_matrix") if active_benchmark else None
    matrix = matrix or [[0, 0], [0, 0]]
    cm_dict = {
        "labels": ["Benign", "Attack"],
        "matrix": matrix,
        "true_negatives": int(matrix[0][0]),
        "false_positives": int(matrix[0][1]),
        "false_negatives": int(matrix[1][0]),
        "true_positives": int(matrix[1][1]),
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
