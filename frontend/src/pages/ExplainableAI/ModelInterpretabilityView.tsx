import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  ShieldAlert,
  BarChart2,
  Sliders,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  ModelInterpretabilityResponse,
  AttackProfileItem,
} from '../../types/explainability';

export const ModelInterpretabilityView: React.FC = () => {
  const [interpData, setInterpData] = useState<ModelInterpretabilityResponse | null>(null);
  const [attackProfiles, setAttackProfiles] = useState<AttackProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'comparison' | 'tree' | 'attacks'>('comparison');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [interpRes, profilesRes] = await Promise.all([
          api.getModelInterpretability(),
          api.getAttackProfiles(),
        ]);
        setInterpData(interpRes);
        setAttackProfiles(profilesRes);
      } catch (err) {
        console.error('Failed to load interpretability data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-soc-accent animate-pulse font-mono">
        <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-soc-accent" />
        <p className="text-sm font-bold">Synthesizing Global Interpretability & Tree Decision Paths...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
            Global Transparency & Attack Signatures
          </span>
          <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
            <GitBranch className="w-5 h-5 text-soc-accent" />
            Model Interpretability & Attack Profiles
          </h2>
          <p className="text-xs text-soc-muted mt-1 max-w-2xl">
            Compare tree impurity against permutation drop and SHAP attribution, inspect decision tree split paths,
            and examine how the ensemble distinguishes specific attack classes from benign network traffic.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-soc-bg p-1 rounded-xl border border-soc-border shrink-0">
          <button
            onClick={() => setActiveSubTab('comparison')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              activeSubTab === 'comparison'
                ? 'bg-soc-accent text-soc-bg font-bold'
                : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Importance Comparison
          </button>
          <button
            onClick={() => setActiveSubTab('tree')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              activeSubTab === 'tree'
                ? 'bg-soc-accent text-soc-bg font-bold'
                : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Tree Split Inspector
          </button>
          <button
            onClick={() => setActiveSubTab('attacks')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              activeSubTab === 'attacks'
                ? 'bg-soc-accent text-soc-bg font-bold'
                : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Attack Signatures
          </button>
        </div>
      </div>

      {/* Subtab 1: Tri-Method Feature Importance Comparison */}
      {activeSubTab === 'comparison' && interpData && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-soc-border bg-soc-card overflow-hidden shadow-card">
            <div className="p-4 border-b border-soc-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-soc-text">
                Tri-Method Feature Ranking Comparison: Tree Gini vs Permutation Drop vs Mean |SHAP|
              </h3>
              <span className="text-[10px] text-soc-muted">
                {interpData.feature_importance_comparison.length} ranked discriminators
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-soc-border bg-soc-bg/40 text-soc-muted uppercase text-[10px]">
                    <th className="p-3">Rank</th>
                    <th className="p-3">Network Feature</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Tree Gini Importance</th>
                    <th className="p-3 text-right">Permutation Drop</th>
                    <th className="p-3 text-right">Mean |SHAP| Attribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {interpData.feature_importance_comparison.map((item) => (
                    <tr key={item.feature} className="hover:bg-soc-border/20 transition-colors">
                      <td className="p-3 font-mono text-soc-accent font-bold">#{item.rank}</td>
                      <td className="p-3 font-semibold text-soc-text">{item.feature}</td>
                      <td className="p-3 text-soc-muted uppercase text-[10px]">{item.category}</td>
                      <td className="p-3 text-right font-mono text-cyan-400">
                        {(item.gini_importance * 100).toFixed(2)}%
                      </td>
                      <td className="p-3 text-right font-mono text-orange-400">
                        {(item.permutation_importance * 100).toFixed(2)}%
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-soc-accent">
                        {item.mean_shap_attribution.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Theoretical Note: Why Measures Differ */}
          <div className="p-4 rounded-xl bg-soc-bg border border-soc-border text-xs text-soc-muted font-sans space-y-2">
            <strong className="text-soc-accent uppercase block font-mono">
              Why do Gini, Permutation, and SHAP importances differ?
            </strong>
            <p className="leading-relaxed">
              <strong>Tree Gini Impurity</strong> measures how often a feature is chosen for splitting in decision trees, but can over-weight high-cardinality continuous parameters.
              <strong> Permutation Importance</strong> shuffles a feature column on test data to observe empirical accuracy drops, reflecting true out-of-sample impact.
              <strong> SHAP Attribution</strong> calculates fair cooperative game-theoretic payoff, capturing non-linear interactions across feature coalitions.
            </p>
          </div>
        </div>
      )}

      {/* Subtab 2: Tree Decision Split Inspector */}
      {activeSubTab === 'tree' && interpData && (
        <div className="rounded-2xl border border-soc-border bg-soc-card overflow-hidden shadow-card space-y-4 p-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-soc-text">
              Base Decision Tree Split Rules (Top Root Splitting Paths)
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Orthogonal partition boundaries learned by the underlying Decision Tree classifier in the Stacking ensemble.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {interpData.tree_rules_sample.map((rule) => (
              <div
                key={rule.node_id}
                className="p-3.5 rounded-xl bg-soc-bg border border-soc-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-soc-card border border-soc-border flex items-center justify-center font-bold text-soc-accent">
                    N{rule.node_id}
                  </span>
                  <div>
                    <span className="font-bold text-soc-text">
                      Split on <strong className="text-soc-accent">{rule.feature}</strong>
                    </span>
                    <span className="text-[10px] text-soc-muted block mt-0.5">
                      Threshold value: <strong>{rule.threshold}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-soc-muted font-sans">
                  <div className="text-soc-text font-mono font-semibold">{rule.direction_taken}</div>
                  <div className="text-[10px] text-soc-muted/80 mt-0.5">{rule.purity_or_class}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 3: Attack Specific Signatures */}
      {activeSubTab === 'attacks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {attackProfiles.map((att) => (
            <div
              key={att.attack_name}
              className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-soc-text">
                  {att.attack_name}
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                    att.severity === 'Critical'
                      ? 'bg-soc-critical/20 text-soc-critical border border-soc-critical/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}
                >
                  {att.severity}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-soc-muted uppercase block">Samples in Dataset</span>
                  <span className="text-sm font-bold text-soc-text">{att.sample_count.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-soc-muted uppercase block">Ensemble Detection Rate</span>
                  <span className="text-sm font-bold text-soc-accent">{(att.detection_rate * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Signature Features */}
              <div className="space-y-1.5 pt-2 border-t border-soc-border">
                <span className="text-[10px] text-soc-muted uppercase tracking-wider block font-bold">
                  Key Diagnostic Signatures:
                </span>
                {att.signature_features.map((sig, i) => (
                  <div key={i} className="text-xs flex items-center justify-between text-soc-muted">
                    <span className="text-soc-text font-semibold">{sig.feature}:</span>
                    <span className="text-orange-400 font-mono text-[11px]">{sig.pattern}</span>
                  </div>
                ))}
              </div>

              {/* Benign Comparison */}
              <p className="text-[11px] text-soc-muted/90 font-sans leading-relaxed pt-2 border-t border-soc-border">
                {att.comparison_with_benign}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
