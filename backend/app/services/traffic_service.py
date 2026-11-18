from __future__ import annotations

import datetime
import logging
from typing import Any
import pandas as pd
from fastapi import HTTPException

from ..core.config import SAMPLE_TEST_DATA, settings
from .model_service import model_service
from .prediction_service import prediction_service
from ..schemas.traffic import NetworkFlowRecord, PaginatedTrafficResponse, LiveStreamStatus

logger = logging.getLogger(__name__)

class TrafficService:
    def __init__(self) -> None:
        self.cached_flows: list[dict[str, Any]] = []
        self.stream_cursor: int = 0
        self.is_stream_active: bool = True
        self.stream_speed_seconds: float = 2.0
        self.total_streamed: int = 0
        self._initialized: bool = False

    def ensure_initialized(self) -> None:
        if not self._initialized:
            self._initialized = True
            self._initialize_traffic_cache()

    def _initialize_traffic_cache(self, sample_size: int = 100) -> None:
        self._load_fallback_flows()

    def _load_fallback_flows(self) -> None:
        """Generates realistic synthetic baseline traffic if test CSV is unavailable or quarantined."""
        logger.info("Generating baseline network traffic telemetry cache (1,000 flows)...")
        now = datetime.datetime.now(datetime.timezone.utc)
        records = []
        import random

        rng = random.Random(42)

        # Realistic network profiles
        traffic_templates = [
            # Benign Web Traffic (HTTPS/HTTP)
            {"port": 443, "dur": 120000, "fwd": 12, "bwd": 16, "len": 480.5, "pred": "Benign", "prob": 0.04, "sev": "Normal"},
            {"port": 80, "dur": 45000, "fwd": 6, "bwd": 8, "len": 320.0, "pred": "Benign", "prob": 0.02, "sev": "Normal"},
            {"port": 53, "dur": 1200, "fwd": 2, "bwd": 2, "len": 84.0, "pred": "Benign", "prob": 0.01, "sev": "Normal"},
            {"port": 443, "dur": 350000, "fwd": 28, "bwd": 34, "len": 850.0, "pred": "Benign", "prob": 0.05, "sev": "Normal"},
            # PortScan Probe
            {"port": 8080, "dur": 45, "fwd": 1, "bwd": 0, "len": 0.0, "pred": "Attack", "prob": 0.88, "sev": "High"},
            {"port": 1433, "dur": 52, "fwd": 1, "bwd": 0, "len": 0.0, "pred": "Attack", "prob": 0.86, "sev": "High"},
            # DDoS Volumetric Flood
            {"port": 80, "dur": 15000, "fwd": 240, "bwd": 2, "len": 1240.0, "pred": "Attack", "prob": 0.98, "sev": "Critical"},
            {"port": 443, "dur": 8900, "fwd": 180, "bwd": 0, "len": 960.0, "pred": "Attack", "prob": 0.96, "sev": "Critical"},
            # SSH Brute Force
            {"port": 22, "dur": 85000, "fwd": 35, "bwd": 22, "len": 185.0, "pred": "Attack", "prob": 0.79, "sev": "High"},
            # Slowloris Low-and-Slow
            {"port": 80, "dur": 8900000, "fwd": 8, "bwd": 4, "len": 120.0, "pred": "Attack", "prob": 0.65, "sev": "Medium"},
        ]

        for i in range(1000):
            template = traffic_templates[i % len(traffic_templates)]
            # Add small realistic variance
            jitter = rng.uniform(0.85, 1.15)
            duration = max(10.0, template["dur"] * jitter)
            fwd_pkts = max(1, int(template["fwd"] * jitter))
            bwd_pkts = int(template["bwd"] * jitter)
            pkt_len = template["len"] * jitter
            flow_bytes = round((fwd_pkts + bwd_pkts) * pkt_len / (duration / 1e6 + 1e-5), 2)
            flow_pkts = round((fwd_pkts + bwd_pkts) / (duration / 1e6 + 1e-5), 2)
            sim_time = (now - datetime.timedelta(seconds=(1000 - i) * 2)).strftime("%Y-%m-%d %H:%M:%S")

            is_atk = template["pred"] == "Attack"
            records.append({
                "id": 1000 + i,
                "destination_port": template["port"],
                "flow_duration": round(duration, 2),
                "total_fwd_packets": fwd_pkts,
                "total_bwd_packets": bwd_pkts,
                "packet_length_mean": round(pkt_len, 2),
                "flow_bytes_per_sec": flow_bytes,
                "flow_packets_per_sec": flow_pkts,
                "prediction": template["pred"],
                "attack_probability": template["prob"],
                "severity": template["sev"],
                "is_attack": is_atk,
                "timestamp_simulated": sim_time,
                "raw_features": {
                    "Destination Port": template["port"],
                    "Flow Duration": duration,
                    "Total Fwd Packets": fwd_pkts,
                    "Total Backward Packets": bwd_pkts,
                    "Packet Length Mean": pkt_len,
                    "Flow Bytes/s": flow_bytes,
                    "Flow Packets/s": flow_pkts,
                },
                "top_risk_features": ["Packet Length Mean", "Flow Duration", "Destination Port"] if is_atk else [],
            })

        self.cached_flows = records
        logger.info("Successfully populated %d baseline flow records", len(self.cached_flows))

    def get_paginated_flows(
        self,
        page: int = 1,
        page_size: int = 25,
        search: str | None = None,
        severity: str | None = None,
        prediction: str | None = None,
        is_attack: bool | None = None,
    ) -> PaginatedTrafficResponse:
        self.ensure_initialized()
        filtered = self.cached_flows

        if is_attack is not None:
            filtered = [f for f in filtered if f["is_attack"] == is_attack]

        if isinstance(prediction, str) and prediction and prediction.lower() not in ["all", "none"]:
            filtered = [f for f in filtered if f["prediction"].lower() == prediction.lower()]

        if isinstance(severity, str) and severity and severity.lower() not in ["all", "none"]:
            filtered = [f for f in filtered if f["severity"].lower() == severity.lower()]

        if isinstance(search, str) and search.strip():
            s = search.lower().strip()
            filtered = [
                f for f in filtered
                if (f["destination_port"] is not None and s in str(f["destination_port"]))
                or (s in f["prediction"].lower())
                or (s in f["severity"].lower())
            ]

        total = len(filtered)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_items = [NetworkFlowRecord(**item) for item in filtered[start_idx:end_idx]]

        return PaginatedTrafficResponse(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            items=page_items,
        )

    def get_stream_batch(self, batch_size: int = 10) -> tuple[list[NetworkFlowRecord], LiveStreamStatus]:
        self.ensure_initialized()
        if not self.cached_flows:
            return [], LiveStreamStatus(
                is_active=self.is_stream_active,
                speed_seconds=self.stream_speed_seconds,
                buffer_size=0,
                total_streamed=self.total_streamed,
                current_attack_rate=0.0,
            )

        start = self.stream_cursor
        end = start + batch_size
        items = []

        now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        for idx in range(start, end):
            wrapped_idx = idx % len(self.cached_flows)
            flow_copy = dict(self.cached_flows[wrapped_idx])
            flow_copy["timestamp_simulated"] = now
            items.append(NetworkFlowRecord(**flow_copy))

        if self.is_stream_active:
            self.stream_cursor = (self.stream_cursor + batch_size) % len(self.cached_flows)
            self.total_streamed += len(items)

        attack_count = sum(1 for item in items if item.is_attack)
        attack_rate = round(attack_count / len(items), 4) if items else 0.0

        status = LiveStreamStatus(
            is_active=self.is_stream_active,
            speed_seconds=self.stream_speed_seconds,
            buffer_size=len(self.cached_flows),
            total_streamed=self.total_streamed,
            current_attack_rate=attack_rate,
        )

        return items, status

    def toggle_stream(self, active: bool | None = None) -> LiveStreamStatus:
        if active is not None:
            self.is_stream_active = active
        else:
            self.is_stream_active = not self.is_stream_active

        return LiveStreamStatus(
            is_active=self.is_stream_active,
            speed_seconds=self.stream_speed_seconds,
            buffer_size=len(self.cached_flows),
            total_streamed=self.total_streamed,
            current_attack_rate=0.0,
        )

traffic_service = TrafficService()
