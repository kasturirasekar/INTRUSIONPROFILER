from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Query
from ...schemas.traffic import LiveStreamStatus, NetworkFlowRecord, PaginatedTrafficResponse
from ...services.traffic_service import traffic_service

router = APIRouter(prefix="/traffic", tags=["Traffic"])

@router.get("", response_model=PaginatedTrafficResponse)
def get_traffic(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=200),
    search: str | None = Query(None),
    severity: str | None = Query(None),
    prediction: str | None = Query(None),
) -> PaginatedTrafficResponse:
    return traffic_service.get_paginated_flows(
        page=page,
        page_size=page_size,
        search=search,
        severity=severity,
        prediction=prediction,
    )

@router.get("/stream")
def get_stream_batch(batch_size: int = Query(10, ge=1, le=50)) -> dict[str, Any]:
    records, status = traffic_service.get_stream_batch(batch_size=batch_size)
    return {
        "status": status,
        "items": records,
    }

@router.post("/stream/toggle", response_model=LiveStreamStatus)
def toggle_stream(active: bool | None = None) -> LiveStreamStatus:
    return traffic_service.toggle_stream(active=active)
