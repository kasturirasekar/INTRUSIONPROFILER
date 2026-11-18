from __future__ import annotations

from fastapi import APIRouter
from ...core.config import SAMPLE_TEST_DATA, settings
from ...schemas.health import HealthResponse
from ...services.model_service import model_service

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok" if model_service.is_loaded else "degraded",
        version=settings.VERSION,
        model_loaded=model_service.is_loaded,
        model_name=model_service.model_name,
        model_type=str(type(model_service.model).__name__) if model_service.model else "None",
        feature_count=len(model_service.feature_names),
        dataset_available=SAMPLE_TEST_DATA.exists(),
        sample_dataset_path=str(SAMPLE_TEST_DATA),
        active_features_sample=model_service.feature_names[:10],
    )
