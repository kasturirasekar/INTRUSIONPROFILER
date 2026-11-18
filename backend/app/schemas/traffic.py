from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

class NetworkFlowRecord(BaseModel):
    id: int
    destination_port: int | None = None
    flow_duration: float | None = None
    total_fwd_packets: float | None = None
    total_bwd_packets: float | None = None
    packet_length_mean: float | None = None
    flow_bytes_per_sec: float | None = None
    flow_packets_per_sec: float | None = None
    prediction: str
    attack_probability: float
    severity: str
    is_attack: bool
    timestamp_simulated: str
    raw_features: dict[str, Any] = Field(default_factory=dict)

class PaginatedTrafficResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[NetworkFlowRecord]

class LiveStreamStatus(BaseModel):
    is_active: bool
    speed_seconds: float
    buffer_size: int
    total_streamed: int
    current_attack_rate: float
