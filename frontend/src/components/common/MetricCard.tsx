import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'accent' | 'critical' | 'warning' | 'success';
  trend?: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  loading = false,
}) => {
  const variantStyles = {
    default: {
      border: 'border-soc-border hover:border-soc-borderLight',
      iconBg: 'bg-soc-secondary text-soc-muted',
      valueColor: 'text-soc-text',
    },
    accent: {
      border: 'border-soc-accent/20 hover:border-soc-accent/50',
      iconBg: 'bg-soc-accent/10 text-soc-accent',
      valueColor: 'text-soc-accent',
    },
    critical: {
      border: 'border-soc-critical/20 hover:border-soc-critical/50',
      iconBg: 'bg-soc-critical/10 text-soc-critical',
      valueColor: 'text-soc-critical',
    },
    warning: {
      border: 'border-soc-high/20 hover:border-soc-high/50',
      iconBg: 'bg-soc-high/10 text-soc-high',
      valueColor: 'text-soc-high',
    },
    success: {
      border: 'border-soc-low/20 hover:border-soc-low/50',
      iconBg: 'bg-soc-low/10 text-soc-low',
      valueColor: 'text-soc-low',
    },
  };

  const current = variantStyles[variant];

  return (
    <div
      className={`bg-soc-card rounded-xl border p-5 transition-all duration-200 shadow-card ${current.border}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-soc-muted uppercase">
          {title}
        </span>
        <div className={`p-2.5 rounded-lg ${current.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-9 w-24 bg-soc-secondary animate-pulse rounded" />
        ) : (
          <div className={`text-2xl font-bold font-mono tracking-tight ${current.valueColor}`}>
            {value}
          </div>
        )}

        {(subtitle || trend) && (
          <div className="mt-1 flex items-center justify-between text-xs text-soc-muted">
            {subtitle && <span>{subtitle}</span>}
            {trend && <span className="font-mono text-soc-accent">{trend}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
