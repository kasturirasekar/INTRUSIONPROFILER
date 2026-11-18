import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BarChart2,
  GitCommit,
  Layers,
  HelpCircle,
  RefreshCw,
  Activity,
  Award,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ReferenceLine,
} from 'recharts';
import { api } from '../../services/api';
import { PredictionExplanationResponse, ShapGlobalResponse } from '../../types/explainability';

interface ShapAnalysisViewProps {
  localExplanation: PredictionExplanationResponse | null;
}

export const ShapAnalysisView: React.FC<ShapAnalysisViewProps> = ({ localExplanation }) => {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'force' | 'ranking' | 'beeswarm' | 'dependence'>('ranking');
  const [globalShap, setGlobalShap] = useState<ShapGlobalResponse | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [sampleSize, setSampleSize] = useState(30);

  const fetchGlobal = async () => {
    setLoadingGlobal(true);
    try {
      const data = await api.getShapGlobal({ sample_size: sampleSize, num_features: 15 });
      setGlobalShap(data);
    } catch (err) {
      console.error('Failed to compute global SHAP', err);
    } finally {
      setLoadingGlobal(false);
    }
  };

  useEffect(() => {
    fetchGlobal();
  }, [sampleSize]);

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* SHAP Theory Guide Header */}
      <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
            Game-Theoretic Explainability (Shapley Values)
          </span>
          <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
            <Sparkles className="w-5 h-5 text-soc-accent" />
            SHAP (SHapley Additive exPlanations) Studio
          </h2>
          <p className="text-xs text-soc-muted mt-1 max-w-2xl">
            Derived from cooperative game theory. Fairly distributes total threat score gain among network features,
            satisfying Efficiency ($\sum \phi_i = f(x) - E[f(z)]$), Symmetry, Null Player, and Additivity.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-soc-bg p-1 rounded-xl border border-soc-border flex-wrap">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              activeTab === 'ranking'
                ? 'bg-soc-accent text-soc-bg font-bold'
                : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Feature Rankings
          </button>
          <button
            onClick={() => setActiveTab('beeswarm')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              activeTab === 'beeswarm'
                ? 'bg-soc-accent text-soc-bg font-bold'
                : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Beeswarm Distribution
          </button>
          <button
            onClick={() => setActiveTab('force')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              activeTab === 'force'
                ? 'bg-soc-accent text-soc-bg font-bold'
                : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Local Force Bar
          </button>
          <button
            onClick={() => setActiveTab('dependence')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              activeTab === 'dependence'
                ? 'bg-soc-accent text-soc-bg font-bold'
                : 'text-soc-muted hover:text-soc-text'
            }`}
          >
            Dependence Scatter
          </button>
        </div>
      </div>

      {/* 1. Global Feature Ranking Tab */}
      {activeTab === 'ranking' && (
        <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-soc-text">
                Global Mean |SHAP| Value (Average Impact Magnitude on Model Output)
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Evaluated over {globalShap?.num_samples_analyzed || sampleSize} empirical test flows. Higher bars represent features with greater overall decision influence.
              </p>
            </div>

            <button
              onClick={fetchGlobal}
              disabled={loadingGlobal}
              className="px-3 py-1.5 text-xs rounded-lg border border-soc-border hover:bg-soc-border text-soc-muted hover:text-soc-text flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGlobal ? 'animate-spin' : ''}`} />
              Recompute
            </button>
          </div>

          {loadingGlobal || !globalShap ? (
            <div className="p-16 text-center text-soc-accent animate-pulse">
              <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
              Computing multi-instance Shapley marginals...
            </div>
          ) : (
            <div className="h-96 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={globalShap.feature_rankings}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                  <XAxis type="number" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    stroke="#64748B"
                    tick={{ fill: '#E2E8F0', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px' }}
                    formatter={(val: any) => [`${val}`, 'Mean |SHAP|']}
                  />
                  <Bar dataKey="mean_abs_shap" fill="#20D6C2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 2. Beeswarm Plot Tab */}
      {activeTab === 'beeswarm' && (
        <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-soc-text">
                SHAP Summary Beeswarm (Directional Impact vs Normalized Feature Value)
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Each dot is a flow. Red dots represent high feature values; Blue dots represent low values. Points to the right push toward Attack.
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-soc-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High Value
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Low Value
              </span>
            </div>
          </div>

          {loadingGlobal || !globalShap ? (
            <div className="p-16 text-center text-soc-accent animate-pulse">
              <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
              Generating beeswarm distributions...
            </div>
          ) : (
            <div className="h-96 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 140, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    type="number"
                    dataKey="shap_value"
                    name="SHAP Value"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    domain={[-0.4, 0.4]}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    name="Feature"
                    stroke="#64748B"
                    tick={{ fill: '#E2E8F0', fontSize: 11 }}
                  />
                  <ZAxis type="number" range={[25, 35]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs shadow-xl font-mono">
                            <div className="font-bold text-white mb-1">{d.feature}</div>
                            <div className="text-slate-400">Value: <span className="text-white font-bold">{d.feature_value}</span></div>
                            <div className="text-slate-400">SHAP: <span className={d.shap_value > 0 ? 'text-red-400' : 'text-blue-400'}>{d.shap_value}</span></div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={0} stroke="#64748B" strokeWidth={1.5} />
                  <Scatter data={globalShap.beeswarm_data}>
                    {globalShap.beeswarm_data.map((entry, index) => {
                      const r = Math.round(255 * entry.normalized_value);
                      const b = Math.round(255 * (1 - entry.normalized_value));
                      return <Cell key={`cell-${index}`} fill={`rgb(${r}, 80, ${b})`} opacity={0.8} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 3. Local Force Bar Tab */}
      {activeTab === 'force' && (
        <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-soc-text">
              Horizontal Force Plot (Active Flow Breakdown)
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Features competing to drive the prediction: Red forces push the prediction higher (Attack); Blue forces pull it lower (Benign).
            </p>
          </div>

          {!localExplanation ? (
            <div className="p-12 text-center text-xs text-soc-muted border border-dashed border-soc-border rounded-xl">
              No active flow loaded. Select a flow from the Prediction Explainer.
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {/* Force Balance Bar */}
              <div className="p-4 rounded-xl bg-soc-bg border border-soc-border">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-cyan-400 font-bold">← PULLING BENIGN (Low Threat)</span>
                  <span className="text-soc-text font-bold">
                    Score: {(localExplanation.final_output_value * 100).toFixed(1)}% (Base: {(localExplanation.baseline_expected_value * 100).toFixed(1)}%)
                  </span>
                  <span className="text-orange-400 font-bold">PUSHING ATTACK (High Threat) →</span>
                </div>

                <div className="h-6 rounded-lg overflow-hidden flex bg-soc-card border border-soc-border">
                  <div
                    className="h-full bg-cyan-500 transition-all flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ width: `${(1 - localExplanation.final_output_value) * 100}%` }}
                  >
                    Benign {((1 - localExplanation.final_output_value) * 100).toFixed(0)}%
                  </div>
                  <div
                    className="h-full bg-orange-500 transition-all flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ width: `${localExplanation.final_output_value * 100}%` }}
                  >
                    Attack {(localExplanation.final_output_value * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Force Item Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-orange-400 block">Top Attack Push Factors</span>
                  {localExplanation.top_malicious_features.slice(0, 5).map((f) => (
                    <div key={f.feature} className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 flex justify-between text-xs">
                      <span className="font-semibold text-soc-text">{f.feature}</span>
                      <span className="font-bold text-orange-400">+{f.contribution.toFixed(4)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-cyan-400 block">Top Benign Mitigating Factors</span>
                  {localExplanation.top_benign_features.slice(0, 5).map((f) => (
                    <div key={f.feature} className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex justify-between text-xs">
                      <span className="font-semibold text-soc-text">{f.feature}</span>
                      <span className="font-bold text-cyan-400">{f.contribution.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Dependence Scatter Tab */}
      {activeTab === 'dependence' && (
        <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-soc-text">
              SHAP Dependence Plot (Feature Value vs SHAP Attribution)
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Reveals linear or threshold non-linearities: shows how the impact of '{globalShap?.dependence_sample[0]?.primary_feature || 'Destination Port'}' changes as its value increases.
            </p>
          </div>

          {!globalShap ? (
            <div className="p-16 text-center text-soc-accent animate-pulse">Loading dependence points...</div>
          ) : (
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    type="number"
                    dataKey="primary_value"
                    name={globalShap.dependence_sample[0]?.primary_feature}
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="shap_value"
                    name="SHAP Attribution"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px' }}
                  />
                  <Scatter data={globalShap.dependence_sample} fill="#20D6C2" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
