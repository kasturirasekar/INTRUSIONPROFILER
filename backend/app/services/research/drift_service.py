from __future__ import annotations

import datetime
import logging
import uuid
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp, wasserstein_distance

from ...schemas.research import (
    DriftAnalysisRequest,
    DriftAnalysisResponse,
    FeatureDriftDetail,
)
from ..studio.dataset_manager import dataset_manager

logger = logging.getLogger(__name__)

class DriftService:
    """
    Traffic Drift Monitoring Engine.
    Detects covariate shifts between reference and incoming traffic using
    Kolmogorov-Smirnov (KS) tests, Population Stability Index (PSI), and Wasserstein Distance.
    """

    def analyze_drift(self, req: DriftAnalysisRequest) -> DriftAnalysisResponse:
        df_ref = dataset_manager.get_dataset_df(req.reference_dataset_id)
        df_inc = dataset_manager.get_dataset_df(req.incoming_dataset_id)

        if len(df_ref) == 0:
            raise ValueError(f"Reference dataset {req.reference_dataset_id} contains zero records.")
        if len(df_inc) == 0:
            raise ValueError(f"Incoming dataset {req.incoming_dataset_id} contains zero records.")

        # Identify shared numeric features
        ref_numeric = [c for c in df_ref.columns if pd.api.types.is_numeric_dtype(df_ref[c]) and c.lower() not in ["target", "label", "binarylabel"]]
        inc_numeric = [c for c in df_inc.columns if pd.api.types.is_numeric_dtype(df_inc[c]) and c.lower() not in ["target", "label", "binarylabel"]]

        shared_features = [c for c in ref_numeric if c in inc_numeric]

        if req.feature_columns:
            shared_features = [c for c in req.feature_columns if c in shared_features]

        if not shared_features:
            raise ValueError("No common numeric features found between reference and incoming datasets.")

        # Limit to top 25 features for responsive analysis
        features_to_check = shared_features[:25]

        feature_details: list[FeatureDriftDetail] = []
        drifted_count = 0

        for feat in features_to_check:
            s_ref = df_ref[feat].dropna().values
            s_inc = df_inc[feat].dropna().values

            if len(s_ref) < 5 or len(s_inc) < 5:
                continue

            ref_mean = float(np.mean(s_ref))
            ref_std = float(np.std(s_ref))
            inc_mean = float(np.mean(s_inc))
            inc_std = float(np.std(s_inc))

            # 1. Kolmogorov-Smirnov 2-sample test
            try:
                ks_res = ks_2samp(s_ref, s_inc)
                ks_stat = float(ks_res.statistic)
                p_val = float(ks_res.pvalue)
            except Exception:
                ks_stat, p_val = 0.0, 1.0

            # 2. Wasserstein Distance
            try:
                w_dist = float(wasserstein_distance(s_ref, s_inc))
            except Exception:
                w_dist = 0.0

            # 3. Population Stability Index (PSI)
            psi = self._calculate_psi(s_ref, s_inc, num_bins=10)

            # Classify Drift Status
            # Significant drift: p < alpha and (PSI > 0.25 or KS > 0.25)
            # Moderate drift: p < alpha and (0.1 <= PSI <= 0.25 or 0.15 <= KS <= 0.25)
            if p_val < req.alpha_significance and (psi > 0.25 or ks_stat > 0.25):
                status = "Significant Drift"
                is_drifted = True
                drifted_count += 1
            elif p_val < req.alpha_significance and (psi >= 0.10 or ks_stat >= 0.15):
                status = "Moderate Drift"
                is_drifted = True
                drifted_count += 1
            else:
                status = "Stable"
                is_drifted = False

            feature_details.append(FeatureDriftDetail(
                feature_name=feat,
                reference_mean=round(ref_mean, 2),
                reference_std=round(ref_std, 2),
                incoming_mean=round(inc_mean, 2),
                incoming_std=round(inc_std, 2),
                ks_statistic=round(ks_stat, 4),
                p_value=round(p_val, 6),
                psi_score=round(psi, 4),
                wasserstein_distance=round(w_dist, 2),
                drift_status=status,
                is_drifted=is_drifted,
            ))

        # Overall severity
        total_feats = len(feature_details)
        drift_pct = (drifted_count / max(1, total_feats)) * 100.0

        if drift_pct >= 50.0:
            severity = "Critical"
            impact = "Substantial distribution divergence observed across majority of network features. Model classification confidence may be degraded on incoming traffic."
        elif drift_pct >= 25.0:
            severity = "High"
            impact = "Noticeable distribution shift in key network traffic features. Model predictions should be monitored for increased false alarms."
        elif drift_pct > 0.0:
            severity = "Moderate"
            impact = "Minor feature drift observed in isolated variables. Core model decision boundaries remain generally stable."
        else:
            severity = "Low"
            impact = "Incoming traffic conforms closely to the reference distribution. Model inferences are operating within expected baseline distributions."

        return DriftAnalysisResponse(
            analysis_id=f"drift_{uuid.uuid4().hex[:10]}",
            reference_dataset_id=req.reference_dataset_id,
            incoming_dataset_id=req.incoming_dataset_id,
            reference_sample_count=len(df_ref),
            incoming_sample_count=len(df_inc),
            total_features_analyzed=total_feats,
            drifted_features_count=drifted_count,
            overall_drift_percentage=round(drift_pct, 1),
            overall_drift_severity=severity,
            feature_details=feature_details,
            model_reliability_impact=impact,
            disclaimer="Traffic drift reflects changes in operational network activity (e.g. software updates, protocol shifts), not necessarily cyber intrusions.",
            created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        )

    def _calculate_psi(self, ref: np.ndarray, inc: np.ndarray, num_bins: int = 10) -> float:
        """
        Calculates the Population Stability Index (PSI) using quantile binning.
        """
        try:
            # Generate quantile breaks from reference data
            quantiles = np.linspace(0, 100, num_bins + 1)
            bins = np.percentile(ref, quantiles)
            bins[0] = -np.inf
            bins[-1] = np.inf

            # Deduplicate bins if many identical values exist
            bins = np.unique(bins)
            if len(bins) < 3:
                return 0.0

            # Compute histograms
            ref_counts, _ = np.histogram(ref, bins=bins)
            inc_counts, _ = np.histogram(inc, bins=bins)

            # Convert to proportions with small epsilon to avoid log(0)
            eps = 1e-4
            ref_pct = (ref_counts / len(ref)) + eps
            inc_pct = (inc_counts / len(inc)) + eps

            # Normalize
            ref_pct /= np.sum(ref_pct)
            inc_pct /= np.sum(inc_pct)

            # PSI formula
            psi_val = np.sum((inc_pct - ref_pct) * np.log(inc_pct / ref_pct))
            return float(np.nan_to_num(psi_val, nan=0.0, posinf=1.0, neginf=0.0))
        except Exception:
            return 0.0

drift_service = DriftService()
