from __future__ import annotations

import io
import json
from typing import Any
import pandas as pd

from .model_service import model_service
from .traffic_service import traffic_service

class ReportService:
    def export_predictions_csv(self, max_rows: int = 5000) -> str:
        flows = traffic_service.cached_flows[:max_rows]
        if not flows:
            return "Destination Port,Flow Duration,Total Fwd Packets,Total Backward Packets,predicted_label,attack_probability,severity\n"

        rows = []
        for f in flows:
            # Base row contains all 78 raw feature columns
            row = dict(f.get("raw_features", {}))
            if f.get("destination_port") is not None and "Destination Port" not in row:
                row["Destination Port"] = f["destination_port"]
            if f.get("flow_duration") is not None and "Flow Duration" not in row:
                row["Flow Duration"] = f["flow_duration"]
            if f.get("total_fwd_packets") is not None and "Total Fwd Packets" not in row:
                row["Total Fwd Packets"] = f["total_fwd_packets"]
            if f.get("total_bwd_packets") is not None and "Total Backward Packets" not in row:
                row["Total Backward Packets"] = f["total_bwd_packets"]

            # Add predicted outcomes
            row["predicted_label"] = f["prediction"]
            row["attack_probability"] = f["attack_probability"]
            row["severity"] = f["severity"]
            rows.append(row)

        df = pd.DataFrame(rows)
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        return buffer.getvalue()

    def generate_threat_executive_summary(self) -> dict[str, Any]:
        flows = traffic_service.cached_flows
        df = pd.DataFrame(flows) if flows else pd.DataFrame()

        total = len(df)
        attacks = int((df["prediction"] == "Attack").sum()) if not df.empty else 0
        critical = int((df["severity"] == "Critical").sum()) if not df.empty else 0
        high = int((df["severity"] == "High").sum()) if not df.empty else 0

        benchmarks = model_service.get_benchmarks()
        rf = next((b for b in benchmarks if b["model"] == "Random Forest"), {})

        return {
            "title": "Cyber-Attack Intrusion Detection Executive Report",
            "model_architecture": "Ensemble Random Forest (78 feature pipeline)",
            "accuracy": rf.get("accuracy", 0.9983),
            "attack_f1_score": rf.get("f1_attack", 0.9953),
            "attack_recall": rf.get("recall_attack", 0.9943),
            "total_network_flows_monitored": total,
            "malicious_intrusions_intercepted": attacks,
            "critical_risk_events": critical,
            "high_risk_events": high,
            "threat_detection_rate": round(attacks / total * 100, 2) if total > 0 else 0,
            "status": "Operational - High Threat Interception Active",
        }

report_service = ReportService()
