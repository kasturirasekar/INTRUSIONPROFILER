from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

# ----------------- Dataset Schemas -----------------

class DataQualitySummary(BaseModel):
    total_rows: int
    total_columns: int
    missing_cells: int
    duplicate_rows: int
    infinite_values: int
    numeric_columns_count: int
    categorical_columns_count: int
    has_labels: bool
    detected_target_column: str | None = None
    target_class_distribution: dict[str, int] | None = None

class DatasetUploadResponse(BaseModel):
    dataset_id: str
    filename: str
    file_size_bytes: int
    record_count: int
    column_count: int
    columns: list[str]
    suggested_target: str | None
    quality_summary: DataQualitySummary
    preview_rows: list[dict[str, Any]]
    is_sample_dataset: bool = False

class DatasetMetadataResponse(BaseModel):
    dataset_id: str
    filename: str
    record_count: int
    column_count: int
    columns: list[str]
    quality_summary: DataQualitySummary

# ----------------- Experiment Schemas -----------------

class BaseLearnerSpec(BaseModel):
    model_id: str
    enabled: bool = True
    hyperparameters: dict[str, Any] = Field(default_factory=dict)
    weight: float = 1.0

class ModelConfigSpec(BaseModel):
    strategy: Literal["individual", "voting", "stacking", "bagging", "boosting", "random_forest"] = "stacking"
    base_estimator_id: str = "decision_tree"
    voting_type: Literal["hard", "soft"] = "soft"
    meta_classifier_id: str = "logistic_regression"
    meta_classifier_hyperparameters: dict[str, Any] = Field(default_factory=dict)
    cv_folds: int = 3
    n_estimators: int = 50
    learning_rate: float = 0.1
    max_depth: int = 12
    base_classifiers: list[BaseLearnerSpec] = Field(default_factory=list)

class StudioExperimentRequest(BaseModel):
    experiment_name: str
    dataset_id: str
    target_column: str | None = None  # None for unlabeled inference
    feature_columns: list[str] | None = None  # None = use all numeric features
    test_split_ratio: float = Field(default=0.30, ge=0.1, le=0.5)
    random_seed: int = 42
    model_settings: ModelConfigSpec

class StudioExperimentStatus(BaseModel):
    experiment_id: str
    name: str
    status: Literal["queued", "running", "completed", "failed"]
    stage: str
    progress: int
    error_message: str | None = None
    is_labeled: bool = True
    dataset_id: str
    created_at: str

class ConfusionMatrixDict(BaseModel):
    labels: list[str]
    matrix: list[list[int]]
    true_negatives: int
    false_positives: int
    false_negatives: int
    true_positives: int

class StudioExperimentResult(BaseModel):
    experiment_id: str
    name: str
    dataset_id: str
    is_labeled: bool
    status: str
    strategy: str
    model_name: str
    training_time_seconds: float
    prediction_time_seconds: float
    # Labeled metrics (None for unlabeled data)
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1_score: float | None = None
    macro_f1: float | None = None
    weighted_f1: float | None = None
    false_positive_rate: float | None = None
    false_negative_rate: float | None = None
    roc_auc: float | None = None
    task_type: str = "binary"
    per_class_metrics: list[dict[str, Any]] | None = None
    confusion_matrix: ConfusionMatrixDict | None = None
    # Unlabeled / General statistics
    total_evaluated_records: int
    predicted_class_counts: dict[str, int]
    mean_confidence: float
    # Predictions preview
    predictions_preview: list[dict[str, Any]]
    created_at: str

# ----------------- Explanation Schemas -----------------

class StudioExplainRequest(BaseModel):
    experiment_id: str
    record_index: int | None = None
    flow_features: dict[str, Any] | None = None
    num_features: int = 8

class StudioFeatureAttribution(BaseModel):
    feature: str
    original_value: float
    contribution: float
    direction: Literal["supports_malicious", "supports_benign"]
    category: str
    cyber_meaning: str

class StudioWaterfallPoint(BaseModel):
    step: int
    feature: str
    contribution: float
    cumulative_score: float
    direction: str

class StudioShapResult(BaseModel):
    baseline_expected_value: float
    final_score: float
    top_malicious: list[StudioFeatureAttribution]
    top_benign: list[StudioFeatureAttribution]
    waterfall_steps: list[StudioWaterfallPoint]
    natural_language_summary: str

class StudioLimeResult(BaseModel):
    surrogate_r2_fidelity: float
    intercept: float
    rules: list[dict[str, Any]]
    summary: str

class StudioCounterfactualResult(BaseModel):
    original_verdict: str
    counterfactual_verdict: str
    original_prob: float
    counterfactual_prob: float
    flipped_successfully: bool
    features_modified_count: int
    modified_features: list[dict[str, Any]]
    narrative: str

class StudioEnsembleResult(BaseModel):
    strategy: str
    final_verdict: str
    final_prob: float
    base_learners: list[dict[str, Any]]
    meta_weights: dict[str, float]
    resolution_narrative: str

class StudioFullExplanationResponse(BaseModel):
    record_index: int | None
    predicted_class: str
    attack_probability: float
    benign_probability: float
    confidence: float
    model_name: str
    shap: StudioShapResult
    lime: StudioLimeResult
    counterfactual: StudioCounterfactualResult
    ensemble: StudioEnsembleResult
    non_causal_notice: str = "Feature attributions reflect statistical associations in the model's decision function, not causal proof of network compromise."
