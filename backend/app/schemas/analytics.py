from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

class HistogramBin(BaseModel):
    bin_range: str
    count: int

class PortActivityItem(BaseModel):
    port: int
    service_hint: str
    flow_count: int
    attack_count: int
    benign_count: int
    attack_percentage: float

class FlowDurationStats(BaseModel):
    min_ms: float
    max_ms: float
    median_ms: float
    mean_ms: float
    histogram: list[HistogramBin]

class PacketStats(BaseModel):
    avg_fwd_packets: float
    avg_bwd_packets: float
    avg_packet_size: float
    histogram: list[HistogramBin]

class AnalyticsResponse(BaseModel):
    sample_size: int
    benign_count: int
    attack_count: int
    flow_duration_stats: FlowDurationStats
    packet_stats: PacketStats
    top_destination_ports: list[PortActivityItem]
    fwd_vs_bwd_packet_ratios: list[dict[str, Any]]
