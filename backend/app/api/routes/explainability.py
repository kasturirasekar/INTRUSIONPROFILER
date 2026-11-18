from __future__ import annotations

import datetime
import logging
from typing import Any
import pandas as pd
from fastapi import APIRouter, HTTPException

from ...core.config import PROCESSED_DATA_DIR
from ...services.model_service import model_service
from ...services.explainability.feature_intelligence_service import feature_intelligence_service
from ...services.explainability.shap_service import shap_service
from ...services.explainability.lime_service import lime_service
from ...services.explainability.counterfactual_service import counterfactual_service
from ...services.explainability.ensemble_explanation_service import ensemble_explanation_service
from ...services.explainability.permutation_service import permutation_service
from ...services.explainability.attack_profile_service import attack_profile_service
from ...schemas.explainability import (
    FlowExplainRequest,
    PredictionExplanationResponse,
    PredictionSummary,
    ShapLocalRequest,
    ShapGlobalRequest,
    ShapGlobalResponse,
    LimeExplainRequest,
    LimeExplanationResponse,
    CounterfactualRequest,
    CounterfactualResponse,
    EnsembleExplainRequest,
    EnsembleExplainResponse,
    ModelInterpretabilityResponse,
    AttackProfile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/explainability", tags=["Explainable AI"])

@router.get("/methods")
def get_supported_methods() -> dict[str, Any]:
    return {
        "supported_methods": [
            {
                "id": "shap",
                "name": "SHAP (SHapley Additive exPlanations)",
                "scope": "Local & Global",
                "theory": "Game-theoretic cooperative attribution based on Shapley values. Satisfies efficiency, symmetry, dummy, and additivity axioms.",
                "best_for": "Feature contribution waterfalls, beeswarm summary plots, and exact marginal attribution.",
                "complexity": "O(M * N_bg)",
            },
            {
                "id": "lime",
                "name": "LIME (Local Interpretable Model-agnostic Explanations)",
                "scope": "Local instance",
                "theory": "Approximates complex black-box model locally with an interpretable sparse linear surrogate fitted on perturbed samples.",
                "best_for": "Rule-based decision thresholds (e.g. Duration > X supports Malicious).",
                "complexity": "O(K_perturb * M)",
            },
            {
                "id": "counterfactual",
                "name": "Constrained Counterfactual Explanations",
                "scope": "Prescriptive What-If",
                "theory": "Identifies the minimal feasible feature adjustments required to cross the model decision boundary to the benign class.",
                "best_for": "Root-cause triage and security boundary sensitivity analysis.",
                "complexity": "O(M_candidates)",
            },
            {
                "id": "ensemble_dissection",
                "name": "Multi-Model Ensemble Dissection",
                "scope": "Architectural",
                "theory": "Inspects individual base learner (LR, DT, RF) outputs, meta-learner coefficients, and voting consensus resolution.",
                "best_for": "Understanding why an ensemble overrules an individual wavering base classifier.",
                "complexity": "O(N_estimators)",
            },
        ],
        "active_model": model_service.model_name,
        "features_count": len(model_service.feature_names),
    }

@router.get("/sample-flows")
def get_sample_flows() -> list[dict[str, Any]]:
    from ...core.config import SAMPLES_DATA_DIR
    test_path = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
    if not test_path.exists():
        test_path = PROCESSED_DATA_DIR / "binary_test.csv.gz"
    if not test_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = pd.read_csv(test_path, nrows=50)
    target_col = "target" if "target" in df.columns else "Label"

    samples = [
        {"id": "FLOW-BENIGN-001", "name": "Standard HTTPS Web Session (Benign)", "type": "Benign", "row_idx": 0},
        {"id": "FLOW-ATTACK-002", "name": "Volumetric Denial-of-Service Flood (Attack)", "type": "Attack", "row_idx": 1},
        {"id": "FLOW-BENIGN-003", "name": "Interactive SSH Admin Session (Benign)", "type": "Benign", "row_idx": 2},
        {"id": "FLOW-ATTACK-004", "name": "Fast SYN Port Reconnaissance (Attack)", "type": "Attack", "row_idx": 7 if len(df) > 7 else 1},
        {"id": "FLOW-BENIGN-005", "name": "DNS Query Resolution (Benign)", "type": "Benign", "row_idx": 4},
    ]

    results = []
    for s in samples:
        idx = s["row_idx"]
        row = df.iloc[idx].to_dict()
        true_label = row.pop(target_col, "Unknown")
        results.append({
            "id": s["id"],
            "name": s["name"],
            "ground_truth": true_label,
            "destination_port": row.get("Destination Port", 80),
            "flow_duration": row.get("Flow Duration", 1000),
            "total_fwd_packets": row.get("Total Fwd Packets", 10),
            "features": row,
        })
    return results

@router.post("/prediction", response_model=PredictionExplanationResponse)
def explain_prediction(req: FlowExplainRequest) -> PredictionExplanationResponse:
    features = req.flow_features
    if not features:
        # Load from test set if flow_index provided
        if req.flow_index is not None:
            from ...core.config import SAMPLES_DATA_DIR
            test_path = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
            if not test_path.exists():
                test_path = PROCESSED_DATA_DIR / "binary_test.csv.gz"
            df = pd.read_csv(test_path, skiprows=range(1, req.flow_index + 1), nrows=1)
            target_col = "target" if "target" in df.columns else "Label"
            row = df.iloc[0].to_dict()
            row.pop(target_col, None)
            features = row
        else:
            raise HTTPException(status_code=400, detail="Must provide flow_features or flow_index")

    # Run SHAP local explanation
    shap_res = shap_service.compute_local_shap(
        flow_features=features,
        n_bg=30,
        num_top_features=req.num_features,
        target_class="Attack",
    )

    p_attack = shap_res["p_attack"]
    p_benign = shap_res["p_benign"]
    predicted_class = "Attack" if p_attack >= 0.5 else "Benign"
    confidence = max(p_attack, p_benign)

    severity = (
        "Critical" if p_attack >= 0.90 else (
            "High" if p_attack >= 0.75 else (
                "Medium" if p_attack >= 0.55 else (
                    "Low" if p_attack >= 0.35 else "Normal"
                )
            )
        )
    )

    flow_id = req.flow_id or f"FLOW-{datetime.datetime.now().strftime('%H%M%S')}"

    summary = PredictionSummary(
        flow_id=flow_id,
        predicted_class=predicted_class,
        probability_attack=round(p_attack, 4),
        probability_benign=round(p_benign, 4),
        confidence=round(confidence, 4),
        severity=severity,
        model_name=model_service.model_name,
        model_type=type(model_service.model).__name__,
        features_analyzed=len(model_service.feature_names),
        timestamp=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
    )

    return PredictionExplanationResponse(
        summary=summary,
        natural_language_explanation=shap_res["natural_language_explanation"],
        baseline_expected_value=shap_res["baseline_expected_value"],
        final_output_value=shap_res["final_output_value"],
        top_malicious_features=shap_res["top_malicious_features"],
        top_benign_features=shap_res["top_benign_features"],
        all_contributions=shap_res["all_contributions"][:req.num_features * 2],
        waterfall_steps=shap_res["waterfall_steps"],
        scientific_disclaimer=shap_res["scientific_disclaimer"],
    )

@router.post("/shap/local")
def get_shap_local(req: ShapLocalRequest) -> dict[str, Any]:
    return shap_service.compute_local_shap(
        flow_features=req.flow_features,
        n_bg=req.background_samples,
        num_top_features=req.num_features,
        target_class=req.target_class,
    )

@router.post("/shap/global", response_model=ShapGlobalResponse)
def get_shap_global(req: ShapGlobalRequest) -> ShapGlobalResponse:
    res = shap_service.compute_global_shap(
        sample_size=req.sample_size,
        num_features=req.num_features,
        target_class=req.target_class,
    )
    if "error" in res:
        raise HTTPException(status_code=500, detail=res["error"])
    return ShapGlobalResponse(**res)

@router.post("/lime", response_model=LimeExplanationResponse)
def get_lime_explanation(req: LimeExplainRequest) -> LimeExplanationResponse:
    res = lime_service.explain_instance(
        flow_features=req.flow_features,
        num_perturbations=req.num_perturbations,
        num_features=req.num_features,
        kernel_width=req.kernel_width,
    )
    return LimeExplanationResponse(**res)

@router.post("/counterfactual", response_model=CounterfactualResponse)
def get_counterfactual(req: CounterfactualRequest) -> CounterfactualResponse:
    res = counterfactual_service.generate_counterfactual(
        flow_features=req.flow_features,
        target_class=req.target_class,
        max_features_to_change=req.max_features_to_change,
        desired_threshold=req.desired_probability_threshold,
    )
    return CounterfactualResponse(**res)

@router.post("/ensemble", response_model=EnsembleExplainResponse)
def get_ensemble_explanation(req: EnsembleExplainRequest) -> EnsembleExplainResponse:
    res = ensemble_explanation_service.explain_ensemble_prediction(req.flow_features)
    return EnsembleExplainResponse(**res)

@router.get("/features")
def get_all_features_intelligence() -> list[dict[str, Any]]:
    return feature_intelligence_service.get_all_features()

@router.get("/features/{feature_name}")
def get_feature_intelligence(feature_name: str) -> dict[str, Any]:
    return feature_intelligence_service.get_feature_info(feature_name)

@router.get("/interpretability", response_model=ModelInterpretabilityResponse)
def get_model_interpretability() -> ModelInterpretabilityResponse:
    res = permutation_service.get_interpretability_data()
    return ModelInterpretabilityResponse(**res)

@router.get("/attack-profiles", response_model=list[AttackProfile])
def get_attack_profiles() -> list[AttackProfile]:
    return [AttackProfile(**p) for p in attack_profile_service.get_attack_profiles()]
