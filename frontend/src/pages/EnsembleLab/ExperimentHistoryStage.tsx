import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Play,
  Eye,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { ExperimentSummaryItem, ExperimentResults } from '../../types/lab';
import { TheoryDrawer } from './TheoryDrawer';

interface ExperimentHistoryStageProps {
  onLoadExperiment: (id: string) => void;
  onRerunExperiment: (id: string) => void;
}

export const ExperimentHistoryStage: React.FC<ExperimentHistoryStageProps> = ({
  onLoadExperiment,
  onRerunExperiment,
}) => {
  const [experiments, setExperiments] = useState<ExperimentSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchList = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.listExperiments(100);
      setExperiments(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load experiment history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this experiment run from the database?')) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteExperiment(id);
      setExperiments((prev) => prev.filter((exp) => exp.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered experiments
  const filtered = experiments.filter((exp) => {
    const matchesSearch = exp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStrategy = strategyFilter === 'all' || exp.strategy.toLowerCase() === strategyFilter.toLowerCase();
    const matchesTask = taskFilter === 'all' || exp.task_type.toLowerCase() === taskFilter.toLowerCase();
    return matchesSearch && matchesStrategy && matchesTask;
  });

  // Calculate statistics
  const completed = experiments.filter((e) => e.status === 'completed');
  const bestF1 = completed.length > 0
    ? Math.max(...completed.map((e) => e.f1_score || 0))
    : 0;
  const avgTime = completed.length > 0
    ? completed.reduce((acc, cur) => acc + (cur.training_time_seconds || 0), 0) / completed.length
    : 0;

  return (
    <div className="space-y-6 animate-fade-in font-mono">
      {/* Educational Guide Drawer */}
      <TheoryDrawer
        title="Experiment Provenance & Cybersecurity Audit Trails"
        cyberContext="In enterprise security operations (SecOps) and compliance frameworks (such as NIST SP 800-53 or MITRE ATT&CK validations), automated detection models cannot be black-box deployments. Every model must maintain a strict audit trail: what training flows were ingested, what feature transforms were applied, what hyperparameter seeds were used, and how the model scored against test datasets. Reproducibility is mandatory for incident post-mortems."
        mlConcept="Experiment tracking systems persist full architectural metadata, hyperparameters, feature subsets, and evaluation metrics into a persistent data store (SQLite). This enables security engineers to roll back regressions, reproduce published research baselines, and retrain models as new network attack variants emerge."
        keyTakeaway="Use this catalog to track progressive improvements to your ensemble architecture across iterative tuning experiments."
        defaultOpen={false}
      />

      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-soc-card border border-soc-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
            Stage 9: Lab Ledger & Provenance
          </span>
          <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
            <History className="w-5 h-5 text-soc-accent" />
            Experiment Registry & History
          </h2>
          <p className="text-xs text-soc-muted mt-1">
            Persistent audit ledger of all configured and trained ensemble intrusion profilers.
          </p>
        </div>

        <button
          onClick={fetchList}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs rounded-lg border border-soc-border hover:bg-soc-border text-soc-muted hover:text-soc-text transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-soc-card border border-soc-border">
          <span className="text-[10px] text-soc-muted uppercase tracking-wider block">Total Recorded Runs</span>
          <div className="text-xl font-bold text-soc-text mt-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-soc-accent" />
            {experiments.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-soc-card border border-soc-border">
          <span className="text-[10px] text-soc-muted uppercase tracking-wider block">Peak Benchmark F1-Score</span>
          <div className="text-xl font-bold text-soc-accent mt-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-soc-accent" />
            {(bestF1 * 100).toFixed(2)}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-soc-card border border-soc-border">
          <span className="text-[10px] text-soc-muted uppercase tracking-wider block">Avg Training Duration</span>
          <div className="text-xl font-bold text-soc-warning mt-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-soc-warning" />
            {avgTime.toFixed(2)}s
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-soc-danger/10 border border-soc-danger/30 text-soc-danger text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 rounded-xl bg-soc-card border border-soc-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-soc-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search experiment name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-soc-bg border border-soc-border text-xs text-soc-text focus:outline-none focus:border-soc-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-soc-muted shrink-0" />
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-soc-bg border border-soc-border text-xs text-soc-text focus:outline-none focus:border-soc-accent"
          >
            <option value="all">All Strategies</option>
            <option value="voting">Voting</option>
            <option value="stacking">Stacking</option>
            <option value="bagging">Bagging</option>
            <option value="boosting">Boosting</option>
            <option value="random_forest">Random Forest</option>
          </select>

          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-soc-bg border border-soc-border text-xs text-soc-text focus:outline-none focus:border-soc-accent"
          >
            <option value="all">All Tasks</option>
            <option value="binary">Binary</option>
            <option value="multiclass">Multiclass</option>
          </select>
        </div>
      </div>

      {/* Table of Experiments */}
      <div className="rounded-xl border border-soc-border bg-soc-card overflow-hidden shadow-card">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-soc-muted">
            {isLoading
              ? 'Loading experiment ledger...'
              : 'No experiments found matching current filter parameters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-soc-border bg-soc-bg/40 text-soc-muted uppercase text-[10px]">
                  <th className="p-3">Experiment Name</th>
                  <th className="p-3">Strategy</th>
                  <th className="p-3">Task</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Accuracy</th>
                  <th className="p-3 text-right">Recall</th>
                  <th className="p-3 text-right">F1-Score</th>
                  <th className="p-3 text-right">Time</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border">
                {filtered.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-soc-border/20 transition-colors group"
                  >
                    <td className="p-3 font-semibold text-soc-text">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[200px]" title={exp.name}>
                          {exp.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-soc-muted uppercase text-[10px]">
                      {exp.strategy}
                    </td>
                    <td className="p-3 text-soc-muted capitalize text-[10px]">
                      {exp.task_type}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          exp.status === 'completed'
                            ? 'bg-soc-accent/20 text-soc-accent'
                            : exp.status === 'running'
                            ? 'bg-soc-warning/20 text-soc-warning animate-pulse'
                            : exp.status === 'failed'
                            ? 'bg-soc-danger/20 text-soc-danger'
                            : 'bg-soc-border text-soc-muted'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-soc-muted">
                      {exp.accuracy !== undefined ? `${(exp.accuracy * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-soc-muted">
                      {exp.recall !== undefined ? `${(exp.recall * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-soc-accent">
                      {exp.f1_score !== undefined ? `${(exp.f1_score * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-soc-muted text-[11px]">
                      {exp.training_time_seconds ? `${exp.training_time_seconds.toFixed(2)}s` : '—'}
                    </td>
                    <td className="p-3 text-soc-muted text-[11px]">
                      {new Date(exp.created_at).toLocaleDateString()}{' '}
                      <span className="text-[9px] text-soc-muted/70">
                        {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {exp.status === 'completed' && (
                          <button
                            onClick={() => onLoadExperiment(exp.id)}
                            title="Inspect Evaluation"
                            className="p-1.5 rounded-lg border border-soc-border hover:bg-soc-accent/10 hover:text-soc-accent hover:border-soc-accent/40 text-soc-muted transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onRerunExperiment(exp.id)}
                          title="Rerun this Configuration"
                          className="p-1.5 rounded-lg border border-soc-border hover:bg-soc-warning/10 hover:text-soc-warning hover:border-soc-warning/40 text-soc-muted transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(exp.id, e)}
                          disabled={deletingId === exp.id}
                          title="Delete Experiment"
                          className="p-1.5 rounded-lg border border-soc-border hover:bg-soc-danger/10 hover:text-soc-danger hover:border-soc-danger/40 text-soc-muted transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
