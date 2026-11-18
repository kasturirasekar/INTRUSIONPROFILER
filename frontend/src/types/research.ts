export interface PerClassMetric {
  class_name: string;
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface ModelEvaluationResult {
  model_id: string;
  name: string;
  is_ensemble: boolean;
  accuracy: number;
  precision_macro: number;
  precision_weighted: number;
  recall_macro: number;
  recall_weighted: number;
  f1_macro: number;
  f1_weighted: number;
  false_positive_rate: number;
  false_negative_rate: number;
  roc_auc: number | null;
  pr_auc: number | null;
  training_time_seconds: number;
  inference_latency_ms_per_1k: number;
  model_size_kb: number;
  per_class_metrics: PerClassMetric[];
  confusion_matrix: number[][];
  confusion_labels: string[];
}

export interface BenchmarkRunRequest {
  dataset_id: string;
  target_column: string;
  feature_columns?: string[];
  task_type?: 'auto' | 'binary' | 'multiclass';
  evaluation_strategy?: 'stratified_split' | 'cross_validation' | 'holdout';
  test_split_ratio?: number;
  cv_folds?: number;
  random_seed?: number;
  selected_models?: string[];
}

export interface BenchmarkRunResponse {
  benchmark_id: string;
  dataset_id: string;
  target_column: string;
  task_type: string;
  evaluation_strategy: string;
  total_records: number;
  train_records: number;
  test_records: number;
  feature_count: number;
  results: ModelEvaluationResult[];
  top_performer: string;
  created_at: string;
}

export interface ModelStressMetric {
  accuracy: number;
  f1_macro: number;
  false_negative_rate: number;
}

export interface RobustnessComparison {
  model_id: string;
  name: string;
  is_ensemble: boolean;
  clean_metrics: ModelStressMetric;
  stressed_metrics: ModelStressMetric;
  f1_drop_percentage: number;
  fnr_increase_percentage: number;
  resilience_score: number;
}

export interface RobustnessExperimentRequest {
  dataset_id: string;
  target_column: string;
  feature_columns?: string[];
  stress_type: 'feature_noise' | 'missing_values' | 'distribution_shift' | 'minority_imbalance';
  stress_intensity: number;
  baseline_model_id?: string;
  ensemble_model_id?: string;
  random_seed?: number;
}

export interface RobustnessExperimentResponse {
  experiment_id: string;
  stress_type: string;
  stress_description: string;
  stress_intensity: number;
  random_seed: number;
  baseline_comparison: RobustnessComparison;
  ensemble_comparison: RobustnessComparison;
  analysis_summary: string;
  is_synthetic: boolean;
  disclaimer: string;
  created_at: string;
}

export interface FeatureDriftDetail {
  feature_name: string;
  reference_mean: number;
  reference_std: number;
  incoming_mean: number;
  incoming_std: number;
  ks_statistic: number;
  p_value: number;
  psi_score: number;
  wasserstein_distance: number;
  drift_status: 'Stable' | 'Moderate Drift' | 'Significant Drift';
  is_drifted: boolean;
}

export interface DriftAnalysisRequest {
  reference_dataset_id: string;
  incoming_dataset_id: string;
  feature_columns?: string[];
  alpha_significance?: number;
}

export interface DriftAnalysisResponse {
  analysis_id: string;
  reference_dataset_id: string;
  incoming_dataset_id: string;
  reference_sample_count: number;
  incoming_sample_count: number;
  total_features_analyzed: number;
  drifted_features_count: number;
  overall_drift_percentage: number;
  overall_drift_severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  feature_details: FeatureDriftDetail[];
  model_reliability_impact: string;
  disclaimer: string;
  created_at: string;
}

export interface ExplanationStabilityResponse {
  record_index: number;
  epsilon: number;
  attribution_cosine_similarity: number;
  stability_grade: string;
  top_stable_features: string[];
  interpretation: string;
  non_causal_notice: string;
}

export interface CounterfactualFeasibilityCheck {
  feature_name: string;
  original_value: number;
  proposed_value: number;
  change_delta: number;
  is_feasible: boolean;
  feasibility_reason: string;
}

export interface FeasibleCounterfactualResponse {
  record_index: number;
  predicted_class: string;
  target_class: string;
  original_probability: number;
  counterfactual_probability: number;
  changes_suggested: CounterfactualFeasibilityCheck[];
  all_changes_feasible: boolean;
  summary: string;
  non_causal_notice: string;
}
