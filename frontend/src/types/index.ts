export type ThreatSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal' | 'Unknown';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  model_loaded: boolean;
  model_name: string;
  model_type: string;
  feature_count: number;
  dataset_available: boolean;
  sample_dataset_path: string;
  active_features_sample: string[];
}

export interface FlowPredictionItem {
  flow_id: number;
  prediction: 'Benign' | 'Attack';
  is_attack: boolean;
  attack_probability: number | null;
  confidence: number | null;
  severity: ThreatSeverity;
  top_risk_features: string[];
  flow_metadata: Record<string, any>;
}

export interface SeverityCount {
  severity: ThreatSeverity;
  count: number;
  percentage: number;
  color: string;
}

export interface TrafficVolumePoint {
  time_label: string;
  total_flows: number;
  attack_flows: number;
  benign_flows: number;
}

export interface AttackCategoryItem {
  category: string;
  count: number;
  percentage: number;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  rank: number;
}

export interface DashboardSummary {
  total_flows_analyzed: number;
  benign_flows_detected: number;
  malicious_flows_detected: number;
  threat_detection_rate: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  low_alerts: number;
  avg_confidence: number;
  model_accuracy: number;
  model_f1: number;
  model_name: string;
  severity_distribution: SeverityCount[];
  traffic_timeline: TrafficVolumePoint[];
  attack_distribution: AttackCategoryItem[];
  top_features: FeatureImportanceItem[];
  recent_alerts: FlowPredictionItem[];
  last_updated: string;
}

export interface NetworkFlowRecord {
  id: number;
  destination_port: number | null;
  flow_duration: number | null;
  total_fwd_packets: number | null;
  total_bwd_packets: number | null;
  packet_length_mean: number | null;
  flow_bytes_per_sec: number | null;
  flow_packets_per_sec: number | null;
  prediction: 'Benign' | 'Attack';
  attack_probability: number | null;
  severity: ThreatSeverity;
  is_attack: boolean;
  timestamp_simulated: string;
  raw_features: Record<string, any>;
}

export interface PaginatedTraffic {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: NetworkFlowRecord[];
}

export interface LiveStreamStatus {
  is_active: boolean;
  speed_seconds: number;
  buffer_size: number;
  total_streamed: number;
  current_attack_rate: number;
}

export interface HistogramBin {
  bin_range: string;
  count: number;
}

export interface PortActivityItem {
  port: number;
  service_hint: string;
  flow_count: number;
  attack_count: number;
  benign_count: number;
  attack_percentage: number;
}

export interface AnalyticsData {
  sample_size: number;
  benign_count: number;
  attack_count: number;
  flow_duration_stats: {
    min_ms: number;
    max_ms: number;
    median_ms: number;
    mean_ms: number;
    histogram: HistogramBin[];
  };
  packet_stats: {
    avg_fwd_packets: number;
    avg_bwd_packets: number;
    avg_packet_size: number;
    histogram: HistogramBin[];
  };
  top_destination_ports: PortActivityItem[];
  fwd_vs_bwd_packet_ratios: Array<{
    label: string;
    avg_fwd_packets: number;
    avg_bwd_packets: number;
    sample_count: number;
  }>;
}

export interface ModelBenchmarkRow {
  model: string;
  accuracy: number;
  training_accuracy?: number | null;
  generalization_gap?: number | null;
  training_accuracy?: number | null;
  generalization_gap?: number | null;
  precision_attack: number;
  recall_attack: number;
  f1_attack: number;
  roc_auc: number | null;
  average_precision: number | null;
  training_time_seconds: number;
  prediction_time_seconds: number;
  confusion_matrix: number[][] | null;
  is_ensemble: boolean;
}

export interface FeatureImportanceDetail {
  feature: string;
  importance: number;
  rank: number;
  category: string;
}

export interface ModelPerformanceData {
  active_model_name: string;
  model_type: string;
  feature_count: number;
  models_compared: ModelBenchmarkRow[];
  practical_model_metadata: Record<string, any>;
  feature_importances: FeatureImportanceDetail[];
  confusion_matrix_active: {
    labels: string[];
    matrix: number[][];
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
    true_positives: number;
  };
}

export interface PredictionBatchResponse {
  total_processed: number;
  attack_count: number;
  benign_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  results: FlowPredictionItem[];
}

export interface InteractivePredictionResponse {
  predicted_label: string;
  verdict_title: string;
  status: string;
  is_attack: boolean;
  confidence: number | null;
  attack_probability: number | null;
  benign_probability: number | null;
  probabilities: Record<string, number>;
  model_name: string;
  model_architecture: string;
  feature_count_used: number;
}

export interface FeatureFieldMeta {
  name: string;
  label: string;
  category: string;
  description: string;
  data_type: string;
  default_value: number;
}

export interface FeatureGroupMeta {
  category_id: string;
  title: string;
  description: string;
  features: FeatureFieldMeta[];
}

export interface PredictionSchemaResponse {
  feature_names: string[];
  feature_count: number;
  groups: FeatureGroupMeta[];
  classes: string[];
  sample_benign: Record<string, number>;
  sample_attack: Record<string, number>;
}
