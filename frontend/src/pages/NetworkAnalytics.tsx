import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  Layers,
  Network,
  RefreshCw,
  Server,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsData } from '../types';
import { api } from '../services/api';

export const NetworkAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !analytics) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-soc-secondary animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-soc-card border border-soc-border rounded-xl animate-pulse" />
          <div className="h-64 bg-soc-card border border-soc-border rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8 text-center text-soc-muted">
        Unable to load network traffic analytics.
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-text font-mono flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-soc-accent" />
            Network Traffic Analytics
          </h1>
          <p className="text-xs sm:text-sm text-soc-muted mt-1">
            Empirical flow distributions, packet metrics, and destination port vectors from monitored flows
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-mono rounded-lg bg-soc-secondary border border-soc-border text-soc-muted hover:text-soc-text flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-soc-accent' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Top Destination Ports Breakdown */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-soc-accent" />
              Top Targeted Destination Ports & Services
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Flow density and threat percentage by destination port
            </p>
          </div>
          <span className="text-xs font-mono text-soc-muted">Top 10 Ports</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-soc-border text-[11px] font-mono text-soc-muted uppercase tracking-wider">
                <th className="pb-3 font-semibold">Port</th>
                <th className="pb-3 font-semibold">Service Protocol</th>
                <th className="pb-3 font-semibold">Total Flows</th>
                <th className="pb-3 font-semibold">Attack Inceptions</th>
                <th className="pb-3 font-semibold">Clean Flows</th>
                <th className="pb-3 font-semibold">Threat Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/40 text-xs font-mono">
              {analytics.top_destination_ports.map((port) => (
                <tr key={port.port} className="hover:bg-soc-secondary/30 transition-colors">
                  <td className="py-3 text-soc-accent font-bold">Port {port.port}</td>
                  <td className="py-3 text-soc-text">{port.service_hint}</td>
                  <td className="py-3 text-soc-text">{port.flow_count.toLocaleString()}</td>
                  <td className="py-3 text-soc-critical font-bold">{port.attack_count.toLocaleString()}</td>
                  <td className="py-3 text-soc-muted">{port.benign_count.toLocaleString()}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        port.attack_percentage > 50
                          ? 'bg-soc-critical/10 text-soc-critical border border-soc-critical/20'
                          : port.attack_percentage > 10
                          ? 'bg-soc-high/10 text-soc-high border border-soc-high/20'
                          : 'bg-soc-low/10 text-soc-low border border-soc-low/20'
                      }`}
                    >
                      {port.attack_percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histograms: Flow Duration & Packet Sizing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flow Duration Distribution */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-soc-accent" />
                Flow Duration Distribution
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Latency / lifespan of network connections in milliseconds
              </p>
            </div>
            <div className="text-right text-xs font-mono text-soc-muted">
              Median: <strong className="text-soc-text">{analytics.flow_duration_stats.median_ms} ms</strong>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.flow_duration_stats.histogram}>
                <XAxis dataKey="bin_range" stroke="#5A6E87" fontSize={10} fontStyle="mono" tickLine={false} />
                <YAxis stroke="#5A6E87" fontSize={10} fontStyle="mono" tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C2B', borderColor: '#1E2D42', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#638CFF" radius={[4, 4, 0, 0]} name="Flows" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Packet Length Distribution */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-soc-accent" />
                Mean Packet Length Distribution
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Payload and header sizing across monitored flows
              </p>
            </div>
            <div className="text-right text-xs font-mono text-soc-muted">
              Mean: <strong className="text-soc-text">{analytics.packet_stats.avg_packet_size} Bytes</strong>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.packet_stats.histogram}>
                <XAxis dataKey="bin_range" stroke="#5A6E87" fontSize={10} fontStyle="mono" tickLine={false} />
                <YAxis stroke="#5A6E87" fontSize={10} fontStyle="mono" tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C2B', borderColor: '#1E2D42', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#20D6C2" radius={[4, 4, 0, 0]} name="Flows" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Forward vs Backward Packet Stats */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
              <Network className="w-4 h-4 text-soc-accent" />
              Forward vs Backward Packet Volume Asymmetry
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Contrasting request-response packet ratios in benign flows vs malicious flows
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.fwd_vs_bwd_packet_ratios.map((item) => (
            <div
              key={item.label}
              className={`p-4 rounded-xl border ${
                item.label === 'Attack'
                  ? 'bg-soc-critical/5 border-soc-critical/20'
                  : 'bg-soc-accent/5 border-soc-accent/20'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className={`font-bold ${item.label === 'Attack' ? 'text-soc-critical' : 'text-soc-accent'}`}>
                  {item.label} Traffic Signature
                </span>
                <span className="text-soc-muted">{item.sample_count} sample flows</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-soc-border/50 text-xs font-mono">
                <div>
                  <span className="text-soc-muted block">Avg Forward Packets</span>
                  <span className="text-lg font-bold text-soc-text mt-0.5 block">{item.avg_fwd_packets}</span>
                </div>
                <div>
                  <span className="text-soc-muted block">Avg Backward Packets</span>
                  <span className="text-lg font-bold text-soc-text mt-0.5 block">{item.avg_bwd_packets}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
