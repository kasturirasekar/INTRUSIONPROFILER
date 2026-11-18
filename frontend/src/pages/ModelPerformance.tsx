import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { ModelPerformanceData, ModelBenchmarkRow } from '../types';
import { api } from '../services/api';

export const ModelPerformance: React.FC = () => {
  const [data, setData] = useState<ModelPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'ensembles' | 'baselines'>('all');

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await api.getModelPerformance();
      setData(res);
    } catch (err) {
      console.error('Failed to load model performance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-soc-secondary animate-pulse rounded-lg" />
        <div className="h-96 bg-soc-card border border-soc-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-soc-muted">
        Unable to load model performance telemetry.
      </div>
    );
  }

  const filteredModels = data.models_compared.filter((m) => {
    if (filterType === 'ensembles') return m.is_ensemble;
    if (filterType === 'baselines') return !m.is_ensemble;
    return true;
  });

  const cm = data.confusion_matrix_active;

  return (
    <div className="p-6 sm:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-text font-mono flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-soc-accent" />
            Machine Learning Model Performance & Evaluation
          </h1>
          <p className="text-xs sm:text-sm text-soc-muted mt-1">
            Empirical benchmark metrics evaluated on 47,607 CIC-IDS-2017 test flows
          </p>
        </div>

        <button
          onClick={fetchPerformance}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-mono rounded-lg bg-soc-secondary border border-soc-border text-soc-muted hover:text-soc-text flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-soc-accent' : ''}`} />
          Refresh Benchmarks
        </button>
      </div>

      {/* Production Model Header Card */}
      <div className="p-6 rounded-xl bg-soc-card border border-soc-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-soc-accent uppercase tracking-wider font-semibold">
            <Award className="w-4 h-4" /> Production Ensemble Learning Engine
          </div>
          <h2 className="text-xl font-bold font-mono text-soc-text">
            {data.active_model_name}
          </h2>
          <p className="text-xs text-soc-muted max-w-2xl">
            Trained on the Canadian Institute for Cybersecurity (CIC-IDS-2017) benchmark dataset. Utilizes multi-model ensemble learning (hierarchical Stacking and Soft Voting) to synergize heterogeneous base learners, achieving peak attack detection (99.58% F1) with minimal false alarms and robust generalization across unseen network flow traffic.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono shrink-0">
          <div className="p-3 rounded-lg bg-soc-secondary/70 border border-soc-border">
            <span className="text-soc-muted block">Ensemble Architecture</span>
            <span className="text-soc-text font-bold">Stacking (LR + DT + RF)</span>
          </div>
          <div className="p-3 rounded-lg bg-soc-secondary/70 border border-soc-border">
            <span className="text-soc-muted block">Feature Vectors</span>
            <span className="text-soc-accent font-bold">{data.feature_count} Columns</span>
          </div>
        </div>
      </div>

      {/* Confusion Matrix & Key Evaluation Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Confusion Matrix Card */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
          <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono mb-1">
            Confusion Matrix (Ensemble Model Test Evaluation)
          </h3>
          <p className="text-xs text-soc-muted mb-4">
            Ground Truth vs Predicted on 47,607 holdout records
          </p>

          <div className="grid grid-cols-2 gap-3 font-mono">
            {/* True Negative */}
            <div className="p-3.5 rounded-lg bg-soc-accent/10 border border-soc-accent/30 text-center">
              <span className="text-[10px] text-soc-muted uppercase block">True Negatives (Clean)</span>
              <span className="text-xl font-bold text-soc-accent mt-1 block">
                {cm.true_negatives.toLocaleString()}
              </span>
              <span className="text-[10px] text-soc-low flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Correct Benign
              </span>
            </div>

            {/* False Positive */}
            <div className="p-3.5 rounded-lg bg-soc-critical/10 border border-soc-critical/30 text-center">
              <span className="text-[10px] text-soc-muted uppercase block">False Positives (False Alarm)</span>
              <span className="text-xl font-bold text-soc-critical mt-1 block">
                {cm.false_positives.toLocaleString()}
              </span>
              <span className="text-[10px] text-soc-critical flex items-center justify-center gap-1 mt-0.5">
                <XCircle className="w-3 h-3" /> 0.08% False Rate
              </span>
            </div>

            {/* False Negative */}
            <div className="p-3.5 rounded-lg bg-soc-high/10 border border-soc-high/30 text-center">
              <span className="text-[10px] text-soc-muted uppercase block">False Negatives (Missed)</span>
              <span className="text-xl font-bold text-soc-high mt-1 block">
                {cm.false_negatives.toLocaleString()}
              </span>
              <span className="text-[10px] text-soc-high flex items-center justify-center gap-1 mt-0.5">
                <XCircle className="w-3 h-3" /> Missed Attacks
              </span>
            </div>

            {/* True Positive */}
            <div className="p-3.5 rounded-lg bg-soc-critical/10 border border-soc-critical/30 text-center">
              <span className="text-[10px] text-soc-muted uppercase block">True Positives (Intercepted)</span>
              <span className="text-xl font-bold text-soc-critical mt-1 block">
                {cm.true_positives.toLocaleString()}
              </span>
              <span className="text-[10px] text-soc-low flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> 99.43% Recall
              </span>
            </div>
          </div>
        </div>

        {/* Feature Importance Ranking */}
        <div className="lg:col-span-2 bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono">
                Model Feature Importance Hierarchy
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Top predictive weights for identifying network anomalies
              </p>
            </div>
            <Layers className="w-4 h-4 text-soc-accent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-56 pr-2">
            {data.feature_importances.slice(0, 10).map((f) => (
              <div
                key={f.feature}
                className="p-3 rounded-lg bg-soc-bg border border-soc-border flex items-center justify-between font-mono"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-xs font-bold text-soc-accent">#{f.rank}</span>
                  <div className="truncate">
                    <span className="text-xs text-soc-text block truncate" title={f.feature}>
                      {f.feature}
                    </span>
                    <span className="text-[10px] text-soc-muted">{f.category}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-soc-text shrink-0">
                  {(f.importance * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model Benchmark Comparison Table */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono">
              Model Benchmark Matrix
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Empirical comparison of baseline models vs ensemble learning classifiers on the test set
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-soc-muted">Filter:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                filterType === 'all'
                  ? 'bg-soc-accent text-soc-bg font-bold border-soc-accent'
                  : 'bg-soc-bg text-soc-muted border-soc-border hover:text-soc-text'
              }`}
            >
              All ({data.models_compared.length})
            </button>
            <button
              onClick={() => setFilterType('ensembles')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                filterType === 'ensembles'
                  ? 'bg-soc-accent text-soc-bg font-bold border-soc-accent'
                  : 'bg-soc-bg text-soc-muted border-soc-border hover:text-soc-text'
              }`}
            >
              Ensembles
            </button>
            <button
              onClick={() => setFilterType('baselines')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                filterType === 'baselines'
                  ? 'bg-soc-accent text-soc-bg font-bold border-soc-accent'
                  : 'bg-soc-bg text-soc-muted border-soc-border hover:text-soc-text'
              }`}
            >
              Baselines
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-soc-border text-[11px] font-mono text-soc-muted uppercase tracking-wider">
                <th className="pb-3 font-semibold">Model Architecture</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Overall Accuracy</th>
                <th className="pb-3 font-semibold">Attack Precision</th>
                <th className="pb-3 font-semibold">Attack Recall</th>
                <th className="pb-3 font-semibold">Attack F1</th>
                <th className="pb-3 font-semibold">ROC-AUC</th>
                <th className="pb-3 font-semibold">Training Latency</th>
                <th className="pb-3 font-semibold text-right">Inference Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/40 text-xs font-mono">
              {filteredModels.map((row) => {
                const isSelected = row.model.toLowerCase().includes('stacking') || row.model === data.active_model_name;

                return (
                  <tr
                    key={row.model}
                    className={`hover:bg-soc-secondary/30 transition-colors ${
                      isSelected ? 'bg-soc-accent/10 font-bold border-l-2 border-soc-accent' : ''
                    }`}
                  >
                    <td className="py-3 text-soc-text flex items-center gap-2">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-soc-accent animate-pulse" />}
                      {row.model}
                      {isSelected && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-soc-accent text-soc-bg font-bold uppercase ml-1">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-soc-muted">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          row.is_ensemble
                            ? 'bg-soc-accent/10 text-soc-accent border border-soc-accent/30'
                            : 'bg-soc-secondary text-soc-muted border border-soc-border'
                        }`}
                      >
                        {row.is_ensemble ? 'Ensemble' : 'Baseline'}
                      </span>
                    </td>
                    <td className="py-3 text-soc-text">{(row.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-3 text-soc-text">{(row.precision_attack * 100).toFixed(2)}%</td>
                    <td className="py-3 text-soc-text">{(row.recall_attack * 100).toFixed(2)}%</td>
                    <td className="py-3 text-soc-accent font-bold">{(row.f1_attack * 100).toFixed(2)}%</td>
                    <td className="py-3 text-soc-muted">{row.roc_auc ? row.roc_auc.toFixed(4) : 'N/A'}</td>
                    <td className="py-3 text-soc-muted">{row.training_time_seconds.toFixed(2)}s</td>
                    <td className="py-3 text-soc-muted text-right">{row.prediction_time_seconds.toFixed(3)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
