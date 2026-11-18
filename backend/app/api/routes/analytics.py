from __future__ import annotations

from fastapi import APIRouter
from ...schemas.analytics import AnalyticsResponse
from ...services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("", response_model=AnalyticsResponse)
def get_analytics() -> AnalyticsResponse:
    return analytics_service.get_analytics()
