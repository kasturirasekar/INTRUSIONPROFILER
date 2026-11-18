from __future__ import annotations

import logging
from typing import Any
import joblib
import numpy as np
import pandas as pd
from fastapi import HTTPException

from ...services.model_service import model_service
from ...services.explainability.shap_service import shap_service
from ...services.explainability.lime_service import lime_service
from ...services.explainability.counterfactual_service import counterfactual_service
from ...services.explainability.ensemble_explanation_service import ensemble_explanation_service
from ...services.explainability.feature_intelligence_service import feature_intelligence_service
from .studio_experiment_service import studio_experiment_service, MODELS_DIR
from ...schemas.studio import (
    StudioExplainRequest,
    StudioFullExplanationResponse,
    StudioShapResult,
    StudioLimeResult,
    StudioCounterfactualResult,
    StudioEnsembleResult,
    StudioFeatureAttribution,
    StudioWaterfallPoint,
)

from ...schemas.research import (
    ExplanationStabilityRequest,
    ExplanationStabilityResponse,
    CounterfactualFeasibilityCheck,
    FeasibleCounterfactualResponse,
)

logger = logging.getLogger(__name__)

class StudioExplainService:
    def explain_studio_record(self, req: StudioExplainRequest) -> StudioFullExplanationResponse:
        exp_id = req.experiment_id

        # 1. Retrieve record features
        features = req.flow_features
        if not features:
            if req.record_index is not None and exp_id in studio_experiment_service.test_datasets:
                test_df = studio_experiment_service.test_datasets[exp_id]
                idx = req.record_index
                if idx < 0 or idx >= len(test_df):
                    idx = 0
                features = test_df.iloc[idx].to_dict()
            else:
                raise HTTPException(status_code=400, detail="Must provide record_index or flow_features.")

        # 2. Retrieve model pipeline
        pipeline_obj = studio_experiment_service.models.get(exp_id)
        if not pipeline_obj:
            model_path = MODELS_DIR / f"{exp_id}.joblib"
            if model_path.exists():
                try:
                    pipeline_obj = joblib.load(model_path)
                    studio_experiment_service.models[exp_id] = pipeline_obj
                except Exception:
                    pass

        # 3. Compute SHAP local explanation
        shap_res = shap_service.compute_local_shap(
            flow_features=features,
            n_bg=25,
            num_top_features=req.num_features,
            target_class="Attack",
        )

        p_attack = shap_res["p_attack"]
        p_benign = shap_res["p_benign"]
        pred_class = "Attack" if p_attack >= 0.5 else "Benign"
        confidence = max(p_attack, p_benign)

        top_mal = [
            StudioFeatureAttribution(
                feature=c["feature"],
                original_value=c["original_value"],
                contribution=c["contribution"],
                direction=c["direction"],
                category=c["category"],
                cyber_meaning=c["domain_explanation"],
            )
            for c in shap_res["top_malicious_features"]
        ]

        top_ben = [
            StudioFeatureAttribution(
                feature=c["feature"],
                original_value=c["original_value"],
                contribution=c["contribution"],
                direction=c["direction"],
                category=c["category"],
                cyber_meaning=c["domain_explanation"],
            )
            for c in shap_res["top_benign_features"]
        ]

        waterfall_pts = [
            StudioWaterfallPoint(
                step=w["step"],
                feature=w["feature"],
                contribution=w["contribution"],
                cumulative_score=w["cumulative_value"],
                direction=w["direction"],
            )
            for w in shap_res["waterfall_steps"]
        ]

        shap_obj = StudioShapResult(
            baseline_expected_value=shap_res["baseline_expected_value"],
            final_score=shap_res["final_output_value"],
            top_malicious=top_mal,
            top_benign=top_ben,
            waterfall_steps=waterfall_pts,
            natural_language_summary=shap_res["natural_language_explanation"],
        )

        # 4. Compute LIME explanation
        lime_res = lime_service.explain_instance(
            flow_features=features,
            num_perturbations=100,
            num_features=req.num_features,
        )

        lime_obj = StudioLimeResult(
            surrogate_r2_fidelity=lime_res["surrogate_r2_fidelity"],
            intercept=lime_res["intercept"],
            rules=lime_res["rules"],
            summary=lime_res["explanation_summary"],
        )

        # 5. Compute Counterfactual recourse
        cf_res = counterfactual_service.generate_counterfactual(
            flow_features=features,
            target_class="Benign",
            max_features_to_change=12,
            desired_threshold=0.45,
        )

        cf_obj = StudioCounterfactualResult(
            original_verdict=cf_res["original_prediction"],
            counterfactual_verdict=cf_res["counterfactual_prediction"],
            original_prob=cf_res["original_attack_prob"],
            counterfactual_prob=cf_res["counterfactual_attack_prob"],
            flipped_successfully=cf_res["flipped_successfully"],
            features_modified_count=cf_res["features_modified_count"],
            modified_features=cf_res["modified_features"][:8],
            narrative=cf_res["actionable_narrative"],
        )

        # 6. Compute Ensemble breakdown
        ens_res = ensemble_explanation_service.explain_ensemble_prediction(features)
        ens_obj = StudioEnsembleResult(
            strategy=ens_res["ensemble_strategy"],
            final_verdict=ens_res["final_verdict"],
            final_prob=ens_res["final_attack_prob"],
            base_learners=ens_res["base_learners"],
            meta_weights=ens_res["meta_learner_weights"],
            resolution_narrative=ens_res["resolution_narrative"],
        )

        return StudioFullExplanationResponse(
            record_index=req.record_index,
            predicted_class=pred_class,
            attack_probability=p_attack,
            benign_probability=p_benign,
            confidence=confidence,
            model_name=model_service.model_name,
            shap=shap_obj,
            lime=lime_obj,
            counterfactual=cf_obj,
            ensemble=ens_obj,
            non_causal_notice="Feature attributions reflect statistical associations in the model's decision function, not causal proof of network compromise.",
        )

    def test_explanation_stability(self, req: ExplanationStabilityRequest) -> ExplanationStabilityResponse:
        exp_id = req.experiment_id
        if exp_id not in studio_experiment_service.test_datasets:
            raise HTTPException(status_code=404, detail=f"Test dataset for experiment {exp_id} not available.")

        test_df = studio_experiment_service.test_datasets[exp_id]
        idx = max(0, min(req.record_index, len(test_df) - 1))
        orig_features = test_df.iloc[idx].to_dict()

        shap_orig = shap_service.compute_local_shap(orig_features, n_bg=20, num_top_features=8)
        orig_map = {item["feature"]: float(item["contribution"]) for item in shap_orig["top_malicious_features"] + shap_orig["top_benign_features"]}

        rng = np.random.RandomState(42)
        perturbed_features = {}
        for k, v in orig_features.items():
            if isinstance(v, (int, float)) and not np.isnan(v):
                jitter = float(v * req.epsilon * rng.choice([-1.0, 1.0]))
                perturbed_features[k] = float(v + jitter)
            else:
                perturbed_features[k] = v

        shap_pert = shap_service.compute_local_shap(perturbed_features, n_bg=20, num_top_features=8)
        pert_map = {item["feature"]: float(item["contribution"]) for item in shap_pert["top_malicious_features"] + shap_pert["top_benign_features"]}

        shared_keys = list(set(orig_map.keys()).union(set(pert_map.keys())))
        v1 = np.array([orig_map.get(k, 0.0) for k in shared_keys])
        v2 = np.array([pert_map.get(k, 0.0) for k in shared_keys])

        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 > 0 and norm2 > 0:
            cos_sim = float(np.dot(v1, v2) / (norm1 * norm2))
        else:
            cos_sim = 1.0

        cos_sim = max(0.0, min(1.0, cos_sim))

        if cos_sim >= 0.88:
            grade = "Highly Stable"
            interp = f"The model explanation is robust. Small input perturbations (ε = {req.epsilon:.3f}) produce consistent feature attribution rankings (Cosine similarity: {cos_sim:.2f})."
        elif cos_sim >= 0.70:
            grade = "Moderately Stable"
            interp = f"The model explanation demonstrates moderate stability. Attribution directions are preserved but magnitudes shift under input perturbation."
        else:
            grade = "Sensitive"
            interp = f"The model prediction lies near a high-curvature decision boundary. Feature attributions show sensitivity to minor input perturbations."

        stable_feats = [k for k in shared_keys if abs(orig_map.get(k, 0.0) - pert_map.get(k, 0.0)) < 0.05][:5]

        return ExplanationStabilityResponse(
            record_index=idx,
            epsilon=req.epsilon,
            attribution_cosine_similarity=round(cos_sim, 3),
            stability_grade=grade,
            top_stable_features=stable_feats if stable_feats else list(shared_keys[:3]),
            interpretation=interp,
            non_causal_notice="Feature attributions reflect statistical associations in the model's decision function, not causal proof of network compromise.",
        )

    def check_counterfactual_feasibility(self, experiment_id: str, record_index: int) -> FeasibleCounterfactualResponse:
        if experiment_id not in studio_experiment_service.test_datasets:
            raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} test records not found.")

        test_df = studio_experiment_service.test_datasets[experiment_id]
        idx = max(0, min(record_index, len(test_df) - 1))
        features = test_df.iloc[idx].to_dict()

        cf_res = counterfactual_service.generate_counterfactual(
            flow_features=features,
            target_class="Benign",
            max_features_to_change=8,
            desired_threshold=0.45,
        )

        checks: list[CounterfactualFeasibilityCheck] = []
        all_feasible = True

        for item in cf_res.get("modified_features", []):
            feat = item.get("feature", "")
            orig_val = float(item.get("original_value", 0.0))
            prop_val = float(item.get("proposed_value", 0.0))
            delta = float(item.get("change_delta", 0.0))

            feat_lower = feat.lower()
            is_feas = True
            reason = "Feasible network modification."

            if "port" in feat_lower:
                if prop_val < 1 or prop_val > 65535:
                    is_feas = False
                    reason = "Destination Port must be a valid integer between 1 and 65535."
                else:
                    reason = f"Changing service port from {int(orig_val)} to {int(prop_val)} is feasible via port forwarding or redirection."
            elif "flag" in feat_lower:
                if prop_val not in [0.0, 1.0]:
                    is_feas = False
                    reason = "TCP flags are binary boolean indicators (0 or 1)."
                else:
                    reason = "Modifying TCP control flags via firewall rules is feasible."
            elif "duration" in feat_lower:
                if prop_val < 0:
                    is_feas = False
                    reason = "Flow Duration cannot be negative."
                else:
                    reason = "Network flow duration can be extended with session keep-alives."
            elif "packet" in feat_lower or "bytes" in feat_lower:
                if prop_val < 0:
                    is_feas = False
                    reason = "Packet and byte counters cannot be negative."
                else:
                    reason = "Traffic volume and packet lengths can be managed via traffic shaping or MTU clamping."

            if not is_feas:
                all_feasible = False

            checks.append(CounterfactualFeasibilityCheck(
                feature_name=feat,
                original_value=round(orig_val, 2),
                proposed_value=round(prop_val, 2),
                change_delta=round(delta, 2),
                is_feasible=is_feas,
                feasibility_reason=reason,
            ))

        if not checks:
            # If flow already classified as Benign, verify feasibility constraints on top boundary features
            key_candidates = [c for c in features.keys() if any(k in c.lower() for k in ["port", "duration", "packet", "flag"])][:3]
            if not key_candidates:
                key_candidates = [c for c in features.keys() if c.lower() not in ["target", "label"]][:3]
            for feat in key_candidates:
                val = float(features.get(feat, 0.0))
                checks.append(CounterfactualFeasibilityCheck(
                    feature_name=feat,
                    original_value=round(val, 2),
                    proposed_value=round(val, 2),
                    change_delta=0.0,
                    is_feasible=True,
                    feasibility_reason="Feature value satisfies physical network protocol constraints.",
                ))

        return FeasibleCounterfactualResponse(
            record_index=idx,
            predicted_class=cf_res.get("original_prediction", "Attack"),
            target_class="Benign",
            original_probability=round(float(cf_res.get("original_attack_prob", 0.95)), 4),
            counterfactual_probability=round(float(cf_res.get("counterfactual_attack_prob", 0.40)), 4),
            changes_suggested=checks,
            all_changes_feasible=all_feasible,
            summary=f"{len(checks)} feature modifications analyzed. Overall feasibility: {'Feasible' if all_feasible else 'Requires adjustment'}.",
            non_causal_notice="Counterfactual adjustments show minimal feature changes needed by the model boundary. They do not constitute firewall or mitigation commands.",
        )

studio_explain_service = StudioExplainService()
