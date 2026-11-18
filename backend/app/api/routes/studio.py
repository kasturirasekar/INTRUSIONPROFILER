from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ...schemas.studio import (
    DatasetUploadResponse,
    StudioExperimentRequest,
    StudioExperimentStatus,
    StudioExperimentResult,
    StudioExplainRequest,
    StudioFullExplanationResponse,
    StudioSamplePredictionRequest,
    StudioSamplePredictionResponse,
)
from ...services.studio.dataset_manager import dataset_manager
from ...services.studio.studio_experiment_service import studio_experiment_service
from ...services.lab.experiment_db import experiment_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/studio", tags=["Ensemble & Explainability Studio"])

@router.post("/datasets/upload", response_model=DatasetUploadResponse)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetUploadResponse:
    if not file.filename or not (file.filename.endswith(".csv") or file.filename.endswith(".csv.gz")):
        raise HTTPException(status_code=400, detail="Only CSV or CSV.GZ files are accepted.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="Uploaded file exceeds 50MB size limit.")

    return dataset_manager.save_uploaded_csv(file, content)

@router.post("/datasets/sample", response_model=DatasetUploadResponse)
def load_sample_dataset(task_type: str = "binary", max_rows: int = 5000) -> DatasetUploadResponse:
    return dataset_manager.load_sample_dataset(task_type=task_type, max_rows=max_rows)

@router.get("/datasets/{dataset_id}/preview")
def get_dataset_preview(dataset_id: str, limit: int = 20) -> dict[str, Any]:
    return dataset_manager.get_preview(dataset_id, limit=limit)

@router.post("/experiments", response_model=StudioExperimentStatus)
def create_studio_experiment(req: StudioExperimentRequest) -> StudioExperimentStatus:
    return studio_experiment_service.launch_experiment(req)

@router.get("/experiments/{experiment_id}/status", response_model=StudioExperimentStatus)
def get_experiment_status(experiment_id: str) -> StudioExperimentStatus:
    return studio_experiment_service.get_status(experiment_id)

@router.get("/experiments/{experiment_id}/results", response_model=StudioExperimentResult)
def get_experiment_results(experiment_id: str) -> StudioExperimentResult:
    return studio_experiment_service.get_results(experiment_id)

@router.post(
    "/experiments/{experiment_id}/predict-sample",
    response_model=StudioSamplePredictionResponse,
)
def predict_heldout_sample(
    experiment_id: str, req: StudioSamplePredictionRequest
) -> StudioSamplePredictionResponse:
    return studio_experiment_service.predict_heldout_sample(experiment_id, req.sample_index)

@router.post("/explain", response_model=StudioFullExplanationResponse)
def explain_record(req: StudioExplainRequest) -> StudioFullExplanationResponse:
    # Explanation dependencies are comparatively heavy; load them only when
    # the explanation feature is requested so experiment routes can start fast.
    from ...services.studio.studio_explain_service import studio_explain_service

    return studio_explain_service.explain_studio_record(req)

@router.get("/experiments")
def list_studio_experiments() -> list[dict[str, Any]]:
    seen_ids = set()
    results = []
    for exp_id, exp in studio_experiment_service.experiments.items():
        res = studio_experiment_service.results.get(exp_id)
        seen_ids.add(exp_id)
        results.append({
            "experiment_id": exp_id,
            "name": exp.name,
            "status": exp.status,
            "is_labeled": exp.is_labeled,
            "dataset_id": exp.dataset_id,
            "created_at": exp.created_at,
            "strategy": res.strategy if res else "ensemble",
            "model_name": res.model_name if res else "Ensemble Pipeline",
            "accuracy": res.accuracy if res else None,
            "precision": res.precision if res else None,
            "recall": res.recall if res else None,
            "f1_score": res.f1_score if res else None,
            "macro_f1": res.macro_f1 if res else None,
            "weighted_f1": res.weighted_f1 if res else None,
            "roc_auc": res.roc_auc if res else None,
            "task_type": res.task_type if res else "binary",
            "false_positive_rate": res.false_positive_rate if res else None,
            "false_negative_rate": res.false_negative_rate if res else None,
            "training_time_seconds": res.training_time_seconds if res else None,
            "prediction_time_seconds": res.prediction_time_seconds if res else None,
            "total_evaluated_records": res.total_evaluated_records if res else 0,
        })

    # Retrieve from DB if not already present
    try:
        db_exps = experiment_db.list_experiments(limit=50)
        for db_row in db_exps:
            exp_id = db_row["id"]
            if exp_id not in seen_ids:
                seen_ids.add(exp_id)
                metrics = db_row.get("metrics") or {}
                results.append({
                    "experiment_id": exp_id,
                    "name": db_row["name"],
                    "status": db_row["status"],
                    "is_labeled": metrics.get("is_labeled", True),
                    "dataset_id": db_row.get("dataset_config", {}).get("dataset_id", "sample"),
                    "created_at": db_row["created_at"],
                    "strategy": metrics.get("strategy", "ensemble"),
                    "model_name": metrics.get("model_name", "Pipeline"),
                    "accuracy": metrics.get("accuracy"),
                    "precision": metrics.get("precision"),
                    "recall": metrics.get("recall"),
                    "f1_score": metrics.get("f1_score"),
                    "macro_f1": metrics.get("macro_f1"),
                    "weighted_f1": metrics.get("weighted_f1"),
                    "roc_auc": metrics.get("roc_auc"),
                    "task_type": db_row.get("task_type", "binary"),
                    "false_positive_rate": metrics.get("false_positive_rate"),
                    "false_negative_rate": metrics.get("false_negative_rate"),
                    "training_time_seconds": db_row.get("training_time_seconds"),
                    "prediction_time_seconds": db_row.get("prediction_time_seconds"),
                    "total_evaluated_records": metrics.get("total_evaluated_records", 0),
                })
    except Exception as e:
        logger.debug("Could not query DB experiments: %s", e)

    return results

@router.post("/experiments/compare")
def compare_studio_experiments(payload: dict[str, list[str]]) -> list[dict[str, Any]]:
    exp_ids = payload.get("experiment_ids", [])
    out = []
    for exp_id in exp_ids:
        res = studio_experiment_service.results.get(exp_id)
        exp = studio_experiment_service.experiments.get(exp_id)
        if res and exp:
            out.append(res.model_dump())
    return out

@router.delete("/experiments/{experiment_id}")
def delete_studio_experiment(experiment_id: str) -> dict[str, Any]:
    deleted = False
    if experiment_id in studio_experiment_service.experiments:
        del studio_experiment_service.experiments[experiment_id]
        deleted = True
    if experiment_id in studio_experiment_service.results:
        del studio_experiment_service.results[experiment_id]
        deleted = True
    return {"experiment_id": experiment_id, "deleted": deleted}
