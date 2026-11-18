import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Database,
  Layers,
  Cpu,
  GitMerge,
  Workflow,
  Play,
  ShieldCheck,
  GitCompare,
  History,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  DatasetSelectionConfig,
  PreprocessingConfig,
  EnsembleConfig,
  ModelCatalogItem,
  DatasetMetadata,
  ExperimentStatus,
  ExperimentResults,
} from '../../types/lab';

import { DatasetStage } from './DatasetStage';
import { PreprocessingStage } from './PreprocessingStage';
import { BaseClassifiersStage } from './BaseClassifiersStage';
import { EnsembleStrategyStage } from './EnsembleStrategyStage';
import { VisualEnsembleBuilder } from './VisualEnsembleBuilder';
import { ExecutionStage } from './ExecutionStage';
import { EvaluationStage } from './EvaluationStage';
import { ComparativeAnalysisStage } from './ComparativeAnalysisStage';
import { ExperimentHistoryStage } from './ExperimentHistoryStage';

const DEFAULT_DATASET_CONFIG: DatasetSelectionConfig = {
  task_type: 'binary',
  train_rows: 200000,
  test_rows: 50000,
  random_seed: 42,
  stratified: true,
};

const DEFAULT_PREPROCESSING_CONFIG: PreprocessingConfig = {
  missing_value_strategy: 'median',
  scaling_strategy: 'standard',
  imbalance_strategy: 'none',
  feature_selection_strategy: 'all',
  top_k_features: 30,
  selected_features: [],
};

const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  strategy: 'voting',
  voting_type: 'soft',
  meta_classifier_id: 'logistic_regression',
  meta_classifier_hyperparameters: { C: 1.0, max_iter: 200 },
  cv_folds: 3,
  passthrough: false,
  base_estimator_id: 'decision_tree',
  n_estimators: 50,
  learning_rate: 0.1,
  max_samples: 0.8,
  subsample: 0.8,
  bootstrap: true,
  base_classifiers: [
    { model_id: 'decision_tree', enabled: true, hyperparameters: { max_depth: 15, criterion: 'gini' }, weight: 1.0 },
    { model_id: 'random_forest', enabled: true, hyperparameters: { n_estimators: 60, max_depth: 12 }, weight: 1.5 },
    { model_id: 'logistic_regression', enabled: true, hyperparameters: { C: 1.0, max_iter: 200 }, weight: 1.0 },
    { model_id: 'extra_trees', enabled: false, hyperparameters: { n_estimators: 50 }, weight: 1.0 },
    { model_id: 'gradient_boosting', enabled: false, hyperparameters: { n_estimators: 50, learning_rate: 0.1 }, weight: 1.0 },
    { model_id: 'adaboost', enabled: false, hyperparameters: { n_estimators: 50, learning_rate: 1.0 }, weight: 1.0 },
    { model_id: 'knn', enabled: false, hyperparameters: { n_neighbors: 5 }, weight: 1.0 },
    { model_id: 'svm', enabled: false, hyperparameters: { C: 1.0, kernel: 'rbf' }, weight: 1.0 },
    { model_id: 'naive_bayes', enabled: false, hyperparameters: { var_smoothing: 1e-9 }, weight: 1.0 },
  ],
};

const STAGES = [
  { id: 1, name: 'Dataset', icon: Database, desc: 'Partition & sampling' },
  { id: 2, name: 'Preprocessing', icon: Layers, desc: 'Impute, scale & SMOTE' },
  { id: 3, name: 'Base Learners', icon: Cpu, desc: '9 ML Classifiers' },
  { id: 4, name: 'Ensemble Strategy', icon: GitMerge, desc: 'Voting, Stacking, Bagging' },
  { id: 5, name: 'Blueprint Canvas', icon: Workflow, desc: 'Visual architecture' },
  { id: 6, name: 'Model Training', icon: Play, desc: 'Live execution' },
  { id: 7, name: 'Security Evaluation', icon: ShieldCheck, desc: 'False alarms vs missed' },
  { id: 8, name: 'Benchmarking', icon: GitCompare, desc: 'Comparative trade-offs' },
  { id: 9, name: 'Lab Ledger', icon: History, desc: 'Provenance & history' },
];

export const EnsembleLab: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [datasetConfig, setDatasetConfig] = useState<DatasetSelectionConfig>(DEFAULT_DATASET_CONFIG);
  const [preprocessingConfig, setPreprocessingConfig] = useState<PreprocessingConfig>(DEFAULT_PREPROCESSING_CONFIG);
  const [ensembleConfig, setEnsembleConfig] = useState<EnsembleConfig>(DEFAULT_ENSEMBLE_CONFIG);

  const [availableModels, setAvailableModels] = useState<ModelCatalogItem[]>([]);
  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata | null>(null);
  const [activeExperiment, setActiveExperiment] = useState<ExperimentStatus | null>(null);
  const [latestResults, setLatestResults] = useState<ExperimentResults | null>(null);
  const [evalExperimentName, setEvalExperimentName] = useState<string>('Current Experiment');

  // Load catalog & metadata on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [modelsRes, metaRes] = await Promise.all([
          api.getAvailableModels(),
          api.getDatasetMetadata(),
        ]);
        setAvailableModels(modelsRes.base_classifiers || []);
        setDatasetMetadata(metaRes);
      } catch (err) {
        console.error('Failed to initialize Ensemble Lab metadata', err);
      }
    };
    init();
  }, []);

  // Quick Preset Handlers
  const applyPreset = (preset: 'balanced' | 'max_recall' | 'ultra_fast' | 'stacking') => {
    if (preset === 'balanced') {
      setDatasetConfig((prev) => ({ ...prev, train_rows: 200000, test_rows: 50000 }));
      setPreprocessingConfig({
        missing_value_strategy: 'median',
        scaling_strategy: 'standard',
        imbalance_strategy: 'none',
        feature_selection_strategy: 'all',
        top_k_features: 30,
        selected_features: [],
      });
      setEnsembleConfig({
        ...DEFAULT_ENSEMBLE_CONFIG,
        strategy: 'voting',
        voting_type: 'soft',
        base_classifiers: [
          { model_id: 'random_forest', enabled: true, hyperparameters: { n_estimators: 60, max_depth: 12 }, weight: 2.0 },
          { model_id: 'extra_trees', enabled: true, hyperparameters: { n_estimators: 50, max_depth: 12 }, weight: 1.5 },
          { model_id: 'logistic_regression', enabled: true, hyperparameters: { C: 1.0, max_iter: 200 }, weight: 1.0 },
          { model_id: 'decision_tree', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'gradient_boosting', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'adaboost', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'knn', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'svm', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'naive_bayes', enabled: false, hyperparameters: {}, weight: 1.0 },
        ],
      });
    } else if (preset === 'max_recall') {
      // Prioritize catching intrusions by using SMOTE and boosting
      setPreprocessingConfig((prev) => ({
        ...prev,
        scaling_strategy: 'robust',
        imbalance_strategy: 'smote',
      }));
      setEnsembleConfig({
        ...DEFAULT_ENSEMBLE_CONFIG,
        strategy: 'boosting',
        n_estimators: 60,
        learning_rate: 0.1,
        base_estimator_id: 'decision_tree',
        base_classifiers: DEFAULT_ENSEMBLE_CONFIG.base_classifiers,
      });
    } else if (preset === 'ultra_fast') {
      setDatasetConfig((prev) => ({ ...prev, train_rows: 200000, test_rows: 50000 }));
      setPreprocessingConfig((prev) => ({
        ...prev,
        scaling_strategy: 'minmax',
        feature_selection_strategy: 'top_k',
        top_k_features: 20,
      }));
      setEnsembleConfig({
        ...DEFAULT_ENSEMBLE_CONFIG,
        strategy: 'voting',
        voting_type: 'hard',
        base_classifiers: [
          { model_id: 'decision_tree', enabled: true, hyperparameters: { max_depth: 8 }, weight: 1.0 },
          { model_id: 'naive_bayes', enabled: true, hyperparameters: {}, weight: 1.0 },
          { model_id: 'random_forest', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'logistic_regression', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'extra_trees', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'gradient_boosting', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'adaboost', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'knn', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'svm', enabled: false, hyperparameters: {}, weight: 1.0 },
        ],
      });
    } else if (preset === 'stacking') {
      setEnsembleConfig({
        ...DEFAULT_ENSEMBLE_CONFIG,
        strategy: 'stacking',
        meta_classifier_id: 'logistic_regression',
        cv_folds: 3,
        passthrough: false,
        base_classifiers: [
          { model_id: 'random_forest', enabled: true, hyperparameters: { n_estimators: 40, max_depth: 10 }, weight: 1.0 },
          { model_id: 'decision_tree', enabled: true, hyperparameters: { max_depth: 10 }, weight: 1.0 },
          { model_id: 'extra_trees', enabled: true, hyperparameters: { n_estimators: 40 }, weight: 1.0 },
          { model_id: 'logistic_regression', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'gradient_boosting', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'adaboost', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'knn', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'svm', enabled: false, hyperparameters: {}, weight: 1.0 },
          { model_id: 'naive_bayes', enabled: false, hyperparameters: {}, weight: 1.0 },
        ],
      });
    }
  };

  const handleExperimentCompleted = (results: ExperimentResults, expId: string) => {
    setLatestResults(results);
    setEvalExperimentName(activeExperiment?.name || `Experiment ${expId.slice(0, 8)}`);
  };

  const handleLoadExperimentToEval = async (id: string) => {
    try {
      const details = await api.getExperimentDetails(id);
      if (details.metrics) {
        setLatestResults(details.metrics);
        setEvalExperimentName(details.name);
        setActiveStage(7); // Jump to Evaluation Stage
      } else {
        alert('This experiment has not recorded final metrics yet.');
      }
    } catch (err: any) {
      alert(`Could not load experiment: ${err.message}`);
    }
  };

  const handleRerunExperiment = async (id: string) => {
    try {
      const status = await api.rerunExperiment(id);
      setActiveExperiment(status);
      setActiveStage(6); // Jump to Execution Stage
    } catch (err: any) {
      alert(`Could not rerun experiment: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* Top Banner & Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-soc-card via-soc-card/90 to-soc-bg border border-soc-border shadow-card relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-soc-accent/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-soc-accent/20 text-soc-accent border border-soc-accent/40 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-soc-accent animate-pulse" />
                Live ML Lab Engine
              </span>
              <span className="text-[10px] text-soc-muted">
                CIC-IDS-2017 Real-Time Research Workbench
              </span>
            </div>
            <h1 className="text-2xl font-bold text-soc-text flex items-center gap-3">
              <FlaskConical className="w-7 h-7 text-soc-accent" />
              Ensemble Intelligence Lab
            </h1>
            <p className="text-xs text-soc-muted mt-1 max-w-3xl leading-relaxed">
              Design, calibrate, train, and benchmark custom cybersecurity ensemble architectures.
              Test hypotheses on live network telemetry, tune base learner weights, and analyze the operational trade-off
              between Missed Attacks (False Negatives) and Analyst Fatigue (False Positives).
            </p>
          </div>

          {/* Quick Presets Menu */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-soc-bg/60 p-2.5 rounded-xl border border-soc-border shrink-0">
            <span className="text-[10px] text-soc-muted uppercase tracking-wider font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-soc-accent" /> Presets:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => applyPreset('balanced')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-soc-card border border-soc-border hover:border-soc-accent text-soc-text transition-colors"
              >
                Balanced Voting
              </button>
              <button
                onClick={() => applyPreset('stacking')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-soc-card border border-soc-border hover:border-soc-accent text-soc-text transition-colors"
              >
                Meta-Stacking
              </button>
              <button
                onClick={() => applyPreset('max_recall')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-soc-card border border-soc-border hover:border-soc-warning text-soc-warning transition-colors"
              >
                Max Recall (SMOTE)
              </button>
              <button
                onClick={() => applyPreset('ultra_fast')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-soc-card border border-soc-border hover:border-soc-accent text-soc-muted hover:text-soc-text transition-colors"
              >
                Ultra-Fast
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Stage Step Indicator */}
      <div className="rounded-xl border border-soc-border bg-soc-card/70 p-2 overflow-x-auto shadow-card">
        <div className="flex items-center min-w-max gap-1">
          {STAGES.map((stg) => {
            const Icon = stg.icon;
            const isActive = activeStage === stg.id;
            const isCompleted = activeStage > stg.id;

            return (
              <button
                key={stg.id}
                onClick={() => setActiveStage(stg.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all text-left ${
                  isActive
                    ? 'bg-soc-accent text-soc-bg font-bold shadow-md'
                    : isCompleted
                    ? 'bg-soc-card hover:bg-soc-border/40 text-soc-text border border-soc-border/50'
                    : 'text-soc-muted hover:text-soc-text hover:bg-soc-border/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${
                    isActive
                      ? 'bg-soc-bg text-soc-accent font-bold'
                      : isCompleted
                      ? 'bg-soc-accent/20 text-soc-accent'
                      : 'bg-soc-bg/50 text-soc-muted'
                  }`}
                >
                  {isCompleted ? '✓' : stg.id}
                </div>
                <div className="flex flex-col">
                  <span className="leading-tight flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5" />
                    {stg.name}
                  </span>
                  <span
                    className={`text-[9px] ${
                      isActive ? 'text-soc-bg/80' : 'text-soc-muted'
                    }`}
                  >
                    {stg.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stage Workspace Area */}
      <div className="min-h-[500px]">
        {activeStage === 1 && (
          <DatasetStage
            config={datasetConfig}
            onChange={setDatasetConfig}
            metadata={datasetMetadata}
          />
        )}

        {activeStage === 2 && (
          <PreprocessingStage
            datasetConfig={datasetConfig}
            config={preprocessingConfig}
            onChange={setPreprocessingConfig}
          />
        )}

        {activeStage === 3 && (
          <BaseClassifiersStage
            availableModels={availableModels}
            ensembleConfig={ensembleConfig}
            onChange={setEnsembleConfig}
          />
        )}

        {activeStage === 4 && (
          <EnsembleStrategyStage
            config={ensembleConfig}
            onChange={setEnsembleConfig}
          />
        )}

        {activeStage === 5 && (
          <div className="space-y-6">
            <VisualEnsembleBuilder
              ensembleConfig={ensembleConfig}
              preprocessingConfig={preprocessingConfig}
              availableModels={availableModels}
              featureCount={datasetMetadata?.feature_count || 78}
            />
            <div className="p-4 rounded-xl bg-soc-card border border-soc-border flex items-center justify-between">
              <span className="text-xs text-soc-muted">
                Architecture Blueprint Verified. Ready to initialize cross-validation & training loop.
              </span>
              <button
                onClick={() => setActiveStage(6)}
                className="px-4 py-2 rounded-lg bg-soc-accent text-soc-bg font-bold text-xs flex items-center gap-2 hover:bg-soc-accent/90 transition-all shadow-md"
              >
                Proceed to Model Training <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeStage === 6 && (
          <ExecutionStage
            datasetConfig={datasetConfig}
            preprocessingConfig={preprocessingConfig}
            ensembleConfig={ensembleConfig}
            activeExperiment={activeExperiment}
            onExperimentStarted={setActiveExperiment}
            onExperimentCompleted={handleExperimentCompleted}
            onNavigateToEvaluation={() => setActiveStage(7)}
          />
        )}

        {activeStage === 7 && (
          <EvaluationStage
            results={latestResults}
            experimentName={evalExperimentName}
          />
        )}

        {activeStage === 8 && (
          <ComparativeAnalysisStage
            onLoadExperimentToEval={handleLoadExperimentToEval}
          />
        )}

        {activeStage === 9 && (
          <ExperimentHistoryStage
            onLoadExperiment={handleLoadExperimentToEval}
            onRerunExperiment={handleRerunExperiment}
          />
        )}
      </div>

      {/* Bottom Stage Progression Bar */}
      <div className="p-4 rounded-xl bg-soc-card border border-soc-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={() => setActiveStage((prev) => Math.max(1, prev - 1))}
          disabled={activeStage === 1}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-soc-border text-soc-muted hover:text-soc-text hover:bg-soc-border/40 disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Previous Stage
        </button>

        <div className="flex items-center gap-2 text-xs text-soc-muted">
          Stage {activeStage} of {STAGES.length}: <span className="text-soc-text font-bold">{STAGES[activeStage - 1].name}</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeStage < 6 && (
            <button
              onClick={() => setActiveStage(6)}
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-soc-accent/40 bg-soc-accent/10 text-soc-accent hover:bg-soc-accent/20 text-xs flex items-center justify-center gap-1.5 transition-colors font-semibold"
            >
              <Play className="w-3.5 h-3.5" /> Quick Train
            </button>
          )}

          <button
            onClick={() => setActiveStage((prev) => Math.min(STAGES.length, prev + 1))}
            disabled={activeStage === STAGES.length}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-soc-accent text-soc-bg font-bold text-xs flex items-center justify-center gap-2 hover:bg-soc-accent/90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
          >
            Next Stage <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
