import React from 'react';
import { Shield, Radio, Cpu, RefreshCw } from 'lucide-react';
import { HealthStatus } from '../../types';

interface NavbarProps {
  health: HealthStatus | null;
  loading: boolean;
  onRefresh: () => void;
  lastUpdated?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  loading,
  onRefresh,
  lastUpdated,
}) => {
  const isConnected = health !== null && health.status === 'ok';

  return (
    <header className="h-16 border-b border-soc-border bg-soc-sidebar/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-xs text-soc-text font-mono">
              INTRUSION<span className="text-cyan-400">PROFILER</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
              SOC v2.0
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:block">
            Ensemble Learning Intrusion Detection Platform
          </span>
        </div>
      </div>

      {/* Real-time Status Indicators */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* API Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-soc-bg border border-soc-border">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-soc-low animate-pulse' : 'bg-soc-critical'
            }`}
          />
          <span className="text-xs font-mono text-soc-muted">
            API: <span className={isConnected ? 'text-soc-text font-medium' : 'text-soc-critical font-medium'}>
              {isConnected ? 'ONLINE' : 'DISCONNECTED'}
            </span>
          </span>
        </div>

        {/* Model Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-soc-bg border border-soc-border">
          <Cpu className="w-3.5 h-3.5 text-soc-accent" />
          <span className="text-xs font-mono text-soc-muted truncate max-w-[190px]">
            {health?.model_loaded ? health.model_name : 'MODEL OFFLINE'}
          </span>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh telemetry"
          className="p-2 rounded-lg bg-soc-secondary border border-soc-border text-soc-muted hover:text-soc-text hover:border-soc-borderLight transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-soc-accent' : ''}`} />
        </button>
      </div>
    </header>
  );
};
