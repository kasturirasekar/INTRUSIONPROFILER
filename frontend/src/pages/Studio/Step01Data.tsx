import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Search,
  CheckSquare,
  Square,
  Sliders,
  BarChart2,
  PieChart as PieIcon,
} from 'lucide-react';
import { api } from '../../services/api';
import { DatasetUploadResponse } from '../../types/studio';
import { NetworkFlowTopology } from '../../components/visual/NetworkFlowTopology';

interface Step01DataProps {
  dataset: DatasetUploadResponse | null;
  onDatasetLoaded: (data: DatasetUploadResponse) => void;
  selectedTarget: string | null;
  onTargetChange: (target: string | null) => void;
  selectedFeatures: string[];
  onFeaturesChange: (features: string[]) => void;
  onProceed: () => void;
}

export const Step01Data: React.FC<Step01DataProps> = ({
  dataset,
  onDatasetLoaded,
  selectedTarget,
  onTargetChange,
  selectedFeatures,
  onFeaturesChange,
  onProceed,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [featureSearch, setFeatureSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await api.uploadStudioDataset(file);
      onDatasetLoaded(res);
      const target = res.suggested_target || null;
      onTargetChange(target);
      const numericCols = res.columns.filter((c) => c !== target);
      onFeaturesChange(numericCols);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse uploaded dataset CSV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectSample = async (taskType: 'binary' | 'multiclass') => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await api.loadStudioSampleDataset(taskType, 5000);
      onDatasetLoaded(res);
      const target = res.suggested_target || null;
      onTargetChange(target);
      const cols = res.columns.filter((c) => c !== target);
      onFeaturesChange(cols);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load sample benchmark dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Filter available features for checklist
  const candidateFeatures = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter((c) => c !== selectedTarget);
  }, [dataset, selectedTarget]);

  const filteredFeatures = useMemo(() => {
    if (!featureSearch.trim()) return candidateFeatures;
    const q = featureSearch.toLowerCase();
    return candidateFeatures.filter((c) => c.toLowerCase().includes(q));
  }, [candidateFeatures, featureSearch]);

  const toggleFeature = (col: string) => {
    if (selectedFeatures.includes(col)) {
      onFeaturesChange(selectedFeatures.filter((f) => f !== col));
    } else {
      onFeaturesChange([...selectedFeatures, col]);
    }
  };

  const selectAllFeatures = () => {
    onFeaturesChange([...candidateFeatures]);
  };

  const deselectAllFeatures = () => {
    onFeaturesChange([]);
  };

  // Class Imbalance Calculation
  const classDist = dataset?.quality_summary?.target_class_distribution;
  const imbalanceSummary = useMemo(() => {
    if (!classDist) return null;
    const entries = Object.entries(classDist);
    if (entries.length < 2) return null;
    const total = entries.reduce((acc, [, val]) => acc + val, 0);
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const majority = sorted[0];
    const minority = sorted[sorted.length - 1];
    const ratio = (majority[1] / (minority[1] || 1)).toFixed(1);
    return {
      entries,
      total,
      majorityName: majority[0],
      majorityCount: majority[1],
      majorityPct: ((majority[1] / total) * 100).toFixed(1),
      minorityName: minority[0],
      minorityCount: minority[1],
      minorityPct: ((minority[1] / total) * 100).toFixed(1),
      imbalanceRatio: `${ratio}:1`,
    };
  }, [classDist]);

  return (
    <div className="space-y-6 text-slate-200">
      {/* Primary Data Input Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Option A: User CSV Upload */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-xl border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center bg-slate-900 hover:bg-slate-800/80 ${
            dragActive
              ? 'border-cyan-400 bg-cyan-950/20'
              : 'border-slate-700 hover:border-slate-500'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".csv,.csv.gz"
            className="hidden"
          />

          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center mb-2.5">
            <Upload className="w-5 h-5 text-cyan-400" />
          </div>

          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Upload Network Traffic Capture (CSV)
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Drag and drop custom network flow records or click to browse. Reads up to 50,000 flows with automatic schema detection.
          </p>
          <span className="text-[11px] font-mono text-cyan-400 mt-3 px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            {isUploading ? 'Parsing Schema...' : 'Select File'}
          </span>
        </div>

        {/* Option B: Explicit Benchmark Sample Dataset */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
                Benchmark Partition
              </span>
              <Database className="w-4 h-4 text-slate-400" />
            </div>

            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Load Benchmark Dataset (CIC-IDS-2017)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explicitly import standard 5,000-flow partitions from the Canadian Institute for Cybersecurity to benchmark model detection rates against verified ground truth.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => handleSelectSample('binary')}
              disabled={isUploading}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-medium text-slate-200 transition-colors"
            >
              Binary (CIC-IDS)
            </button>
            <button
              onClick={() => handleSelectSample('multiclass')}
              disabled={isUploading}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-medium text-slate-200 transition-colors"
            >
              Multiclass (12 Classes)
            </button>
            <button
              onClick={() => handleSelectSample('lightweight' as any)}
              disabled={isUploading}
              className="px-3 py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 text-xs font-mono font-medium text-cyan-300 transition-colors"
            >
              Lightweight (Fast 12 Feats)
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loaded Dataset Intelligence Workspace */}
      {dataset && (
        <div className="space-y-5">
          <NetworkFlowTopology
            rows={dataset.preview_rows}
            title="Uploaded flow topology"
            subtitle={`Topology derived from the ${dataset.preview_rows.length} uploaded preview records shown below. Endpoint fields are used when present; otherwise the graph summarizes destination ports or reports missing endpoint fields.`}
            height={Math.max(280, Math.min(420, dataset.preview_rows.length * 20 + 120))}
          />

          {/* Quality & Summary Strip */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                  Dataset Telemetry Active
                </span>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2 mt-0.5">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  {dataset.filename}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-white font-semibold">
                  {dataset.record_count.toLocaleString()} Records
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-400 font-semibold">
                  {dataset.column_count} Total Columns
                </span>
              </div>
            </div>

            {/* Quality Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Missing Cells</span>
                <span className={`text-sm font-bold ${dataset.quality_summary.missing_cells > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {dataset.quality_summary.missing_cells}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Duplicate Rows</span>
                <span className="text-sm font-bold text-slate-200">
                  {dataset.quality_summary.duplicate_rows}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Infinite Values</span>
                <span className={`text-sm font-bold ${dataset.quality_summary.infinite_values > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {dataset.quality_summary.infinite_values}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Numeric Features</span>
                <span className="text-sm font-bold text-cyan-400">
                  {dataset.quality_summary.numeric_columns_count}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Validation Mode</span>
                <span className={`text-sm font-bold ${selectedTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedTarget ? 'Supervised (Holdout Split)' : 'Inference (Unlabeled)'}
                </span>
              </div>
            </div>
          </div>

          {/* Target Column Selection & Class Imbalance Breakdown */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Ground Truth Label Column
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select the column containing verified labels. Select "None" if traffic is ungrounded.
                </p>
              </div>

              <select
                value={selectedTarget || 'none'}
                onChange={(e) => {
                  const val = e.target.value === 'none' ? null : e.target.value;
                  onTargetChange(val);
                  // Refresh features to omit target
                  onFeaturesChange(dataset.columns.filter((c) => c !== val));
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="none">No Target (Unlabeled / Pure Inference)</option>
                {dataset.columns.map((c) => (
                  <option key={c} value={c}>
                    Target: {c} {c === dataset.suggested_target ? '(Auto-Detected)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Imbalance & Distribution Analysis */}
            {imbalanceSummary && selectedTarget && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Empirical Class Distribution ({imbalanceSummary.total.toLocaleString()} labeled flows)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Imbalance Ratio: <strong className="text-cyan-400">{imbalanceSummary.imbalanceRatio}</strong>
                  </span>
                </div>

                {/* Compact Stacked Distribution Bar */}
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                  {imbalanceSummary.entries.map(([cls, count], idx) => {
                    const pct = (count / imbalanceSummary.total) * 100;
                    const isAtt = cls.toLowerCase().includes('attack') || cls.toLowerCase().includes('threat') || idx === 1;
                    return (
                      <div
                        key={cls}
                        style={{ width: `${pct}%` }}
                        className={`h-full ${isAtt ? 'bg-rose-500' : 'bg-emerald-500'} transition-all`}
                        title={`${cls}: ${count.toLocaleString()} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
                  {imbalanceSummary.entries.map(([cls, count], idx) => {
                    const isAtt = cls.toLowerCase().includes('attack') || cls.toLowerCase().includes('threat') || idx === 1;
                    const pct = ((count / imbalanceSummary.total) * 100).toFixed(1);
                    return (
                      <div key={cls} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isAtt ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                        <span className="text-slate-300 font-semibold">{cls}:</span>
                        <span className="text-slate-400">{count.toLocaleString()} flows ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Feature Selection Interface */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Feature Matrix Selection ({selectedFeatures.length} of {candidateFeatures.length} Active)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Check which network flow dimensions will be passed into the imputation and ensemble pipeline.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={featureSearch}
                    onChange={(e) => setFeatureSearch(e.target.value)}
                    placeholder="Filter features..."
                    className="pl-8 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-44"
                  />
                </div>
                <button
                  onClick={selectAllFeatures}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
                >
                  All
                </button>
                <button
                  onClick={deselectAllFeatures}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-800 rounded-lg bg-slate-950">
              {filteredFeatures.map((feat) => {
                const isChecked = selectedFeatures.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(feat)}
                    className={`flex items-center gap-2 p-2 rounded text-left text-xs font-mono transition-colors ${
                      isChecked
                        ? 'bg-slate-900 text-white border border-slate-700'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate" title={feat}>
                      {feat}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dataset Preview Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Raw Feature Telemetry Preview (First {dataset.preview_rows.length} Flows)
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                {dataset.column_count} columns detected
              </span>
            </div>

            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-[10px] uppercase">
                    {dataset.columns.map((col) => (
                      <th
                        key={col}
                        className={`p-2.5 whitespace-nowrap font-semibold ${
                          col === selectedTarget ? 'text-cyan-400 bg-cyan-950/20' : ''
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {dataset.preview_rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      {dataset.columns.map((col) => (
                        <td
                          key={col}
                          className={`p-2.5 whitespace-nowrap text-slate-300 ${
                            col === selectedTarget ? 'text-cyan-400 font-bold bg-cyan-950/10' : ''
                          }`}
                        >
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs font-mono text-slate-400">
              Active Selection:{' '}
              <strong className="text-white">{selectedFeatures.length} features</strong> selected for training.
            </div>

            <button
              onClick={onProceed}
              disabled={selectedFeatures.length === 0}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-mono font-semibold text-xs flex items-center gap-2 transition-colors"
            >
              <span>Proceed to Configure (02)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
