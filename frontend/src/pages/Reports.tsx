import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  GitCompare,
  Trash2,
  Layers,
} from 'lucide-react';
import { PredictionBatchResponse } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/common/SeverityBadge';

export const Reports: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<PredictionBatchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [summaryData, setSummaryData] = useState<Record<string, any> | null>(null);

  // Experiment History & Comparison State
  const [experimentHistory, setExperimentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedExpIds, setSelectedExpIds] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<any[] | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.listStudioExperiments();
      setExperimentHistory(data || []);
    } catch (err) {
      console.error('Failed to load experiment history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleToggleSelectExp = (id: string) => {
    if (selectedExpIds.includes(id)) {
      setSelectedExpIds(selectedExpIds.filter((item) => item !== id));
    } else {
      if (selectedExpIds.length < 4) {
        setSelectedExpIds([...selectedExpIds, id]);
      } else {
        alert('You can compare a maximum of 4 experiments side-by-side.');
      }
    }
  };

  const handleCompareSelected = async () => {
    if (selectedExpIds.length < 2) {
      alert('Please select at least 2 experiments to compare.');
      return;
    }
    try {
      const res = await api.compareStudioExperiments(selectedExpIds);
      setComparisonResults(res);
    } catch (err) {
      console.error('Failed to compare experiments', err);
    }
  };

  const handleDeleteExp = async (id: string) => {
    if (confirm(`Are you sure you want to delete experiment ${id}?`)) {
      try {
        await api.deleteStudioExperiment(id);
        fetchHistory();
        setSelectedExpIds(selectedExpIds.filter((item) => item !== id));
      } catch (err) {
        console.error('Failed to delete experiment', err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      const res = await api.uploadPredictionFile(file);
      setUploadResult(res);
    } catch (err: any) {
      console.error('Flow file upload failed', err);
      const msg = err.message || err.response?.data?.detail || 'Failed to process flow file.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTelemetryCsv = () => {
    setDownloadingCsv(true);
    const url = api.getExportCsvUrl(5000);
    window.location.href = url;
    setTimeout(() => setDownloadingCsv(false), 2000);
  };

  const handleFetchSummary = async () => {
    try {
      const res = await api.getExecutiveSummary();
      setSummaryData(res);
    } catch (err) {
      console.error('Failed to generate summary', err);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-text font-mono flex items-center gap-2.5">
          <FileSpreadsheet className="w-5 h-5 text-soc-accent" />
          Reports & Flow Batch Prediction Center
        </h1>
        <p className="text-xs sm:text-sm text-soc-muted mt-1">
          Upload JSON flow records or CSV captures for batch profiling, or export generated incident telemetry
        </p>
      </div>

      {/* Grid: 2 Action Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Batch Upload Card */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2 mb-1">
              <UploadCloud className="w-4 h-4 text-soc-accent" />
              Upload Custom Network Flow File
            </h3>
            <p className="text-xs text-soc-muted mb-4">
              Submit a JSON flow or CSV containing CIC-IDS-2017 feature columns for real-time model profiling
            </p>

            <div className="border-2 border-dashed border-soc-border hover:border-soc-accent/50 rounded-xl p-6 text-center transition-colors bg-soc-bg/50">
              <input
                type="file"
                id="csv-upload-input"
                accept=".json,application/json,.csv,.csv.gz"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="csv-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="p-3 rounded-xl bg-soc-secondary text-soc-accent">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-soc-text font-medium">
                  {file ? file.name : 'Click to select a JSON or CSV flow file'}
                </span>
                <span className="text-[11px] text-soc-muted">
                  Supports up to 5,000 flows per batch
                </span>
              </label>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 rounded-lg bg-soc-critical/10 border border-soc-critical/30 text-xs font-mono text-soc-critical flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-soc-border flex items-center justify-between">
            <span className="text-xs font-mono text-soc-muted">
              {file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'No file chosen'}
            </span>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-5 py-2 rounded-lg text-xs font-mono font-bold bg-soc-accent text-soc-bg hover:bg-soc-accentHover disabled:opacity-40 transition-colors shadow-glowAccent"
            >
              {uploading ? 'Profiling Flows...' : 'Analyze & Profile'}
            </button>
          </div>
        </div>

        {/* Telemetry Export & Executive Summary Card */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2 mb-1">
              <Download className="w-4 h-4 text-soc-accent" />
              Export Telemetry & Incident Reports
            </h3>
            <p className="text-xs text-soc-muted mb-4">
              Download annotated flow predictions with probability scores and severity ratings
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-soc-bg border border-soc-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold font-mono text-soc-text block">
                    Full Predictions Dataset (CSV)
                  </span>
                  <span className="text-[11px] text-soc-muted">
                    Up to 5,000 profiled network flows with predictions and severity
                  </span>
                </div>
                <button
                  onClick={handleDownloadTelemetryCsv}
                  disabled={downloadingCsv}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono bg-soc-secondary hover:bg-soc-border text-soc-accent flex items-center gap-1.5 transition-colors border border-soc-border"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadingCsv ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-soc-bg border border-soc-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold font-mono text-soc-text block">
                    Executive Threat Summary (JSON)
                  </span>
                  <span className="text-[11px] text-soc-muted">
                    Formal SOC metrics report for audit and executive briefing
                  </span>
                </div>
                <button
                  onClick={handleFetchSummary}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono bg-soc-secondary hover:bg-soc-border text-soc-accent flex items-center gap-1.5 transition-colors border border-soc-border"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Generate
                </button>
              </div>
            </div>
          </div>

          {summaryData && (
            <div className="mt-4 p-3 rounded-lg bg-soc-secondary/60 border border-soc-border text-xs font-mono text-soc-muted space-y-1">
              <div className="text-soc-text font-bold">{summaryData.title}</div>
              <div>Model: {summaryData.model_architecture} (F1: {(summaryData.attack_f1_score * 100).toFixed(2)}%)</div>
              <div>Threats Intercepted: {summaryData.malicious_intrusions_intercepted} of {summaryData.total_network_flows_monitored} flows</div>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded CSV Prediction Results */}
      {uploadResult && (
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-soc-low" />
                Batch Analysis Results: {uploadResult.total_processed.toLocaleString()} Flows Profiled
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Classified using Multi-Model Ensemble Learning Pipeline (Stacking Classifier)
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-soc-critical/10 text-soc-critical border border-soc-critical/20 font-bold">
                {uploadResult.attack_count} Intrusions Detected
              </span>
              <span className="px-2.5 py-1 rounded bg-soc-accent/10 text-soc-accent border border-soc-accent/20 font-bold">
                {uploadResult.benign_count} Benign
              </span>
            </div>
          </div>

          {/* Results Table Preview */}
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-soc-border text-[11px] font-mono text-soc-muted uppercase tracking-wider sticky top-0 bg-soc-card">
                  <th className="pb-3 font-semibold">Row #</th>
                  <th className="pb-3 font-semibold">Classification</th>
                  <th className="pb-3 font-semibold">Severity</th>
                  <th className="pb-3 font-semibold">Attack Probability</th>
                  <th className="pb-3 font-semibold">Target Port</th>
                  <th className="pb-3 font-semibold">Flow Duration</th>
                  <th className="pb-3 font-semibold">Key Risk Features</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border/40 text-xs font-mono">
                {uploadResult.results.slice(0, 50).map((r) => (
                  <tr key={r.flow_id} className="hover:bg-soc-secondary/30 transition-colors">
                    <td className="py-2.5 text-soc-text font-bold">#{r.flow_id}</td>
                    <td className="py-2.5 font-bold">
                      <span className={r.is_attack ? 'text-soc-critical' : 'text-soc-accent'}>
                        {r.prediction}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <SeverityBadge severity={r.severity} size="sm" />
                    </td>
                    <td className="py-2.5 text-soc-text font-bold">
                      {(r.attack_probability * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-soc-text">
                      {r.flow_metadata?.['Destination Port'] ?? 'N/A'}
                    </td>
                    <td className="py-2.5 text-soc-muted">
                      {r.flow_metadata?.['Flow Duration']
                        ? `${(Number(r.flow_metadata['Flow Duration']) / 1000).toFixed(1)} ms`
                        : '0 ms'}
                    </td>
                    <td className="py-2.5 text-soc-muted max-w-xs truncate">
                      {r.top_risk_features.join(', ') || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Experiment History & Side-by-Side Comparison */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-soc-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-soc-text flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-soc-accent" />
              Experiment History & Model Benchmarking Archive
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Select multiple experiments to benchmark evaluation metrics, training duration, and false alarm rates side-by-side.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCompareSelected}
              disabled={selectedExpIds.length < 2}
              className="px-3 py-1.5 rounded-lg bg-soc-accent text-slate-950 font-bold text-xs disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare ({selectedExpIds.length}) Runs
            </button>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="px-3 py-1.5 rounded-lg bg-soc-secondary text-soc-muted hover:text-soc-text text-xs border border-soc-border"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Comparison Modal / Panel */}
        {comparisonResults && comparisonResults.length > 0 && (
          <div className="p-4 rounded-xl bg-soc-bg border border-soc-accent/40 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-soc-accent uppercase flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Side-by-Side Run Comparison
              </h4>
              <button
                onClick={() => setComparisonResults(null)}
                className="text-xs text-soc-muted hover:text-soc-text"
              >
                Close Comparison
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-soc-border">
                <thead>
                  <tr className="bg-soc-secondary text-soc-muted border-b border-soc-border text-[11px] uppercase">
                    <th className="p-2.5">Metric / Parameter</th>
                    {comparisonResults.map((cr) => (
                      <th key={cr.experiment_id} className="p-2.5 text-soc-text font-bold">
                        {cr.name} ({cr.strategy})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border/40">
                  <tr>
                    <td className="p-2.5 text-soc-muted">Model Name</td>
                    {comparisonResults.map((cr) => (
                      <td key={cr.experiment_id} className="p-2.5 text-soc-text font-bold">{cr.model_name}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-soc-muted">Task Type</td>
                    {comparisonResults.map((cr) => (
                      <td key={cr.experiment_id} className="p-2.5 text-soc-text">{cr.task_type || 'binary'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-soc-muted">Accuracy</td>
                    {comparisonResults.map((cr) => (
                      <td key={cr.experiment_id} className="p-2.5 text-soc-text font-bold">
                        {cr.accuracy !== null ? `${(cr.accuracy * 100).toFixed(2)}%` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-soc-muted">Macro F1 Score</td>
                    {comparisonResults.map((cr) => (
                      <td key={cr.experiment_id} className="p-2.5 text-soc-accent font-bold">
                        {cr.macro_f1 !== null ? `${(cr.macro_f1 * 100).toFixed(2)}%` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-soc-muted">False Alarm Rate (FPR)</td>
                    {comparisonResults.map((cr) => (
                      <td key={cr.experiment_id} className="p-2.5 text-emerald-400">
                        {cr.false_positive_rate !== null ? `${(cr.false_positive_rate * 100).toFixed(2)}%` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-soc-muted">Miss Rate (FNR)</td>
                    {comparisonResults.map((cr) => (
                      <td key={cr.experiment_id} className="p-2.5 text-soc-critical">
                        {cr.false_negative_rate !== null ? `${(cr.false_negative_rate * 100).toFixed(2)}%` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 text-soc-muted">Training Duration</td>
                    {comparisonResults.map((cr) => (
                      <td key={cr.experiment_id} className="p-2.5 text-soc-muted">
                        {cr.training_time_seconds ? `${cr.training_time_seconds.toFixed(2)}s` : '0.00s'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Experiment History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-soc-border text-[11px] text-soc-muted uppercase tracking-wider bg-soc-secondary/40">
                <th className="p-3 text-center">Compare</th>
                <th className="p-3">Run Name</th>
                <th className="p-3">Strategy</th>
                <th className="p-3">Task</th>
                <th className="p-3 text-right">Accuracy</th>
                <th className="p-3 text-right">Macro F1</th>
                <th className="p-3 text-right">FPR</th>
                <th className="p-3 text-right">Training Time</th>
                <th className="p-3 text-right">Records</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/40">
              {experimentHistory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-soc-muted">
                    No experiments saved in archive yet. Run experiments in the Studio or Benchmark Engine.
                  </td>
                </tr>
              ) : (
                experimentHistory.map((exp) => (
                  <tr key={exp.experiment_id} className="hover:bg-soc-secondary/20 transition-colors">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedExpIds.includes(exp.experiment_id)}
                        onChange={() => handleToggleSelectExp(exp.experiment_id)}
                        className="accent-soc-accent rounded"
                      />
                    </td>
                    <td className="p-3 font-bold text-soc-text">
                      {exp.name}
                      <span className="text-[10px] text-soc-muted block font-normal">{exp.experiment_id}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-soc-secondary border border-soc-border text-soc-accent uppercase">
                        {exp.strategy}
                      </span>
                    </td>
                    <td className="p-3 text-soc-muted">{exp.task_type || 'binary'}</td>
                    <td className="p-3 text-right text-soc-text font-bold">
                      {exp.accuracy !== null && exp.accuracy !== undefined ? `${(exp.accuracy * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="p-3 text-right text-soc-accent font-bold">
                      {exp.f1_score !== null && exp.f1_score !== undefined ? `${(exp.f1_score * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="p-3 text-right text-emerald-400">
                      {exp.false_positive_rate !== null && exp.false_positive_rate !== undefined ? `${(exp.false_positive_rate * 100).toFixed(2)}%` : 'N/A'}
                    </td>
                    <td className="p-3 text-right text-soc-muted">
                      {exp.training_time_seconds ? `${exp.training_time_seconds.toFixed(2)}s` : '0.0s'}
                    </td>
                    <td className="p-3 text-right text-soc-muted">
                      {exp.total_evaluated_records?.toLocaleString() || 0}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteExp(exp.experiment_id)}
                        className="p-1 rounded text-soc-muted hover:text-soc-critical hover:bg-soc-secondary transition-colors"
                        title="Delete Experiment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
