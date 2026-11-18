import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Cpu,
  BarChart2,
} from 'lucide-react';
import { ExperimentResults } from '../../types/lab';
import { MetricCard } from '../../components/common/MetricCard';
import { TheoryDrawer } from './TheoryDrawer';

interface EvaluationStageProps {
  results: ExperimentResults | null;
  experimentName: string;
}

export const EvaluationStage: React.FC<EvaluationStageProps> = ({ results, experimentName }) => {
  if (!results) {
    return (
      <div className="p-12 text-center text-soc-muted font-mono rounded-xl border border-dashed border-soc-border bg-soc-card/30">
        No active experiment results to display. Go to the "Model Training" stage and click "Start Experiment Run" first.
      </div>
    );
  }

  const cm = results.confusion_matrix;
  const tradeoffs = results.security_tradeoffs;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Educational Guide Drawer */}
      <TheoryDrawer
        title="Cybersecurity-Centric Evaluation: False Negatives vs False Positives"
        cyberContext="In conventional machine learning, standard accuracy treats all mistakes equally. In cyber defense, errors have asymmetrical consequences. A FALSE NEGATIVE (Missed Intrusion) allows malicious command-and-control, data exfiltration, or ransomware lateral movement into your network unnoticed. Conversely, a FALSE POSITIVE (False Alarm) triggers alert fatigue: if a network profiler generates 1,000 false alerts daily, SOC analysts will inevitably begin ignoring alarms, allowing genuine breaches to slip through."
        mlConcept="Evaluating network intrusion models requires scrutinizing the confusion matrix. Precision = TP / (TP + FP) measures alert reliability. Recall (True Positive Rate) = TP / (TP + FN) measures intrusion containment. The F1-Score calculates their harmonic mean. For perimeter security, models are tuned to maximize Recall (minimizing False Negatives) while keeping the False Positive Rate (FP / (FP + TN)) strictly under operational analyst limits."
        keyTakeaway="Always examine the False Negative Rate alongside the False Alarm Rate: an intrusion model with 99% accuracy is useless if that 1% error corresponds to missing every sophisticated zero-day attack."
        defaultOpen={false}
      />

      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-soc-card border border-soc-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono">
        <div>
          <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
            Evaluation Report
          </span>
          <h3 className="text-base font-bold text-soc-text mt-0.5">{experimentName}</h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-lg bg-soc-secondary text-soc-muted border border-soc-border">
            Inference: <strong className="text-soc-text">{results.prediction_time_seconds.toFixed(3)}s</strong>
          </span>
          <span className="px-3 py-1 rounded-lg bg-soc-accent/15 text-soc-accent border border-soc-accent/30 font-bold">
            Detection Rate: {tradeoffs.detection_rate}%
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Accuracy"
          value={`${results.accuracy}%`}
          icon={CheckCircle2}
          variant="accent"
          subtitle="Test set classification rate"
        />
        <MetricCard
          title="Attack Recall (Detection)"
          value={`${results.recall}%`}
          icon={ShieldAlert}
          variant="critical"
          subtitle={`${tradeoffs.missed_attack_rate}% missed attack rate`}
        />
        <MetricCard
          title="Attack Precision"
          value={`${results.precision}%`}
          icon={ShieldCheck}
          variant="success"
          subtitle={`${tradeoffs.false_alarm_rate}% false alarm rate`}
        />
        <MetricCard
          title="Attack F1-Score"
          value={`${results.f1_score}%`}
          icon={TrendingUp}
          variant="accent"
          subtitle={results.roc_auc ? `ROC-AUC: ${results.roc_auc}` : 'Harmonic mean of P & R'}
        />
      </div>

      {/* Confusion Matrix & Security Trade-offs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-4">
          <div>
            <h4 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono">
              Confusion Matrix (Held-out Test Flows)
            </h4>
            <p className="text-xs text-soc-muted mt-0.5">
              Breakdown of actual network flow truth vs model prediction
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            {/* True Negative */}
            <div className="p-4 rounded-xl bg-soc-accent/10 border border-soc-accent/30 text-center space-y-1">
              <span className="text-[10px] text-soc-muted uppercase block">True Negatives (Clean)</span>
              <span className="text-2xl font-bold text-soc-accent block">
                {cm.true_negatives.toLocaleString()}
              </span>
              <span className="text-[11px] text-soc-low flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Benign Verified
              </span>
            </div>

            {/* False Positive */}
            <div className="p-4 rounded-xl bg-soc-high/10 border border-soc-high/30 text-center space-y-1">
              <span className="text-[10px] text-soc-muted uppercase block">False Positives (False Alarm)</span>
              <span className="text-2xl font-bold text-soc-high block">
                {cm.false_positives.toLocaleString()}
              </span>
              <span className="text-[11px] text-soc-high flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Analyst Interruption
              </span>
            </div>

            {/* False Negative */}
            <div className="p-4 rounded-xl bg-soc-critical/10 border border-soc-critical/30 text-center space-y-1">
              <span className="text-[10px] text-soc-muted uppercase block">False Negatives (Missed)</span>
              <span className="text-2xl font-bold text-soc-critical block">
                {cm.false_negatives.toLocaleString()}
              </span>
              <span className="text-[11px] text-soc-critical font-bold flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Undetected Incursions
              </span>
            </div>

            {/* True Positive */}
            <div className="p-4 rounded-xl bg-soc-critical/10 border border-soc-critical/30 text-center space-y-1">
              <span className="text-[10px] text-soc-muted uppercase block">True Positives (Intercepted)</span>
              <span className="text-2xl font-bold text-soc-critical block">
                {cm.true_positives.toLocaleString()}
              </span>
              <span className="text-[11px] text-soc-low flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Blocked Attacks
              </span>
            </div>
          </div>
        </div>

        {/* Security Trade-off Analysis */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-soc-critical" />
              Operational Security Trade-off Audit
            </h4>
            <p className="text-xs text-soc-muted mt-0.5">
              Assessing detection integrity against operational security team fatigue
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-lg bg-soc-secondary/60 border border-soc-border space-y-1">
              <span className="text-soc-muted text-[10px] uppercase block">SOC Analyst Fatigue Level</span>
              <span className="text-soc-text font-bold text-sm block">
                {tradeoffs.analyst_operational_burden}
              </span>
              <span className="text-[11px] text-soc-muted block">
                False alarm rate: {tradeoffs.false_alarm_rate}% of all clean traffic.
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-soc-secondary/60 border border-soc-border space-y-1">
              <span className="text-soc-muted text-[10px] uppercase block">Perimeter Infiltration Vulnerability</span>
              <span className="text-soc-critical font-bold text-sm block">
                Missed Attack Rate: {tradeoffs.missed_attack_rate}%
              </span>
              <span className="text-[11px] text-soc-muted block">
                {tradeoffs.threat_severity_summary}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-soc-accent/10 border border-soc-accent/30 text-soc-text">
              <span className="text-soc-accent text-[10px] font-bold uppercase block mb-1">
                Deployment Verdict
              </span>
              <span className="text-xs leading-relaxed block">{tradeoffs.recommendation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Class Breakdown if available */}
      {results.per_class_metrics && Object.keys(results.per_class_metrics).length > 2 && (
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-3">
          <h4 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono">
            Multiclass Per-Attack Detection Breakdown
          </h4>

          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-soc-border text-[11px] text-soc-muted uppercase">
                  <th className="pb-2 font-semibold">Attack Class ID</th>
                  <th className="pb-2 font-semibold">Precision</th>
                  <th className="pb-2 font-semibold">Recall (Detection)</th>
                  <th className="pb-2 font-semibold">F1-Score</th>
                  <th className="pb-2 font-semibold text-right">Holdout Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border/40">
                {Object.entries(results.per_class_metrics).map(([cls, met]) => (
                  <tr key={cls} className="hover:bg-soc-secondary/30">
                    <td className="py-2 text-soc-text font-bold">Class #{cls}</td>
                    <td className="py-2 text-soc-text">{(met.precision * 100).toFixed(1)}%</td>
                    <td className="py-2 text-soc-critical font-bold">{(met.recall * 100).toFixed(1)}%</td>
                    <td className="py-2 text-soc-accent font-bold">{(met.f1_score * 100).toFixed(1)}%</td>
                    <td className="py-2 text-soc-muted text-right">{met.support} flows</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
