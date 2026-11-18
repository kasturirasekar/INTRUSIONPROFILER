from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

# ----------------- Stage 1: Dataset -----------------
class DatasetSelectionConfig(BaseModel):
    task_type: Literal["binary", "multiclass"] = "binary"
    train_rows: int = Field(default=200000, ge=500, le=200000)
    test_rows: int = Field(default=50000, ge=200, le=50000)
    random_seed: int = 42
    stratified: bool = True

class DatasetMetadataResponse(BaseModel):
    name: str
    description: str
    total_records: int
    feature_count: int
    task_type: str
    binary_classes: dict[str, int]
    multiclass_categories: list[dict[str, Any]]
    feature_names: list[str]

class DatasetPreviewResponse(BaseModel):
    task_type: str
    train_count: int
    test_count: int
    class_distribution: dict[str, int]
    features_sample: list[str]
    sample_rows: list[dict[str, Any]]

# ----------------- Stage 2: Preprocessing -----------------
class PreprocessingConfig(BaseModel):
    missing_value_strategy: Literal["median", "mean", "drop"] = "median"
    scaling_strategy: Literal["standard", "minmax", "robust", "none"] = "standard"
    imbalance_strategy: Literal["none", "smote", "random_oversample", "random_undersample"] = "none"
    feature_selection_strategy: Literal["all", "top_k", "manual"] = "all"
    top_k_features: int = Field(default=20, ge=5, le=78)
    selected_features: list[str] = Field(default_factory=list)

class PreprocessingPreviewRequest(BaseModel):
    dataset_config: DatasetSelectionConfig
    preprocessing_config: PreprocessingConfig

class PreprocessingPreviewResponse(BaseModel):
    original_train_shape: list[int]
    transformed_train_shape: list[int]
    features_retained: list[str]
    original_class_distribution: dict[str, int]
    transformed_class_distribution: dict[str, int]
    applied_transformations: list[str]
    cybersecurity_impact_note: str

# ----------------- Stage 3: Base Classifiers -----------------
class HyperparameterSpec(BaseModel):
    name: str
    type: Literal["int", "float", "str", "bool"]
    default: Any
    options: list[Any] | None = None
    min_value: float | None = None
    max_value: float | None = None
    description: str

class ModelCatalogItem(BaseModel):
    id: str
    name: str
    category: str
    role_in_intrusion_detection: str
    description: str
    supported_tasks: list[str]
    supports_predict_proba: bool
    hyperparameters: list[HyperparameterSpec]
    default_hyperparameters: dict[str, Any]

class AvailableModelsResponse(BaseModel):
    base_classifiers: list[ModelCatalogItem]
    ensemble_strategies: list[dict[str, Any]]

class BaseClassifierConfig(BaseModel):
    model_id: str
    enabled: bool = True
    hyperparameters: dict[str, Any] = Field(default_factory=dict)
    weight: float = 1.0

# ----------------- Stage 4: Ensemble -----------------
class EnsembleConfig(BaseModel):
    strategy: Literal["voting", "stacking", "bagging", "boosting", "random_forest"] = "voting"
    voting_type: Literal["hard", "soft"] = "soft"
    meta_classifier_id: str = "logistic_regression"
    meta_classifier_hyperparameters: dict[str, Any] = Field(default_factory=dict)
    cv_folds: int = Field(default=3, ge=2, le=5)
    passthrough: bool = False
    
    # Bagging / Boosting specific
    base_estimator_id: str = "decision_tree"
    n_estimators: int = Field(default=50, ge=5, le=300)
    max_depth: int = Field(default=12, ge=2, le=100)
    learning_rate: float = Field(default=0.1, ge=0.001, le=2.0)
    max_samples: float = Field(default=1.0, ge=0.1, le=1.0)
    subsample: float = Field(default=1.0, ge=0.1, le=1.0)
    bootstrap: bool = True

    # Base classifiers participating in voting/stacking
    base_classifiers: list[BaseClassifierConfig] = Field(default_factory=list)

# ----------------- Stage 5: Experiment Execution -----------------
class ExperimentRequest(BaseModel):
    name: str
    dataset_config: DatasetSelectionConfig
    preprocessing_config: PreprocessingConfig
    ensemble_config: EnsembleConfig
    notes: str | None = None

class ConfusionMatrixData(BaseModel):
    labels: list[str]
    matrix: list[list[int]]
    true_negatives: int
    false_positives: int
    false_negatives: int
    true_positives: int

class SecurityTradeoffAnalysis(BaseModel):
    detection_rate: float
    false_alarm_rate: float
    missed_attack_rate: float
    threat_severity_summary: str
    analyst_operational_burden: str
    recommendation: str

class ExperimentResults(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    macro_f1: float | None = None
    weighted_f1: float | None = None
    roc_auc: float | None = None
    pr_auc: float | None = None
    confusion_matrix: ConfusionMatrixData
    security_tradeoffs: SecurityTradeoffAnalysis
    per_class_metrics: dict[str, dict[str, float]] | None = None
    training_time_seconds: float
    prediction_time_seconds: float
    feature_importances: list[dict[str, Any]] | None = None

class ExperimentStatusResponse(BaseModel):
    id: str
    name: str
    status: Literal["queued", "running", "completed", "failed"]
    stage: str
    progress: int
    error_message: str | None = None

class ExperimentDetailResponse(BaseModel):
    id: str
    name: str
    created_at: str
    task_type: str
    status: str
    stage: str
    progress: int
    dataset_config: DatasetSelectionConfig
    preprocessing_config: PreprocessingConfig
    ensemble_config: EnsembleConfig
    metrics: ExperimentResults | None = None
    training_time_seconds: float
    prediction_time_seconds: float
    error_message: str | None = None
    notes: str | None = None

class ExperimentSummaryItem(BaseModel):
    id: str
    name: str
    created_at: str
    task_type: str
    status: str
    strategy: str
    accuracy: float | None = None
    f1_score: float | None = None
    recall: float | None = None
    training_time_seconds: float | None = None

class ComparativeAnalysisRequest(BaseModel):
    experiment_ids: list[str] = Field(min_length=2, max_length=5)

class ComparativeAnalysisItem(BaseModel):
    id: str
    name: str
    strategy: str
    accuracy: float
    recall: float
    precision: float
    f1_score: float
    false_positive_rate: float
    false_negative_rate: float
    training_time: float
    detection_verdict: str

class ComparativeAnalysisResponse(BaseModel):
    experiments: list[ComparativeAnalysisItem]
    best_overall_f1: str
    best_attack_detection_rate: str
    lowest_false_alarm_rate: str
    operational_recommendation: str
