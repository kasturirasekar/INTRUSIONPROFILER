import React, { useState } from 'react';
import { BookOpen, ShieldAlert, Cpu, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface TheoryDrawerProps {
  title: string;
  cyberContext: string;
  mlConcept: string;
  keyTakeaway?: string;
  defaultOpen?: boolean;
}

export const TheoryDrawer: React.FC<TheoryDrawerProps> = ({
  title,
  cyberContext,
  mlConcept,
  keyTakeaway,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'cyber' | 'ml'>('cyber');

  return (
    <div className="bg-soc-card/70 border border-soc-border rounded-xl overflow-hidden shadow-card transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-soc-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-soc-accent/10 text-soc-accent">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-soc-accent">
              Theory & Cybersecurity Insights
            </span>
            <h4 className="text-sm font-semibold text-soc-text">{title}</h4>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-soc-muted">
          <span>{isOpen ? 'Collapse Guide' : 'Learn Concepts'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-soc-border/60 bg-soc-sidebar/40 space-y-4 animate-fade-in">
          {/* Tab Selector */}
          <div className="flex gap-2 border-b border-soc-border/50 pb-3">
            <button
              onClick={() => setActiveTab('cyber')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-colors ${
                activeTab === 'cyber'
                  ? 'bg-soc-critical/15 text-soc-critical border border-soc-critical/30'
                  : 'text-soc-muted hover:text-soc-text'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Cybersecurity Context
            </button>

            <button
              onClick={() => setActiveTab('ml')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-colors ${
                activeTab === 'ml'
                  ? 'bg-soc-accent/15 text-soc-accent border border-soc-accent/30'
                  : 'text-soc-muted hover:text-soc-text'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Machine Learning Theory
            </button>
          </div>

          {/* Content Body */}
          <div className="text-xs text-soc-muted leading-relaxed font-sans space-y-2">
            {activeTab === 'cyber' ? (
              <div className="space-y-2 text-soc-text/90">
                <p>{cyberContext}</p>
              </div>
            ) : (
              <div className="space-y-2 text-soc-text/90">
                <p>{mlConcept}</p>
              </div>
            )}
          </div>

          {/* Key Takeaway Pill */}
          {keyTakeaway && (
            <div className="p-3 rounded-lg bg-soc-secondary/60 border border-soc-border/80 flex items-start gap-2.5 text-xs font-mono">
              <Lightbulb className="w-4 h-4 text-soc-high shrink-0 mt-0.5" />
              <div>
                <span className="text-soc-high font-bold block mb-0.5">EXPERT TAKEAWAY:</span>
                <span className="text-soc-muted">{keyTakeaway}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
