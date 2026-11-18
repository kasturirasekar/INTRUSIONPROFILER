import React, { useState } from 'react';
import { Layers, ArrowRight, ShieldAlert, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { DatasetSelectionConfig, PreprocessingConfig, PreprocessingPreview } from '../../types/lab';
import { api } from '../../services/api';
import { TheoryDrawer } from './TheoryDrawer';

interface PreprocessingStageProps {
  datasetConfig: DatasetSelectionConfig;
  config: PreprocessingConfig;
  onChange: (cfg: PreprocessingConfig) => void;
}

export const PreprocessingStage: React.FC<PreprocessingStageProps> = ({
  datasetConfig,
  config,
  onChange,
}) => {
  const [preview, setPreview] = useState<PreprocessingPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await api.previewPreprocessing(datasetConfig, config);
      setPreview(res);
    } catch (err) {
      console.error('Preprocessing preview failed', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Educational Guide Drawer */}
      <TheoryDrawer
        title="Preprocessing, Feature Scaling & Data Leakage Prevention"
        cyberContext="Raw network captures frequently record non-finite rates (such as infinite Flow Bytes/sec in zero-duration single-packet scans) or extreme packet sizes in DDoS floods. If an imputer or scaler is fitted across both training and testing datasets simultaneously, statistical parameters (e.g. mean or variance of attack packets) leak into the model's test evaluation. In the real world, an intrusion detection system must classify unseen flows arriving in real time, with zero prior knowledge of future packet parameters."
        mlConcept="Preprocessing pipelines must maintain strict temporal and structural isolation: transformers call .fit_transform() on the training split only, and .transform() on the testing split. Similarly, synthetic oversampling techniques like SMOTE generate artificial interpolation points; if SMOTE is applied to test evaluation data, the model is tested against synthetic points rather than real network flows, falsifying detection metrics."
        keyTakeaway="All scaling, imputing, and SMOTE resampling in this lab are mathematically constrained to the training partition to ensure zero data leakage."
        defaultOpen={false}
      />

      {/* Preprocessing Control Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missing Values & Feature Scaling */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-5">
          <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-soc-accent" />
            Imputation & Feature Scaling
          </h3>

          {/* Missing Value Strategy */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-soc-muted block">Missing & Infinite Value Handling</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'median', label: 'Median Imputer', desc: 'Robust to flow duration skew' },
                { id: 'mean', label: 'Mean Imputer', desc: 'Sensitive to packet bursts' },
                { id: 'drop', label: 'Drop Missing Rows', desc: 'Discards corrupted records' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...config, missing_value_strategy: opt.id as any })}
                  className={`p-2.5 rounded-lg text-left border font-mono transition-colors ${
                    config.missing_value_strategy === opt.id
                      ? 'bg-soc-accent/15 border-soc-accent text-soc-accent'
                      : 'bg-soc-bg border-soc-border text-soc-muted hover:text-soc-text'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-soc-muted leading-tight mt-0.5 block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scaling Strategy */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-soc-muted block">Feature Scaling Transformation</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'standard', label: 'StandardScaler', desc: 'z = (x - μ) / σ' },
                { id: 'minmax', label: 'MinMaxScaler', desc: 'Bound [0, 1]' },
                { id: 'robust', label: 'RobustScaler', desc: 'Median & IQR' },
                { id: 'none', label: 'No Scaling', desc: 'Raw units (Trees)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...config, scaling_strategy: opt.id as any })}
                  className={`p-2.5 rounded-lg text-left border font-mono transition-colors ${
                    config.scaling_strategy === opt.id
                      ? 'bg-soc-accent/15 border-soc-accent text-soc-accent'
                      : 'bg-soc-bg border-soc-border text-soc-muted hover:text-soc-text'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-soc-muted leading-tight mt-0.5 block">{opt.desc}</span>
                </button>
              ))}
            </div>
            <span className="text-[10px] text-soc-muted font-mono block">
              Essential for distance models (KNN, SVM) and gradient optimization (Logistic Regression). Tree models (Random Forest) are scale-invariant.
            </span>
          </div>

          {/* Feature Selection Strategy */}
          <div className="space-y-2 pt-2 border-t border-soc-border">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-soc-muted">Feature Space Reduction</span>
              <span className="text-soc-accent font-bold">
                {config.feature_selection_strategy === 'all'
                  ? 'All 78 Features'
                  : `Top ${config.top_k_features} Features`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...config, feature_selection_strategy: 'all' })}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  config.feature_selection_strategy === 'all'
                    ? 'bg-soc-accent/15 border-soc-accent text-soc-accent'
                    : 'bg-soc-bg border-soc-border text-soc-muted'
                }`}
              >
                Use All 78 Network Features
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...config, feature_selection_strategy: 'top_k' })}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  config.feature_selection_strategy === 'top_k'
                    ? 'bg-soc-accent/15 border-soc-accent text-soc-accent'
                    : 'bg-soc-bg border-soc-border text-soc-muted'
                }`}
              >
                Select Top K (ANOVA F-Score)
              </button>
            </div>

            {config.feature_selection_strategy === 'top_k' && (
              <div className="pt-2">
                <input
                  type="range"
                  min={5}
                  max={78}
                  step={5}
                  value={config.top_k_features}
                  onChange={(e) => onChange({ ...config, top_k_features: Number(e.target.value) })}
                  className="w-full accent-soc-accent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Class Imbalance & Real-time Transformation Preview */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-soc-high" />
              Class Imbalance Resampling (Train Only)
            </h3>

            <div className="grid grid-cols-2 gap-2 font-mono">
              {[
                { id: 'none', label: 'No Resampling', desc: 'Preserves natural traffic distribution' },
                { id: 'smote', label: 'SMOTE (Synthetic)', desc: 'Generates k-nearest synthetic attacks' },
                { id: 'random_oversample', label: 'Random Oversampling', desc: 'Duplicates minority attack flows' },
                { id: 'random_undersample', label: 'Random Undersampling', desc: 'Down-samples benign flows' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...config, imbalance_strategy: opt.id as any })}
                  className={`p-3 rounded-lg text-left border transition-colors ${
                    config.imbalance_strategy === opt.id
                      ? 'bg-soc-high/15 border-soc-high text-soc-high'
                      : 'bg-soc-bg border-soc-border text-soc-muted hover:text-soc-text'
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-soc-muted leading-tight mt-0.5 block">{opt.desc}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePreview}
              disabled={loadingPreview}
              className="w-full py-2.5 rounded-lg text-xs font-mono font-bold bg-soc-secondary border border-soc-border text-soc-accent hover:border-soc-borderLight flex items-center justify-center gap-2 transition-colors mt-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
              Compute & Preview Preprocessing Transformation
            </button>
          </div>

          {/* Transformation Preview Box */}
          {preview ? (
            <div className="p-4 rounded-xl bg-soc-secondary/50 border border-soc-border space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-soc-border/60 pb-2">
                <span className="text-soc-muted">Feature Dimension Delta:</span>
                <span className="text-soc-text font-bold flex items-center gap-1.5">
                  {preview.original_train_shape[1]} features <ArrowRight className="w-3 h-3 text-soc-accent" /> {preview.transformed_train_shape[1]} features
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-soc-border/60 pb-2">
                <span className="text-soc-muted">Training Flows Resampled:</span>
                <span className="text-soc-accent font-bold">
                  {preview.transformed_train_shape[0].toLocaleString()} records
                </span>
              </div>

              <div>
                <span className="text-soc-muted block mb-1">Applied Operations:</span>
                <div className="flex flex-wrap gap-1">
                  {preview.applied_transformations.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-soc-bg border border-soc-border text-[11px] text-soc-text">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-soc-bg/40 border border-dashed border-soc-border text-center text-xs font-mono text-soc-muted">
              Click "Compute & Preview" above to inspect the exact matrix dimensions and resampling effects.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
