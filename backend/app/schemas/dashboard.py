from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field
from .prediction import FlowPredictionItem

class SeverityCount(BaseModel):
    severity: str
    count: int
    percentage: float
    color: str

class TrafficVolumePoint(BaseModel):
    time_label: str
    total_flows: int
    attack_flows: int
    benign_flows: int

class AttackCategoryItem(BaseModel):
    category: str
    count: int
    percentage: float
    risk_level: str

class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    rank: int

class DashboardSummaryResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    total_flows_analyzed: int
    benign_flows_detected: int
    malicious_flows_detected: int
    threat_detection_rate: float
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int
    avg_confidence: float
    model_accuracy: float
    model_f1: float
    model_name: str
    severity_distribution: list[SeverityCount]
    traffic_timeline: list[TrafficVolumePoint]
    attack_distribution: list[AttackCategoryItem]
    top_features: list[FeatureImportanceItem]
    recent_alerts: list[FlowPredictionItem]
    last_updated: str
