import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Brain,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Sliders,
  Layers,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { api } from '../../services/api';
import { NetworkFlowTopology } from '../../components/visual/NetworkFlowTopology';
import {
  StudioExperimentResult,
  StudioFullExplanationResponse,
} from '../../types/studio';

interface Step04ExplainProps {
  experimentResult: StudioExperimentResult | null;
  onNavigateToResults: () => void;
}

export const Step04Explain: React.FC<Step04ExplainProps> = ({
  experimentResult,
  onNavigateToResults,
}) => {
  const reduceMotion = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<StudioFullExplanationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'shap' | 'lime' | 'counterfactual' | 'ensemble'>('shap');

  const previewRecords = experimentResult?.predictions_preview || [];
  const flowRecords = previewRecords.map((record) => record.features);
  const flowRecordIndices = previewRecords.map((record) => record.index);

  const fetchExplanation = async (index: number) => {
    if (!experimentResult) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.explainStudioRecord({
        experiment_id: experimentResult.experiment_id,
        record_index: index,
        num_features: 8,
      });
      setExplanation(resp);
    } catch (err: any) {
      console.error('Explanation fetch failed:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to explain selected record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (experimentResult && previewRecords.length > 0) {
      fetchExplanation(selectedIndex);
    }
  }, [experimentResult?.experiment_id, selectedIndex]);

  if (!experimentResult) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto my-8">
        <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Active Experiment Model</h3>
        <p className="text-slate-400 text-sm mb-6">
          You must run an experiment in Step 03 (Train & Predict) first before inspecting flow explanations.
        </p>
      </div>
    );
  }

  const isAttack = explanation ? explanation.predicted_class === 'Attack' : false;

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Step 04 — Explainable Intelligence
              </span>
              <span className="text-slate-500 text-xs">• Dynamic Flow Explainers</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Investigate Model Decisions on User Flows
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Unpack why the ensemble classified individual network traffic records as malicious or benign.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchExplanation(selectedIndex)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700/60 transition-all disabled:opacity-50"
              title="Refresh Explanation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onNavigateToResults}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/10 transition-all"
            >
              <span>View Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Record Selection Strip */}
        <div className="pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Select Flow Record:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {previewRecords.slice(0, 8).map((rec) => {
                const isSelected = selectedIndex === rec.index;
                const recAttack = rec.prediction === 'Attack';
                return (
                  <button
                    key={rec.index}
                    onClick={() => setSelectedIndex(rec.index)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-slate-800 text-white border-emerald-500/60 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        recAttack ? 'bg-rose-500' : 'bg-emerald-400'
                      }`}
                    />
                    <span>Flow #{rec.index}</span>
                    <span className="text-[10px] text-slate-500">
                      ({(rec.confidence * 100).toFixed(0)}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="text-slate-500">Active Model:</span>
            <span className="font-semibold text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
              {experimentResult.model_name}
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-10 h-10 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Synthesizing Explainable AI Attributions...</p>
          <p className="text-xs text-slate-400 mt-1">
            Calculating SHAP Shapley values, LIME local decision boundaries, and counterfactual deltas.
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Explanation Error</p>
            <p className="text-xs text-rose-400/90">{error}</p>
          </div>
        </div>
      )}

      {explanation && !loading && (
        <>
          {/* Flow Prediction Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                      isAttack
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {isAttack ? (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{explanation.predicted_class} Flow Detected</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Confidence: <strong className="text-white">{(explanation.confidence * 100).toFixed(1)}%</strong>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">
                  Forensic Attribution Dossier: Record #{selectedIndex}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {explanation.shap?.natural_language_summary ||
                    'No SHAP summary was returned for this selected record.'}
                </p>
              </div>

              {/* Attack vs Benign Probability Breakdown Bar */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 min-w-[280px]">
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-rose-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Attack: {(explanation.attack_probability * 100).toFixed(1)}%
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Benign: {(explanation.benign_probability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.round(explanation.attack_probability * 100)}%` }}
                    className="bg-rose-500 transition-all duration-500"
                  />
                  <div
                    style={{ width: `${Math.round(explanation.benign_probability * 100)}%` }}
                    className="bg-emerald-400 transition-all duration-500"
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-500 text-right">
                  Base expected score E[f(x)]: {Number.isFinite(explanation.shap?.baseline_expected_value) ? explanation.shap!.baseline_expected_value.toFixed(3) : '—'}
                </div>
              </div>
            </div>
          </div>

          <NetworkFlowTopology
            rows={flowRecords}
            recordIndices={flowRecordIndices}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            title="Selected held-out flow"
            subtitle={`Topology derived from ${flowRecords.length} held-out prediction preview records. Select a path to inspect that record's actual destination fields.`}
            height={300}
          />

          {/* Explainability Method Selector Tabs */}
          <div className="flex flex-wrap border-b border-slate-800 gap-2">
            {[
              { id: 'shap', label: 'Feature Importance (Why was this classified?)', icon: TrendingUp },
              { id: 'lime', label: 'Decision Rules (Explanation Reliability)', icon: Sliders },
              { id: 'counterfactual', label: 'What would need to change?', icon: RotateCcw },
              { id: 'ensemble', label: 'Model Agreement (Individual Votes)', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                    isActive
                      ? 'border-emerald-400 text-emerald-400 bg-slate-900/50'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            >
              {/* TAB 1: SHAP Waterfall & Attribution */}
              {activeTab === 'shap' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Waterfall Chart Column */}
              <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      SHAP Cumulative Waterfall Path
                    </h4>
                    <p className="text-xs text-slate-400">
                      Shows how each feature value moves the attack probability from base rate to final score.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700/60">
                    Additive Shapley
                  </span>
                </div>

                <div className="h-72 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={explanation.shap?.waterfall_steps || []}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        domain={[0, 1]}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      />
                      <YAxis
                        dataKey="feature"
                        type="category"
                        tick={{ fill: '#cbd5e1', fontSize: 11 }}
                        width={130}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs shadow-xl">
                                <p className="font-semibold text-white">{data.feature}</p>
                                <p className="text-slate-400">
                                  Contribution:{' '}
                                  <span
                                    className={
                                      data.contribution >= 0 ? 'text-rose-400' : 'text-emerald-400'
                                    }
                                  >
                                    {data.contribution >= 0 ? '+' : ''}
                                    {(data.contribution * 100).toFixed(2)}%
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  Running Score: {(data.cumulative_score * 100).toFixed(2)}%
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="cumulative_score" radius={[0, 4, 4, 0]}>
                        {(explanation.shap?.waterfall_steps || []).map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={entry.contribution >= 0 ? '#f43f5e' : '#10b981'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                    <span>Pushes toward Malicious Attack</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                    <span>Pushes toward Normal Benign</span>
                  </div>
                </div>
              </div>

              {/* Attribution Feature Breakdown Column */}
              <div className="lg:col-span-5 space-y-4">
                {/* Top Malicious Pushers */}
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Malicious Evidence Factors
                  </h4>
                  <div className="space-y-2.5">
                    {explanation.shap?.top_malicious?.length > 0 ? (
                      explanation.shap.top_malicious.map((attr, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/60 border border-rose-500/20 rounded-xl p-3"
                        >
                          <div className="flex justify-between items-start text-xs mb-1">
                            <span className="font-semibold text-white">{attr.feature}</span>
                            <span className="font-mono text-rose-400 font-bold">
                              +{(attr.contribution * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            {attr.cyber_meaning}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                            <span>Raw Value: <strong className="text-slate-300">{attr.original_value}</strong></span>
                            <span>•</span>
                            <span className="text-slate-400">{attr.category}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        No strong malicious pushing factors detected for this flow.
                      </p>
                    )}
                  </div>
                </div>

                {/* Top Benign Pushers */}
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Benign Stabilizing Factors
                  </h4>
                  <div className="space-y-2.5">
                    {explanation.shap?.top_benign?.length > 0 ? (
                      explanation.shap.top_benign.map((attr, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-3"
                        >
                          <div className="flex justify-between items-start text-xs mb-1">
                            <span className="font-semibold text-white">{attr.feature}</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {(attr.contribution * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            {attr.cyber_meaning}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                            <span>Raw Value: <strong className="text-slate-300">{attr.original_value}</strong></span>
                            <span>•</span>
                            <span className="text-slate-400">{attr.category}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        No strong benign dampening factors detected for this flow.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIME Local Decision Rules */}
          {activeTab === 'lime' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      LIME Interpretable Decision Rules
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Local surrogate decision rules fitted around the selected flow record.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Surrogate Fidelity R²:</span>
                      <span
                        className={`font-mono font-bold ${
                          (explanation.lime?.surrogate_r2_fidelity || 0) > 0.7
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {Number.isFinite(explanation.lime?.surrogate_r2_fidelity) ? explanation.lime!.surrogate_r2_fidelity.toFixed(3) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="my-5 p-4 bg-slate-950/70 border border-slate-800/60 rounded-xl">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explanation.lime?.summary ||
                      'No LIME summary was returned for this selected record.'}
                  </p>
                </div>

                {/* Rules List */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Extracted Threshold Boundaries:
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {explanation.lime?.rules?.map((rule, idx) => {
                      const isMal = rule.direction === 'supports_malicious';
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border bg-slate-950/60 flex items-start justify-between gap-3 ${
                            isMal ? 'border-rose-500/20' : 'border-emerald-500/20'
                          }`}
                        >
                          <div>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                isMal
                                  ? 'bg-rose-500/10 text-rose-300'
                                  : 'bg-emerald-500/10 text-emerald-300'
                              }`}
                            >
                              {isMal ? 'Malicious Push' : 'Benign Push'}
                            </span>
                            <p className="font-mono text-xs font-semibold text-white mt-2">
                              {rule.rule}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Target Feature: {rule.feature}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-[10px] text-slate-500 block">Surrogate Weight</span>
                            <span
                              className={`font-mono text-xs font-bold ${
                                isMal ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {rule.weight >= 0 ? '+' : ''}
                              {rule.weight.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Counterfactual Recourse */}
          {activeTab === 'counterfactual' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-emerald-400" />
                      Constrained Counterfactual Explanations
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Identifies the minimal feature modifications necessary to flip the model verdict to{' '}
                      <strong>{explanation.counterfactual?.counterfactual_verdict || 'Benign'}</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        explanation.counterfactual?.flipped_successfully
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {explanation.counterfactual?.flipped_successfully
                        ? 'Verdict Inversion Found'
                        : 'Partial Shift Only'}
                    </span>
                  </div>
                </div>

                {/* Narrative box */}
                <div className="my-5 p-4 bg-slate-950/70 border border-slate-800/60 rounded-xl">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explanation.counterfactual?.narrative ||
                      'Adjusting flow characteristics alters model scoring past the classification threshold.'}
                  </p>
                </div>

                {/* Flip Comparison Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-1">Original Prediction</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {explanation.counterfactual?.original_verdict}
                      </span>
                      <span className="text-xs font-mono text-rose-400">
                        {((explanation.counterfactual?.original_prob || 0) * 100).toFixed(1)}% prob
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-1">Counterfactual State</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-emerald-400">
                        {explanation.counterfactual?.counterfactual_verdict}
                      </span>
                      <span className="text-xs font-mono text-emerald-400">
                        {((explanation.counterfactual?.counterfactual_prob || 0) * 100).toFixed(1)}% prob
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-1">Required Feature Shifts</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {explanation.counterfactual?.features_modified_count || 0} Features
                      </span>
                      <span className="text-xs text-slate-500">L1 minimal perturbation</span>
                    </div>
                  </div>
                </div>

                {/* Modified Features Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Network Feature</th>
                        <th className="py-2.5 px-3">Observed Value</th>
                        <th className="py-2.5 px-3">Required Target Value</th>
                        <th className="py-2.5 px-3">Shift Required</th>
                        <th className="py-2.5 px-3">Defensive Cyber Implication</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {explanation.counterfactual?.modified_features?.map((mod, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3 font-semibold text-white">{mod.feature}</td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            {mod.original_value} {mod.unit}
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                            {mod.counterfactual_value} {mod.unit}
                          </td>
                          <td className="py-3 px-3 font-mono text-amber-300">
                            {mod.delta >= 0 ? '+' : ''}
                            {mod.delta.toFixed(1)} ({mod.percent_change >= 0 ? '+' : ''}
                            {mod.percent_change.toFixed(1)}%)
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {mod.cyber_meaning}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Ensemble Base Dissection */}
          {activeTab === 'ensemble' && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Ensemble Decision Resolution
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Strategy: <strong className="text-white uppercase">{explanation.ensemble?.strategy}</strong> • Final Verdict:{' '}
                      <strong className="text-emerald-400">{explanation.ensemble?.final_verdict}</strong>
                    </p>
                  </div>
                </div>

                <div className="my-5 p-4 bg-slate-950/70 border border-slate-800/60 rounded-xl">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explanation.ensemble?.resolution_narrative}
                  </p>
                </div>

                {/* Base Learner Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {explanation.ensemble?.base_learners?.map((learner, idx) => {
                    const isLearnerAttack = learner.predicted_class === 'Attack';
                    return (
                      <div
                        key={idx}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-bold text-white text-xs">{learner.name}</h5>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isLearnerAttack
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {learner.predicted_class}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 mb-3">{learner.role_description}</p>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-400">
                              <span>Attack Probability:</span>
                              <span className="font-mono text-white font-semibold">
                                {(learner.probability_attack * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Meta-Weight:</span>
                              <span className="font-mono text-emerald-400 font-semibold">
                                {learner.meta_weight.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Ensemble Consensus:</span>
                          <span
                            className={
                              learner.agreement_with_ensemble
                                ? 'text-emerald-400 font-semibold'
                                : 'text-amber-400 font-semibold'
                            }
                          >
                            {learner.agreement_with_ensemble ? 'In Agreement' : 'Divergent'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Non-causal notice */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono flex items-center gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>
          <strong>Scientific Notice:</strong> {explanation.non_causal_notice || "Feature attributions reflect statistical associations in the model's decision function, not causal proof of network compromise."}
        </span>
      </div>
    </>
      )}
    </div>
  );
};
