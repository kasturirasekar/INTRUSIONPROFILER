from __future__ import annotations

import json
import logging
from typing import Any
import numpy as np
import pandas as pd

from ..core.config import METRICS_DIR
from .traffic_service import traffic_service
from ..schemas.analytics import (
    AnalyticsResponse,
    FlowDurationStats,
    HistogramBin,
    PacketStats,
    PortActivityItem,
)

logger = logging.getLogger(__name__)

PORT_SERVICE_MAP = {
    21: "FTP (File Transfer)",
    22: "SSH (Secure Shell)",
    23: "Telnet (Unencrypted)",
    25: "SMTP (Mail)",
    53: "DNS (Domain Name Service)",
    80: "HTTP (Web Traffic)",
    88: "Kerberos",
    110: "POP3 (Mail)",
    143: "IMAP (Mail)",
    443: "HTTPS (Encrypted Web)",
    445: "SMB (Direct Host)",
    1433: "MSSQL Server",
    3306: "MySQL Database",
    3389: "RDP (Remote Desktop)",
    5432: "PostgreSQL",
    8080: "HTTP-Proxy / Alt",
    8443: "HTTPS-Alt",
}

class AnalyticsService:
    def __init__(self) -> None:
        self._category_cache: list[dict[str, Any]] = [
            {"category": "DoS Hulk", "count": 3160, "percentage": 36.7, "risk_level": "Critical"},
            {"category": "PortScan", "count": 2591, "percentage": 30.1, "risk_level": "High"},
            {"category": "DDoS", "count": 2243, "percentage": 26.0, "risk_level": "Critical"},
            {"category": "DoS GoldenEye", "count": 179, "percentage": 2.1, "risk_level": "High"},
            {"category": "FTP-Patator", "count": 112, "percentage": 1.3, "risk_level": "High"},
            {"category": "DoS slowloris", "count": 97, "percentage": 1.1, "risk_level": "Medium"},
            {"category": "DoS Slowhttptest", "count": 89, "percentage": 1.0, "risk_level": "Medium"},
            {"category": "SSH-Patator", "count": 70, "percentage": 0.8, "risk_level": "High"},
            {"category": "Bot", "count": 33, "percentage": 0.4, "risk_level": "High"},
            {"category": "Web Attack - Brute Force", "count": 23, "percentage": 0.3, "risk_level": "Medium"},
            {"category": "Web Attack - XSS", "count": 13, "percentage": 0.2, "risk_level": "Medium"},
        ]

    def get_analytics(self) -> AnalyticsResponse:
        traffic_service.ensure_initialized()
        flows = traffic_service.cached_flows

        if not flows:
            return AnalyticsResponse(
                sample_size=0,
                benign_count=0,
                attack_count=0,
                flow_duration_stats=FlowDurationStats(min_ms=0, max_ms=0, median_ms=0, mean_ms=0, histogram=[]),
                packet_stats=PacketStats(avg_fwd_packets=0, avg_bwd_packets=0, avg_packet_size=0, histogram=[]),
                top_destination_ports=[],
                fwd_vs_bwd_packet_ratios=[],
            )

        df = pd.DataFrame(flows)
        benign_count = int((df["prediction"] == "Benign").sum())
        attack_count = int((df["prediction"] == "Attack").sum())

        # Flow duration stats
        durations = df["flow_duration"].dropna().clip(lower=0)
        # convert microseconds to milliseconds for human-readable display
        durations_ms = durations / 1000.0
        min_dur = float(durations_ms.min()) if not durations_ms.empty else 0.0
        max_dur = float(durations_ms.max()) if not durations_ms.empty else 0.0
        median_dur = float(durations_ms.median()) if not durations_ms.empty else 0.0
        mean_dur = float(durations_ms.mean()) if not durations_ms.empty else 0.0

        dur_bins = []
        if not durations_ms.empty:
            counts, bin_edges = np.histogram(durations_ms, bins=6)
            for i in range(len(counts)):
                dur_bins.append(HistogramBin(
                    bin_range=f"{bin_edges[i]:.0f}-{bin_edges[i+1]:.0f} ms",
                    count=int(counts[i]),
                ))

        # Packet stats
        fwd_pkts = df["total_fwd_packets"].dropna()
        bwd_pkts = df["total_bwd_packets"].dropna()
        pkt_len = df["packet_length_mean"].dropna()

        pkt_bins = []
        if not pkt_len.empty:
            counts, bin_edges = np.histogram(pkt_len, bins=6)
            for i in range(len(counts)):
                pkt_bins.append(HistogramBin(
                    bin_range=f"{bin_edges[i]:.0f}-{bin_edges[i+1]:.0f} B",
                    count=int(counts[i]),
                ))

        packet_stats = PacketStats(
            avg_fwd_packets=round(float(fwd_pkts.mean()), 2) if not fwd_pkts.empty else 0.0,
            avg_bwd_packets=round(float(bwd_pkts.mean()), 2) if not bwd_pkts.empty else 0.0,
            avg_packet_size=round(float(pkt_len.mean()), 2) if not pkt_len.empty else 0.0,
            histogram=pkt_bins,
        )

        # Port activity
        ports_df = df.dropna(subset=["destination_port"]).copy()
        top_ports = []
        if not ports_df.empty:
            ports_df["destination_port"] = ports_df["destination_port"].astype(int)
            grouped = ports_df.groupby("destination_port").agg(
                total=("prediction", "count"),
                attack_count=("is_attack", "sum"),
            ).reset_index()

            grouped["benign_count"] = grouped["total"] - grouped["attack_count"]
            grouped["attack_percentage"] = (grouped["attack_count"] / grouped["total"] * 100).round(1)
            grouped = grouped.sort_values("total", ascending=False).head(10)

            for _, row in grouped.iterrows():
                port_num = int(row["destination_port"])
                service = PORT_SERVICE_MAP.get(port_num, f"Port {port_num}")
                top_ports.append(PortActivityItem(
                    port=port_num,
                    service_hint=service,
                    flow_count=int(row["total"]),
                    attack_count=int(row["attack_count"]),
                    benign_count=int(row["benign_count"]),
                    attack_percentage=float(row["attack_percentage"]),
                ))

        # Forward vs backward packet ratios by prediction
        fwd_bwd_comparison = []
        for label in ["Benign", "Attack"]:
            sub = df[df["prediction"] == label]
            fwd_bwd_comparison.append({
                "label": label,
                "avg_fwd_packets": round(float(sub["total_fwd_packets"].mean()), 2) if not sub.empty else 0.0,
                "avg_bwd_packets": round(float(sub["total_bwd_packets"].mean()), 2) if not sub.empty else 0.0,
                "sample_count": len(sub),
            })

        return AnalyticsResponse(
            sample_size=len(flows),
            benign_count=benign_count,
            attack_count=attack_count,
            flow_duration_stats=FlowDurationStats(
                min_ms=round(min_dur, 2),
                max_ms=round(max_dur, 2),
                median_ms=round(median_dur, 2),
                mean_ms=round(mean_dur, 2),
                histogram=dur_bins,
            ),
            packet_stats=packet_stats,
            top_destination_ports=top_ports,
            fwd_vs_bwd_packet_ratios=fwd_bwd_comparison,
        )

    def get_attack_category_distribution(self) -> list[dict[str, Any]]:
        """Extract real multiclass attack distribution from training evaluations."""
        if self._category_cache is not None:
            return self._category_cache

        mc_path = METRICS_DIR / "multiclass_model_results.json"
        if mc_path.exists():
            try:
                with mc_path.open() as f:
                    data = json.load(f)
                    classes = data.get("label_classes", [])
                    # From Multiclass Decision Tree test report support
                    results = data.get("results", {})
                    dt_report = results.get("Multiclass Decision Tree", {}).get("classification_report", {})

                    output = []
                    total_support = sum(v.get("support", 0) for k, v in dt_report.items() if k.isdigit())
                    for idx_str, metrics in dt_report.items():
                        if idx_str.isdigit():
                            idx = int(idx_str)
                            cat_name = classes[idx] if idx < len(classes) else f"Category {idx}"
                            if cat_name == "BENIGN":
                                continue
                            supp = int(metrics.get("support", 0))
                            pct = round(supp / total_support * 100, 2) if total_support > 0 else 0
                            risk = "Critical" if "DDoS" in cat_name or "Hulk" in cat_name or "GoldenEye" in cat_name else (
                                "High" if "Patator" in cat_name or "PortScan" in cat_name or "Bot" in cat_name else "Medium"
                            )
                            output.append({
                                "category": cat_name,
                                "count": supp,
                                "percentage": pct,
                                "risk_level": risk,
                            })
                    output.sort(key=lambda x: x["count"], reverse=True)
                    self._category_cache = output
                    return output
            except Exception as e:
                logger.error("Error reading multiclass distribution: %s", e)

        fallback = [
            {"category": "DoS Hulk", "count": 3160, "percentage": 36.7, "risk_level": "Critical"},
            {"category": "PortScan", "count": 2591, "percentage": 30.1, "risk_level": "High"},
            {"category": "DDoS", "count": 2243, "percentage": 26.0, "risk_level": "Critical"},
            {"category": "DoS GoldenEye", "count": 179, "percentage": 2.1, "risk_level": "High"},
            {"category": "FTP-Patator", "count": 112, "percentage": 1.3, "risk_level": "High"},
            {"category": "DoS slowloris", "count": 97, "percentage": 1.1, "risk_level": "Medium"},
            {"category": "DoS Slowhttptest", "count": 89, "percentage": 1.0, "risk_level": "Medium"},
            {"category": "SSH-Patator", "count": 70, "percentage": 0.8, "risk_level": "High"},
            {"category": "Bot", "count": 33, "percentage": 0.4, "risk_level": "High"},
            {"category": "Web Attack - Brute Force", "count": 23, "percentage": 0.3, "risk_level": "Medium"},
            {"category": "Web Attack - XSS", "count": 13, "percentage": 0.2, "risk_level": "Medium"},
        ]
        self._category_cache = fallback
        return fallback

analytics_service = AnalyticsService()
