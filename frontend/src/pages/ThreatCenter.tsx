import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Target,
} from 'lucide-react';
import { NetworkFlowRecord } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/common/SeverityBadge';

interface ThreatCenterProps {
  onInspectFlow: (flow: NetworkFlowRecord) => void;
}

export const ThreatCenter: React.FC<ThreatCenterProps> = ({ onInspectFlow }) => {
  const [threats, setThreats] = useState<NetworkFlowRecord[]>([]);
  const [totalThreats, setTotalThreats] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [severityFilter, setSeverityFilter] = useState('All');
  const [search, setSearch] = useState('');

  const fetchThreats = async () => {
    setLoading(true);
    try {
      const data = await api.getThreats({
        page,
        page_size: pageSize,
        severity: severityFilter !== 'All' ? severityFilter : undefined,
        search: search.trim() || undefined,
      });
      setThreats(data.items);
      setTotalThreats(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to load threats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, [page, severityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchThreats();
  };

  const criticalCount = threats.filter((t) => t.severity === 'Critical').length;
  const highCount = threats.filter((t) => t.severity === 'High').length;

  return (
    <div className="p-6 sm:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-text font-mono flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-soc-critical" />
            Threat Detection Center
          </h1>
          <p className="text-xs sm:text-sm text-soc-muted mt-1">
            Real-time queue of intercepted malicious network intrusions and critical vulnerabilities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-soc-critical/10 border border-soc-critical/30 text-xs font-mono text-soc-critical">
            Active Threats Intercepted: <strong className="text-white">{totalThreats.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-soc-card border border-soc-border p-5 rounded-xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs text-soc-muted font-mono uppercase block">Total Threats Logged</span>
            <span className="text-2xl font-bold font-mono text-soc-critical mt-1 block">
              {totalThreats.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-soc-critical/10 text-soc-critical">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border p-5 rounded-xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs text-soc-muted font-mono uppercase block">Critical In-Queue (Page)</span>
            <span className="text-2xl font-bold font-mono text-soc-critical mt-1 block">
              {criticalCount}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-soc-critical/10 text-soc-critical">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-soc-card border border-soc-border p-5 rounded-xl shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs text-soc-muted font-mono uppercase block">High Risk (Page)</span>
            <span className="text-2xl font-bold font-mono text-soc-high mt-1 block">
              {highCount}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-soc-high/10 text-soc-high">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-soc-card border border-soc-border flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-card">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-soc-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threats by Destination Port or Severity..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-soc-bg border border-soc-border rounded-lg text-soc-text placeholder:text-soc-muted focus:outline-none focus:border-soc-accent font-mono"
          />
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-soc-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-soc-bg border border-soc-border text-soc-text rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-soc-accent font-mono"
            >
              <option value="All">All Threat Levels</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <button
            onClick={fetchThreats}
            disabled={loading}
            className="p-2 rounded-lg bg-soc-secondary border border-soc-border text-soc-muted hover:text-soc-text hover:border-soc-borderLight transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-soc-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Threats Table */}
      <div className="bg-soc-card border border-soc-border rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-soc-border bg-soc-sidebar/60 text-[11px] font-mono text-soc-muted uppercase tracking-wider">
                <th className="p-3.5 font-semibold">Incident ID</th>
                <th className="p-3.5 font-semibold">Severity</th>
                <th className="p-3.5 font-semibold">Attack Probability</th>
                <th className="p-3.5 font-semibold">Target Port</th>
                <th className="p-3.5 font-semibold">Duration</th>
                <th className="p-3.5 font-semibold">Packets (Fwd/Bwd)</th>
                <th className="p-3.5 font-semibold">Interception Time</th>
                <th className="p-3.5 font-semibold text-right">Inspect Vector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/40 text-xs font-mono">
              {threats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-soc-muted">
                    {loading ? 'Querying threat database...' : 'No active threats matching filter.'}
                  </td>
                </tr>
              ) : (
                threats.map((threat) => (
                  <tr key={threat.id} className="hover:bg-soc-secondary/30 transition-colors">
                    <td className="p-3.5 text-soc-text font-bold">#THREAT-{threat.id}</td>
                    <td className="p-3.5">
                      <SeverityBadge severity={threat.severity} size="sm" />
                    </td>
                    <td className="p-3.5 font-bold text-soc-critical">
                      {(threat.attack_probability * 100).toFixed(1)}%
                    </td>
                    <td className="p-3.5 text-soc-text">
                      Port {threat.destination_port ?? 'Unknown'}
                    </td>
                    <td className="p-3.5 text-soc-muted">
                      {threat.flow_duration ? `${(threat.flow_duration / 1000).toFixed(1)} ms` : '0 ms'}
                    </td>
                    <td className="p-3.5 text-soc-muted">
                      {threat.total_fwd_packets ?? 0} / {threat.total_bwd_packets ?? 0}
                    </td>
                    <td className="p-3.5 text-soc-muted truncate max-w-[150px]">
                      {threat.timestamp_simulated}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => onInspectFlow(threat)}
                        className="px-2.5 py-1 text-[11px] rounded bg-soc-secondary hover:bg-soc-border text-soc-accent inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-soc-border bg-soc-sidebar/40 flex items-center justify-between text-xs font-mono text-soc-muted">
          <span>
            Page <strong className="text-soc-text">{page}</strong> of{' '}
            <strong className="text-soc-text">{totalPages}</strong> ({totalThreats.toLocaleString()} threats)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-soc-border text-soc-muted hover:text-soc-text hover:border-soc-borderLight disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-soc-border text-soc-muted hover:text-soc-text hover:border-soc-borderLight disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
