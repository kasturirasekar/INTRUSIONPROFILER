import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock,
  Zap,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  GitCompare,
  BarChart2,
  Table,
} from 'lucide-react';
import { api } from '../../services/api';
import { StudioExperimentResult } from '../../types/studio';

interface Step05ResultsProps {
  experimentResult: StudioExperimentResult | null;
  onSelectFlowForExplain: (recordIndex: number) => void;
  onRerun: () => void;
}

export const Step05Results: React.FC<Step05ResultsProps> = ({
  experimentResult,
  onSelectFlowForExplain,
  onRerun,
}) => {
  const [viewTab, setViewTab] = useState<'telemetry' | 'compare'>('telemetry');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [allRuns, setAllRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState<boolean>(false);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchRuns = async () => {
      setLoadingRuns(true);
      try {
        const data = await api.listStudioExperiments();
        setAllRuns(data || []);
      } catch (err) {
        console.error('Failed to load past experiments', err);
      } finally {
        setLoadingRuns(false);
      }
    };
    fetchRuns();
  }, [experimentResult?.experiment_id]);

  if (!experimentResult) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center max-w-xl mx-auto my-8 font-mono">
        <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white mb-1">No Active Experiment Results</h3>
        <p className="text-slate-400 text-xs mb-4">
          Execute a model run in Step 03 (Train & Predict) to evaluate performance and view predictions.
        </p>
      </div>
    );
  }

  const isLabeled = experimentResult.is_labeled;
  const cm = experimentResult.confusion_matrix;
  const previewRows = experimentResult.predictions_preview || [];
  const totalPages = Math.ceil(previewRows.length / rowsPerPage) || 1;
  const paginatedRows = previewRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const downloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(experimentResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `experiment_${experimentResult.experiment_id}_dossier.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const downloadCSV = () => {
    if (!previewRows || previewRows.length === 0) return;
    const headers = ['index', 'ground_truth', 'prediction', 'confidence'];
    const csvContent = [
      headers.join(','),
      ...previewRows.map((r) => `${r.index},"${r.ground_truth}","${r.prediction}",${r.confidence.toFixed(4)}`),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `experiment_${experimentResult.experiment_id}_predictions.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-5 text-slate-200">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Step 05 — Performance & Telemetry
              </span>
              <span className="text-slate-500 text-xs font-mono">
                {isLabeled ? 'Supervised Holdout Evaluation' : 'Unlabeled Inference Profiling'}
              </span>
            </div>
            <h2 className="text-lg font-mono font-bold text-white tracking-tight">
              {experimentResult.name}
            </h2>
            <p className="text-slate-400 text-xs font-mono mt-0.5">
              Strategy: <strong className="text-slate-200 uppercase">{experimentResult.strategy}</strong> • Model:{' '}
              <strong className="text-slate-200">{experimentResult.model_name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Predictions CSV</span>
            </button>
            <button
              onClick={downloadJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg border border-slate-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Audit JSON</span>
            </button>
            <button
              onClick={onRerun}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Run</span>
            </button>
          </div>
        </div>

        {/* Diagnostics Strip & View Toggle */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Training: <strong className="text-slate-200">{experimentResult.training_time_seconds.toFixed(2)}s</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-500" />
              Inference: <strong className="text-slate-200">{experimentResult.prediction_time_seconds.toFixed(3)}s</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Evaluated: <strong className="text-slate-200">{experimentResult.total_evaluated_records.toLocaleString()} flows</strong>
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewTab('telemetry')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                viewTab === 'telemetry'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Active Telemetry</span>
            </button>
            <button
              onClick={() => setViewTab('compare')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                viewTab === 'compare'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-3 h-3" />
              <span>Compare Runs ({allRuns.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: Active Run Telemetry */}
      {viewTab === 'telemetry' && (
        <div className="space-y-5">
          {isLabeled ? (
            <div className="space-y-5">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
                {[
                  { label: 'Accuracy', value: experimentResult.accuracy, color: 'text-white' },
                  { label: 'Precision', value: experimentResult.precision, color: 'text-cyan-400' },
                  { label: 'Recall (TPR)', value: experimentResult.recall, color: 'text-cyan-400' },
                  { label: 'F1 Score', value: experimentResult.f1_score, color: 'text-emerald-400' },
                  {
                    label: 'False Alarm (FPR)',
                    value: experimentResult.false_positive_rate,
                    color: 'text-amber-400',
                  },
                  {
                    label: 'Missed Threats (FNR)',
                    value: experimentResult.false_negative_rate,
                    color: 'text-rose-400',
                  },
                ].map((metric, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between"
                  >
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      {metric.label}
                    </span>
                    <span className={`text-lg font-bold mt-1.5 ${metric.color}`}>
                      {metric.value !== undefined && metric.value !== null
                        ? `${(metric.value * 100).toFixed(2)}%`
                        : 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Holdout 20% split
                    </span>
                  </div>
                ))}
              </div>

              {/* Confusion Matrix and Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Confusion Matrix */}
                <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="mb-3">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      Empirical Confusion Matrix
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Evaluated on holdout test flows against verified ground truth.
                    </p>
                  </div>

                  {cm ? (
                    <div className="grid grid-cols-2 gap-2.5 mt-3 font-mono text-center">
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase block">True Benign (TN)</span>
                        <span className="text-xl font-bold text-emerald-400 my-0.5 block">
                          {cm.true_negatives.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">Normal correctly allowed</span>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase block">False Positive (FP)</span>
                        <span className="text-xl font-bold text-amber-400 my-0.5 block">
                          {cm.false_positives.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">False alarms generated</span>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase block">False Negative (FN)</span>
                        <span className="text-xl font-bold text-rose-400 my-0.5 block">
                          {cm.false_negatives.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">Intrusions missed</span>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase block">True Attack (TP)</span>
                        <span className="text-xl font-bold text-cyan-400 my-0.5 block">
                          {cm.true_positives.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">Malicious threats caught</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-mono italic py-4">Confusion matrix not generated.</p>
                  )}
                </div>

                {/* Threat vs Benign Breakdown */}
                <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between font-mono">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Threat vs Benign Distribution
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">
                      Breakdown of model verdicts across all evaluated records.
                    </p>

                    <div className="space-y-2.5">
                      {Object.entries(experimentResult.predicted_class_counts || {}).map(([cls, count]) => {
                        const isAtt = cls === 'Attack';
                        const pct = ((count / (experimentResult.total_evaluated_records || 1)) * 100).toFixed(1);
                        return (
                          <div key={cls} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                                <span className={`w-2 h-2 rounded-full ${isAtt ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                                {cls}
                              </span>
                              <span className="text-slate-400">
                                {count.toLocaleString()} flows ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full ${isAtt ? 'bg-rose-500' : 'bg-emerald-400'}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>Cross-validated scoring strictly prevents data leakage.</span>
                  </div>
                </div>
              </div>

              {/* Per-Class Detailed Performance Table (for Multiclass and Binary) */}
              {experimentResult.per_class_metrics && experimentResult.per_class_metrics.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                        Per-Class Precision, Recall & F1-Score Breakdown
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Individual performance metrics for each attack category and benign traffic.
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      {experimentResult.per_class_metrics.length} Categories
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-800">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                          <th className="p-2.5">Category Name</th>
                          <th className="p-2.5 text-right">Precision</th>
                          <th className="p-2.5 text-right">Recall</th>
                          <th className="p-2.5 text-right">F1-Score</th>
                          <th className="p-2.5 text-right">Support (Samples)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {experimentResult.per_class_metrics.map((pcm) => (
                          <tr key={pcm.class_name} className="hover:bg-slate-800/20">
                            <td className="p-2.5 font-bold text-white flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${pcm.class_name.toLowerCase().includes('benign') ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              {pcm.class_name}
                            </td>
                            <td className="p-2.5 text-right text-slate-300">{(pcm.precision * 100).toFixed(1)}%</td>
                            <td className="p-2.5 text-right text-slate-300">{(pcm.recall * 100).toFixed(1)}%</td>
                            <td className="p-2.5 text-right font-bold text-cyan-400">{(pcm.f1_score * 100).toFixed(1)}%</td>
                            <td className="p-2.5 text-right text-slate-400">{pcm.support.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unlabeled Inference Display */
            <div className="space-y-4 font-mono">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Unsupervised Inference Profiling
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Because this uploaded dataset has no verified ground-truth attack labels, supervised performance metrics
                    (Accuracy, Precision, Recall, F1) are strictly omitted to maintain scientific integrity. Flows were profiled
                    using calibrated ensemble probability boundaries.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Profiled Flows</span>
                  <span className="text-xl font-bold text-white">
                    {experimentResult.total_evaluated_records.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Classified Malicious</span>
                  <span className="text-xl font-bold text-rose-400">
                    {(experimentResult.predicted_class_counts?.['Attack'] || 0).toLocaleString()} flows
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Classified Benign</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {(experimentResult.predicted_class_counts?.['Benign'] || 0).toLocaleString()} flows
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Flow Predictions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Flow Prediction Telemetry
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select any flow record to inspect SHAP waterfall attribution and counterfactual recourse in Step 04.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 border border-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-400 text-[11px]">
                  Page <strong className="text-white">{currentPage}</strong> of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-30 border border-slate-800"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-semibold">
                    <th className="py-2 px-3">Flow #</th>
                    {isLabeled && <th className="py-2 px-3">Ground Truth</th>}
                    <th className="py-2 px-3">Prediction</th>
                    <th className="py-2 px-3">Confidence</th>
                    <th className="py-2 px-3">Features Snapshot</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paginatedRows.map((row) => {
                    const isAtt = row.prediction === 'Attack';
                    return (
                      <tr key={row.index} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-300">
                          #{row.index}
                        </td>

                        {isLabeled && (
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                row.ground_truth === 'Attack'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-emerald-500/10 text-emerald-400'
                              }`}
                            >
                              {row.ground_truth}
                            </span>
                          </td>
                        )}

                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              isAtt
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isAtt ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                            {row.prediction}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-200">
                          {(row.confidence * 100).toFixed(1)}%
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 max-w-xs overflow-hidden text-[10px] text-slate-400">
                            {Object.entries(row.features || {})
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <span key={k} className="truncate bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                                  {k}: {typeof v === 'number' ? v.toFixed(1) : v}
                                </span>
                              ))}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onSelectFlowForExplain(row.index)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 text-[11px] rounded transition-colors"
                          >
                            <span>Explain</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Interactive Experiment Comparison */}
      {viewTab === 'compare' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 font-mono">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Multi-Experiment Comparative Benchmarks
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Side-by-side performance comparison across all trained models and strategies in the session ledger.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {allRuns.length} Recorded Experiments
            </span>
          </div>

          {loadingRuns ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Loading experiment ledger...
            </div>
          ) : allRuns.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No previous experiments found. Train multiple models in Step 03 to unlock comparative benchmarking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-[10px] uppercase text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Run Name / ID</th>
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3">Accuracy</th>
                    <th className="py-2.5 px-3">Precision</th>
                    <th className="py-2.5 px-3">Recall (TPR)</th>
                    <th className="py-2.5 px-3">F1 Score</th>
                    <th className="py-2.5 px-3">False Alarm (FPR)</th>
                    <th className="py-2.5 px-3">Train Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {allRuns.map((run) => {
                    const isCurrent = run.experiment_id === experimentResult.experiment_id;
                    return (
                      <tr
                        key={run.experiment_id}
                        className={`transition-colors ${
                          isCurrent ? 'bg-cyan-950/20 text-white font-semibold' : 'hover:bg-slate-800/30 text-slate-300'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {isCurrent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[160px] font-bold" title={run.name}>
                              {run.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">{run.created_at?.slice(0, 16)}</span>
                        </td>

                        <td className="py-3 px-3 uppercase text-[10px] text-slate-400">
                          {run.strategy || 'ensemble'}
                        </td>

                        <td className="py-3 px-3 truncate max-w-[140px]">
                          {run.model_name || 'Ensemble'}
                        </td>

                        <td className="py-3 px-3 font-semibold text-white">
                          {run.accuracy !== null && run.accuracy !== undefined
                            ? `${(run.accuracy * 100).toFixed(2)}%`
                            : '— (Unlabeled)'}
                        </td>

                        <td className="py-3 px-3 text-cyan-400">
                          {run.precision !== null && run.precision !== undefined
                            ? `${(run.precision * 100).toFixed(2)}%`
                            : '—'}
                        </td>

                        <td className="py-3 px-3 text-cyan-400">
                          {run.recall !== null && run.recall !== undefined
                            ? `${(run.recall * 100).toFixed(2)}%`
                            : '—'}
                        </td>

                        <td className="py-3 px-3 text-emerald-400 font-bold">
                          {run.f1_score !== null && run.f1_score !== undefined
                            ? `${(run.f1_score * 100).toFixed(2)}%`
                            : '—'}
                        </td>

                        <td className="py-3 px-3 text-amber-400">
                          {run.false_positive_rate !== null && run.false_positive_rate !== undefined
                            ? `${(run.false_positive_rate * 100).toFixed(2)}%`
                            : '—'}
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          {run.training_time_seconds ? `${run.training_time_seconds.toFixed(2)}s` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
