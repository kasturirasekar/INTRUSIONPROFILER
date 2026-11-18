export type TaskType = 'binary' | 'multiclass';

export interface DatasetSelectionConfig {
  task_type: TaskType;
  train_rows: number;
  test_rows: number;
  random_seed: number;
  stratified: boolean;
}

export interface DatasetMetadata {
  name: string;
  description: string;
  total_records: number;
  feature_count: number;
  task_type: string;
  binary_classes: Record<string, number>;
  multiclass_categories: Array<{
    id: number;
    category: string;
    test_samples: number;
    severity: string;
  }>;
  feature_names: string[];
}

export interface DatasetPreview {
  task_type: string;
  train_count: number;
  test_count: number;
  class_distribution: Record<string, number>;
  features_sample: string[];
  sample_rows: Array<Record<string, any>>;
}

export interface PreprocessingConfig {
  missing_value_strategy: 'median' | 'mean' | 'drop';
  scaling_strategy: 'standard' | 'minmax' | 'robust' | 'none';
  imbalance_strategy: 'none' | 'smote' | 'random_oversample' | 'random_undersample';
  feature_selection_strategy: 'all' | 'top_k' | 'manual';
  top_k_features: number;
  selected_features: string[];
}

export interface PreprocessingPreview {
  original_train_shape: [number, number];
  transformed_train_shape: [number, number];
  features_retained: string[];
  original_class_distribution: Record<string, number>;
  transformed_class_distribution: Record<string, number>;
  applied_transformations: string[];
  cybersecurity_impact_note: string;
}

export interface HyperparameterSpec {
  name: string;
  type: 'int' | 'float' | 'str' | 'bool';
  default: any;
  options?: any[];
  min_value?: number;
  max_value?: number;
  description: string;
}

export interface ModelCatalogItem {
  id: string;
  name: string;
  category: string;
  role_in_intrusion_detection: string;
  description: string;
  supported_tasks: string[];
  supports_predict_proba: boolean;
  hyperparameters: HyperparameterSpec[];
  default_hyperparameters: Record<string, any>;
}

export interface AvailableModels {
  base_classifiers: ModelCatalogItem[];
  ensemble_strategies: Array<{
    id: string;
    name: string;
    description: string;
    cybersecurity_benefit: string;
    modes?: string[];
    supported_meta?: string[];
  }>;
}

export interface BaseClassifierConfig {
  model_id: string;
  enabled: boolean;
  hyperparameters: Record<string, any>;
  weight: number;
}

export interface EnsembleConfig {
  strategy: 'voting' | 'stacking' | 'bagging' | 'boosting' | 'random_forest';
  voting_type: 'hard' | 'soft';
  meta_classifier_id: string;
  meta_classifier_hyperparameters: Record<string, any>;
  cv_folds: number;
  passthrough: boolean;
  base_estimator_id: string;
  n_estimators: number;
  learning_rate: number;
  max_samples: number;
  subsample: number;
  bootstrap: boolean;
  base_classifiers: BaseClassifierConfig[];
}

export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][];
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  true_positives: number;
}

export interface SecurityTradeoffAnalysis {
  detection_rate: number;
  false_alarm_rate: number;
  missed_attack_rate: number;
  threat_severity_summary: string;
  analyst_operational_burden: string;
  recommendation: string;
}

export interface ExperimentResults {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  macro_f1?: number;
  weighted_f1?: number;
  roc_auc?: number;
  pr_auc?: number;
  confusion_matrix: ConfusionMatrixData;
  security_tradeoffs: SecurityTradeoffAnalysis;
  per_class_metrics?: Record<string, {
    precision: number;
    recall: number;
    f1_score: number;
    support: number;
  }>;
  training_time_seconds: number;
  prediction_time_seconds: number;
  feature_importances?: Array<{ feature: string; importance: number; rank: number }>;
}

export interface ExperimentStatus {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: string;
  progress: number;
  error_message?: string;
}

export interface ExperimentSummaryItem {
  id: string;
  name: string;
  created_at: string;
  task_type: string;
  status: string;
  strategy: string;
  accuracy?: number;
  f1_score?: number;
  recall?: number;
  training_time_seconds?: number;
}

export interface ExperimentDetail {
  id: string;
  name: string;
  created_at: string;
  task_type: string;
  status: string;
  stage: string;
  progress: number;
  dataset_config: DatasetSelectionConfig;
  preprocessing_config: PreprocessingConfig;
  ensemble_config: EnsembleConfig;
  metrics?: ExperimentResults;
  training_time_seconds: number;
  prediction_time_seconds: number;
  error_message?: string;
  notes?: string;
}

export interface ComparativeAnalysisItem {
  id: string;
  name: string;
  strategy: string;
  accuracy: number;
  recall: number;
  precision: number;
  f1_score: number;
  false_positive_rate: number;
  false_negative_rate: number;
  training_time: number;
  detection_verdict: string;
}

export interface ComparativeAnalysisResponse {
  experiments: ComparativeAnalysisItem[];
  best_overall_f1: string;
  best_attack_detection_rate: string;
  lowest_false_alarm_rate: string;
  operational_recommendation: string;
}
