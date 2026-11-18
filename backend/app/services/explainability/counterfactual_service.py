from __future__ import annotations

import logging
from typing import Any
import numpy as np
import pandas as pd

from ...core.config import PROCESSED_DATA_DIR
from ...services.model_service import model_service
from .feature_intelligence_service import feature_intelligence_service

logger = logging.getLogger(__name__)

class CounterfactualService:
    def __init__(self) -> None:
        self._benign_medians: pd.Series | None = None
        self._benign_stds: pd.Series | None = None
        self._initialized: bool = False

    def _ensure_baselines(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        self._load_baselines()

    def _load_baselines(self) -> None:
        from ...core.config import SAMPLES_DATA_DIR
        sample_path = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
        if not sample_path.exists():
            sample_path = PROCESSED_DATA_DIR / "binary_train.csv.gz"

        try:
            df = pd.read_csv(sample_path, nrows=1000)
            target_col = "target" if "target" in df.columns else ("Label" if "Label" in df.columns else None)
            if target_col:
                benign_df = df[df[target_col] == "Benign"].drop(columns=[target_col])
            else:
                benign_df = df
            self._benign_medians = benign_df.median()
            self._benign_stds = benign_df.std().replace(0, 1.0)
        except Exception as e:
            logger.warning("Could not pre-calculate benign baselines for counterfactuals: %s", e)

    def generate_counterfactual(
        self,
        flow_features: dict[str, Any],
        target_class: str = "Benign",
        max_features_to_change: int = 15,
        desired_threshold: float = 0.45,
    ) -> dict[str, Any]:
        self._ensure_baselines()
        feature_names = model_service.feature_names or list(flow_features.keys())
        query_vals = [float(flow_features.get(f, 0.0)) for f in feature_names]
        query_df = pd.DataFrame([query_vals], columns=feature_names)

        m = model_service.model
        attack_idx = 0
        if hasattr(m, "classes_") and "Attack" in m.classes_:
            attack_idx = list(m.classes_).index("Attack")

        orig_probs = m.predict_proba(query_df)[0]
        orig_p_attack = float(orig_probs[attack_idx])
        orig_pred = "Attack" if orig_p_attack >= 0.5 else "Benign"

        # If already benign and target is benign, return baseline
        if orig_pred == target_class:
            return {
                "original_prediction": orig_pred,
                "original_attack_prob": round(orig_p_attack, 4),
                "counterfactual_prediction": orig_pred,
                "counterfactual_attack_prob": round(orig_p_attack, 4),
                "flipped_successfully": True,
                "features_modified_count": 0,
                "normalized_l1_distance": 0.0,
                "modified_features": [],
                "full_counterfactual_vector": {f: float(flow_features.get(f, 0.0)) for f in feature_names},
                "actionable_narrative": f"The query flow is already classified as {target_class} ({orig_p_attack*100:.1f}% attack probability). No counterfactual feature modification required.",
                "ethical_disclaimer": "Counterfactual explanations identify the algorithmic decision boundaries of the model for research and validation purposes only.",
            }

        if self._benign_medians is None or self._benign_stds is None:
            self._load_baselines()

        medians = self._benign_medians
        stds = self._benign_stds

        # Prioritize features by deviation from benign median
        deviations = {}
        for f in feature_names:
            cur = float(flow_features.get(f, 0.0))
            med = float(medians.get(f, cur)) if medians is not None else cur
            sd = float(stds.get(f, 1.0)) if stds is not None else 1.0
            deviations[f] = abs(cur - med) / (sd + 1e-6)

        sorted_candidates = sorted(deviations.items(), key=lambda kv: kv[1], reverse=True)

        cf_df = query_df.copy()
        modified_list = []
        flipped = False
        curr_p_attack = orig_p_attack

        for feat_name, dev_score in sorted_candidates[:max_features_to_change]:
            orig_val = float(cf_df.iloc[0][feat_name])
            target_val = float(medians.get(feat_name, orig_val)) if medians is not None else orig_val

            # Enforce networking constraints
            if "Port" in feat_name:
                target_val = float(int(np.clip(target_val, 1, 65535)))
            elif "Flag" in feat_name:
                target_val = float(int(np.clip(target_val, 0, 1)))
            elif "Packets" in feat_name:
                target_val = float(max(1, int(target_val)))
            else:
                target_val = float(max(0.0, target_val))

            if abs(orig_val - target_val) < 1e-6:
                continue

            cf_df.iloc[0, cf_df.columns.get_loc(feat_name)] = target_val
            new_probs = m.predict_proba(cf_df)[0]
            curr_p_attack = float(new_probs[attack_idx])

            info = feature_intelligence_service.get_feature_info(feat_name)
            delta = target_val - orig_val
            pct = (delta / (abs(orig_val) + 1e-6)) * 100

            modified_list.append({
                "feature": feat_name,
                "original_value": round(orig_val, 4),
                "counterfactual_value": round(target_val, 4),
                "delta": round(delta, 4),
                "percent_change": round(pct, 1),
                "unit": info.get("unit", "Value"),
                "is_valid_constraint": True,
                "cyber_meaning": f"Normalizing {feat_name} towards the baseline benign median ({target_val:.1f}).",
            })

            if curr_p_attack <= desired_threshold:
                flipped = True
                break

        # Normalized L1 distance
        dist_sum = 0.0
        for item in modified_list:
            feat = item["feature"]
            sd = float(stds.get(feat, 1.0)) if stds is not None else 1.0
            dist_sum += abs(item["delta"]) / sd
        norm_l1 = dist_sum / len(feature_names)

        final_pred = "Attack" if curr_p_attack >= 0.5 else "Benign"
        top_mod = modified_list[0]["feature"] if modified_list else "Flow Parameters"

        if flipped:
            narrative = (
                f"Successfully synthesized a feasible counterfactual by adjusting {len(modified_list)} feature(s). "
                f"Attack probability plummeted from {orig_p_attack*100:.1f}% to {curr_p_attack*100:.1f}%. "
                f"The most impactful modification was adjusting '{top_mod}' from {modified_list[0]['original_value']} to {modified_list[0]['counterfactual_value']}."
            )
        else:
            narrative = (
                f"Partial counterfactual generated: after modifying {len(modified_list)} feature(s), "
                f"attack probability was reduced to {curr_p_attack*100:.1f}%, but remained above the {desired_threshold*100:.0f}% threshold. "
                f"Deep multi-vector anomalies in remaining flow characteristics sustained the intrusion classification."
            )

        full_cf_dict = {f: float(cf_df.iloc[0][f]) for f in feature_names}

        return {
            "original_prediction": orig_pred,
            "original_attack_prob": round(orig_p_attack, 4),
            "counterfactual_prediction": final_pred,
            "counterfactual_attack_prob": round(curr_p_attack, 4),
            "flipped_successfully": flipped,
            "features_modified_count": len(modified_list),
            "normalized_l1_distance": round(norm_l1, 5),
            "modified_features": modified_list,
            "full_counterfactual_vector": full_cf_dict,
            "actionable_narrative": narrative,
            "ethical_disclaimer": "Counterfactual explanations represent theoretical algorithmic decision boundaries. They must not be utilized for adversarial evasion or bypassing perimeter security controls.",
        }

counterfactual_service = CounterfactualService()
