from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Query
from ...schemas.traffic import PaginatedTrafficResponse
from ...services.traffic_service import traffic_service

router = APIRouter(prefix="/threats", tags=["Threats"])

@router.get("", response_model=PaginatedTrafficResponse)
def get_threats(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    severity: str | None = Query(None),
    search: str | None = Query(None),
) -> PaginatedTrafficResponse:
    return traffic_service.get_paginated_flows(
        page=page,
        page_size=page_size,
        search=search,
        severity=severity,
        is_attack=True,
    )
