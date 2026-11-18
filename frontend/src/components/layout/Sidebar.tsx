import React from 'react';
import {
  LayoutDashboard,
  Activity,
  ShieldAlert,
  BarChart3,
  Cpu,
  BrainCircuit,
  Sparkles,
  FileSpreadsheet,
  Settings as SettingsIcon,
  FlaskConical,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'traffic'
  | 'threats'
  | 'analytics'
  | 'model'
  | 'xai'
  | 'studio'
  | 'research'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  criticalCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  criticalCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'SOC Dashboard',
      icon: LayoutDashboard,
      desc: 'Command Center & KPIs',
    },
    {
      id: 'traffic' as NavTab,
      label: 'Live Traffic',
      icon: Activity,
      desc: 'Flow Replay & Inspection',
    },
    {
      id: 'threats' as NavTab,
      label: 'Threat Center',
      icon: ShieldAlert,
      desc: 'Detected Attacks Queue',
      badge: criticalCount > 0 ? criticalCount : undefined,
    },
    {
      id: 'analytics' as NavTab,
      label: 'Network Analytics',
      icon: BarChart3,
      desc: 'Protocols, Ports & Sizing',
    },
    {
      id: 'model' as NavTab,
      label: 'Model Performance',
      icon: Cpu,
      desc: 'Ensemble Benchmarks & ROC',
    },
    {
      id: 'xai' as NavTab,
      label: 'Predict & Explain (XAI)',
      icon: Sparkles,
      desc: 'Model Predict & Explainability',
      isNew: true,
    },
    {
      id: 'studio' as NavTab,
      label: 'Ensemble Studio',
      icon: BrainCircuit,
      desc: 'Interactive ML & XAI',
      isNew: true,
    },
    {
      id: 'research' as NavTab,
      label: 'Research & Evaluation',
      icon: FlaskConical,
      desc: 'Benchmark, Drift & Stress',
      isNew: true,
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports & Upload',
      icon: FileSpreadsheet,
      desc: 'CSV Batch Predict & Export',
    },
    {
      id: 'settings' as NavTab,
      label: 'System & Schema',
      icon: SettingsIcon,
      desc: 'API Config & Feature List',
    },
  ];

  return (
    <aside className="w-64 border-r border-soc-border bg-soc-sidebar flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-soc-muted uppercase font-mono">
          Security Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 text-left ${
                isActive
                  ? 'bg-soc-card border border-soc-accent/40 text-soc-accent shadow-glowAccent/20'
                  : 'text-soc-muted hover:text-soc-text hover:bg-soc-secondary/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-soc-accent' : 'text-soc-muted'}`} />
                <div>
                  <div className={`text-xs font-semibold ${isActive ? 'text-soc-text' : ''}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-soc-muted/80 leading-tight">
                    {item.desc}
                  </div>
                </div>
              </div>

              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-soc-critical text-white shadow-glowCritical">
                  {item.badge}
                </span>
              )}

              {item.isNew && item.badge === undefined && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-soc-accent/20 text-soc-accent border border-soc-accent/40 animate-pulse">
                  NEW
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dataset & Engine Info footer */}
      <div className="p-4 border-t border-soc-border bg-soc-bg/50">
        <div className="p-3 rounded-xl bg-soc-card border border-soc-border/80">
          <div className="flex items-center justify-between text-[11px] font-mono text-soc-muted">
            <span>DATASET</span>
            <span className="text-soc-text font-bold">CIC-IDS-2017</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-soc-muted mt-1">
            <span>ENGINE</span>
            <span className="text-soc-accent font-bold">Logistic Regression</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-soc-muted mt-1">
            <span>TEST ACC.</span>
            <span className="text-soc-low font-bold">94.99%</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
