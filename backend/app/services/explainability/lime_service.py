from __future__ import annotations

import logging
from typing import Any
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

from ...core.config import PROCESSED_DATA_DIR
from ...services.model_service import model_service
from .feature_intelligence_service import feature_intelligence_service

logger = logging.getLogger(__name__)

class LimeService:
    def __init__(self) -> None:
        self._stds: np.ndarray | None = None
        self._means: np.ndarray | None = None
        self._feature_names: list[str] | None = None
        self._initialized: bool = False

    def _ensure_distributions(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        self._init_distributions()

    def _init_distributions(self) -> None:
        from ...core.config import SAMPLES_DATA_DIR
        sample_path = SAMPLES_DATA_DIR / "sample_cic_binary.csv"
        if not sample_path.exists():
            sample_path = PROCESSED_DATA_DIR / "binary_train.csv.gz"

        try:
            df = pd.read_csv(sample_path, nrows=500)
            target_col = "target" if "target" in df.columns else ("Label" if "Label" in df.columns else None)
            if target_col:
                df = df.drop(columns=[target_col])
            self._feature_names = list(df.columns)
            self._stds = df.std().replace(0, 1.0).values
            self._means = df.mean().values
        except Exception as e:
            logger.warning("Could not pre-calculate LIME reference standard deviations: %s", e)

    def explain_instance(
        self,
        flow_features: dict[str, Any],
        num_perturbations: int = 150,
        num_features: int = 10,
        kernel_width: float | None = None,
    ) -> dict[str, Any]:
        self._ensure_distributions()
        feature_names = model_service.feature_names or self._feature_names or list(flow_features.keys())
        x_vals = np.array([float(flow_features.get(f, 0.0)) for f in feature_names])

        if self._stds is None or len(self._stds) != len(x_vals):
            self._stds = np.maximum(np.abs(x_vals) * 0.25, 1.0)
            self._means = x_vals

        # Perturbation sampling
        stds = self._stds
        noise = np.random.normal(0, 0.35, size=(num_perturbations, len(x_vals)))
        Z = x_vals + noise * stds
        # Network constraints: non-negative
        Z = np.maximum(Z, 0)
        # First row is the original point
        Z[0] = x_vals

        # Distance & exponential kernel weights
        norm_diff = (Z - x_vals) / (stds + 1e-6)
        dists = np.sqrt(np.sum(norm_diff**2, axis=1))

        if kernel_width is None:
            kernel_width = np.sqrt(len(x_vals)) * 0.75
        weights = np.exp(-(dists**2) / (kernel_width**2 + 1e-6))

        # Query complex model
        df_Z = pd.DataFrame(Z, columns=feature_names)
        m = model_service.model
        attack_idx = 0
        if hasattr(m, "classes_") and "Attack" in m.classes_:
            attack_idx = list(m.classes_).index("Attack")

        preds = m.predict_proba(df_Z)[:, attack_idx]

        # Fit weighted Ridge surrogate
        Z_std = (Z - self._means) / (stds + 1e-6)
        ridge = Ridge(alpha=1.0)
        ridge.fit(Z_std, preds, sample_weight=weights)
        r2 = float(ridge.score(Z_std, preds, sample_weight=weights))
        r2 = max(0.0, min(1.0, r2))

        coefs = ridge.coef_
        sorted_indices = np.argsort(np.abs(coefs))[::-1][:num_features]

        rules = []
        for idx in sorted_indices:
            feat = feature_names[idx]
            val = float(x_vals[idx])
            mean_val = float(self._means[idx]) if self._means is not None else val
            w = float(coefs[idx])
            direction = "supports_malicious" if w > 0 else "supports_benign"

            if val > mean_val:
                rule_str = f"{feat} > {mean_val:.2f} (current: {val:.2f})"
            else:
                rule_str = f"{feat} <= {mean_val:.2f} (current: {val:.2f})"

            rules.append({
                "rule": rule_str,
                "feature": feat,
                "weight": round(w, 5),
                "direction": direction,
            })

        top_rule = rules[0]["rule"] if rules else "General traffic parameters"
        summary = (
            f"LIME surrogate model (fidelity R² = {r2*100:.1f}%) locally approximated the ensemble decision space "
            f"using {num_perturbations} perturbed flows. The strongest local condition driving the prediction is "
            f"'{top_rule}' with local regression weight {rules[0]['weight'] if rules else 0}."
        )

        return {
            "surrogate_r2_fidelity": round(r2, 4),
            "intercept": round(float(ridge.intercept_), 4),
            "prediction_local": round(float(preds[0]), 4),
            "rules": rules,
            "explanation_summary": summary,
            "scientific_note": "LIME fits an interpretable linear surrogate within the local Euclidean neighborhood of the query point. Unlike SHAP, LIME does not guarantee global efficiency or additivity.",
        }

lime_service = LimeService()
