import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  RotateCw,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Gauge,
  ArrowRight,
  TrendingDown,
  Info,
  Server,
  FileCheck2,
  FileQuestion,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../services/api';
import {
  BenchmarkRunRequest,
  BenchmarkRunResponse,
  ModelEvaluationResult,
  RobustnessExperimentResponse,
  DriftAnalysisResponse,
  ExplanationStabilityResponse,
  FeasibleCounterfactualResponse,
} from '../types/research';

export const ResearchStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'benchmark' | 'robustness' | 'drift' | 'stability'>('benchmark');

  // Shared Dataset Selection
  const [datasetId, setDatasetId] = useState<string>('sample_cic_ids_multiclass');
  const [taskType, setTaskType] = useState<'auto' | 'binary' | 'multiclass'>('auto');
  const [evalStrategy, setEvalStrategy] = useState<'stratified_split' | 'cross_validation' | 'holdout'>('stratified_split');
  const [cvFolds, setCvFolds] = useState<number>(5);

  // Available models for benchmarking
  const ALL_BENCHMARK_MODELS = [
    { id: 'decision_tree', name: 'Decision Tree', isEnsemble: false },
    { id: 'logistic_regression', name: 'Logistic Regression', isEnsemble: false },
    { id: 'naive_bayes', name: 'Naive Bayes', isEnsemble: false },
    { id: 'random_forest', name: 'Random Forest', isEnsemble: true },
    { id: 'extra_trees', name: 'Extra Trees', isEnsemble: true },
    { id: 'gradient_boosting', name: 'Gradient Boosting', isEnsemble: true },
    { id: 'adaboost', name: 'AdaBoost', isEnsemble: true },
    { id: 'voting', name: 'Voting Ensemble', isEnsemble: true },
    { id: 'bagging', name: 'Bagging Ensemble', isEnsemble: true },
    { id: 'stacking', name: 'Stacking Ensemble', isEnsemble: true },
  ];

  const [selectedModels, setSelectedModels] = useState<string[]>([
    'decision_tree',
    'logistic_regression',
    'random_forest',
    'gradient_boosting',
    'voting',
    'stacking',
  ]);

  // Benchmark State
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkRunResponse | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  // Robustness State
  const [stressType, setStressType] = useState<'feature_noise' | 'missing_values' | 'distribution_shift' | 'minority_imbalance'>('feature_noise');
  const [stressIntensity, setStressIntensity] = useState<number>(0.15);
  const [baselineModel, setBaselineModel] = useState<string>('decision_tree');
  const [ensembleModel, setEnsembleModel] = useState<string>('random_forest');
  const [robustnessLoading, setRobustnessLoading] = useState(false);
  const [robustnessResult, setRobustnessResult] = useState<RobustnessExperimentResponse | null>(null);

  // Drift State
  const [refDatasetId, setRefDatasetId] = useState<string>('sample_cic_ids_binary');
  const [incDatasetId, setIncDatasetId] = useState<string>('sample_drifted_traffic');
  const [driftLoading, setDriftLoading] = useState(false);
  const [driftResult, setDriftResult] = useState<DriftAnalysisResponse | null>(null);

  // Stability State
  const [recentExperiments, setRecentExperiments] = useState<any[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>('');
  const [epsilonVal, setEpsilonVal] = useState<number>(0.02);
  const [stabilityLoading, setStabilityLoading] = useState(false);
  const [stabilityResult, setStabilityResult] = useState<ExplanationStabilityResponse | null>(null);
  const [feasibilityResult, setFeasibilityResult] = useState<FeasibleCounterfactualResponse | null>(null);

  useEffect(() => {
    // Load available experiments for stability inspect
    api.listStudioExperiments().then((exps) => {
      setRecentExperiments(exps);
      if (exps.length > 0) {
        setSelectedExpId(exps[0].experiment_id);
      }
    }).catch(() => {});
  }, []);

  // Handlers
  const handleRunBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await api.runBenchmark({
        dataset_id: datasetId,
        target_column: 'target',
        task_type: taskType,
        evaluation_strategy: evalStrategy,
        cv_folds: cvFolds,
        test_split_ratio: 0.25,
        random_seed: 42,
        selected_models: selectedModels,
      });
      setBenchmarkResult(res);
    } catch (err: any) {
      alert(`Benchmark execution failed: ${err.message || 'Check dataset availability'}`);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const handleRunRobustness = async () => {
    setRobustnessLoading(true);
    try {
      const res = await api.runRobustnessExperiment({
        dataset_id: datasetId,
        target_column: 'target',
        stress_type: stressType,
        stress_intensity: stressIntensity,
        baseline_model_id: baselineModel,
        ensemble_model_id: ensembleModel,
        random_seed: 42,
      });
      setRobustnessResult(res);
    } catch (err: any) {
      alert(`Robustness test failed: ${err.message || 'Check parameters'}`);
    } finally {
      setRobustnessLoading(false);
    }
  };

  const handleRunDrift = async () => {
    setDriftLoading(true);
    try {
      const res = await api.analyzeTrafficDrift({
        reference_dataset_id: refDatasetId,
        incoming_dataset_id: incDatasetId,
      });
      setDriftResult(res);
    } catch (err: any) {
      alert(`Drift analysis failed: ${err.message || 'Check datasets'}`);
    } finally {
      setDriftLoading(false);
    }
  };

  const handleCheckStability = async () => {
    if (!selectedExpId) return;
    setStabilityLoading(true);
    try {
      const [stab, feas] = await Promise.all([
        api.checkExplanationStability({ experiment_id: selectedExpId, record_index: 0, epsilon: epsilonVal }),
        api.checkCounterfactualFeasibility(selectedExpId, 0),
      ]);
      setStabilityResult(stab);
      setFeasibilityResult(feas);
    } catch (err: any) {
      alert(`Explanation check failed: ${err.message || 'Run an experiment first in Studio'}`);
    } finally {
      setStabilityLoading(false);
    }
  };

  const toggleModelSelection = (id: string) => {
    if (selectedModels.includes(id)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter((m) => m !== id));
      }
    } else {
      setSelectedModels([...selectedModels, id]);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-soc-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-soc-accent uppercase tracking-wider mb-1">
            <FlaskConical className="w-4 h-4" /> Academic Research & Experimental Evaluation Engine
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-text font-mono">
            Research & Model Evaluation
          </h1>
          <p className="text-xs sm:text-sm text-soc-muted mt-1">
            Reproducible multi-model benchmarking, controlled perturbation stress testing, traffic distribution drift, and explanation stability.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-soc-secondary border border-soc-border self-start sm:self-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'benchmark' ? 'bg-soc-card text-soc-accent shadow-sm font-semibold' : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Model Benchmark
          </button>
          <button
            onClick={() => setActiveTab('robustness')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'robustness' ? 'bg-soc-card text-soc-accent shadow-sm font-semibold' : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Robustness Stress Test
          </button>
          <button
            onClick={() => setActiveTab('drift')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'drift' ? 'bg-soc-card text-soc-accent shadow-sm font-semibold' : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Traffic Drift
          </button>
          <button
            onClick={() => setActiveTab('stability')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'stability' ? 'bg-soc-card text-soc-accent shadow-sm font-semibold' : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Explanation Stability
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UNIFIED MULTI-MODEL BENCHMARK ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'benchmark' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Card */}
          <div className="p-6 rounded-xl bg-soc-card border border-soc-border shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-soc-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-soc-text uppercase flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-soc-accent" /> Evaluation Configuration
                </h3>
                <p className="text-xs text-soc-muted mt-0.5">
                  Strict train/test isolation: learned preprocessing (median imputation & standard scaling) is fitted strictly on training data.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedModels(ALL_BENCHMARK_MODELS.map((m) => m.id))}
                  className="px-2.5 py-1 text-[11px] font-mono rounded bg-soc-secondary text-soc-muted hover:text-soc-text"
                >
                  Select All 10
                </button>
                <button
                  onClick={() => setSelectedModels(['decision_tree', 'random_forest', 'voting', 'stacking'])}
                  className="px-2.5 py-1 text-[11px] font-mono rounded bg-soc-secondary text-soc-muted hover:text-soc-text"
                >
                  Reset Default
                </button>
              </div>
            </div>

            {/* Config Grids */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="text-soc-muted block mb-1">Benchmark Dataset</label>
                <select
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                >
                  <option value="sample_cic_ids_multiclass">CIC-IDS-2017 Multiclass (12 Attack Categories)</option>
                  <option value="sample_cic_ids_binary">CIC-IDS-2017 Binary (Benign vs Attack)</option>
                  <option value="sample_lightweight_network_flows">Lightweight Network Flows (12 Key Features - Fast)</option>
                  <option value="sample_drifted_traffic">Covariate-Shifted Traffic (Stress Evaluation)</option>
                </select>
              </div>

              <div>
                <label className="text-soc-muted block mb-1">Evaluation Strategy</label>
                <select
                  value={evalStrategy}
                  onChange={(e) => setEvalStrategy(e.target.value as any)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                >
                  <option value="stratified_split">Stratified Random Split (75% Train / 25% Test)</option>
                  <option value="cross_validation">k-Fold Cross Validation (Out-of-fold Leakage Free)</option>
                  <option value="holdout">Chronological Holdout (First 75% Train / Last 25% Test)</option>
                </select>
              </div>

              {evalStrategy === 'cross_validation' ? (
                <div>
                  <label className="text-soc-muted block mb-1">Number of Folds (k)</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={cvFolds}
                    onChange={(e) => setCvFolds(parseInt(e.target.value) || 5)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-soc-muted block mb-1">Classification Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                  >
                    <option value="auto">Auto-detect from target column</option>
                    <option value="multiclass">Multi-class (Individual Attack Vectors)</option>
                    <option value="binary">Binary (Benign vs Attack)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Model Selection Chips */}
            <div>
              <span className="text-xs text-soc-muted font-mono block mb-2">
                Models Participating in Benchmark ({selectedModels.length} selected):
              </span>
              <div className="flex flex-wrap gap-2">
                {ALL_BENCHMARK_MODELS.map((m) => {
                  const isChecked = selectedModels.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleModelSelection(m.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-soc-accent/10 border-soc-accent text-soc-accent font-semibold'
                          : 'bg-soc-bg border-soc-border text-soc-muted hover:border-soc-borderLight'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${m.isEnsemble ? 'bg-amber-400' : 'bg-slate-400'}`} />
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-soc-border/60">
              <span className="text-xs font-mono text-soc-muted">
                Random Seed: <code className="text-soc-text">42</code> (Strictly Deterministic)
              </span>

              <button
                onClick={handleRunBenchmark}
                disabled={benchmarkLoading || selectedModels.length === 0}
                className="px-5 py-2.5 rounded-lg bg-soc-accent text-slate-950 text-xs font-mono font-bold hover:bg-soc-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {benchmarkLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
                {benchmarkLoading ? 'Running Rigorous Benchmark...' : 'Execute Evaluation Engine'}
              </button>
            </div>
          </div>

          {/* Benchmark Results */}
          {benchmarkResult && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-soc-card border border-soc-border flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                <div>
                  <span className="text-soc-muted">Evaluation ID: </span>
                  <code className="text-soc-text font-bold">{benchmarkResult.benchmark_id}</code>
                  <span className="mx-2 text-soc-border">|</span>
                  <span className="text-soc-muted">Strategy: </span>
                  <strong className="text-soc-text">{benchmarkResult.evaluation_strategy}</strong>
                  <span className="mx-2 text-soc-border">|</span>
                  <span className="text-soc-muted">Split: </span>
                  <strong className="text-soc-text">{benchmarkResult.train_records.toLocaleString()} Train / {benchmarkResult.test_records.toLocaleString()} Test</strong>
                </div>

                <div className="px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Top Performing Model: <strong>{benchmarkResult.top_performer}</strong>
                </div>
              </div>

              {/* Table */}
              <div className="bg-soc-card border border-soc-border rounded-xl shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-soc-border bg-soc-sidebar/60 text-[11px] text-soc-muted uppercase tracking-wider">
                        <th className="p-3.5">Model Architecture</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5 text-right">Accuracy</th>
                        <th className="p-3.5 text-right">Precision (Macro)</th>
                        <th className="p-3.5 text-right">Recall (Macro)</th>
                        <th className="p-3.5 text-right">Macro F1</th>
                        <th className="p-3.5 text-right">Weighted F1</th>
                        <th className="p-3.5 text-right">False Alarm (FPR)</th>
                        <th className="p-3.5 text-right">Miss Rate (FNR)</th>
                        <th className="p-3.5 text-right">Speed (ms/1k)</th>
                        <th className="p-3.5 text-right">Size (KB)</th>
                        <th className="p-3.5 text-center">Per-Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soc-border/40">
                      {benchmarkResult.results.map((res, i) => (
                        <React.Fragment key={res.model_id}>
                          <tr className={`hover:bg-soc-secondary/20 transition-colors ${i === 0 ? 'bg-soc-accent/5' : ''}`}>
                            <td className="p-3.5 font-bold text-soc-text flex items-center gap-2">
                              {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-soc-accent text-slate-950 font-bold uppercase">Rank 1</span>}
                              {res.name}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                res.is_ensemble
                                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                                  : 'bg-slate-700/30 text-slate-300 border border-slate-700'
                              }`}>
                                {res.is_ensemble ? 'Ensemble' : 'Baseline'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-bold text-soc-text">{(res.accuracy * 100).toFixed(2)}%</td>
                            <td className="p-3.5 text-right text-soc-muted">{(res.precision_macro * 100).toFixed(2)}%</td>
                            <td className="p-3.5 text-right text-soc-muted">{(res.recall_macro * 100).toFixed(2)}%</td>
                            <td className="p-3.5 text-right font-bold text-soc-accent">{(res.f1_macro * 100).toFixed(2)}%</td>
                            <td className="p-3.5 text-right text-soc-muted">{(res.f1_weighted * 100).toFixed(2)}%</td>
                            <td className="p-3.5 text-right text-emerald-400">{(res.false_positive_rate * 100).toFixed(2)}%</td>
                            <td className="p-3.5 text-right text-soc-critical">{(res.false_negative_rate * 100).toFixed(2)}%</td>
                            <td className="p-3.5 text-right text-soc-muted">{res.inference_latency_ms_per_1k.toFixed(1)} ms</td>
                            <td className="p-3.5 text-right text-soc-muted">{res.model_size_kb.toFixed(1)} KB</td>
                            <td className="p-3.5 text-center">
                              {res.per_class_metrics.length > 0 && (
                                <button
                                  onClick={() => setExpandedModel(expandedModel === res.model_id ? null : res.model_id)}
                                  className="px-2 py-1 rounded bg-soc-secondary hover:bg-soc-border text-soc-accent inline-flex items-center gap-1 text-[11px]"
                                >
                                  {expandedModel === res.model_id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  Classes
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Per Class Breakdown Accordion */}
                          {expandedModel === res.model_id && res.per_class_metrics.length > 0 && (
                            <tr>
                              <td colSpan={12} className="p-4 bg-soc-bg border-y border-soc-border">
                                <div className="space-y-2 max-w-4xl">
                                  <h4 className="text-xs font-bold text-soc-accent uppercase">
                                    Per-Class Classification Metrics for {res.name}
                                  </h4>
                                  <table className="w-full text-left text-xs border border-soc-border">
                                    <thead>
                                      <tr className="bg-soc-secondary/60 text-soc-muted border-b border-soc-border">
                                        <th className="p-2">Attack / Traffic Class</th>
                                        <th className="p-2 text-right">Precision</th>
                                        <th className="p-2 text-right">Recall</th>
                                        <th className="p-2 text-right">F1-Score</th>
                                        <th className="p-2 text-right">Support</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-soc-border/40">
                                      {res.per_class_metrics.map((pcm) => (
                                        <tr key={pcm.class_name} className="hover:bg-soc-secondary/10">
                                          <td className="p-2 text-soc-text font-bold">{pcm.class_name}</td>
                                          <td className="p-2 text-right">{(pcm.precision * 100).toFixed(1)}%</td>
                                          <td className="p-2 text-right">{(pcm.recall * 100).toFixed(1)}%</td>
                                          <td className="p-2 text-right font-bold text-soc-accent">{(pcm.f1_score * 100).toFixed(1)}%</td>
                                          <td className="p-2 text-right text-soc-muted">{pcm.support}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROBUSTNESS & CONTROLLED STRESS TESTING */}
      {/* ========================================================================= */}
      {activeTab === 'robustness' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Card */}
          <div className="p-6 rounded-xl bg-soc-card border border-soc-border shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-soc-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-soc-text uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" /> Controlled Adversarial & Perturbation Stress Testing
                </h3>
                <p className="text-xs text-soc-muted mt-0.5">
                  Scientifically quantifies model resilience when test traffic undergoes distribution shifts or corruption.
                </p>
              </div>

              <div className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
                Controlled Synthetic Experiment
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <label className="text-soc-muted block mb-1">Stress Condition</label>
                <select
                  value={stressType}
                  onChange={(e) => setStressType(e.target.value as any)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                >
                  <option value="feature_noise">Feature Noise (Gaussian Jitter)</option>
                  <option value="missing_values">Missing Values (Random Masking)</option>
                  <option value="distribution_shift">Distribution Shift (Scale Drift)</option>
                  <option value="minority_imbalance">Minority Class Imbalance</option>
                </select>
              </div>

              <div>
                <label className="text-soc-muted block mb-1">
                  Perturbation Intensity: <strong className="text-soc-text">{stressIntensity.toFixed(2)}</strong>
                </label>
                <input
                  type="range"
                  min={stressType === 'distribution_shift' ? 1.05 : 0.02}
                  max={stressType === 'distribution_shift' ? 2.0 : 0.50}
                  step={0.02}
                  value={stressIntensity}
                  onChange={(e) => setStressIntensity(parseFloat(e.target.value))}
                  className="w-full accent-soc-accent mt-2"
                />
              </div>

              <div>
                <label className="text-soc-muted block mb-1">Baseline Model</label>
                <select
                  value={baselineModel}
                  onChange={(e) => setBaselineModel(e.target.value)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                >
                  <option value="decision_tree">Decision Tree (Single Classifier)</option>
                  <option value="logistic_regression">Logistic Regression (Linear Baseline)</option>
                </select>
              </div>

              <div>
                <label className="text-soc-muted block mb-1">Ensemble Architecture</label>
                <select
                  value={ensembleModel}
                  onChange={(e) => setEnsembleModel(e.target.value)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                >
                  <option value="random_forest">Random Forest (Bagged Trees)</option>
                  <option value="voting">Voting Ensemble (Consensus)</option>
                  <option value="stacking">Stacking Ensemble (Meta-Learner)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-soc-border/60">
              <span className="text-xs font-mono text-soc-muted">
                Reproducible Random Seed: <code className="text-soc-text">42</code>
              </span>

              <button
                onClick={handleRunRobustness}
                disabled={robustnessLoading}
                className="px-5 py-2.5 rounded-lg bg-soc-accent text-slate-950 text-xs font-mono font-bold hover:bg-soc-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {robustnessLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
                {robustnessLoading ? 'Executing Perturbation Test...' : 'Run Stress Comparison'}
              </button>
            </div>
          </div>

          {/* Robustness Results */}
          {robustnessResult && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-soc-card border border-soc-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-soc-accent">
                  <Info className="w-4 h-4" /> <strong>Empirical Resilience Analysis:</strong>
                </div>
                <p className="text-xs font-mono text-soc-text leading-relaxed">
                  {robustnessResult.analysis_summary}
                </p>
                <p className="text-[11px] font-mono text-soc-muted border-t border-soc-border/60 pt-2">
                  Notice: {robustnessResult.disclaimer}
                </p>
              </div>

              {/* Side-by-Side Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                {/* Baseline Card */}
                <div className="p-5 rounded-xl bg-soc-card border border-soc-border shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-soc-muted uppercase tracking-wider block">Single Baseline</span>
                      <h4 className="text-sm font-bold text-soc-text">{robustnessResult.baseline_comparison.name}</h4>
                    </div>
                    <div className="px-3 py-1 rounded bg-soc-secondary border border-soc-border text-xs text-soc-muted">
                      Resilience: <strong className="text-soc-text">{robustnessResult.baseline_comparison.resilience_score}</strong>/100
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-center border-t border-b border-soc-border/60 py-3">
                    <div>
                      <span className="text-soc-muted block text-[10px]">Clean F1</span>
                      <strong className="text-soc-text">{(robustnessResult.baseline_comparison.clean_metrics.f1_macro * 100).toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-soc-muted block text-[10px]">Stressed F1</span>
                      <strong className="text-soc-critical">{(robustnessResult.baseline_comparison.stressed_metrics.f1_macro * 100).toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-soc-muted block text-[10px]">F1 Drop</span>
                      <strong className="text-soc-critical">-{robustnessResult.baseline_comparison.f1_drop_percentage.toFixed(1)}%</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-soc-muted">
                    <span>Miss Rate Increase:</span>
                    <strong className="text-soc-critical">+{robustnessResult.baseline_comparison.fnr_increase_percentage.toFixed(1)}%</strong>
                  </div>
                </div>

                {/* Ensemble Card */}
                <div className="p-5 rounded-xl bg-soc-card border border-soc-accent/40 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-soc-accent uppercase tracking-wider block font-semibold">Ensemble Architecture</span>
                      <h4 className="text-sm font-bold text-soc-text">{robustnessResult.ensemble_comparison.name}</h4>
                    </div>
                    <div className="px-3 py-1 rounded bg-soc-accent/10 border border-soc-accent/30 text-xs text-soc-accent font-bold">
                      Resilience: {robustnessResult.ensemble_comparison.resilience_score}/100
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-center border-t border-b border-soc-border/60 py-3">
                    <div>
                      <span className="text-soc-muted block text-[10px]">Clean F1</span>
                      <strong className="text-soc-text">{(robustnessResult.ensemble_comparison.clean_metrics.f1_macro * 100).toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-soc-muted block text-[10px]">Stressed F1</span>
                      <strong className="text-amber-400">{(robustnessResult.ensemble_comparison.stressed_metrics.f1_macro * 100).toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-soc-muted block text-[10px]">F1 Drop</span>
                      <strong className="text-amber-400">-{robustnessResult.ensemble_comparison.f1_drop_percentage.toFixed(1)}%</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-soc-muted">
                    <span>Miss Rate Increase:</span>
                    <strong className="text-amber-400">+{robustnessResult.ensemble_comparison.fnr_increase_percentage.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRAFFIC DRIFT ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'drift' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-xl bg-soc-card border border-soc-border shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-soc-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-soc-text uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-soc-accent" /> Statistical Traffic Distribution Drift Monitor
                </h3>
                <p className="text-xs text-soc-muted mt-0.5">
                  Computes Kolmogorov-Smirnov (KS) test statistics, Population Stability Index (PSI), and Wasserstein distance.
                </p>
              </div>

              <div className="px-2.5 py-1 rounded bg-soc-secondary text-soc-muted text-xs font-mono">
                Statistical Testing Module
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-soc-muted block mb-1">Reference Baseline Traffic (Training)</label>
                <select
                  value={refDatasetId}
                  onChange={(e) => setRefDatasetId(e.target.value)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                >
                  <option value="sample_cic_ids_binary">CIC-IDS-2017 Binary Reference Traffic</option>
                  <option value="sample_cic_ids_multiclass">CIC-IDS-2017 Multiclass Reference Traffic</option>
                  <option value="sample_lightweight_network_flows">Lightweight Baseline Traffic</option>
                </select>
              </div>

              <div>
                <label className="text-soc-muted block mb-1">Incoming Monitored Traffic (Observation)</label>
                <select
                  value={incDatasetId}
                  onChange={(e) => setIncDatasetId(e.target.value)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                >
                  <option value="sample_drifted_traffic">Covariate-Shifted Traffic (Simulated Surge & Anomalies)</option>
                  <option value="sample_cic_ids_multiclass">CIC-IDS-2017 Multiclass Traffic</option>
                  <option value="sample_cic_ids_binary">CIC-IDS-2017 Binary (Baseline)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-soc-border/60">
              <span className="text-xs font-mono text-soc-muted">
                Hypothesis Significance Level: <code className="text-soc-text">α = 0.05</code>
              </span>

              <button
                onClick={handleRunDrift}
                disabled={driftLoading}
                className="px-5 py-2.5 rounded-lg bg-soc-accent text-slate-950 text-xs font-mono font-bold hover:bg-soc-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {driftLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
                {driftLoading ? 'Analyzing Traffic Distributions...' : 'Run Drift Analysis'}
              </button>
            </div>
          </div>

          {/* Drift Results */}
          {driftResult && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-soc-card border border-soc-border space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-soc-accent">
                    <Info className="w-4 h-4" /> <strong>Drift Impact on Model Reliability:</strong>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    driftResult.overall_drift_severity === 'Low'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : driftResult.overall_drift_severity === 'Moderate'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-soc-critical/10 text-soc-critical border border-soc-critical/30'
                  }`}>
                    {driftResult.overall_drift_severity} Drift Detected ({driftResult.drifted_features_count}/{driftResult.total_features_analyzed} features)
                  </span>
                </div>
                <p className="text-soc-text leading-relaxed">{driftResult.model_reliability_impact}</p>
                <p className="text-[11px] text-soc-muted border-t border-soc-border/60 pt-2">
                  Notice: {driftResult.disclaimer}
                </p>
              </div>

              {/* Feature Drift Table */}
              <div className="bg-soc-card border border-soc-border rounded-xl shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-soc-border bg-soc-sidebar/60 text-[11px] text-soc-muted uppercase tracking-wider">
                        <th className="p-3.5">Feature Name</th>
                        <th className="p-3.5">Ref Mean ± Std</th>
                        <th className="p-3.5">Incoming Mean ± Std</th>
                        <th className="p-3.5 text-right">KS Statistic</th>
                        <th className="p-3.5 text-right">p-value</th>
                        <th className="p-3.5 text-right">PSI Score</th>
                        <th className="p-3.5 text-right">Wasserstein Dist</th>
                        <th className="p-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soc-border/40">
                      {driftResult.feature_details.map((fd) => (
                        <tr key={fd.feature_name} className="hover:bg-soc-secondary/20 transition-colors">
                          <td className="p-3.5 font-bold text-soc-text">{fd.feature_name}</td>
                          <td className="p-3.5 text-soc-muted">{fd.reference_mean} ± {fd.reference_std}</td>
                          <td className="p-3.5 text-soc-muted">{fd.incoming_mean} ± {fd.incoming_std}</td>
                          <td className="p-3.5 text-right">{fd.ks_statistic.toFixed(4)}</td>
                          <td className="p-3.5 text-right">{fd.p_value < 0.0001 ? '< 0.0001' : fd.p_value.toFixed(4)}</td>
                          <td className="p-3.5 text-right font-bold">{fd.psi_score.toFixed(4)}</td>
                          <td className="p-3.5 text-right text-soc-muted">{fd.wasserstein_distance.toFixed(1)}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              fd.drift_status === 'Stable'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : fd.drift_status === 'Moderate Drift'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-soc-critical/10 text-soc-critical border border-soc-critical/30'
                            }`}>
                              {fd.drift_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXPLANATION STABILITY & FEASIBILITY */}
      {/* ========================================================================= */}
      {activeTab === 'stability' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-xl bg-soc-card border border-soc-border shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-soc-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-soc-text uppercase flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-soc-accent" /> Explanation Stability & Counterfactual Feasibility
                </h3>
                <p className="text-xs text-soc-muted mt-0.5">
                  Validates whether local feature attributions remain stable under input perturbations, and whether counterfactual recourse complies with network protocol constraints.
                </p>
              </div>

              <div className="px-2.5 py-1 rounded bg-soc-secondary text-soc-muted text-xs font-mono">
                XAI Verification Suite
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-soc-muted block mb-1">Target Experiment</label>
                <select
                  value={selectedExpId}
                  onChange={(e) => setSelectedExpId(e.target.value)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-soc-text focus:outline-none focus:border-soc-accent"
                >
                  {recentExperiments.length === 0 ? (
                    <option value="">No completed Studio runs found. Run an experiment in Studio first.</option>
                  ) : (
                    recentExperiments.map((exp) => (
                      <option key={exp.experiment_id} value={exp.experiment_id}>
                        {exp.name} ({exp.strategy}) - {exp.experiment_id}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-soc-muted block mb-1">
                  Perturbation Epsilon (ε): <strong className="text-soc-text">{epsilonVal.toFixed(3)}</strong>
                </label>
                <input
                  type="range"
                  min={0.005}
                  max={0.08}
                  step={0.005}
                  value={epsilonVal}
                  onChange={(e) => setEpsilonVal(parseFloat(e.target.value))}
                  className="w-full accent-soc-accent mt-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-soc-border/60">
              <span className="text-xs font-mono text-soc-muted">
                Mathematical Verification: Cosine Similarity between ∇ Attributions
              </span>

              <button
                onClick={handleCheckStability}
                disabled={stabilityLoading || !selectedExpId}
                className="px-5 py-2.5 rounded-lg bg-soc-accent text-slate-950 text-xs font-mono font-bold hover:bg-soc-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {stabilityLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
                {stabilityLoading ? 'Verifying Explanation Stability...' : 'Run Stability & Feasibility Audit'}
              </button>
            </div>
          </div>

          {/* Results Grid */}
          {(stabilityResult || feasibilityResult) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs animate-fade-in">
              {/* Stability Result */}
              {stabilityResult && (
                <div className="p-5 rounded-xl bg-soc-card border border-soc-border shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-soc-text flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-soc-accent" /> Attribution Stability
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      stabilityResult.stability_grade === 'Highly Stable'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {stabilityResult.stability_grade}
                    </span>
                  </div>

                  <div className="p-3 rounded bg-soc-bg border border-soc-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-soc-muted">Attribution Cosine Similarity:</span>
                      <strong className="text-soc-accent text-sm">{stabilityResult.attribution_cosine_similarity.toFixed(3)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-soc-muted">Input Perturbation (ε):</span>
                      <strong className="text-soc-text">±{(stabilityResult.epsilon * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  <p className="text-soc-muted leading-relaxed">{stabilityResult.interpretation}</p>

                  <div className="pt-2 border-t border-soc-border/60">
                    <span className="text-soc-muted block mb-1">Top Invariant Features:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {stabilityResult.top_stable_features.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded bg-soc-secondary text-[11px] text-soc-text">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-soc-muted pt-2 border-t border-soc-border/40">
                    {stabilityResult.non_causal_notice}
                  </p>
                </div>
              )}

              {/* Feasibility Result */}
              {feasibilityResult && (
                <div className="p-5 rounded-xl bg-soc-card border border-soc-border shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-soc-text flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-400" /> Counterfactual Feasibility
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      feasibilityResult.all_changes_feasible
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {feasibilityResult.all_changes_feasible ? 'All Changes Feasible' : 'Requires Adjustment'}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {feasibilityResult.changes_suggested.map((cs) => (
                      <div key={cs.feature_name} className="p-2.5 rounded bg-soc-bg border border-soc-border space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-soc-text">{cs.feature_name}</span>
                          <span className={`text-[10px] flex items-center gap-1 ${cs.is_feasible ? 'text-emerald-400' : 'text-soc-critical'}`}>
                            {cs.is_feasible ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {cs.is_feasible ? 'Feasible' : 'Infeasible'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-soc-muted">
                          <span>{cs.original_value} → {cs.proposed_value} (Δ {cs.change_delta})</span>
                        </div>
                        <p className="text-[11px] text-soc-muted">{cs.feasibility_reason}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-soc-muted pt-2 border-t border-soc-border/40">
                    {feasibilityResult.non_causal_notice}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
