from __future__ import annotations

from fastapi import APIRouter
from ...schemas.dashboard import DashboardSummaryResponse
from ...services.dashboard_service import dashboard_service

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary() -> DashboardSummaryResponse:
    return dashboard_service.get_summary()
