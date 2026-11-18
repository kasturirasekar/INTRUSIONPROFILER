import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Scale,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';
import { LimeExplanationResponse } from '../../types/explainability';

interface LimeExplainerViewProps {
  flowFeatures: Record<string, any> | null;
}

export const LimeExplainerView: React.FC<LimeExplainerViewProps> = ({ flowFeatures }) => {
  const [numPerturbations, setNumPerturbations] = useState(150);
  const [numFeatures, setNumFeatures] = useState(8);
  const [limeData, setLimeData] = useState<LimeExplanationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runLime = async () => {
    if (!flowFeatures) return;
    setIsLoading(true);
    try {
      const res = await api.getLimeExplanation({
        flow_features: flowFeatures,
        num_perturbations: numPerturbations,
        num_features: numFeatures,
      });
      setLimeData(res);
    } catch (err) {
      console.error('Failed to run LIME explanation', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (flowFeatures) {
      runLime();
    }
  }, [flowFeatures]);

  if (!flowFeatures) {
    return (
      <div className="p-12 text-center text-soc-muted font-mono rounded-xl border border-dashed border-soc-border bg-soc-card/30">
        Select a flow in the Prediction Explainer tab to run local LIME surrogate modeling.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* Header & Concept Banner */}
      <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
            Local Surrogate Approximation
          </span>
          <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
            <Compass className="w-5 h-5 text-soc-accent" />
            LIME (Local Interpretable Model-agnostic Explanations)
          </h2>
          <p className="text-xs text-soc-muted mt-1 max-w-2xl">
            Surrounds the target flow with thousands of synthetic perturbations, queries the ensemble,
            and fits an interpretable weighted linear surrogate to extract human-readable decision rules.
          </p>
        </div>

        {/* Configuration Bar */}
        <div className="flex items-center gap-3 bg-soc-bg p-3 rounded-xl border border-soc-border shrink-0">
          <div>
            <label className="text-[10px] text-soc-muted uppercase block">Perturbations ({numPerturbations})</label>
            <input
              type="range"
              min={50}
              max={300}
              step={25}
              value={numPerturbations}
              onChange={(e) => setNumPerturbations(+e.target.value)}
              className="w-28 accent-soc-accent"
            />
          </div>

          <div>
            <label className="text-[10px] text-soc-muted uppercase block">Top Rules ({numFeatures})</label>
            <input
              type="range"
              min={3}
              max={15}
              value={numFeatures}
              onChange={(e) => setNumFeatures(+e.target.value)}
              className="w-20 accent-soc-accent"
            />
          </div>

          <button
            onClick={runLime}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-soc-accent text-soc-bg font-bold text-xs flex items-center gap-1.5 hover:bg-soc-accent/90 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Re-fit
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-16 text-center text-soc-accent animate-pulse space-y-2">
          <Activity className="w-7 h-7 animate-spin mx-auto text-soc-accent" />
          <p className="text-sm font-bold">Fitting Weighted Ridge Surrogate on {numPerturbations} Perturbed Instances...</p>
        </div>
      )}

      {limeData && !isLoading && (
        <div className="space-y-6">
          {/* Fidelity & Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-soc-card border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase tracking-wider block">Surrogate Model Fidelity (R²)</span>
              <div className="text-2xl font-bold text-soc-accent mt-1 flex items-center gap-2">
                {(limeData.surrogate_r2_fidelity * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-soc-muted mt-1 block">
                How accurately the linear model matches the ensemble locally
              </span>
            </div>

            <div className="p-4 rounded-xl bg-soc-card border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase tracking-wider block">Local Neighborhood Intercept</span>
              <div className="text-2xl font-bold text-soc-text mt-1">
                {limeData.intercept.toFixed(4)}
              </div>
              <span className="text-[10px] text-soc-muted mt-1 block">
                Baseline threat score in immediate local Euclidean sphere
              </span>
            </div>

            <div className="p-4 rounded-xl bg-soc-card border border-soc-border">
              <span className="text-[10px] text-soc-muted uppercase tracking-wider block">Local Threat Prediction</span>
              <div className="text-2xl font-bold text-orange-400 mt-1">
                {(limeData.prediction_local * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-soc-muted mt-1 block">
                Ridge surrogate estimate for query flow
              </span>
            </div>
          </div>

          {/* Narrative Summary Callout */}
          <div className="p-4 rounded-xl bg-soc-accent/10 border border-soc-accent/30 text-xs text-soc-text leading-relaxed">
            <strong className="text-soc-accent uppercase block mb-1">Local Surrogate Assessment:</strong>
            {limeData.explanation_summary}
          </div>

          {/* Extracted Decision Rules */}
          <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-soc-text">
              Extracted Local Decision Rules (Ranked by Surrogate Weight)
            </h3>

            <div className="space-y-2.5">
              {limeData.rules.map((rule, idx) => {
                const isMalicious = rule.direction === 'supports_malicious';
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isMalicious
                        ? 'bg-orange-500/5 border-orange-500/30'
                        : 'bg-cyan-500/5 border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isMalicious ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-soc-text font-mono block">
                          IF {rule.rule}
                        </span>
                        <span className="text-[10px] text-soc-muted">Feature: {rule.feature}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          isMalicious ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}
                      >
                        {isMalicious ? 'Pushes Attack' : 'Supports Benign'}
                      </span>
                      <span
                        className={`text-sm font-bold font-mono ${
                          isMalicious ? 'text-orange-400' : 'text-cyan-400'
                        }`}
                      >
                        {rule.weight > 0 ? `+${rule.weight.toFixed(4)}` : rule.weight.toFixed(4)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Academic Distinction: SHAP vs LIME */}
          <div className="p-5 rounded-xl bg-soc-bg border border-soc-border space-y-2 text-xs">
            <span className="font-bold text-soc-muted uppercase tracking-wider block">
              Methodological Comparison: SHAP vs LIME
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-soc-muted leading-relaxed font-sans">
              <div className="p-3 rounded-lg bg-soc-card border border-soc-border">
                <strong className="text-soc-accent block mb-1 font-mono">SHAP (Cooperative Game Theory)</strong>
                Calculates the exact average marginal contribution of a feature across all possible feature subsets.
                Guarantees mathematical additivity ($\sum \phi = f(x) - E[f(z)]$) and symmetric fairness.
              </div>
              <div className="p-3 rounded-lg bg-soc-card border border-soc-border">
                <strong className="text-orange-400 block mb-1 font-mono">LIME (Local Linear Surrogate)</strong>
                Approximates the decision boundary strictly in the immediate geometric neighborhood of the query.
                Provides intuitive threshold rules, but does not guarantee additivity or global consistency.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
