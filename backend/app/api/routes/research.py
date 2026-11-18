from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Query

from ...schemas.research import (
    BenchmarkRunRequest,
    BenchmarkRunResponse,
    RobustnessExperimentRequest,
    RobustnessExperimentResponse,
    DriftAnalysisRequest,
    DriftAnalysisResponse,
    ExplanationStabilityRequest,
    ExplanationStabilityResponse,
    FeasibleCounterfactualResponse,
)
from ...services.research.evaluation_engine import evaluation_engine
from ...services.research.robustness_service import robustness_service
from ...services.research.drift_service import drift_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/research", tags=["Research & Evaluation"])

@router.post("/benchmark", response_model=BenchmarkRunResponse)
def run_benchmark(req: BenchmarkRunRequest) -> BenchmarkRunResponse:
    """
    Unified Evaluation Engine:
    Benchmarks configured baseline and ensemble classifiers (DT, LR, RF, NB, Extra Trees, GBDT, AdaBoost, Voting, Bagging, Stacking)
    under strict data leakage prevention.
    """
    try:
        return evaluation_engine.run_benchmark(req)
    except Exception as e:
        logger.error(f"Benchmark run failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/robustness", response_model=RobustnessExperimentResponse)
def run_robustness_experiment(req: RobustnessExperimentRequest) -> RobustnessExperimentResponse:
    """
    Controlled Stress Testing:
    Evaluates baseline vs ensemble degradation under feature noise, missing values, distribution shifts, or severe class imbalance.
    """
    try:
        return robustness_service.run_robustness_experiment(req)
    except Exception as e:
        logger.error(f"Robustness experiment failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/drift", response_model=DriftAnalysisResponse)
def analyze_traffic_drift(req: DriftAnalysisRequest) -> DriftAnalysisResponse:
    """
    Traffic Drift Analysis:
    Quantifies statistical distribution divergence between reference baseline and incoming traffic
    using Kolmogorov-Smirnov (KS) tests, Population Stability Index (PSI), and Wasserstein distances.
    """
    try:
        return drift_service.analyze_drift(req)
    except Exception as e:
        logger.error(f"Traffic drift analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/explain/stability", response_model=ExplanationStabilityResponse)
def check_explanation_stability(req: ExplanationStabilityRequest) -> ExplanationStabilityResponse:
    """
    Explanation Stability Evaluation:
    Evaluates whether local SHAP attributions are mathematically stable under small input perturbation (epsilon).
    """
    try:
        from ...services.studio.studio_explain_service import studio_explain_service

        return studio_explain_service.test_explanation_stability(req)
    except Exception as e:
        logger.error(f"Explanation stability check failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/explain/feasibility", response_model=FeasibleCounterfactualResponse)
def check_counterfactual_feasibility(
    experiment_id: str = Query(..., description="Experiment ID"),
    record_index: int = Query(0, description="Test record index"),
) -> FeasibleCounterfactualResponse:
    """
    Counterfactual Feasibility Validation:
    Validates whether proposed counterfactual modifications conform to practical network protocols and constraints.
    """
    try:
        from ...services.studio.studio_explain_service import studio_explain_service

        return studio_explain_service.check_counterfactual_feasibility(experiment_id, record_index)
    except Exception as e:
        logger.error(f"Counterfactual feasibility validation failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
