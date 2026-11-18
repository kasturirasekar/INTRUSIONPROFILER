from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Response
from ...services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/export-csv")
def export_predictions_csv(max_rows: int = 5000) -> Response:
    csv_content = report_service.export_predictions_csv(max_rows=max_rows)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="cyber_intrusion_predictions.csv"'},
    )

@router.get("/summary")
def get_executive_summary() -> dict[str, Any]:
    return report_service.generate_threat_executive_summary()
