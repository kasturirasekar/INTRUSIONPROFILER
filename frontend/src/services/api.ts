import axios from 'axios';
import {
  HealthStatus,
  DashboardSummary,
  PaginatedTraffic,
  LiveStreamStatus,
  NetworkFlowRecord,
  AnalyticsData,
  ModelPerformanceData,
  FeatureImportanceDetail,
  PredictionBatchResponse,
  InteractivePredictionResponse,
  PredictionSchemaResponse,
} from '../types';
import {
  DatasetMetadata,
  DatasetPreview,
  DatasetSelectionConfig,
  PreprocessingConfig,
  PreprocessingPreview,
  AvailableModels,
  ExperimentStatus,
  ExperimentSummaryItem,
  ExperimentDetail,
  ExperimentResults,
  ComparativeAnalysisResponse,
} from '../types/lab';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '8000') {
      return '';
    }
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:8000`;
  }
  return 'http://127.0.0.1:8000';
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health
  getHealth: async (): Promise<HealthStatus> => {
    const res = await apiClient.get<HealthStatus>('/health');
    return res.data;
  },

  // Dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return res.data;
  },

  // Traffic
  getTraffic: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    severity?: string;
    prediction?: string;
  }): Promise<PaginatedTraffic> => {
    const res = await apiClient.get<PaginatedTraffic>('/traffic', { params });
    return res.data;
  },

  getStreamBatch: async (batchSize: number = 10): Promise<{ status: LiveStreamStatus; items: NetworkFlowRecord[] }> => {
    const res = await apiClient.get('/traffic/stream', { params: { batch_size: batchSize } });
    return res.data;
  },

  toggleStream: async (active?: boolean): Promise<LiveStreamStatus> => {
    const res = await apiClient.post<LiveStreamStatus>('/traffic/stream/toggle', null, {
      params: active !== undefined ? { active } : {},
    });
    return res.data;
  },

  // Threats
  getThreats: async (params?: {
    page?: number;
    page_size?: number;
    severity?: string;
    search?: string;
  }): Promise<PaginatedTraffic> => {
    const res = await apiClient.get<PaginatedTraffic>('/threats', { params });
    return res.data;
  },

  // Analytics
  getAnalytics: async (): Promise<AnalyticsData> => {
    const res = await apiClient.get<AnalyticsData>('/analytics');
    return res.data;
  },

  // Model
  getModelPerformance: async (): Promise<ModelPerformanceData> => {
    const res = await apiClient.get<ModelPerformanceData>('/model/performance');
    return res.data;
  },

  getFeatureImportance: async (): Promise<FeatureImportanceDetail[]> => {
    const res = await apiClient.get<FeatureImportanceDetail[]>('/model/feature-importance');
    return res.data;
  },

  // Predictions
  getPredictionSchema: async (): Promise<PredictionSchemaResponse> => {
    const res = await apiClient.get<PredictionSchemaResponse>('/predict/schema');
    return res.data;
  },

  predictInteractive: async (record: Record<string, any>): Promise<InteractivePredictionResponse> => {
    const res = await apiClient.post<InteractivePredictionResponse>('/predict/interactive', { record });
    return res.data;
  },

  predictSingle: async (record: Record<string, any>): Promise<PredictionBatchResponse> => {
    const res = await apiClient.post<PredictionBatchResponse>('/predict', { record });
    return res.data;
  },

  predictBatch: async (records: Array<Record<string, any>>): Promise<PredictionBatchResponse> => {
    const res = await apiClient.post<PredictionBatchResponse>('/predict/batch', { records });
    return res.data;
  },

  uploadPredictionFile: async (file: File): Promise<PredictionBatchResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/predict/upload-csv` : '/api/predict/upload-csv';

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
      });
    } catch (networkErr: any) {
      throw new Error(
        'Failed to connect to the backend server. Please verify the FastAPI server is running at http://127.0.0.1:8000.'
      );
    }

    if (!response.ok) {
      let errorDetail = 'Failed to process flow file.';
      try {
        const errorJson = await response.json();
        if (typeof errorJson.detail === 'string') {
          errorDetail = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        }
      } catch {
        errorDetail = `Server error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    return (await response.json()) as PredictionBatchResponse;
  },

  // Reports
  getExecutiveSummary: async (): Promise<Record<string, any>> => {
    const res = await apiClient.get('/reports/summary');
    return res.data;
  },

  getExportCsvUrl: (maxRows: number = 5000): string => {
    return API_BASE_URL
      ? `${API_BASE_URL}/api/reports/export-csv?max_rows=${maxRows}`
      : `/api/reports/export-csv?max_rows=${maxRows}`;
  },

  // ---------------- Ensemble Intelligence Lab ----------------
  getDatasetMetadata: async (): Promise<DatasetMetadata> => {
    const res = await apiClient.get<DatasetMetadata>('/datasets/metadata');
    return res.data;
  },

  previewDataset: async (config: DatasetSelectionConfig): Promise<DatasetPreview> => {
    const res = await apiClient.post<DatasetPreview>('/datasets/preview', config);
    return res.data;
  },

  previewPreprocessing: async (
    datasetConfig: DatasetSelectionConfig,
    preprocessingConfig: PreprocessingConfig
  ): Promise<PreprocessingPreview> => {
    const res = await apiClient.post<PreprocessingPreview>('/preprocessing/preview', {
      dataset_config: datasetConfig,
      preprocessing_config: preprocessingConfig,
    });
    return res.data;
  },

  getAvailableModels: async (): Promise<AvailableModels> => {
    const res = await apiClient.get<AvailableModels>('/ensemble/available-models');
    return res.data;
  },

  createExperiment: async (data: {
    name: string;
    dataset_config: DatasetSelectionConfig;
    preprocessing_config: PreprocessingConfig;
    ensemble_config: any;
    notes?: string;
  }): Promise<ExperimentStatus> => {
    const res = await apiClient.post<ExperimentStatus>('/experiments', data);
    return res.data;
  },

  listExperiments: async (limit: number = 50): Promise<ExperimentSummaryItem[]> => {
    const res = await apiClient.get<ExperimentSummaryItem[]>('/experiments', { params: { limit } });
    return res.data;
  },

  getExperimentDetails: async (id: string): Promise<ExperimentDetail> => {
    const res = await apiClient.get<ExperimentDetail>(`/experiments/${id}`);
    return res.data;
  },

  getExperimentStatus: async (id: string): Promise<ExperimentStatus> => {
    const res = await apiClient.get<ExperimentStatus>(`/experiments/${id}/status`);
    return res.data;
  },

  getExperimentResults: async (id: string): Promise<ExperimentResults> => {
    const res = await apiClient.get<ExperimentResults>(`/experiments/${id}/results`);
    return res.data;
  },

  rerunExperiment: async (id: string): Promise<ExperimentStatus> => {
    const res = await apiClient.post<ExperimentStatus>(`/experiments/${id}/rerun`);
    return res.data;
  },

  deleteExperiment: async (id: string): Promise<{ status: string; id: string }> => {
    const res = await apiClient.delete<{ status: string; id: string }>(`/experiments/${id}`);
    return res.data;
  },

  compareExperiments: async (experimentIds: string[]): Promise<ComparativeAnalysisResponse> => {
    const res = await apiClient.post<ComparativeAnalysisResponse>('/experiments/compare', {
      experiment_ids: experimentIds,
    });
    return res.data;
  },

  // ---------------- Explainable AI (XAI) ----------------
  getXaiMethods: async (): Promise<any> => {
    const res = await apiClient.get('/explainability/methods');
    return res.data;
  },

  getSampleFlows: async (): Promise<import('../types/explainability').SampleFlowItem[]> => {
    const res = await apiClient.get('/explainability/sample-flows');
    return res.data;
  },

  explainPrediction: async (data: {
    flow_id?: string;
    flow_index?: number;
    flow_features?: Record<string, any>;
    num_features?: number;
  }): Promise<import('../types/explainability').PredictionExplanationResponse> => {
    const res = await apiClient.post('/explainability/prediction', data);
    return res.data;
  },

  getShapLocal: async (data: {
    flow_features: Record<string, any>;
    background_samples?: number;
    num_features?: number;
    target_class?: 'Attack' | 'Benign';
  }): Promise<any> => {
    const res = await apiClient.post('/explainability/shap/local', data);
    return res.data;
  },

  getShapGlobal: async (data?: {
    sample_size?: number;
    num_features?: number;
    target_class?: 'Attack' | 'Benign';
  }): Promise<import('../types/explainability').ShapGlobalResponse> => {
    const res = await apiClient.post('/explainability/shap/global', data || {});
    return res.data;
  },

  getLimeExplanation: async (data: {
    flow_features: Record<string, any>;
    num_perturbations?: number;
    num_features?: number;
  }): Promise<import('../types/explainability').LimeExplanationResponse> => {
    const res = await apiClient.post('/explainability/lime', data);
    return res.data;
  },

  getCounterfactual: async (data: {
    flow_features: Record<string, any>;
    target_class?: 'Benign' | 'Attack';
    max_features_to_change?: number;
    desired_probability_threshold?: number;
  }): Promise<import('../types/explainability').CounterfactualResponse> => {
    const res = await apiClient.post('/explainability/counterfactual', data);
    return res.data;
  },

  getEnsembleExplanation: async (data: {
    flow_features: Record<string, any>;
  }): Promise<import('../types/explainability').EnsembleExplainResponse> => {
    const res = await apiClient.post('/explainability/ensemble', data);
    return res.data;
  },

  getAllFeaturesIntelligence: async (): Promise<import('../types/explainability').FeatureIntelligenceItem[]> => {
    const res = await apiClient.get('/explainability/features');
    return res.data;
  },

  getFeatureIntelligence: async (featureName: string): Promise<import('../types/explainability').FeatureIntelligenceItem> => {
    const res = await apiClient.get(`/explainability/features/${encodeURIComponent(featureName)}`);
    return res.data;
  },

  getModelInterpretability: async (): Promise<import('../types/explainability').ModelInterpretabilityResponse> => {
    const res = await apiClient.get('/explainability/interpretability');
    return res.data;
  },

  getAttackProfiles: async (): Promise<import('../types/explainability').AttackProfileItem[]> => {
    const res = await apiClient.get('/explainability/attack-profiles');
    return res.data;
  },

  // ---------------- Unified Ensemble & Explainability Studio ----------------
  uploadStudioDataset: async (file: File): Promise<import('../types/studio').DatasetUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const url = API_BASE_URL ? `${API_BASE_URL}/api/studio/datasets/upload` : '/api/studio/datasets/upload';
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to upload CSV' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return (await response.json()) as import('../types/studio').DatasetUploadResponse;
  },

  loadStudioSampleDataset: async (taskType: string = 'binary', maxRows: number = 5000): Promise<import('../types/studio').DatasetUploadResponse> => {
    const res = await apiClient.post('/studio/datasets/sample', null, {
      params: { task_type: taskType, max_rows: maxRows },
    });
    return res.data;
  },

  getStudioDatasetPreview: async (datasetId: string, limit: number = 20): Promise<any> => {
    const res = await apiClient.get(`/studio/datasets/${datasetId}/preview`, { params: { limit } });
    return res.data;
  },

  createStudioExperiment: async (data: import('../types/studio').StudioExperimentRequest): Promise<import('../types/studio').StudioExperimentStatus> => {
    const res = await apiClient.post('/studio/experiments', data);
    return res.data;
  },

  getStudioExperimentStatus: async (expId: string): Promise<import('../types/studio').StudioExperimentStatus> => {
    const res = await apiClient.get(`/studio/experiments/${expId}/status`);
    return res.data;
  },

  getStudioExperimentResults: async (expId: string): Promise<import('../types/studio').StudioExperimentResult> => {
    const res = await apiClient.get(`/studio/experiments/${expId}/results`);
    return res.data;
  },

  predictStudioHeldoutSample: async (expId: string, sampleIndex: number): Promise<import('../types/studio').StudioSamplePredictionResponse> => {
    const res = await apiClient.post(`/studio/experiments/${expId}/predict-sample`, { sample_index: sampleIndex });
    return res.data;
  },

  explainStudioRecord: async (data: import('../types/studio').StudioExplainRequest): Promise<import('../types/studio').StudioFullExplanationResponse> => {
    const res = await apiClient.post('/studio/explain', data);
    return res.data;
  },

  listStudioExperiments: async (): Promise<any[]> => {
    const res = await apiClient.get('/studio/experiments');
    return res.data;
  },

  compareStudioExperiments: async (experimentIds: string[]): Promise<any[]> => {
    const res = await apiClient.post('/studio/experiments/compare', { experiment_ids: experimentIds });
    return res.data;
  },

  deleteStudioExperiment: async (experimentId: string): Promise<any> => {
    const res = await apiClient.delete(`/studio/experiments/${experimentId}`);
    return res.data;
  },

  // ---------------- Research & Evaluation Suite ----------------
  runBenchmark: async (data: import('../types/research').BenchmarkRunRequest): Promise<import('../types/research').BenchmarkRunResponse> => {
    const res = await apiClient.post('/research/benchmark', data);
    return res.data;
  },

  runRobustnessExperiment: async (data: import('../types/research').RobustnessExperimentRequest): Promise<import('../types/research').RobustnessExperimentResponse> => {
    const res = await apiClient.post('/research/robustness', data);
    return res.data;
  },

  analyzeTrafficDrift: async (data: import('../types/research').DriftAnalysisRequest): Promise<import('../types/research').DriftAnalysisResponse> => {
    const res = await apiClient.post('/research/drift', data);
    return res.data;
  },

  checkExplanationStability: async (data: { experiment_id: string; record_index: number; epsilon?: number }): Promise<import('../types/research').ExplanationStabilityResponse> => {
    const res = await apiClient.post('/research/explain/stability', data);
    return res.data;
  },

  checkCounterfactualFeasibility: async (experimentId: string, recordIndex: number = 0): Promise<import('../types/research').FeasibleCounterfactualResponse> => {
    const res = await apiClient.get('/research/explain/feasibility', {
      params: { experiment_id: experimentId, record_index: recordIndex },
    });
    return res.data;
  },
};
