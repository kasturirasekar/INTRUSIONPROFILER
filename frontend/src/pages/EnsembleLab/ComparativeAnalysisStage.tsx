import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Award,
  Zap,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../../services/api';
import { ExperimentSummaryItem, ComparativeAnalysisResponse } from '../../types/lab';
import { TheoryDrawer } from './TheoryDrawer';

interface ComparativeAnalysisStageProps {
  onLoadExperimentToEval?: (id: string) => void;
}

export const ComparativeAnalysisStage: React.FC<ComparativeAnalysisStageProps> = ({
  onLoadExperimentToEval,
}) => {
  const [experiments, setExperiments] = useState<ExperimentSummaryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparativeAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchExperiments = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await api.listExperiments(50);
      const completed = list.filter((e) => e.status === 'completed');
      setExperiments(completed);

      // Preselect first 2-3 completed experiments if none selected
      if (selectedIds.length === 0 && completed.length >= 2) {
        const initial = completed.slice(0, 3).map((e) => e.id);
        setSelectedIds(initial);
        runComparison(initial);
      } else if (selectedIds.length >= 2) {
        runComparison(selectedIds);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch experiment history');
    } finally {
      setIsLoading(false);
    }
  };

  const runComparison = async (ids: string[]) => {
    if (ids.length < 2) {
      setComparison(null);
      return;
    }
    setIsComparing(true);
    setErrorMsg(null);
    try {
      const res = await api.compareExperiments(ids);
      setComparison(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to compare experiments');
    } finally {
      setIsComparing(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const toggleSelect = (id: string) => {
    let next: string[];
    if (selectedIds.includes(id)) {
      next = selectedIds.filter((item) => item !== id);
    } else {
      next = [...selectedIds, id];
    }
    setSelectedIds(next);
    if (next.length >= 2) {
      runComparison(next);
    } else {
      setComparison(null);
    }
  };

  const selectAll = () => {
    const allIds = experiments.map((e) => e.id);
    setSelectedIds(allIds);
    if (allIds.length >= 2) runComparison(allIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setComparison(null);
  };

  // Prepare chart data
  const chartData = comparison
    ? comparison.experiments.map((exp) => ({
        name: exp.name.length > 18 ? exp.name.substring(0, 16) + '...' : exp.name,
        fullName: exp.name,
        strategy: exp.strategy,
        Accuracy: +(exp.accuracy * 100).toFixed(2),
        'Detection Rate (Recall)': +(exp.recall * 100).toFixed(2),
        Precision: +(exp.precision * 100).toFixed(2),
        'F1-Score': +(exp.f1_score * 100).toFixed(2),
        'False Alarm Rate (FPR)': +(exp.false_positive_rate * 100).toFixed(2),
        'Missed Attack Rate (FNR)': +(exp.false_negative_rate * 100).toFixed(2),
      }))
    : [];

  return (
    <div className="space-y-6 animate-fade-in font-mono">
      {/* Theory Guide Drawer */}
      <TheoryDrawer
        title="Comparative Cybersecurity Model Analysis"
        cyberContext="In real-world security operations, no single model is universally superior. A lightweight Random Forest might offer 98.2% detection with sub-millisecond inference suitable for 10Gbps inline firewalls. A Deep Stacking ensemble might hit 99.7% detection but require 10x compute, making it ideal for offline tier-3 forensics. Rigorous side-by-side benchmarking reveals the precise operational trade-offs between detection fidelity, false alarm rates, and computational overhead."
        mlConcept="When comparing ensemble pipelines against standalone baselines, analyze the Pareto frontier between True Positive Rate (Recall) and False Positive Rate (FPR). An optimal cyber-attack classifier dominates other candidates by simultaneously achieving higher detection rates at equal or lower false positive rates."
        keyTakeaway="Select your final architecture based on your deployment tier: prioritize maximum recall for zero-trust perimeters, and minimize false positive rates for automated IP blocking."
        defaultOpen={false}
      />

      {/* Header & Controls */}
      <div className="p-5 rounded-xl bg-soc-card border border-soc-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
            Stage 8: Benchmark & Trade-Offs
          </span>
          <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
            <GitCompare className="w-5 h-5 text-soc-accent" />
            Comparative Model Intelligence
          </h2>
          <p className="text-xs text-soc-muted mt-1">
            Evaluate multiple trained architectures side-by-side on identical test traffic partitions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchExperiments}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs rounded-lg border border-soc-border hover:bg-soc-border text-soc-muted hover:text-soc-text transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={selectAll}
            disabled={experiments.length < 2}
            className="px-3 py-1.5 text-xs rounded-lg border border-soc-accent/40 bg-soc-accent/10 text-soc-accent hover:bg-soc-accent/20 transition-colors"
          >
            Select All ({experiments.length})
          </button>
          <button
            onClick={clearSelection}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 text-xs rounded-lg border border-soc-border text-soc-muted hover:text-soc-danger transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-soc-danger/10 border border-soc-danger/30 text-soc-danger text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Experiment Selector Pills */}
      <div className="p-4 rounded-xl bg-soc-card border border-soc-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase font-bold text-soc-muted tracking-wider">
            Select Experiments to Benchmark (Minimum 2 required)
          </h3>
          <span className="text-xs text-soc-accent">
            {selectedIds.length} of {experiments.length} selected
          </span>
        </div>

        {experiments.length === 0 ? (
          <div className="p-6 text-center text-xs text-soc-muted border border-dashed border-soc-border rounded-lg">
            No completed experiments found. Train at least 2 models in the "Model Training" stage to compare them.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {experiments.map((exp) => {
              const isSelected = selectedIds.includes(exp.id);
              return (
                <button
                  key={exp.id}
                  onClick={() => toggleSelect(exp.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-soc-accent/15 border-soc-accent text-soc-text shadow-sm'
                      : 'bg-soc-card/50 border-soc-border text-soc-muted hover:border-soc-muted'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] border ${
                      isSelected
                        ? 'bg-soc-accent text-soc-bg border-soc-accent font-bold'
                        : 'border-soc-muted/50'
                    }`}
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className="font-semibold">{exp.name}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-soc-bg text-soc-muted border border-soc-border">
                    {exp.strategy}
                  </span>
                  {exp.f1_score !== undefined && (
                    <span className="text-[10px] text-soc-accent">
                      F1: {(exp.f1_score * 100).toFixed(1)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isComparing && (
        <div className="p-12 text-center text-soc-accent font-mono animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Synthesizing comparative cybersecurity benchmarks...
        </div>
      )}

      {/* Benchmarks Content */}
      {comparison && comparison.experiments.length >= 2 && !isComparing && (
        <div className="space-y-6">
          {/* Winner Accolade Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-soc-card border border-soc-accent/30 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-soc-accent/10 text-soc-accent">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-soc-muted uppercase tracking-wider block">
                    Highest Overall F1-Score
                  </span>
                  <h4 className="text-sm font-bold text-soc-accent truncate">
                    {comparison.best_overall_f1}
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-soc-muted">
                Best harmonic balance between precision and intrusion recall across all test flows.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-soc-card border border-soc-warning/30 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-soc-warning/10 text-soc-warning">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-soc-muted uppercase tracking-wider block">
                    Max Intrusion Recall
                  </span>
                  <h4 className="text-sm font-bold text-soc-warning truncate">
                    {comparison.best_attack_detection_rate}
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-soc-muted">
                Lowest rate of missed attacks. Critical for perimeter containment and zero-trust tiers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-soc-card border border-emerald-500/30 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-soc-muted uppercase tracking-wider block">
                    Lowest False Alarm Rate
                  </span>
                  <h4 className="text-sm font-bold text-emerald-400 truncate">
                    {comparison.lowest_false_alarm_rate}
                  </h4>
                </div>
              </div>
              <p className="text-[11px] text-soc-muted">
                Minimizes alert fatigue by keeping benign traffic false alarms to an absolute minimum.
              </p>
            </div>
          </div>

          {/* Operational Recommendation Callout */}
          <div className="p-4 rounded-xl bg-soc-accent/10 border border-soc-accent/40 flex items-start gap-3">
            <Info className="w-5 h-5 text-soc-accent shrink-0 mt-0.5" />
            <div>
              <span className="text-xs uppercase font-bold text-soc-accent tracking-wider">
                SOC Deployment Recommendation
              </span>
              <p className="text-xs text-soc-text/90 mt-1 leading-relaxed">
                {comparison.operational_recommendation}
              </p>
            </div>
          </div>

          {/* Comparative Table */}
          <div className="rounded-xl border border-soc-border bg-soc-card overflow-hidden shadow-card">
            <div className="p-4 border-b border-soc-border flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-soc-text">
                Side-by-Side Model Benchmarking Matrix
              </h3>
              <span className="text-[10px] text-soc-muted">
                {comparison.experiments.length} models evaluated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-soc-border bg-soc-bg/40 text-soc-muted uppercase text-[10px]">
                    <th className="p-3">Model / Architecture</th>
                    <th className="p-3">Strategy</th>
                    <th className="p-3 text-right">Accuracy</th>
                    <th className="p-3 text-right">Intrusion Recall</th>
                    <th className="p-3 text-right">Precision</th>
                    <th className="p-3 text-right">F1-Score</th>
                    <th className="p-3 text-right">False Alarm Rate</th>
                    <th className="p-3 text-right">Missed Attack Rate</th>
                    <th className="p-3 text-right">Train Time</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {comparison.experiments.map((item) => {
                    const isBestF1 = item.name === comparison.best_overall_f1;
                    const isBestRecall = item.name === comparison.best_attack_detection_rate;
                    const isLowestFPR = item.name === comparison.lowest_false_alarm_rate;

                    return (
                      <tr key={item.id} className="hover:bg-soc-border/20 transition-colors">
                        <td className="p-3 font-semibold text-soc-text flex items-center gap-2">
                          {item.name}
                          {isBestF1 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-soc-accent/20 text-soc-accent border border-soc-accent/40 font-bold">
                              BEST F1
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-soc-muted uppercase text-[10px]">
                          {item.strategy}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {(item.accuracy * 100).toFixed(2)}%
                        </td>
                        <td className="p-3 text-right font-mono">
                          <span
                            className={
                              isBestRecall
                                ? 'text-soc-warning font-bold'
                                : 'text-soc-text'
                            }
                          >
                            {(item.recall * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {(item.precision * 100).toFixed(2)}%
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-soc-accent">
                          {(item.f1_score * 100).toFixed(2)}%
                        </td>
                        <td className="p-3 text-right font-mono">
                          <span
                            className={
                              isLowestFPR
                                ? 'text-emerald-400 font-bold'
                                : 'text-soc-muted'
                            }
                          >
                            {(item.false_positive_rate * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <span
                            className={
                              item.false_negative_rate > 0.05
                                ? 'text-soc-danger'
                                : 'text-soc-muted'
                            }
                          >
                            {(item.false_negative_rate * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-soc-muted text-[11px]">
                          {item.training_time.toFixed(2)}s
                        </td>
                        <td className="p-3 text-center">
                          {onLoadExperimentToEval && (
                            <button
                              onClick={() => onLoadExperimentToEval(item.id)}
                              className="text-[10px] text-soc-accent hover:underline"
                            >
                              View Report
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grouped Bar Chart Visual Comparison */}
          <div className="p-5 rounded-xl border border-soc-border bg-soc-card shadow-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-soc-text">
              Direct Visual Benchmark (Key Performance Metrics %)
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis domain={[80, 100]} stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Accuracy" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Detection Rate (Recall)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Precision" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="F1-Score" fill="#20D6C2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length < 2 && experiments.length >= 2 && (
        <div className="p-8 text-center text-soc-muted text-xs border border-dashed border-soc-border rounded-xl">
          Please select at least 2 experiments above to compute comparative performance metrics.
        </div>
      )}
    </div>
  );
};
