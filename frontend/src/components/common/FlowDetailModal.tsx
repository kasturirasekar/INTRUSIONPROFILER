import React, { useState } from 'react';
import { X, ShieldAlert, ShieldCheck, Activity, Search, Copy, Check } from 'lucide-react';
import { NetworkFlowRecord } from '../../types';
import { SeverityBadge } from './SeverityBadge';

interface FlowDetailModalProps {
  flow: NetworkFlowRecord | null;
  onClose: () => void;
}

export const FlowDetailModal: React.FC<FlowDetailModalProps> = ({ flow, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  if (!flow) return null;

  const features = flow.raw_features || {};
  const featureEntries = Object.entries(features).filter(([key]) =>
    key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(flow, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-soc-card border border-soc-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-soc-border bg-soc-sidebar/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${flow.is_attack ? 'bg-soc-critical/20 text-soc-critical' : 'bg-soc-accent/20 text-soc-accent'}`}>
              {flow.is_attack ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold tracking-tight text-soc-text">
                  Flow Record #{flow.id}
                </h3>
                <SeverityBadge severity={flow.severity} />
              </div>
              <p className="text-xs text-soc-muted font-mono mt-0.5">
                Timestamp: {flow.timestamp_simulated}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 text-xs font-mono rounded-lg border border-soc-border text-soc-muted hover:text-soc-text hover:border-soc-borderLight flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-soc-low" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'JSON'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-soc-muted hover:text-soc-text hover:bg-soc-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-soc-sidebar/30 border-b border-soc-border">
          <div className="p-3 rounded-lg bg-soc-secondary/60 border border-soc-border/50">
            <span className="text-xs text-soc-muted block">Classification</span>
            <span className={`text-base font-bold font-mono ${flow.is_attack ? 'text-soc-critical' : 'text-soc-accent'}`}>
              {flow.prediction}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-soc-secondary/60 border border-soc-border/50">
            <span className="text-xs text-soc-muted block">Attack Probability</span>
            <span className="text-base font-bold font-mono text-soc-text">
              {(flow.attack_probability * 100).toFixed(1)}%
            </span>
          </div>

          <div className="p-3 rounded-lg bg-soc-secondary/60 border border-soc-border/50">
            <span className="text-xs text-soc-muted block">Destination Port</span>
            <span className="text-base font-bold font-mono text-soc-text">
              {flow.destination_port ?? 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-soc-secondary/60 border border-soc-border/50">
            <span className="text-xs text-soc-muted block">Flow Duration</span>
            <span className="text-base font-bold font-mono text-soc-text">
              {flow.flow_duration ? `${(flow.flow_duration / 1000).toFixed(2)} ms` : '0 ms'}
            </span>
          </div>
        </div>

        {/* Feature Explorer */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-soc-muted flex items-center gap-2">
              <Activity className="w-4 h-4 text-soc-accent" />
              Flow Feature Matrix ({featureEntries.length} of {Object.keys(features).length})
            </h4>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-soc-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter features..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-soc-secondary border border-soc-border rounded-lg text-soc-text placeholder:text-soc-muted focus:outline-none focus:border-soc-accent font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {featureEntries.map(([key, val]) => (
              <div
                key={key}
                className="p-2.5 rounded-lg bg-soc-bg border border-soc-border/60 hover:border-soc-border transition-colors"
              >
                <div className="text-[11px] text-soc-muted font-mono truncate" title={key}>
                  {key}
                </div>
                <div className="text-sm font-bold font-mono text-soc-text mt-0.5 truncate">
                  {typeof val === 'number' ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(4)) : String(val)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-soc-border bg-soc-sidebar/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium bg-soc-secondary text-soc-text hover:bg-soc-border rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
