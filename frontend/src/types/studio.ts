export interface DataQualitySummary {
  total_rows: number;
  total_columns: number;
  missing_cells: number;
  duplicate_rows: number;
  infinite_values: number;
  numeric_columns_count: number;
  categorical_columns_count: number;
  has_labels: boolean;
  detected_target_column?: string | null;
  target_class_distribution?: Record<string, number> | null;
}

export interface DatasetUploadResponse {
  dataset_id: string;
  filename: string;
  file_size_bytes: number;
  record_count: number;
  column_count: number;
  columns: string[];
  suggested_target?: string | null;
  quality_summary: DataQualitySummary;
  preview_rows: Array<Record<string, any>>;
  is_sample_dataset: boolean;
}

export interface BaseLearnerSpec {
  model_id: string;
  enabled: boolean;
  hyperparameters: Record<string, any>;
  weight: number;
}

export interface ModelConfigSpec {
  strategy: 'individual' | 'voting' | 'stacking' | 'bagging' | 'boosting' | 'random_forest';
  base_estimator_id: string;
  voting_type: 'hard' | 'soft';
  meta_classifier_id: string;
  meta_classifier_hyperparameters: Record<string, any>;
  cv_folds: number;
  n_estimators: number;
  learning_rate: number;
  max_depth: number;
  base_classifiers: BaseLearnerSpec[];
}

export interface StudioExperimentRequest {
  experiment_name: string;
  dataset_id: string;
  target_column?: string | null;
  feature_columns?: string[] | null;
  test_split_ratio: number;
  random_seed: number;
  model_settings: ModelConfigSpec;
}

export interface StudioExperimentStatus {
  experiment_id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: string;
  progress: number;
  error_message?: string | null;
  is_labeled: boolean;
  dataset_id: string;
  created_at: string;
}

export interface ConfusionMatrixDict {
  labels: string[];
  matrix: number[][];
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  true_positives: number;
}

export interface StudioExperimentResult {
  experiment_id: string;
  name: string;
  dataset_id: string;
  is_labeled: boolean;
  status: string;
  strategy: string;
  model_name: string;
  training_time_seconds: number;
  prediction_time_seconds: number;
  accuracy?: number | null;
  training_accuracy?: number | null;
  generalization_gap?: number | null;
  precision?: number | null;
  recall?: number | null;
  f1_score?: number | null;
  macro_f1?: number | null;
  weighted_f1?: number | null;
  false_positive_rate?: number | null;
  false_negative_rate?: number | null;
  roc_auc?: number | null;
  task_type?: string;
  per_class_metrics?: Array<{
    class_name: string;
    precision: number;
    recall: number;
    f1_score: number;
    support: number;
  }>;
  confusion_matrix?: ConfusionMatrixDict | null;
  total_evaluated_records: number;
  predicted_class_counts: Record<string, number>;
  mean_confidence: number | null;
  predictions_preview: Array<{
    index: number;
    ground_truth: string;
    prediction: string;
    confidence: number | null;
    features: Record<string, number>;
  }>;
  created_at: string;
}

export interface StudioSamplePredictionResponse {
  sample_index: number;
  prediction: string;
  confidence: number | null;
  probabilities?: Record<string, number> | null;
  features: Record<string, unknown>;
}

export interface StudioExplainRequest {
  experiment_id: string;
  record_index?: number | null;
  flow_features?: Record<string, any> | null;
  num_features?: number;
}

export interface StudioFeatureAttribution {
  feature: string;
  original_value: number;
  contribution: number;
  direction: 'supports_malicious' | 'supports_benign';
  category: string;
  cyber_meaning: string;
}

export interface StudioWaterfallPoint {
  step: number;
  feature: string;
  contribution: number;
  cumulative_score: number;
  direction: string;
}

export interface StudioShapResult {
  baseline_expected_value: number;
  final_score: number;
  top_malicious: StudioFeatureAttribution[];
  top_benign: StudioFeatureAttribution[];
  waterfall_steps: StudioWaterfallPoint[];
  natural_language_summary: string;
}

export interface StudioLimeResult {
  surrogate_r2_fidelity: number;
  intercept: number;
  rules: Array<{
    rule: string;
    feature: string;
    weight: number;
    direction: 'supports_malicious' | 'supports_benign';
  }>;
  summary: string;
}

export interface StudioCounterfactualResult {
  original_verdict: string;
  counterfactual_verdict: string;
  original_prob: number;
  counterfactual_prob: number;
  flipped_successfully: boolean;
  features_modified_count: number;
  modified_features: Array<{
    feature: string;
    original_value: number;
    counterfactual_value: number;
    delta: number;
    percent_change: number;
    unit: string;
    cyber_meaning: string;
  }>;
  narrative: string;
}

export interface StudioEnsembleResult {
  strategy: string;
  final_verdict: string;
  final_prob: number;
  base_learners: Array<{
    name: string;
    algorithm: string;
    predicted_class: string;
    probability_attack: number;
    meta_weight: number;
    agreement_with_ensemble: boolean;
    role_description: string;
  }>;
  meta_weights: Record<string, number>;
  resolution_narrative: string;
}

export interface StudioFullExplanationResponse {
  record_index?: number | null;
  predicted_class: string;
  attack_probability: number;
  benign_probability: number;
  confidence: number;
  model_name: string;
  shap: StudioShapResult;
  lime: StudioLimeResult;
  counterfactual: StudioCounterfactualResult;
  ensemble: StudioEnsembleResult;
  non_causal_notice?: string;
}
