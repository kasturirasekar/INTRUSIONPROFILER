from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

# ==========================================
# UNIFIED BENCHMARK EVALUATION ENGINE SCHEMAS
# ==========================================

class ModelBenchmarkConfig(BaseModel):
    model_id: str = Field(..., description="Model identifier: decision_tree, logistic_regression, random_forest, naive_bayes, extra_trees, gradient_boosting, adaboost, voting, bagging, stacking")
    name: str = Field(..., description="Display name for model")
    hyperparameters: dict[str, Any] = Field(default_factory=dict)
    is_ensemble: bool = False

class BenchmarkRunRequest(BaseModel):
    dataset_id: str = Field(..., description="Uploaded or sample dataset ID")
    target_column: str = Field(..., description="Ground truth target column name")
    feature_columns: list[str] = Field(default_factory=list, description="List of feature columns to use (empty for all numeric)")
    task_type: str = Field("auto", description="auto, binary, or multiclass")
    evaluation_strategy: str = Field("stratified_split", description="stratified_split, cross_validation, or holdout")
    test_split_ratio: float = Field(0.2, ge=0.05, le=0.5, description="Fraction of data reserved for testing (if split)")
    cv_folds: int = Field(5, ge=2, le=10, description="Number of folds if cross_validation")
    random_seed: int = Field(42, description="Random seed for reproducible partitioning")
    selected_models: list[str] = Field(
        default_factory=lambda: ["decision_tree", "logistic_regression", "random_forest", "gradient_boosting", "voting", "stacking"],
        description="List of model IDs to benchmark"
    )

class PerClassMetric(BaseModel):
    class_name: str
    precision: float
    recall: float
    f1_score: float
    support: int

class ModelEvaluationResult(BaseModel):
    model_id: str
    name: str
    is_ensemble: bool
    accuracy: float
    precision_macro: float
    precision_weighted: float
    recall_macro: float
    recall_weighted: float
    f1_macro: float
    f1_weighted: float
    false_positive_rate: float
    false_negative_rate: float
    roc_auc: float | None = None
    pr_auc: float | None = None
    training_time_seconds: float
    inference_latency_ms_per_1k: float
    model_size_kb: float
    per_class_metrics: list[PerClassMetric] = Field(default_factory=list)
    confusion_matrix: list[list[int]] = Field(default_factory=list)
    confusion_labels: list[str] = Field(default_factory=list)

class BenchmarkRunResponse(BaseModel):
    benchmark_id: str
    dataset_id: str
    target_column: str
    task_type: str
    evaluation_strategy: str
    total_records: int
    train_records: int
    test_records: int
    feature_count: int
    results: list[ModelEvaluationResult]
    top_performer: str
    created_at: str

# ==========================================
# ROBUSTNESS EXPERIMENTS SCHEMAS
# ==========================================

class RobustnessExperimentRequest(BaseModel):
    dataset_id: str
    target_column: str
    feature_columns: list[str] = Field(default_factory=list)
    stress_type: str = Field(..., description="feature_noise, missing_values, distribution_shift, minority_imbalance")
    stress_intensity: float = Field(..., description="Intensity parameter: noise sigma (0.01-0.5), missingness fraction (0.05-0.5), shift scale (1.1-2.0), or minority retention (0.05-0.5)")
    baseline_model_id: str = Field("decision_tree", description="Baseline single classifier: decision_tree or logistic_regression")
    ensemble_model_id: str = Field("random_forest", description="Ensemble classifier: random_forest, voting, or stacking")
    random_seed: int = 42

class ModelStressMetric(BaseModel):
    accuracy: float
    f1_macro: float
    false_negative_rate: float

class RobustnessComparison(BaseModel):
    model_id: str
    name: str
    is_ensemble: bool
    clean_metrics: ModelStressMetric
    stressed_metrics: ModelStressMetric
    f1_drop_percentage: float
    fnr_increase_percentage: float
    resilience_score: float = Field(..., description="Score 0-100 indicating resilience under perturbation")

class RobustnessExperimentResponse(BaseModel):
    experiment_id: str
    stress_type: str
    stress_description: str
    stress_intensity: float
    random_seed: int
    baseline_comparison: RobustnessComparison
    ensemble_comparison: RobustnessComparison
    analysis_summary: str
    is_synthetic: bool = True
    disclaimer: str = "This is a controlled synthetic stress test. Perturbations are artificially injected to evaluate model stability under distribution shifts, not recorded intrusions."
    created_at: str

# ==========================================
# TRAFFIC DRIFT ANALYSIS SCHEMAS
# ==========================================

class DriftAnalysisRequest(BaseModel):
    reference_dataset_id: str = Field(..., description="Baseline/training reference traffic dataset ID")
    incoming_dataset_id: str = Field(..., description="Incoming or newly observed traffic dataset ID")
    feature_columns: list[str] = Field(default_factory=list, description="Features to analyze (empty for top numeric)")
    alpha_significance: float = Field(0.05, description="Significance level for Kolmogorov-Smirnov test")

class FeatureDriftDetail(BaseModel):
    feature_name: str
    reference_mean: float
    reference_std: float
    incoming_mean: float
    incoming_std: float
    ks_statistic: float
    p_value: float
    psi_score: float
    wasserstein_distance: float
    drift_status: str = Field(..., description="Stable, Moderate Drift, or Significant Drift")
    is_drifted: bool

class DriftAnalysisResponse(BaseModel):
    analysis_id: str
    reference_dataset_id: str
    incoming_dataset_id: str
    reference_sample_count: int
    incoming_sample_count: int
    total_features_analyzed: int
    drifted_features_count: int
    overall_drift_percentage: float
    overall_drift_severity: str = Field(..., description="Low, Moderate, High, or Critical")
    feature_details: list[FeatureDriftDetail]
    model_reliability_impact: str
    disclaimer: str = "Traffic drift reflects changes in operational network activity (e.g. software updates, protocol shifts), not necessarily cyber intrusions."
    created_at: str

# ==========================================
# ADVANCED EXPLAINABLE AI ENHANCEMENTS
# ==========================================

class ExplanationStabilityRequest(BaseModel):
    experiment_id: str
    record_index: int
    epsilon: float = Field(0.02, ge=0.005, le=0.1, description="Small input perturbation magnitude")

class ExplanationStabilityResponse(BaseModel):
    record_index: int
    epsilon: float
    attribution_cosine_similarity: float = Field(..., description="Similarity between original and perturbed attributions (0 to 1)")
    stability_grade: str = Field(..., description="Highly Stable, Moderately Stable, or Sensitive")
    top_stable_features: list[str]
    interpretation: str
    non_causal_notice: str = "Feature attributions reflect statistical associations in the model's decision function, not causal proof of network compromise."

class CounterfactualFeasibilityCheck(BaseModel):
    feature_name: str
    original_value: float
    proposed_value: float
    change_delta: float
    is_feasible: bool
    feasibility_reason: str

class FeasibleCounterfactualResponse(BaseModel):
    record_index: int
    predicted_class: str
    target_class: str
    original_probability: float
    counterfactual_probability: float
    changes_suggested: list[CounterfactualFeasibilityCheck]
    all_changes_feasible: bool
    summary: str
    non_causal_notice: str = "Counterfactual adjustments show minimal feature changes needed by the model boundary. They do not constitute firewall or mitigation commands."
