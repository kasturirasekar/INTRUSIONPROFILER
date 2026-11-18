import React from 'react';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardSummary, NetworkFlowRecord } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { SeverityBadge } from '../components/common/SeverityBadge';

interface DashboardProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onInspectFlow: (flow: NetworkFlowRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, loading, onInspectFlow }) => {
  if (!summary && loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-soc-secondary animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-soc-card border border-soc-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 text-center text-soc-muted">
        Unable to load dashboard telemetry. Please ensure the backend is running.
      </div>
    );
  }

  const severityPieData = summary.severity_distribution.map((s) => ({
    name: s.severity,
    value: s.count,
    color: s.color,
  }));

  return (
    <div className="p-6 sm:p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-soc-text font-mono flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-soc-accent animate-pulse" />
            Security Command Center
          </h1>
          <p className="text-xs sm:text-sm text-soc-muted mt-1">
            Real-time cyber threat profiling and multi-vector intrusion detection telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-soc-card border border-soc-border text-xs font-mono text-soc-muted">
            Telemetry Synced: <span className="text-soc-text">{summary.last_updated}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Flows Analyzed"
          value={summary.total_flows_analyzed.toLocaleString()}
          icon={Activity}
          variant="default"
          subtitle="Monitored records"
        />
        <MetricCard
          title="Benign Flows"
          value={summary.benign_flows_detected.toLocaleString()}
          icon={ShieldCheck}
          variant="success"
          subtitle="Clean network traffic"
        />
        <MetricCard
          title="Intrusions Blocked"
          value={summary.malicious_flows_detected.toLocaleString()}
          icon={ShieldAlert}
          variant="critical"
          subtitle={`Threat rate: ${summary.threat_detection_rate}%`}
        />
        <MetricCard
          title="Critical Alerts"
          value={summary.critical_alerts}
          icon={AlertTriangle}
          variant="critical"
          subtitle=">= 90% attack prob"
        />
        <MetricCard
          title="Model Accuracy"
          value={`${summary.model_accuracy}%`}
          icon={Cpu}
          variant="accent"
          subtitle="Test set evaluation"
        />
        <MetricCard
          title="Model F1 Score"
          value={`${summary.model_f1}%`}
          icon={TrendingUp}
          variant="accent"
          subtitle="Ensemble test evaluation"
        />
      </div>

      {/* Charts Row: Traffic Volume & Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Volume Timeline */}
        <div className="lg:col-span-2 bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono">
                Traffic Volume & Intrusion Trend
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Distribution of benign vs intercepted attack flows across telemetry windows
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-soc-accent">
                <span className="w-2 h-2 rounded-full bg-soc-accent" /> Benign
              </span>
              <span className="flex items-center gap-1.5 text-soc-critical">
                <span className="w-2 h-2 rounded-full bg-soc-critical" /> Malicious
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.traffic_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="benignGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#20D6C2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#20D6C2" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="attackGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4D6D" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#FF4D6D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time_label" stroke="#5A6E87" fontSize={11} fontStyle="mono" tickLine={false} />
                <YAxis stroke="#5A6E87" fontSize={11} fontStyle="mono" tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C2B', borderColor: '#1E2D42', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="benign_flows" stroke="#20D6C2" strokeWidth={2} fillOpacity={1} fill="url(#benignGrad)" name="Benign Flows" />
                <Area type="monotone" dataKey="attack_flows" stroke="#FF4D6D" strokeWidth={2} fillOpacity={1} fill="url(#attackGrad)" name="Attack Flows" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Severity Distribution Donut */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono">
              Threat Severity Profiling
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Flow categorization by calculated attack severity
            </p>
          </div>

          <div className="h-52 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {severityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C2B', borderColor: '#1E2D42', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-soc-border">
            {summary.severity_distribution.map((sev) => (
              <div key={sev.severity} className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-soc-muted">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sev.color }} />
                  {sev.severity}
                </span>
                <span className="text-soc-text font-bold">
                  {sev.count.toLocaleString()} ({sev.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Real Attack Distribution & Top Model Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Attack Categories in Dataset */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono">
                Attack Category Distribution (CIC-IDS-2017)
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Multiclass intrusion breakdown from benchmark dataset
              </p>
            </div>
            <Zap className="w-4 h-4 text-soc-high" />
          </div>

          <div className="space-y-3">
            {summary.attack_distribution.slice(0, 6).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-soc-text font-medium">{cat.category}</span>
                  <span className="text-soc-muted">
                    {cat.count.toLocaleString()} flows ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-soc-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      cat.risk_level === 'Critical'
                        ? 'bg-soc-critical'
                        : cat.risk_level === 'High'
                        ? 'bg-soc-high'
                        : 'bg-soc-medium'
                    }`}
                    style={{ width: `${Math.min(100, cat.percentage * 2.5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Importance */}
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono">
                Trained Ensemble Feature Importance
              </h3>
              <p className="text-xs text-soc-muted mt-0.5">
                Top predictive weights learned by the model pipeline
              </p>
            </div>
            <Cpu className="w-4 h-4 text-soc-accent" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.top_features.slice(0, 6)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
              >
                <XAxis type="number" stroke="#5A6E87" fontSize={10} fontStyle="mono" tickLine={false} />
                <YAxis dataKey="feature" type="category" stroke="#91A0B5" fontSize={10} width={90} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C2B', borderColor: '#1E2D42', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ fontFamily: 'monospace' }}
                />
                <Bar dataKey="importance" fill="#20D6C2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent High Priority Threat Alerts */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-soc-critical" />
              High Priority Interceptions
            </h3>
            <p className="text-xs text-soc-muted mt-0.5">
              Recently intercepted flows classified with high or critical threat confidence
            </p>
          </div>
          <span className="text-xs font-mono text-soc-muted">Top 6 Alerts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-soc-border text-[11px] font-mono text-soc-muted uppercase tracking-wider">
                <th className="pb-3 font-semibold">Flow ID</th>
                <th className="pb-3 font-semibold">Severity</th>
                <th className="pb-3 font-semibold">Attack Confidence</th>
                <th className="pb-3 font-semibold">Dest Port</th>
                <th className="pb-3 font-semibold">Flow Duration</th>
                <th className="pb-3 font-semibold">Key Risk Indicators</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/50 text-xs font-mono">
              {summary.recent_alerts.slice(0, 6).map((alert) => (
                <tr key={alert.flow_id} className="hover:bg-soc-secondary/40 transition-colors">
                  <td className="py-3 text-soc-text font-bold">#{alert.flow_id}</td>
                  <td className="py-3">
                    <SeverityBadge severity={alert.severity} size="sm" />
                  </td>
                  <td className="py-3 text-soc-critical font-bold">
                    {(alert.attack_probability * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 text-soc-text">
                    {alert.flow_metadata?.['Destination Port'] ?? 'N/A'}
                  </td>
                  <td className="py-3 text-soc-muted">
                    {alert.flow_metadata?.['Flow Duration']
                      ? `${(Number(alert.flow_metadata['Flow Duration']) / 1000).toFixed(1)} ms`
                      : '0 ms'}
                  </td>
                  <td className="py-3 text-soc-muted max-w-xs truncate" title={alert.top_risk_features.join(', ')}>
                    {alert.top_risk_features.join(', ') || 'Packet Length Variance'}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() =>
                        onInspectFlow({
                          id: alert.flow_id,
                          destination_port: alert.flow_metadata?.['Destination Port'] ?? null,
                          flow_duration: alert.flow_metadata?.['Flow Duration'] ?? null,
                          total_fwd_packets: alert.flow_metadata?.['Total Fwd Packets'] ?? null,
                          total_bwd_packets: alert.flow_metadata?.['Total Backward Packets'] ?? null,
                          packet_length_mean: null,
                          flow_bytes_per_sec: null,
                          flow_packets_per_sec: null,
                          prediction: 'Attack',
                          attack_probability: alert.attack_probability,
                          severity: alert.severity,
                          is_attack: true,
                          timestamp_simulated: summary.last_updated,
                          raw_features: alert.flow_metadata || {},
                        })
                      }
                      className="px-2.5 py-1 text-[11px] rounded bg-soc-secondary hover:bg-soc-border text-soc-accent transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
