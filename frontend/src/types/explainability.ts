export interface FeatureContribution {
  feature: string;
  original_value: number;
  contribution: number;
  direction: 'supports_malicious' | 'supports_benign';
  percentage_contribution: number;
  domain_explanation: string;
  category: string;
}

export interface WaterfallStep {
  step: number;
  feature: string;
  feature_value: number;
  contribution: number;
  cumulative_value: number;
  direction: 'supports_malicious' | 'supports_benign' | 'baseline' | 'final';
}

export interface PredictionSummary {
  flow_id: string;
  predicted_class: string;
  probability_attack: number;
  probability_benign: number;
  confidence: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal';
  model_name: string;
  model_type: string;
  features_analyzed: number;
  timestamp: string;
}

export interface PredictionExplanationResponse {
  summary: PredictionSummary;
  natural_language_explanation: string;
  baseline_expected_value: number;
  final_output_value: number;
  top_malicious_features: FeatureContribution[];
  top_benign_features: FeatureContribution[];
  all_contributions: FeatureContribution[];
  waterfall_steps: WaterfallStep[];
  scientific_disclaimer: string;
}

export interface ShapBeeswarmPoint {
  feature: string;
  flow_index: number;
  shap_value: number;
  feature_value: number;
  normalized_value: number;
}

export interface ShapGlobalResponse {
  num_samples_analyzed: number;
  feature_rankings: Array<{
    rank: number;
    feature: string;
    mean_abs_shap: number;
    category: string;
  }>;
  beeswarm_data: ShapBeeswarmPoint[];
  expected_value: number;
  dependence_sample: Array<{
    primary_feature: string;
    primary_value: number;
    shap_value: number;
    interaction_feature: string;
    interaction_value: number;
  }>;
}

export interface LimeRule {
  rule: string;
  feature: string;
  weight: number;
  direction: 'supports_malicious' | 'supports_benign';
}

export interface LimeExplanationResponse {
  surrogate_r2_fidelity: number;
  intercept: number;
  prediction_local: number;
  rules: LimeRule[];
  explanation_summary: string;
  scientific_note: string;
}

export interface CounterfactualDelta {
  feature: string;
  original_value: number;
  counterfactual_value: number;
  delta: number;
  percent_change: number;
  unit: string;
  is_valid_constraint: boolean;
  cyber_meaning: string;
}

export interface CounterfactualResponse {
  original_prediction: string;
  original_attack_prob: number;
  counterfactual_prediction: string;
  counterfactual_attack_prob: number;
  flipped_successfully: boolean;
  features_modified_count: number;
  normalized_l1_distance: number;
  modified_features: CounterfactualDelta[];
  full_counterfactual_vector: Record<string, number>;
  actionable_narrative: string;
  ethical_disclaimer: string;
}

export interface BaseLearnerDecision {
  name: string;
  algorithm: string;
  predicted_class: string;
  probability_attack: number;
  meta_weight: number;
  agreement_with_ensemble: boolean;
  role_description: string;
}

export interface EnsembleExplainResponse {
  ensemble_strategy: string;
  final_verdict: string;
  final_attack_prob: number;
  base_learners: BaseLearnerDecision[];
  meta_learner_name: string;
  meta_learner_weights: Record<string, number>;
  resolution_narrative: string;
  disagreement_analysis: string;
}

export interface FeatureIntelligenceItem {
  name: string;
  category: string;
  layer: string;
  unit: string;
  definition: string;
  cyber_context: string;
  attack_associations: string[];
  statistics: {
    benign_mean?: number;
    benign_median?: number;
    benign_std?: number;
    attack_mean?: number;
    attack_median?: number;
    attack_std?: number;
    min_val?: number;
    max_val?: number;
  };
}

export interface TreeDecisionSplit {
  node_id: number;
  feature: string;
  threshold: number;
  value: number;
  direction_taken: string;
  purity_or_class: string;
}

export interface ModelInterpretabilityResponse {
  active_model_name: string;
  model_architecture: string;
  feature_importance_comparison: Array<{
    rank: number;
    feature: string;
    category: string;
    gini_importance: number;
    permutation_importance: number;
    mean_shap_attribution: number;
  }>;
  tree_rules_sample: TreeDecisionSplit[];
  interpretability_score: string;
  evaluation_tradeoff: string;
}

export interface AttackProfileItem {
  attack_name: string;
  sample_count: number;
  severity: string;
  detection_rate: number;
  signature_features: Array<{
    feature: string;
    pattern: string;
    impact: string;
  }>;
  comparison_with_benign: string;
}

export interface SampleFlowItem {
  id: string;
  name: string;
  ground_truth: string;
  destination_port: number;
  flow_duration: number;
  total_fwd_packets: number;
  features: Record<string, any>;
}
