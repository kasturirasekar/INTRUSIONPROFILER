from __future__ import annotations

import datetime
from typing import Any
import pandas as pd

from .model_service import model_service
from .traffic_service import traffic_service
from .analytics_service import analytics_service
from ..schemas.dashboard import (
    AttackCategoryItem,
    DashboardSummaryResponse,
    FeatureImportanceItem,
    SeverityCount,
    TrafficVolumePoint,
)
from ..schemas.prediction import FlowPredictionItem

SEVERITY_COLORS = {
    "Critical": "#FF4D6D",
    "High": "#FF9F43",
    "Medium": "#F6C85F",
    "Low": "#38C995",
    "Normal": "#20D6C2",
}

class DashboardService:
    def get_summary(self) -> DashboardSummaryResponse:
        traffic_service.ensure_initialized()
        flows = traffic_service.cached_flows
        total = len(flows)
        df = pd.DataFrame(flows) if total > 0 else pd.DataFrame()

        attack_count = int((df["prediction"] == "Attack").sum()) if not df.empty else 0
        benign_count = int((df["prediction"] == "Benign").sum()) if not df.empty else 0
        detection_rate = round(attack_count / total * 100, 2) if total > 0 else 0.0

        # Severity distribution - always provide all 5 severities
        severity_counts = []
        counts = df["severity"].value_counts() if not df.empty else pd.Series(dtype=int)
        for sev in ["Critical", "High", "Medium", "Low", "Normal"]:
            c = int(counts.get(sev, 0))
            pct = round(c / total * 100, 1) if total > 0 else 0.0
            severity_counts.append(
                SeverityCount(
                    severity=sev,
                    count=c,
                    percentage=pct,
                    color=SEVERITY_COLORS[sev],
                )
            )

        critical_count = int((df["severity"] == "Critical").sum()) if not df.empty else 0
        high_count = int((df["severity"] == "High").sum()) if not df.empty else 0
        medium_count = int((df["severity"] == "Medium").sum()) if not df.empty else 0
        low_count = int((df["severity"] == "Low").sum()) if not df.empty else 0
        avg_conf = round(float(df["attack_probability"].mean() * 100), 2) if not df.empty else 0.0

        # Traffic timeline points (12 timeline buckets representing time windows)
        timeline_points = []
        if not df.empty:
            bucket_size = max(1, total // 12)
            for b in range(12):
                chunk = df.iloc[b * bucket_size : (b + 1) * bucket_size]
                if chunk.empty:
                    continue
                atk = int((chunk["prediction"] == "Attack").sum())
                bng = int((chunk["prediction"] == "Benign").sum())
                timeline_points.append(
                    TrafficVolumePoint(
                        time_label=f"T-{12 - b}m",
                        total_flows=len(chunk),
                        attack_flows=atk,
                        benign_flows=bng,
                    )
                )

        # Real attack categories
        categories = analytics_service.get_attack_category_distribution()
        attack_items = [AttackCategoryItem(**cat) for cat in categories]

        # Top 10 feature importances
        top_feats = []
        for item in model_service.feature_importances[:10]:
            top_feats.append(
                FeatureImportanceItem(
                    feature=item["feature"],
                    importance=item["importance"],
                    rank=item["rank"],
                )
            )

        # Recent alerts (top critical/high attacks)
        recent_alerts = []
        if not df.empty:
            attacks_df = df[df["is_attack"]].sort_values("attack_probability", ascending=False).head(10)
            for _, r in attacks_df.iterrows():
                recent_alerts.append(
                    FlowPredictionItem(
                        flow_id=int(r["id"]),
                        prediction=str(r["prediction"]),
                        is_attack=bool(r["is_attack"]),
                        attack_probability=float(r["attack_probability"]),
                        confidence=float(r["attack_probability"]),
                        severity=str(r["severity"]),
                        top_risk_features=list(r.get("top_risk_features", ["Packet Length Std", "Flow Duration"])),
                        flow_metadata={
                            "Destination Port": r["destination_port"],
                            "Flow Duration": r["flow_duration"],
                            "Total Fwd Packets": r["total_fwd_packets"],
                            "Total Backward Packets": r["total_bwd_packets"],
                        },
                    )
                )

        # Metrics follow the currently loaded production classifier.
        active_name = model_service.model_name.lower()
        active_benchmarks = model_service.get_benchmarks()
        active_benchmark = next(
            (b for b in active_benchmarks if b.get("model", "").lower() in active_name or active_name in b.get("model", "").lower()),
            next((b for b in active_benchmarks if b.get("is_ensemble")), active_benchmarks[0] if active_benchmarks else None),
        )
        accuracy = active_benchmark.get("accuracy", 0.0) if active_benchmark else 0.0
        f1_score = active_benchmark.get("f1_attack", 0.0) if active_benchmark else 0.0

        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        return DashboardSummaryResponse(
            total_flows_analyzed=total,
            benign_flows_detected=benign_count,
            malicious_flows_detected=attack_count,
            threat_detection_rate=detection_rate,
            critical_alerts=critical_count,
            high_alerts=high_count,
            medium_alerts=medium_count,
            low_alerts=low_count,
            avg_confidence=avg_conf,
            model_accuracy=round(accuracy * 100, 2),
            model_f1=round(f1_score * 100, 2),
            model_name=model_service.model_name,
            severity_distribution=severity_counts,
            traffic_timeline=timeline_points,
            attack_distribution=attack_items,
            top_features=top_feats,
            recent_alerts=recent_alerts,
            last_updated=now_str,
        )

dashboard_service = DashboardService()
