import React from 'react';
import {
  FileText,
  Download,
  Printer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { PredictionExplanationResponse } from '../../types/explainability';

interface ExplainabilityReportViewProps {
  explanation: PredictionExplanationResponse | null;
}

export const ExplainabilityReportView: React.FC<ExplainabilityReportViewProps> = ({ explanation }) => {
  if (!explanation) {
    return (
      <div className="p-12 text-center text-soc-muted font-mono rounded-xl border border-dashed border-soc-border bg-soc-card/30">
        No flow explanation active. Select a flow in the Prediction Explainer tab to generate a forensic audit dossier.
      </div>
    );
  }

  const { summary } = explanation;
  const isAttack = summary.predicted_class === 'Attack';

  const exportJson = () => {
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(explanation, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonStr;
    link.download = `explainability_dossier_${summary.flow_id}.json`;
    link.click();
  };

  const exportCsv = () => {
    const headers = ['Feature', 'Original Value', 'Contribution', 'Direction', 'Percentage', 'Category'];
    const rows = explanation.all_contributions.map((c) => [
      `"${c.feature}"`,
      c.original_value,
      c.contribution,
      `"${c.direction}"`,
      c.percentage_contribution,
      `"${c.category}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `feature_attributions_${summary.flow_id}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* Top Action Bar */}
      <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
            Forensic Incident Dossier
          </span>
          <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
            <FileText className="w-5 h-5 text-soc-accent" />
            Explainability Audit Report
          </h2>
          <p className="text-xs text-soc-muted mt-1">
            Standardized machine learning interpretability report for incident post-mortems and compliance audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs rounded-lg border border-soc-border hover:bg-soc-border text-soc-muted hover:text-soc-text flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 text-xs rounded-lg border border-soc-border hover:bg-soc-border text-soc-muted hover:text-soc-text flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={exportJson}
            className="px-3.5 py-2 text-xs rounded-lg bg-soc-accent text-soc-bg font-bold flex items-center gap-1.5 hover:bg-soc-accent/90 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON Dossier
          </button>
        </div>
      </div>

      {/* Printable Report Paper Layout */}
      <div className="p-8 rounded-2xl bg-soc-card border border-soc-border shadow-2xl space-y-6 text-xs text-soc-text">
        {/* Dossier Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-soc-border gap-4">
          <div>
            <span className="text-[10px] text-soc-accent uppercase tracking-widest block font-bold">
              SECURITY OPERATIONS INCIDENT DOSSIER
            </span>
            <h1 className="text-2xl font-bold text-soc-text mt-1">
              Flow Telemetry Profiling Report: {summary.flow_id}
            </h1>
            <span className="text-xs text-soc-muted">Generated at {summary.timestamp}</span>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-soc-muted uppercase block">Profiling Engine</span>
            <span className="text-sm font-bold text-soc-text">{summary.model_name}</span>
            <span className="text-[10px] text-soc-accent block">Stacking Ensemble Architecture</span>
          </div>
        </div>

        {/* Executive Verdict Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-soc-bg border border-soc-border">
          <div>
            <span className="text-[10px] text-soc-muted uppercase block">Predicted Class</span>
            <span className={`text-base font-bold ${isAttack ? 'text-orange-400' : 'text-cyan-400'}`}>
              {summary.predicted_class}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-soc-muted uppercase block">Attack Probability</span>
            <span className="text-base font-bold text-soc-text">
              {(summary.probability_attack * 100).toFixed(2)}%
            </span>
          </div>

          <div>
            <span className="text-[10px] text-soc-muted uppercase block">Severity Rating</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                isAttack ? 'bg-soc-critical/20 text-soc-critical' : 'bg-soc-low/20 text-soc-low'
              }`}
            >
              {summary.severity}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-soc-muted uppercase block">Dimensions Profiled</span>
            <span className="text-base font-bold text-soc-text">78 Features</span>
          </div>
        </div>

        {/* Automated Natural Language Summary */}
        <div className="p-4 rounded-xl bg-soc-bg border border-soc-border space-y-1.5 font-sans">
          <strong className="text-xs font-bold uppercase tracking-wider text-soc-accent font-mono block">
            Executive Diagnostic Summary
          </strong>
          <p className="text-xs text-soc-text leading-relaxed">
            {explanation.natural_language_explanation}
          </p>
        </div>

        {/* Top Contributing Factors Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-soc-text">
            Key Feature Attributions (Shapley Cooperative Value Decomposition)
          </h3>

          <div className="overflow-x-auto border border-soc-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-soc-border bg-soc-bg/40 text-soc-muted uppercase text-[10px]">
                  <th className="p-2.5">Feature Name</th>
                  <th className="p-2.5 text-right">Value</th>
                  <th className="p-2.5 text-right">Attribution</th>
                  <th className="p-2.5">Direction</th>
                  <th className="p-2.5">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border">
                {explanation.all_contributions.slice(0, 10).map((c) => (
                  <tr key={c.feature} className="hover:bg-soc-border/10">
                    <td className="p-2.5 font-semibold text-soc-text">{c.feature}</td>
                    <td className="p-2.5 text-right font-mono text-soc-muted">{c.original_value.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-soc-accent">
                      {c.contribution > 0 ? `+${c.contribution.toFixed(4)}` : c.contribution.toFixed(4)}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          c.direction === 'supports_malicious'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-cyan-500/20 text-cyan-400'
                        }`}
                      >
                        {c.direction === 'supports_malicious' ? 'Malicious' : 'Benign'}
                      </span>
                    </td>
                    <td className="p-2.5 text-soc-muted text-[10px] uppercase">{c.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scientific Limitations & Regulatory Disclosures */}
        <div className="p-4 rounded-xl bg-soc-bg border border-soc-border space-y-1.5 font-sans text-soc-muted">
          <strong className="text-[10px] font-bold uppercase tracking-wider text-soc-muted font-mono block">
            Scientific Limitations & Regulatory Notice
          </strong>
          <p className="text-[11px] leading-relaxed">
            1. Feature attributions indicate statistical correlation and decision-boundary sensitivity under the trained model; they do not prove external real-world causation.
            2. Shapley values are calculated against a background reference sample of CIC-IDS-2017 network traffic.
            3. Counterfactual scenarios reflect algorithmic sensitivity thresholds, not penetration test or evasion recommendations.
          </p>
        </div>
      </div>
    </div>
  );
};
