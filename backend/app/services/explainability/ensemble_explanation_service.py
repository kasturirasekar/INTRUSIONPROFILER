from __future__ import annotations

import logging
from typing import Any
import numpy as np
import pandas as pd

from ...services.model_service import model_service

logger = logging.getLogger(__name__)

class EnsembleExplanationService:
    def explain_ensemble_prediction(self, flow_features: dict[str, Any]) -> dict[str, Any]:
        m = model_service.model
        feature_names = model_service.feature_names or list(flow_features.keys())
        query_vals = [float(flow_features.get(f, 0.0)) for f in feature_names]
        query_df = pd.DataFrame([query_vals], columns=feature_names)

        attack_idx = 0
        if hasattr(m, "classes_") and "Attack" in m.classes_:
            attack_idx = list(m.classes_).index("Attack")

        final_probs = m.predict_proba(query_df)[0]
        final_attack_prob = float(final_probs[attack_idx])
        final_verdict = "Attack" if final_attack_prob >= 0.5 else "Benign"

        base_decisions = []
        meta_weights_dict: dict[str, float] = {}
        meta_learner_name = "LogisticRegression Meta-Classifier"
        strategy = "Stacking Classifier (Multi-Model Learning)"

        if hasattr(m, "named_steps") and "model" in m.named_steps and "preprocess" in m.named_steps:
            pre = m.named_steps["preprocess"]
            clf = m.named_steps["model"]
            X_trans = pre.transform(query_df)

            if hasattr(clf, "estimators_") and hasattr(clf, "estimators"):
                # Stacking or Voting Classifier
                est_pairs = list(zip(clf.estimators, clf.estimators_))
                has_meta = hasattr(clf, "final_estimator_")

                # Extract meta-classifier weights if Stacking
                if has_meta:
                    meta = clf.final_estimator_
                    meta_learner_name = type(meta).__name__
                    if hasattr(meta, "coef_"):
                        coefs = meta.coef_[0]
                        for i, (spec, _) in enumerate(est_pairs):
                            est_id = spec[0]
                            meta_weights_dict[est_id] = round(float(coefs[i]), 4)
                else:
                    strategy = "Voting Classifier"
                    weights = getattr(clf, "weights", None) or [1.0] * len(est_pairs)
                    for i, (spec, _) in enumerate(est_pairs):
                        meta_weights_dict[spec[0]] = round(float(weights[i]), 4)

                for (name, orig_est), fitted_est in est_pairs:
                    pred_val = fitted_est.predict(X_trans)[0]
                    # Map to class
                    if hasattr(fitted_est, "classes_") and "Attack" in fitted_est.classes_:
                        sub_attack_idx = list(fitted_est.classes_).index("Attack")
                        sub_prob_attack = float(fitted_est.predict_proba(X_trans)[0, sub_attack_idx])
                    elif hasattr(fitted_est, "predict_proba"):
                        sub_prob_attack = float(fitted_est.predict_proba(X_trans)[0, 0])
                    else:
                        sub_prob_attack = 1.0 if pred_val == 0 or str(pred_val).lower() == "attack" else 0.0

                    pred_class = "Attack" if sub_prob_attack >= 0.5 else "Benign"
                    alg_name = type(fitted_est).__name__

                    role_desc = "Linear hyperplane boundary" if "Logistic" in alg_name else (
                        "Orthogonal decision split" if "DecisionTree" in alg_name else "Bagged feature subspace ensemble"
                    )

                    weight_val = meta_weights_dict.get(name, 1.0)
                    base_decisions.append({
                        "name": name.upper(),
                        "algorithm": alg_name,
                        "predicted_class": pred_class,
                        "probability_attack": round(sub_prob_attack, 4),
                        "meta_weight": weight_val,
                        "agreement_with_ensemble": pred_class == final_verdict,
                        "role_description": role_desc,
                    })

        if not base_decisions:
            # Fallback for standalone ensemble like RandomForest
            base_decisions = [
                {
                    "name": "ENSEMBLE_CORE",
                    "algorithm": type(m).__name__,
                    "predicted_class": final_verdict,
                    "probability_attack": round(final_attack_prob, 4),
                    "meta_weight": 1.0,
                    "agreement_with_ensemble": True,
                    "role_description": "Aggregated forest vote",
                }
            ]

        # Synthesize disagreement narrative
        agreements = sum(1 for b in base_decisions if b["agreement_with_ensemble"])
        total_base = len(base_decisions)

        if agreements == total_base:
            resolution = (
                f"Full Unanimous Consensus: All {total_base} base classifiers ({', '.join(b['name'] for b in base_decisions)}) "
                f"unanimously classified this flow as {final_verdict}. The {meta_learner_name} confirmed this consensus "
                f"with {final_attack_prob*100:.1f}% confidence."
            )
            disagreement = "Zero disagreement between base models. The flow falls cleanly within common decision boundaries."
        else:
            dissenters = [b for b in base_decisions if not b["agreement_with_ensemble"]]
            dissent_names = ", ".join(d["name"] for d in dissenters)
            top_supporter = max((b for b in base_decisions if b["agreement_with_ensemble"]), key=lambda x: abs(x["meta_weight"]), default=None)
            supporter_name = top_supporter["name"] if top_supporter else "Primary Learner"

            resolution = (
                f"Meta-Learner Resolution: Model(s) {dissent_names} diverged, predicting '{dissenters[0]['predicted_class']}'. "
                f"However, {supporter_name} carries a dominant meta-weight ({top_supporter['meta_weight'] if top_supporter else 0}) "
                f"in the {meta_learner_name}, overriding the divergence and cementing the final '{final_verdict}' verdict."
            )
            disagreement = (
                f"Heterogeneous divergence observed: Linear models or single trees can waver on correlated boundary traffic, "
                f"whereas the ensemble meta-learner resolves conflicting signals by weighting high-dimensional random subspace estimators."
            )

        return {
            "ensemble_strategy": strategy,
            "final_verdict": final_verdict,
            "final_attack_prob": round(final_attack_prob, 4),
            "base_learners": base_decisions,
            "meta_learner_name": meta_learner_name,
            "meta_learner_weights": meta_weights_dict,
            "resolution_narrative": resolution,
            "disagreement_analysis": disagreement,
        }

ensemble_explanation_service = EnsembleExplanationService()
