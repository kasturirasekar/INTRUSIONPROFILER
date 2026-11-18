import React, { useState, useEffect } from 'react';
import { Database, ShieldAlert, Sparkles, RefreshCw, Eye } from 'lucide-react';
import { DatasetMetadata, DatasetPreview, DatasetSelectionConfig } from '../../types/lab';
import { api } from '../../services/api';
import { TheoryDrawer } from './TheoryDrawer';

interface DatasetStageProps {
  config: DatasetSelectionConfig;
  onChange: (cfg: DatasetSelectionConfig) => void;
  metadata: DatasetMetadata | null;
}

export const DatasetStage: React.FC<DatasetStageProps> = ({ config, onChange, metadata }) => {
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const data = await api.previewDataset(config);
      setPreview(data);
    } catch (err) {
      console.error('Failed to preview dataset', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [config.task_type]);

  return (
    <div className="space-y-6">
      {/* Educational Guide Drawer */}
      <TheoryDrawer
        title="Dataset Selection & Traffic Flow Representation"
        cyberContext="Network intrusion detection differs fundamentally from ordinary ML tasks. A network flow is an aggregation of bidirectional packet headers between source and destination IP/ports. In real-world enterprise traffic, legitimate communication (benign) accounts for 95%–99% of total packets, while attack traffic represents rare, stealthy bursts. Randomly splitting flows without stratification can cause rare attack categories (such as Web Attack XSS or Botnets) to vanish entirely from the testing set, creating an illusion of high detection accuracy."
        mlConcept="Supervised classifiers learn an empirical decision boundary f(X) -> Y. When the dataset is heavily skewed (e.g. 90:10 ratio), an uncalibrated classifier can predict the majority class (Benign) 100% of the time and still achieve 90% accuracy while failing completely at security defense. Stratified sampling preserves the identical proportion of minority attack vectors in both training and test folds."
        keyTakeaway="Always use Stratified sampling when partitioning network intrusion datasets, and evaluate models using Attack Recall and F1 rather than raw overall accuracy."
        defaultOpen={false}
      />

      {/* Dataset Selection Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-1 bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
              <Database className="w-4 h-4 text-soc-accent" />
              Partition Parameters
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-soc-secondary text-soc-accent">
              CIC-IDS-2017
            </span>
          </div>

          {/* Task Type Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-soc-muted block">Classification Objective</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...config, task_type: 'binary' })}
                className={`px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  config.task_type === 'binary'
                    ? 'bg-soc-accent/15 border-soc-accent text-soc-accent'
                    : 'bg-soc-bg border-soc-border text-soc-muted hover:text-soc-text'
                }`}
              >
                Binary (Benign/Attack)
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...config, task_type: 'multiclass' })}
                className={`px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  config.task_type === 'multiclass'
                    ? 'bg-soc-accent/15 border-soc-accent text-soc-accent'
                    : 'bg-soc-bg border-soc-border text-soc-muted hover:text-soc-text'
                }`}
              >
                Multiclass (12 Attack Categories)
              </button>
            </div>
          </div>

          {/* Training Sample Size Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-soc-muted">Maximum Training Rows</span>
              <span className="text-soc-text font-bold">{config.train_rows.toLocaleString()} flows</span>
            </div>
            <input
              type="range"
              min={1000}
              max={200000}
              step={5000}
              value={config.train_rows}
              onChange={(e) => onChange({ ...config, train_rows: Number(e.target.value) })}
              className="w-full accent-soc-accent"
            />
            <span className="text-[10px] text-soc-muted block">
              Set this above the dataset size to use every available training flow.
            </span>
          </div>

          {/* Testing Sample Size Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-soc-muted">Maximum Holdout Rows</span>
              <span className="text-soc-text font-bold">{config.test_rows.toLocaleString()} flows</span>
            </div>
            <input
              type="range"
              min={500}
              max={50000}
              step={1000}
              value={config.test_rows}
              onChange={(e) => onChange({ ...config, test_rows: Number(e.target.value) })}
              className="w-full accent-soc-accent"
            />
          </div>

          {/* Random Seed & Stratification */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-soc-border">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-soc-muted block">Random Seed</label>
              <input
                type="number"
                value={config.random_seed}
                onChange={(e) => onChange({ ...config, random_seed: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs bg-soc-bg border border-soc-border rounded-lg text-soc-text font-mono focus:outline-none focus:border-soc-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-soc-muted block">Stratified Split</label>
              <button
                type="button"
                onClick={() => onChange({ ...config, stratified: !config.stratified })}
                className={`w-full py-1.5 text-xs font-mono rounded-lg border font-bold transition-colors ${
                  config.stratified
                    ? 'bg-soc-low/15 border-soc-low text-soc-low'
                    : 'bg-soc-bg border-soc-border text-soc-muted'
                }`}
              >
                {config.stratified ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchPreview}
            disabled={loadingPreview}
            className="w-full py-2.5 rounded-lg text-xs font-mono font-bold bg-soc-secondary border border-soc-border text-soc-accent hover:border-soc-borderLight flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
            Refresh Dataset Slice Preview
          </button>
        </div>

        {/* Right: Dataset Metadata & Class Distribution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3.5 rounded-xl bg-soc-card border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase block">Total Benchmark Size</span>
              <span className="text-lg font-bold text-soc-text mt-1 block">
                {metadata?.total_records.toLocaleString() ?? '238,075'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-soc-card border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase block">Extracted Features</span>
              <span className="text-lg font-bold text-soc-accent mt-1 block">
                {metadata?.feature_count ?? 78} numeric
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-soc-card border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase block">Training Flows Used</span>
              <span className="text-lg font-bold text-soc-text mt-1 block">
                {preview?.train_count.toLocaleString() ?? config.train_rows.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-soc-card border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase block">Holdout Flows Used</span>
              <span className="text-lg font-bold text-soc-text mt-1 block">
                {preview?.test_count.toLocaleString() ?? config.test_rows.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Multiclass Taxonomy List / Binary Class Distribution */}
          <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-card space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-soc-text flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-soc-critical" />
              Dataset Attack Taxonomy & Class Representation
            </h4>

            {config.task_type === 'binary' ? (
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-soc-accent/10 border border-soc-accent/30 space-y-1">
                  <span className="text-soc-accent font-bold block">Clean Traffic (BENIGN)</span>
                  <span className="text-lg font-bold text-soc-text">~82% of flows</span>
                  <p className="text-[11px] text-soc-muted">Normal web browsing, DNS queries, SSH administration, and internal enterprise traffic.</p>
                </div>
                <div className="p-4 rounded-xl bg-soc-critical/10 border border-soc-critical/30 space-y-1">
                  <span className="text-soc-critical font-bold block">Malicious Traffic (ATTACK)</span>
                  <span className="text-lg font-bold text-soc-text">~18% of flows</span>
                  <p className="text-[11px] text-soc-muted">Multi-vector incursions including DoS, DDoS, PortScan, FTP-Patator, SSH-Patator, and Web Exploits.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-xs">
                {metadata?.multiclass_categories.map((cat) => (
                  <div key={cat.id} className="p-2.5 rounded-lg bg-soc-bg border border-soc-border/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-soc-text truncate" title={cat.category}>
                        {cat.category}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-soc-secondary text-soc-muted">
                        #{cat.id}
                      </span>
                    </div>
                    <span className="text-[11px] text-soc-muted mt-0.5 block">
                      {cat.test_samples.toLocaleString()} samples
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sample Rows Table Preview */}
          {preview && (
            <div className="bg-soc-card border border-soc-border rounded-xl p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-soc-text flex items-center gap-2">
                  <Eye className="w-4 h-4 text-soc-accent" />
                  Live Partition Sample Preview (First 8 Features)
                </h4>
                <span className="text-[11px] font-mono text-soc-muted">
                  Loaded: {preview.train_count.toLocaleString()} train / {preview.test_count.toLocaleString()} test
                </span>
              </div>

              <div className="overflow-x-auto max-h-48 text-xs font-mono">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-soc-border text-[11px] text-soc-muted uppercase">
                      {Object.keys(preview.sample_rows[0] || {}).map((col) => (
                        <th key={col} className="pb-2 font-semibold pr-3 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soc-border/40">
                    {preview.sample_rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-soc-secondary/30">
                        {Object.entries(row).map(([k, v]) => (
                          <td
                            key={k}
                            className={`py-1.5 pr-3 whitespace-nowrap ${
                              k === 'target'
                                ? v === 'Attack' || Number(v) > 0
                                  ? 'text-soc-critical font-bold'
                                  : 'text-soc-accent font-bold'
                                : 'text-soc-text'
                            }`}
                          >
                            {typeof v === 'number' ? v.toFixed(2) : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
