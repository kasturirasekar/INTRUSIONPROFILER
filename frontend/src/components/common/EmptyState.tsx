import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-soc-border bg-soc-card/40 my-6">
      <div className="p-3.5 rounded-2xl bg-soc-secondary text-soc-muted mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-soc-text">{title}</h3>
      <p className="text-sm text-soc-muted max-w-sm mt-1">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 text-xs font-medium rounded-lg bg-soc-accent text-soc-bg hover:bg-soc-accentHover transition-colors font-mono"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
