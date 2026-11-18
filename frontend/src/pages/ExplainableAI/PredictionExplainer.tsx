import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { PredictionExplanationResponse } from '../../types/explainability';

interface PredictionExplainerProps {
  explanation: PredictionExplanationResponse | null;
  isLoading: boolean;
  onSelectFeatureForDeepDive?: (featName: string) => void;
}

export const PredictionExplainer: React.FC<PredictionExplainerProps> = ({
  explanation,
  isLoading,
  onSelectFeatureForDeepDive,
}) => {
  if (isLoading) {
    return (
      <div className="p-16 text-center font-mono text-soc-accent animate-pulse space-y-3">
        <Activity className="w-8 h-8 animate-spin mx-auto text-soc-accent" />
        <p className="text-sm font-bold">Computing Real-Time Shapley Game-Theoretic Feature Attributions...</p>
        <p className="text-xs text-soc-muted">Evaluating background marginal permutations across 78 network flow dimensions</p>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="p-12 text-center text-soc-muted font-mono rounded-xl border border-dashed border-soc-border bg-soc-card/30">
        Select a network flow from the header above or click "Run Explanation" to profile feature attributions.
      </div>
    );
  }

  const { summary } = explanation;
  const isAttack = summary.predicted_class === 'Attack';

  // Prepare waterfall chart data
  const waterfallChartData = explanation.waterfall_steps.map((step) => {
    const isBaseline = step.direction === 'baseline';
    const isFinal = step.direction === 'final';
    const isPositive = step.direction === 'supports_malicious';

    return {
      name: step.feature.length > 20 ? step.feature.substring(0, 18) + '...' : step.feature,
      fullName: step.feature,
      value: +(step.cumulative_value * 100).toFixed(2),
      contribution: +(step.contribution * 100).toFixed(2),
      direction: step.direction,
      fill: isBaseline
        ? '#64748B'
        : isFinal
        ? isAttack
          ? '#EF4444'
          : '#10B981'
        : isPositive
        ? '#F97316'
        : '#06B6D4',
    };
  });

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* Prediction Summary Header Card */}
      <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10 ${
            isAttack ? 'bg-soc-critical' : 'bg-soc-low'
          }`}
        />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-soc-bg text-soc-muted border border-soc-border font-bold uppercase tracking-wider">
                ID: {summary.flow_id}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isAttack
                    ? 'bg-soc-critical/20 text-soc-critical border border-soc-critical/40'
                    : 'bg-soc-low/20 text-soc-low border border-soc-low/40'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isAttack ? 'bg-soc-critical animate-pulse' : 'bg-soc-low'}`} />
                {summary.severity} Severity
              </span>
              <span className="text-[10px] text-soc-muted">{summary.timestamp}</span>
            </div>

            <div className="flex items-center gap-3">
              {isAttack ? (
                <ShieldAlert className="w-8 h-8 text-soc-critical shrink-0" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-soc-low shrink-0" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-soc-text">
                  Predicted Class: <span className={isAttack ? 'text-soc-critical' : 'text-soc-low'}>{summary.predicted_class}</span>
                </h2>
                <p className="text-xs text-soc-muted">
                  Profiled via {summary.model_name} on {summary.features_analyzed} network parameters
                </p>
              </div>
            </div>
          </div>

          {/* Probabilities gauge */}
          <div className="flex items-center gap-4 bg-soc-bg/80 p-4 rounded-xl border border-soc-border shrink-0">
            <div>
              <span className="text-[10px] text-soc-muted uppercase block">Attack Probability</span>
              <span className={`text-xl font-bold ${isAttack ? 'text-soc-critical' : 'text-soc-muted'}`}>
                {(summary.probability_attack * 100).toFixed(1)}%
              </span>
              <div className="w-24 h-1.5 rounded-full bg-soc-border mt-1 overflow-hidden">
                <div
                  className="h-full bg-soc-critical rounded-full"
                  style={{ width: `${summary.probability_attack * 100}%` }}
                />
              </div>
            </div>

            <div className="w-px h-10 bg-soc-border" />

            <div>
              <span className="text-[10px] text-soc-muted uppercase block">Benign Probability</span>
              <span className={`text-xl font-bold ${!isAttack ? 'text-soc-low' : 'text-soc-muted'}`}>
                {(summary.probability_benign * 100).toFixed(1)}%
              </span>
              <div className="w-24 h-1.5 rounded-full bg-soc-border mt-1 overflow-hidden">
                <div
                  className="h-full bg-soc-low rounded-full"
                  style={{ width: `${summary.probability_benign * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Natural Language Explanation Box */}
        <div className="mt-6 p-4 rounded-xl bg-soc-bg/70 border border-soc-border/90 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-soc-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-soc-accent tracking-wider">
              Automated Forensic Explanation
            </span>
            <p className="text-xs text-soc-text leading-relaxed font-sans">
              {explanation.natural_language_explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Waterfall Contribution Chart */}
      <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-soc-text flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-soc-accent" />
              Shapley Attribution Waterfall (Baseline E[f(x)] → Final Probability)
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Visualizes step-by-step how each key feature shifted the threat score away from the dataset baseline.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-soc-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-orange-500" /> Pushes Attack
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500" /> Pulls Benign
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs shadow-xl font-mono">
                        <div className="font-bold text-white mb-1">{d.fullName}</div>
                        <div className="text-slate-400">
                          Threat Score: <span className="text-white font-bold">{d.value}%</span>
                        </div>
                        {d.direction !== 'baseline' && d.direction !== 'final' && (
                          <div className={d.contribution > 0 ? 'text-orange-400' : 'text-cyan-400'}>
                            Attribution: {d.contribution > 0 ? `+${d.contribution}%` : `${d.contribution}%`}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '50% Verdict Threshold', fill: '#EF4444', fontSize: 10 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfallChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dual Contribution Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Malicious Contributors */}
        <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              Features Pushing Toward Malicious (+Attribution)
            </h3>
            <span className="text-[10px] text-soc-muted">
              {explanation.top_malicious_features.length} features
            </span>
          </div>

          <div className="space-y-2">
            {explanation.top_malicious_features.map((feat) => (
              <div
                key={feat.feature}
                className="p-3 rounded-xl bg-soc-bg/60 border border-soc-border/70 hover:border-orange-500/40 transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-soc-text hover:text-orange-400 cursor-pointer" onClick={() => onSelectFeatureForDeepDive && onSelectFeatureForDeepDive(feat.feature)}>
                    {feat.feature}
                  </span>
                  <span className="text-xs font-bold text-orange-400">
                    +{feat.contribution.toFixed(4)} ({feat.percentage_contribution}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-soc-muted">
                  <span>Observed Value: <strong className="text-soc-text">{feat.original_value.toLocaleString()}</strong></span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-soc-card border border-soc-border uppercase">
                    {feat.category}
                  </span>
                </div>
                <p className="text-[10px] text-soc-muted/80 font-sans leading-tight">
                  {feat.domain_explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Benign Contributors */}
        <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Features Pulling Toward Benign (-Attribution)
            </h3>
            <span className="text-[10px] text-soc-muted">
              {explanation.top_benign_features.length} features
            </span>
          </div>

          <div className="space-y-2">
            {explanation.top_benign_features.length === 0 ? (
              <div className="p-8 text-center text-xs text-soc-muted border border-dashed border-soc-border rounded-lg">
                No significant benign attributions for this flow. All features aligned toward attack classification.
              </div>
            ) : (
              explanation.top_benign_features.map((feat) => (
                <div
                  key={feat.feature}
                  className="p-3 rounded-xl bg-soc-bg/60 border border-soc-border/70 hover:border-cyan-500/40 transition-colors flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-soc-text hover:text-cyan-400 cursor-pointer" onClick={() => onSelectFeatureForDeepDive && onSelectFeatureForDeepDive(feat.feature)}>
                      {feat.feature}
                    </span>
                    <span className="text-xs font-bold text-cyan-400">
                      {feat.contribution.toFixed(4)} ({feat.percentage_contribution}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-soc-muted">
                    <span>Observed Value: <strong className="text-soc-text">{feat.original_value.toLocaleString()}</strong></span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-soc-card border border-soc-border uppercase">
                      {feat.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-soc-muted/80 font-sans leading-tight">
                    {feat.domain_explanation}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
