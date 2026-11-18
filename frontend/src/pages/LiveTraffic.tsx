import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Square,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { NetworkFlowRecord, LiveStreamStatus } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/common/SeverityBadge';

interface LiveTrafficProps {
  onInspectFlow: (flow: NetworkFlowRecord) => void;
}

export const LiveTraffic: React.FC<LiveTrafficProps> = ({ onInspectFlow }) => {
  const [flows, setFlows] = useState<NetworkFlowRecord[]>([]);
  const [totalFlows, setTotalFlows] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [predictionFilter, setPredictionFilter] = useState('All');

  // Live Stream Replay
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(2); // seconds
  const [streamStats, setStreamStats] = useState<LiveStreamStatus | null>(null);
  const streamIntervalRef = useRef<number | null>(null);

  const fetchTraffic = async () => {
    setLoading(true);
    try {
      const data = await api.getTraffic({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        severity: severityFilter !== 'All' ? severityFilter : undefined,
        prediction: predictionFilter !== 'All' ? predictionFilter : undefined,
      });
      setFlows(data.items);
      setTotalFlows(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to load traffic flows', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraffic();
  }, [page, severityFilter, predictionFilter]);

  // Live streaming polling
  useEffect(() => {
    if (isStreaming) {
      streamIntervalRef.current = window.setInterval(async () => {
        try {
          const res = await api.getStreamBatch(5);
          setStreamStats(res.status);
          // Prepend new stream records to top of current view
          setFlows((prev) => [...res.items, ...prev].slice(0, 50));
        } catch (err) {
          console.error('Live stream poll error', err);
        }
      }, streamSpeed * 1000);
    } else {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    }

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [isStreaming, streamSpeed]);

  const toggleStreaming = () => {
    setIsStreaming(!isStreaming);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTraffic();
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-text font-mono flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-soc-accent animate-pulse" />
            Live Network Traffic Monitor
          </h1>
          <p className="text-xs sm:text-sm text-soc-muted mt-1">
            Real-time feed replay from CIC-IDS network capture with automated ML inference
          </p>
        </div>

        {/* Live Replay Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleStreaming}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-card ${
              isStreaming
                ? 'bg-soc-critical text-white shadow-glowCritical animate-pulse'
                : 'bg-soc-accent text-soc-bg hover:bg-soc-accentHover shadow-glowAccent'
            }`}
          >
            {isStreaming ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" /> Stop Replay
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Start Live Replay
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dataset Replay Notice */}
      <div className="p-3.5 rounded-xl bg-soc-secondary/60 border border-soc-border flex items-center justify-between text-xs font-mono text-soc-muted">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-soc-accent" />
          <span>
            Mode:{' '}
            <strong className="text-soc-text">
              {isStreaming ? 'STREAMING ACTIVE' : 'HISTORICAL EXPLORATION'}
            </strong>{' '}
            (Dataset Replay Engine: <code>binary_test.csv.gz</code>)
          </span>
        </span>
        {streamStats && (
          <span className="text-soc-accent">
            Rate: {(streamStats.current_attack_rate * 100).toFixed(0)}% attack flows
          </span>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-soc-card border border-soc-border flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-card">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-soc-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Destination Port, Protocol, or Severity..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-soc-bg border border-soc-border rounded-lg text-soc-text placeholder:text-soc-muted focus:outline-none focus:border-soc-accent font-mono"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
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
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-soc-muted">
            <span>Class:</span>
            <select
              value={predictionFilter}
              onChange={(e) => {
                setPredictionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-soc-bg border border-soc-border text-soc-text rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-soc-accent font-mono"
            >
              <option value="All">All Classes</option>
              <option value="Attack">Malicious Only</option>
              <option value="Benign">Benign Only</option>
            </select>
          </div>

          <button
            onClick={fetchTraffic}
            disabled={loading}
            className="p-2 rounded-lg bg-soc-secondary border border-soc-border text-soc-muted hover:text-soc-text hover:border-soc-borderLight transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-soc-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Traffic Table */}
      <div className="bg-soc-card border border-soc-border rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-soc-border bg-soc-sidebar/60 text-[11px] font-mono text-soc-muted uppercase tracking-wider">
                <th className="p-3.5 font-semibold">Flow ID</th>
                <th className="p-3.5 font-semibold">Classification</th>
                <th className="p-3.5 font-semibold">Severity</th>
                <th className="p-3.5 font-semibold">Confidence</th>
                <th className="p-3.5 font-semibold">Dest Port</th>
                <th className="p-3.5 font-semibold">Duration</th>
                <th className="p-3.5 font-semibold">Fwd/Bwd Packets</th>
                <th className="p-3.5 font-semibold">Packet Mean</th>
                <th className="p-3.5 font-semibold">Timestamp</th>
                <th className="p-3.5 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/40 text-xs font-mono">
              {flows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-soc-muted">
                    {loading ? 'Loading traffic telemetry...' : 'No flows match the active filter criteria.'}
                  </td>
                </tr>
              ) : (
                flows.map((flow) => (
                  <tr
                    key={`${flow.id}-${flow.timestamp_simulated}`}
                    className="hover:bg-soc-secondary/30 transition-colors"
                  >
                    <td className="p-3.5 text-soc-text font-bold">#{flow.id}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold ${
                          flow.is_attack
                            ? 'bg-soc-critical/10 text-soc-critical border border-soc-critical/20'
                            : 'bg-soc-accent/10 text-soc-accent border border-soc-accent/20'
                        }`}
                      >
                        {flow.is_attack ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        {flow.prediction}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <SeverityBadge severity={flow.severity} size="sm" />
                    </td>
                    <td className="p-3.5 font-bold">
                      <span className={flow.is_attack ? 'text-soc-critical' : 'text-soc-accent'}>
                        {(flow.attack_probability * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3.5 text-soc-text">
                      {flow.destination_port ?? 'N/A'}
                    </td>
                    <td className="p-3.5 text-soc-muted">
                      {flow.flow_duration ? `${(flow.flow_duration / 1000).toFixed(1)} ms` : '0 ms'}
                    </td>
                    <td className="p-3.5 text-soc-muted">
                      {flow.total_fwd_packets ?? 0} / {flow.total_bwd_packets ?? 0}
                    </td>
                    <td className="p-3.5 text-soc-muted">
                      {flow.packet_length_mean ? `${flow.packet_length_mean.toFixed(1)} B` : '0 B'}
                    </td>
                    <td className="p-3.5 text-soc-muted text-[11px] truncate max-w-[140px]">
                      {flow.timestamp_simulated}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => onInspectFlow(flow)}
                        className="p-1.5 rounded-lg bg-soc-secondary hover:bg-soc-border text-soc-accent transition-colors"
                        title="Deep Inspect Flow Features"
                      >
                        <Eye className="w-4 h-4" />
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
            Showing page <strong className="text-soc-text">{page}</strong> of{' '}
            <strong className="text-soc-text">{totalPages}</strong> ({totalFlows.toLocaleString()} total flows)
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
