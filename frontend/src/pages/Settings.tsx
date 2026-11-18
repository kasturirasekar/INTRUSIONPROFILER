import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Database,
  FileCode2,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { HealthStatus } from '../types';

interface SettingsProps {
  health: HealthStatus | null;
}

export const Settings: React.FC<SettingsProps> = ({ health }) => {
  const [apiUrl, setApiUrl] = useState(
    import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
  );
  const [copiedSchema, setCopiedSchema] = useState(false);

  const handleCopyFeatures = () => {
    if (health?.active_features_sample) {
      navigator.clipboard.writeText(health.active_features_sample.join(', '));
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-text font-mono flex items-center gap-2.5">
          <SettingsIcon className="w-5 h-5 text-soc-accent" />
          System Configuration & Feature Schema Guide
        </h1>
        <p className="text-xs sm:text-sm text-soc-muted mt-1">
          Backend operational settings, environment parameters, and model input specifications
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backend Connectivity Configuration */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-4">
          <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
            <Server className="w-4 h-4 text-soc-accent" />
            Backend REST API Connection
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-mono text-soc-muted">API Base URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-soc-bg border border-soc-border rounded-lg text-soc-text font-mono focus:outline-none focus:border-soc-accent"
            />
            <span className="text-[11px] text-soc-muted block">
              Configured via <code>VITE_API_BASE_URL</code> environment variable.
            </span>
          </div>

          <div className="p-4 rounded-xl bg-soc-secondary/50 border border-soc-border space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-soc-muted">Status:</span>
              <span className="text-soc-low font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> {health?.status === 'ok' ? 'HEALTHY' : 'CONNECTING'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-soc-muted">Version:</span>
              <span className="text-soc-text">{health?.version ?? '2.0.0'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-soc-muted">Active Pipeline:</span>
              <span className="text-soc-text">{health?.model_type ?? 'sklearn.Pipeline'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-soc-muted">Feature Dimension:</span>
              <span className="text-soc-accent font-bold">{health?.feature_count ?? 78} numeric features</span>
            </div>
          </div>
        </div>

        {/* Dataset & Artifact Locations */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-4">
          <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
            <Database className="w-4 h-4 text-soc-accent" />
            Artifacts & Data Stores
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-soc-bg border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase block">Model Artifact</span>
              <span className="text-soc-text block font-bold mt-0.5 truncate">
                outputs/models/final_model_random_forest.joblib
              </span>
            </div>

            <div className="p-3 rounded-lg bg-soc-bg border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase block">Evaluation Dataset</span>
              <span className="text-soc-text block font-bold mt-0.5 truncate">
                data/processed/binary_test.csv.gz (47,607 rows)
              </span>
            </div>

            <div className="p-3 rounded-lg bg-soc-bg border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase block">Metrics Store</span>
              <span className="text-soc-text block font-bold mt-0.5 truncate">
                outputs/metrics/baseline_model_comparison.csv
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Specification Reference */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-soc-accent" />
              Expected CIC-IDS-2017 Feature Matrix Schema
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              The model pipeline processes 78 numeric flow features. Missing features are automatically imputed with training set medians.
            </p>
          </div>

          <button
            onClick={handleCopyFeatures}
            className="px-3 py-1.5 text-xs font-mono rounded-lg border border-soc-border text-soc-muted hover:text-soc-text hover:border-soc-borderLight flex items-center gap-1.5 transition-colors"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5 text-soc-low" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSchema ? 'Copied' : 'Copy Sample Features'}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-soc-bg border border-soc-border font-mono text-xs text-soc-muted space-y-2 leading-relaxed">
          <p className="text-soc-text">
            Key input features include:
          </p>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {[
              'Destination Port',
              'Flow Duration',
              'Total Fwd Packets',
              'Total Backward Packets',
              'Total Length of Fwd Packets',
              'Packet Length Mean',
              'Packet Length Std',
              'Packet Length Variance',
              'Flow Bytes/s',
              'Flow Packets/s',
              'Flow IAT Mean',
              'Flow IAT Std',
              'Flow IAT Max',
              'Fwd IAT Total',
              'Bwd IAT Total',
              'FIN Flag Count',
              'SYN Flag Count',
              'RST Flag Count',
              'PSH Flag Count',
              'ACK Flag Count',
              'Down/Up Ratio',
              'Average Packet Size',
              'Init_Win_bytes_forward',
              'Init_Win_bytes_backward',
            ].map((col) => (
              <span key={col} className="px-2 py-0.5 rounded bg-soc-secondary text-soc-text border border-soc-border/60">
                {col}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded bg-soc-secondary text-soc-accent border border-soc-border/60">
              + 54 additional flow metrics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
