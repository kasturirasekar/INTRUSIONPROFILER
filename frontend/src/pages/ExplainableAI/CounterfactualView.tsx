import React, { useState, useEffect } from 'react';
import {
  GitFork,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Scale,
} from 'lucide-react';
import { api } from '../../services/api';
import { CounterfactualResponse } from '../../types/explainability';

interface CounterfactualViewProps {
  flowFeatures: Record<string, any> | null;
}

export const CounterfactualView: React.FC<CounterfactualViewProps> = ({ flowFeatures }) => {
  const [maxFeatures, setMaxFeatures] = useState(12);
  const [threshold, setThreshold] = useState(0.45);
  const [cfData, setCfData] = useState<CounterfactualResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runCounterfactual = async () => {
    if (!flowFeatures) return;
    setIsLoading(true);
    try {
      const res = await api.getCounterfactual({
        flow_features: flowFeatures,
        target_class: 'Benign',
        max_features_to_change: maxFeatures,
        desired_probability_threshold: threshold,
      });
      setCfData(res);
    } catch (err) {
      console.error('Failed to generate counterfactual', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (flowFeatures) {
      runCounterfactual();
    }
  }, [flowFeatures]);

  if (!flowFeatures) {
    return (
      <div className="p-12 text-center text-soc-muted font-mono rounded-xl border border-dashed border-soc-border bg-soc-card/30">
        Select a flow in the Prediction Explainer tab to generate counterfactual recourse scenarios.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* Header & Concept */}
      <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
            Prescriptive What-If Recourse
          </span>
          <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
            <GitFork className="w-5 h-5 text-soc-accent" />
            Constrained Counterfactual Analysis
          </h2>
          <p className="text-xs text-soc-muted mt-1 max-w-2xl">
            Answers: "What minimal feature changes would cause the ensemble to flip its classification from Malicious to Benign?"
            All proposed modifications strictly respect valid physical network protocol constraints.
          </p>
        </div>

        {/* Configuration Bar */}
        <div className="flex items-center gap-3 bg-soc-bg p-3 rounded-xl border border-soc-border shrink-0">
          <div>
            <label className="text-[10px] text-soc-muted uppercase block">Max Features ({maxFeatures})</label>
            <input
              type="range"
              min={3}
              max={25}
              value={maxFeatures}
              onChange={(e) => setMaxFeatures(+e.target.value)}
              className="w-24 accent-soc-accent"
            />
          </div>

          <div>
            <label className="text-[10px] text-soc-muted uppercase block">Threshold ({(threshold * 100).toFixed(0)}%)</label>
            <input
              type="range"
              min={0.1}
              max={0.5}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(+e.target.value)}
              className="w-24 accent-soc-accent"
            />
          </div>

          <button
            onClick={runCounterfactual}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg bg-soc-accent text-soc-bg font-bold text-xs flex items-center gap-1.5 hover:bg-soc-accent/90 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Solve
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-16 text-center text-soc-accent animate-pulse space-y-2">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-soc-accent" />
          <p className="text-sm font-bold">Optimizing Feasible Constrained Feature Path to Benign Frontier...</p>
        </div>
      )}

      {cfData && !isLoading && (
        <div className="space-y-6">
          {/* Verdict Shift Banner */}
          <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center">
                <span className="text-[10px] text-soc-muted uppercase block">Original Prediction</span>
                <span className="text-xl font-bold text-orange-400 mt-1 block">{cfData.original_prediction}</span>
                <span className="text-[11px] text-soc-muted">{(cfData.original_attack_prob * 100).toFixed(1)}% Threat</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] text-soc-accent font-bold uppercase mb-1">Flipped Decision</span>
                <ArrowRight className="w-6 h-6 text-soc-accent" />
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center">
                <span className="text-[10px] text-soc-muted uppercase block">Counterfactual State</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{cfData.counterfactual_prediction}</span>
                <span className="text-[11px] text-soc-muted">{(cfData.counterfactual_attack_prob * 100).toFixed(1)}% Threat</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                <span className="text-soc-muted block">Features Modified</span>
                <span className="text-soc-text font-bold text-base">{cfData.features_modified_count} of 78</span>
              </div>

              <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                <span className="text-soc-muted block">Normalized L1 Distance</span>
                <span className="text-soc-accent font-bold text-base">{cfData.normalized_l1_distance}</span>
              </div>
            </div>
          </div>

          {/* Actionable Recourse Narrative Callout */}
          <div className="p-4 rounded-xl bg-soc-accent/10 border border-soc-accent/30 text-xs text-soc-text leading-relaxed">
            <strong className="text-soc-accent uppercase block mb-1">Actionable Forensic Recourse:</strong>
            {cfData.actionable_narrative}
          </div>

          {/* Modifications Delta Table */}
          <div className="rounded-2xl border border-soc-border bg-soc-card overflow-hidden shadow-card">
            <div className="p-4 border-b border-soc-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-soc-text">
                Proposed Counterfactual Deltas (What Must Change)
              </h3>
              <span className="text-[10px] text-soc-accent font-bold">
                ✓ Valid Protocol Constraints Enforced
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-soc-border bg-soc-bg/40 text-soc-muted uppercase text-[10px]">
                    <th className="p-3">Network Feature</th>
                    <th className="p-3 text-right">Original Value</th>
                    <th className="p-3 text-center">→</th>
                    <th className="p-3 text-right">Counterfactual Target</th>
                    <th className="p-3 text-right">Delta (%)</th>
                    <th className="p-3">Protocol Feasibility & Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {cfData.modified_features.map((item) => (
                    <tr key={item.feature} className="hover:bg-soc-border/20 transition-colors">
                      <td className="p-3 font-semibold text-soc-text">
                        {item.feature}
                      </td>
                      <td className="p-3 text-right font-mono text-orange-400">
                        {item.original_value.toLocaleString()}
                      </td>
                      <td className="p-3 text-center text-soc-muted">→</td>
                      <td className="p-3 text-right font-mono text-cyan-400 font-bold">
                        {item.counterfactual_value.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-soc-muted">
                        <span className={item.percent_change < 0 ? 'text-cyan-400' : 'text-orange-400'}>
                          {item.percent_change > 0 ? `+${item.percent_change}%` : `${item.percent_change}%`}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-soc-muted/90 font-sans">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-soc-low shrink-0" />
                          {item.cyber_meaning}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ethical & Security Boundary Notice */}
          <div className="p-4 rounded-xl bg-soc-bg border border-soc-border text-xs text-soc-muted font-sans flex items-start gap-2.5">
            <Info className="w-4 h-4 text-soc-accent shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-soc-text">Security Architecture Note: </strong>
              {cfData.ethical_disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
