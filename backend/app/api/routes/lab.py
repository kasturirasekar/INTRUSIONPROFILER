from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException, Query

from ...schemas.lab import (
    AvailableModelsResponse,
    ComparativeAnalysisItem,
    ComparativeAnalysisRequest,
    ComparativeAnalysisResponse,
    DatasetMetadataResponse,
    DatasetPreviewResponse,
    DatasetSelectionConfig,
    ExperimentDetailResponse,
    ExperimentRequest,
    ExperimentResults,
    ExperimentStatusResponse,
    ExperimentSummaryItem,
    PreprocessingPreviewRequest,
    PreprocessingPreviewResponse,
)
from ...services.lab.dataset_service import dataset_service
from ...services.lab.experiment_db import experiment_db
from ...services.lab.model_catalog import get_available_models
from ...services.lab.preprocessing_service import preprocessing_service
from ...services.lab.training_service import training_service

router = APIRouter(tags=["Ensemble Lab"])

# 1. Dataset Endpoints
@router.get("/datasets/metadata", response_model=DatasetMetadataResponse)
def get_dataset_metadata() -> DatasetMetadataResponse:
    return dataset_service.get_metadata()

@router.post("/datasets/preview", response_model=DatasetPreviewResponse)
def preview_dataset(config: DatasetSelectionConfig) -> DatasetPreviewResponse:
    return dataset_service.preview_dataset(config)

# 2. Preprocessing Preview
@router.post("/preprocessing/preview", response_model=PreprocessingPreviewResponse)
def preview_preprocessing(request: PreprocessingPreviewRequest) -> PreprocessingPreviewResponse:
    return preprocessing_service.preview_preprocessing(
        request.dataset_config, request.preprocessing_config
    )

# 3. Model Catalog
@router.get("/ensemble/available-models", response_model=AvailableModelsResponse)
def get_model_catalog() -> AvailableModelsResponse:
    return get_available_models()

# 4. Experiment Execution & Management
@router.post("/experiments", response_model=ExperimentStatusResponse)
def create_and_run_experiment(request: ExperimentRequest) -> ExperimentStatusResponse:
    exp_id = training_service.launch_experiment(request)
    return ExperimentStatusResponse(
        id=exp_id,
        name=request.name,
        status="running",
        stage="Initializing Experiment",
        progress=5,
    )

@router.get("/experiments", response_model=list[ExperimentSummaryItem])
def list_experiments(limit: int = Query(50, ge=1, le=100)) -> list[ExperimentSummaryItem]:
    rows = experiment_db.list_experiments(limit=limit)
    items = []
    for r in rows:
        metrics = r.get("metrics") or {}
        ens_cfg = r.get("ensemble_config") or {}
        items.append(
            ExperimentSummaryItem(
                id=r["id"],
                name=r["name"],
                created_at=r["created_at"],
                task_type=r["task_type"],
                status=r["status"],
                strategy=ens_cfg.get("strategy", "voting"),
                accuracy=metrics.get("accuracy"),
                f1_score=metrics.get("f1_score"),
                recall=metrics.get("recall"),
                training_time_seconds=r.get("training_time_seconds"),
            )
        )
    return items

@router.get("/experiments/{experiment_id}", response_model=ExperimentDetailResponse)
def get_experiment_details(experiment_id: str) -> ExperimentDetailResponse:
    row = experiment_db.get_experiment(experiment_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    return ExperimentDetailResponse(**row)

@router.get("/experiments/{experiment_id}/status", response_model=ExperimentStatusResponse)
def get_experiment_status(experiment_id: str) -> ExperimentStatusResponse:
    row = experiment_db.get_experiment(experiment_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    return ExperimentStatusResponse(
        id=row["id"],
        name=row["name"],
        status=row["status"],
        stage=row["stage"],
        progress=row["progress"],
        error_message=row.get("error_message"),
    )

@router.get("/experiments/{experiment_id}/results", response_model=ExperimentResults)
def get_experiment_results(experiment_id: str) -> ExperimentResults:
    row = experiment_db.get_experiment(experiment_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    if row["status"] != "completed" or not row.get("metrics"):
        raise HTTPException(status_code=400, detail=f"Experiment status is '{row['status']}'. Results not available.")
    return ExperimentResults(**row["metrics"])

@router.post("/experiments/{experiment_id}/rerun", response_model=ExperimentStatusResponse)
def rerun_experiment(experiment_id: str) -> ExperimentStatusResponse:
    row = experiment_db.get_experiment(experiment_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")

    req = ExperimentRequest(
        name=f"{row['name']} (Rerun)",
        dataset_config=DatasetSelectionConfig(**row["dataset_config"]),
        preprocessing_config=row["preprocessing_config"],
        ensemble_config=row["ensemble_config"],
        notes=f"Rerun of {experiment_id}",
    )
    new_id = training_service.launch_experiment(req)
    return ExperimentStatusResponse(
        id=new_id,
        name=req.name,
        status="running",
        stage="Initializing Experiment",
        progress=5,
    )

@router.delete("/experiments/{experiment_id}")
def delete_experiment(experiment_id: str) -> dict[str, Any]:
    deleted = experiment_db.delete_experiment(experiment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    return {"status": "deleted", "id": experiment_id}

@router.post("/experiments/compare", response_model=ComparativeAnalysisResponse)
def compare_experiments(request: ComparativeAnalysisRequest) -> ComparativeAnalysisResponse:
    items: list[ComparativeAnalysisItem] = []

    for exp_id in request.experiment_ids:
        row = experiment_db.get_experiment(exp_id)
        if not row or not row.get("metrics"):
            continue
        m = row["metrics"]
        st = m.get("security_tradeoffs") or {}
        ens = row.get("ensemble_config") or {}

        items.append(
            ComparativeAnalysisItem(
                id=row["id"],
                name=row["name"],
                strategy=ens.get("strategy", "voting"),
                accuracy=m.get("accuracy", 0.0),
                recall=m.get("recall", 0.0),
                precision=m.get("precision", 0.0),
                f1_score=m.get("f1_score", 0.0),
                false_positive_rate=st.get("false_alarm_rate", 0.0),
                false_negative_rate=st.get("missed_attack_rate", 0.0),
                training_time=row.get("training_time_seconds", 0.0),
                detection_verdict=st.get("recommendation", "N/A"),
            )
        )

    if len(items) < 2:
        raise HTTPException(status_code=400, detail="At least 2 completed experiments are required for comparative analysis.")

    best_f1 = max(items, key=lambda x: x.f1_score)
    best_recall = max(items, key=lambda x: x.recall)
    lowest_fpr = min(items, key=lambda x: x.false_positive_rate)

    rec = (
        f"{best_f1.name} achieves the highest overall F1-Score ({best_f1.f1_score}%). "
        f"For minimal missed intrusions (perimeter security), {best_recall.name} is preferred (Recall: {best_recall.recall}%). "
        f"For minimal alert fatigue in the SOC, {lowest_fpr.name} yields the lowest false alarm rate ({lowest_fpr.false_positive_rate}%)."
    )

    return ComparativeAnalysisResponse(
        experiments=items,
        best_overall_f1=f"{best_f1.name} ({best_f1.f1_score}%)",
        best_attack_detection_rate=f"{best_recall.name} ({best_recall.recall}%)",
        lowest_false_alarm_rate=f"{lowest_fpr.name} ({lowest_fpr.false_positive_rate}%)",
        operational_recommendation=rec,
    )
