from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

# ----------------- Request Schemas -----------------

class FlowExplainRequest(BaseModel):
    flow_id: str | None = None
    flow_index: int | None = None
    flow_features: dict[str, Any] | None = None
    model_name: str | None = None
    explainer_method: Literal["shap", "lime", "both"] = "shap"
    num_features: int = Field(default=10, ge=3, le=50)

class ShapLocalRequest(BaseModel):
    flow_features: dict[str, Any]
    background_samples: int = Field(default=30, ge=10, le=100)
    num_features: int = Field(default=10, ge=3, le=50)
    target_class: Literal["Attack", "Benign"] = "Attack"

class ShapGlobalRequest(BaseModel):
    sample_size: int = Field(default=40, ge=10, le=150)
    num_features: int = Field(default=15, ge=5, le=40)
    target_class: Literal["Attack", "Benign"] = "Attack"

class LimeExplainRequest(BaseModel):
    flow_features: dict[str, Any]
    num_perturbations: int = Field(default=150, ge=50, le=500)
    num_features: int = Field(default=10, ge=3, le=30)
    kernel_width: float | None = None

class CounterfactualRequest(BaseModel):
    flow_features: dict[str, Any]
    target_class: Literal["Benign", "Attack"] = "Benign"
    max_features_to_change: int = Field(default=15, ge=1, le=40)
    desired_probability_threshold: float = Field(default=0.45, ge=0.05, le=0.95)

class EnsembleExplainRequest(BaseModel):
    flow_features: dict[str, Any]

# ----------------- Response Schemas -----------------

class FeatureContribution(BaseModel):
    feature: str
    original_value: float
    contribution: float
    direction: Literal["supports_malicious", "supports_benign"]
    percentage_contribution: float
    domain_explanation: str
    category: str

class WaterfallStep(BaseModel):
    step: int
    feature: str
    feature_value: float
    contribution: float
    cumulative_value: float
    direction: Literal["supports_malicious", "supports_benign", "baseline", "final"]

class PredictionSummary(BaseModel):
    flow_id: str
    predicted_class: str
    probability_attack: float
    probability_benign: float
    confidence: float
    severity: Literal["Critical", "High", "Medium", "Low", "Normal"]
    model_name: str
    model_type: str
    features_analyzed: int
    timestamp: str

class PredictionExplanationResponse(BaseModel):
    summary: PredictionSummary
    natural_language_explanation: str
    baseline_expected_value: float
    final_output_value: float
    top_malicious_features: list[FeatureContribution]
    top_benign_features: list[FeatureContribution]
    all_contributions: list[FeatureContribution]
    waterfall_steps: list[WaterfallStep]
    scientific_disclaimer: str

class ShapBeeswarmPoint(BaseModel):
    feature: str
    flow_index: int
    shap_value: float
    feature_value: float
    normalized_value: float

class ShapGlobalResponse(BaseModel):
    num_samples_analyzed: int
    feature_rankings: list[dict[str, Any]]
    beeswarm_data: list[ShapBeeswarmPoint]
    expected_value: float
    dependence_sample: list[dict[str, Any]]

class LimeRule(BaseModel):
    rule: str
    feature: str
    weight: float
    direction: Literal["supports_malicious", "supports_benign"]

class LimeExplanationResponse(BaseModel):
    surrogate_r2_fidelity: float
    intercept: float
    prediction_local: float
    rules: list[LimeRule]
    explanation_summary: str
    scientific_note: str

class CounterfactualDelta(BaseModel):
    feature: str
    original_value: float
    counterfactual_value: float
    delta: float
    percent_change: float
    unit: str
    is_valid_constraint: bool
    cyber_meaning: str

class CounterfactualResponse(BaseModel):
    original_prediction: str
    original_attack_prob: float
    counterfactual_prediction: str
    counterfactual_attack_prob: float
    flipped_successfully: bool
    features_modified_count: int
    normalized_l1_distance: float
    modified_features: list[CounterfactualDelta]
    full_counterfactual_vector: dict[str, float]
    actionable_narrative: str
    ethical_disclaimer: str

class BaseLearnerDecision(BaseModel):
    name: str
    algorithm: str
    predicted_class: str
    probability_attack: float
    meta_weight: float
    agreement_with_ensemble: bool
    role_description: str

class EnsembleExplainResponse(BaseModel):
    ensemble_strategy: str
    final_verdict: str
    final_attack_prob: float
    base_learners: list[BaseLearnerDecision]
    meta_learner_name: str
    meta_learner_weights: dict[str, float]
    resolution_narrative: str
    disagreement_analysis: str

class TreeDecisionSplit(BaseModel):
    node_id: int
    feature: str
    threshold: float
    value: float
    direction_taken: str
    purity_or_class: str

class ModelInterpretabilityResponse(BaseModel):
    active_model_name: str
    model_architecture: str
    feature_importance_comparison: list[dict[str, Any]]
    tree_rules_sample: list[TreeDecisionSplit]
    interpretability_score: str
    evaluation_tradeoff: str

class AttackProfile(BaseModel):
    attack_name: str
    sample_count: int
    severity: str
    detection_rate: float
    signature_features: list[dict[str, Any]]
    comparison_with_benign: str
