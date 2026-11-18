import React from 'react';
import { ThreatSeverity } from '../../types';

interface SeverityBadgeProps {
  severity: ThreatSeverity;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const styles: Record<ThreatSeverity, { bg: string; text: string; border: string }> = {
    Critical: {
      bg: 'bg-soc-critical/10',
      text: 'text-soc-critical',
      border: 'border-soc-critical/30',
    },
    High: {
      bg: 'bg-soc-high/10',
      text: 'text-soc-high',
      border: 'border-soc-high/30',
    },
    Medium: {
      bg: 'bg-soc-medium/10',
      text: 'text-soc-medium',
      border: 'border-soc-medium/30',
    },
    Low: {
      bg: 'bg-soc-low/10',
      text: 'text-soc-low',
      border: 'border-soc-low/30',
    },
    Normal: {
      bg: 'bg-soc-normal/10',
      text: 'text-soc-normal',
      border: 'border-soc-normal/30',
    },
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-semibold',
  };

  const current = styles[severity] || styles.Normal;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider font-medium ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${severity === 'Critical' ? 'bg-soc-critical animate-pulse' : 'bg-current'}`} />
      {severity}
    </span>
  );
};
