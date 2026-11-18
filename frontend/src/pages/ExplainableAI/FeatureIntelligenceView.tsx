import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Layers,
  ShieldAlert,
  Activity,
  BarChart2,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../../services/api';
import { FeatureIntelligenceItem } from '../../types/explainability';

interface FeatureIntelligenceViewProps {
  initialSelectedFeature?: string;
}

export const FeatureIntelligenceView: React.FC<FeatureIntelligenceViewProps> = ({
  initialSelectedFeature,
}) => {
  const [features, setFeatures] = useState<FeatureIntelligenceItem[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<FeatureIntelligenceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const data = await api.getAllFeaturesIntelligence();
        setFeatures(data);
        if (data.length > 0) {
          const found = initialSelectedFeature
            ? data.find((f) => f.name.toLowerCase() === initialSelectedFeature.toLowerCase())
            : data[0];
          setSelectedFeature(found || data[0]);
        }
      } catch (err) {
        console.error('Failed to load feature intelligence', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [initialSelectedFeature]);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(features.map((f) => f.category)))];

  const filtered = features.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.definition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'All' || f.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const stats = selectedFeature?.statistics;
  const statChartData = stats
    ? [
        {
          metric: 'Mean Value',
          Benign: +(stats.benign_mean || 0).toFixed(2),
          Attack: +(stats.attack_mean || 0).toFixed(2),
        },
        {
          metric: 'Median Value',
          Benign: +(stats.benign_median || 0).toFixed(2),
          Attack: +(stats.attack_median || 0).toFixed(2),
        },
        {
          metric: 'Standard Deviation',
          Benign: +(stats.benign_std || 0).toFixed(2),
          Attack: +(stats.attack_std || 0).toFixed(2),
        },
      ]
    : [];

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card">
        <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
          CIC-IDS-2017 Domain Knowledge Base
        </span>
        <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
          <BookOpen className="w-5 h-5 text-soc-accent" />
          Cybersecurity Feature Intelligence
        </h2>
        <p className="text-xs text-soc-muted mt-1 max-w-2xl">
          Comprehensive networking definitions, OSI protocol layer mapping, and empirical benign vs attack distribution
          baselines for all 78 evaluated flow dimensions.
        </p>
      </div>

      {/* Main 2-Column Layout: Sidebar Directory & Feature Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Directory List */}
        <div className="p-4 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-soc-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 78 features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-soc-bg border border-soc-border text-xs text-soc-text focus:outline-none focus:border-soc-accent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-soc-muted shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-soc-bg border border-soc-border text-xs text-soc-muted focus:outline-none focus:border-soc-accent"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1 divide-y divide-soc-border/40">
            {filtered.map((f) => {
              const isSelected = selectedFeature?.name === f.name;
              return (
                <button
                  key={f.name}
                  onClick={() => setSelectedFeature(f)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all text-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-soc-accent/15 border border-soc-accent/40 text-soc-accent font-bold'
                      : 'text-soc-muted hover:text-soc-text hover:bg-soc-bg'
                  }`}
                >
                  <span className="truncate pr-2">{f.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-soc-bg border border-soc-border uppercase shrink-0">
                    {f.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Intelligence Dossier */}
        <div className="lg:col-span-2 space-y-6">
          {selectedFeature ? (
            <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-6">
              {/* Feature Title Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-soc-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-soc-accent/10 text-soc-accent border border-soc-accent/30 font-bold uppercase">
                      {selectedFeature.category}
                    </span>
                    <span className="text-[10px] text-soc-muted uppercase">
                      {selectedFeature.layer}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-soc-text">
                    {selectedFeature.name}
                  </h3>
                  <span className="text-xs text-soc-muted">Unit: {selectedFeature.unit}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {selectedFeature.attack_associations.map((att) => (
                    <span
                      key={att}
                      className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 font-semibold"
                    >
                      {att}
                    </span>
                  ))}
                </div>
              </div>

              {/* Technical Definition */}
              <div className="space-y-1 font-sans">
                <span className="text-xs font-bold uppercase tracking-wider text-soc-muted font-mono block">
                  Technical Protocol Definition
                </span>
                <p className="text-xs text-soc-text leading-relaxed">
                  {selectedFeature.definition}
                </p>
              </div>

              {/* Cybersecurity Threat Context */}
              <div className="p-4 rounded-xl bg-soc-bg border border-soc-border space-y-1.5 font-sans">
                <span className="text-xs font-bold uppercase tracking-wider text-soc-accent font-mono block">
                  Cyber Threat Context & Forensic Indicator
                </span>
                <p className="text-xs text-soc-muted leading-relaxed">
                  {selectedFeature.cyber_context}
                </p>
              </div>

              {/* Empirical Distribution Comparison */}
              {stats && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-soc-text font-mono">
                    Empirical Baseline Comparison (Benign vs Attack Flows)
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                      <span className="text-[10px] text-soc-muted uppercase block">Benign Mean</span>
                      <span className="text-sm font-bold text-cyan-400">
                        {stats.benign_mean !== undefined ? stats.benign_mean.toFixed(2) : '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                      <span className="text-[10px] text-soc-muted uppercase block">Attack Mean</span>
                      <span className="text-sm font-bold text-orange-400">
                        {stats.attack_mean !== undefined ? stats.attack_mean.toFixed(2) : '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                      <span className="text-[10px] text-soc-muted uppercase block">Benign Median</span>
                      <span className="text-sm font-bold text-cyan-400">
                        {stats.benign_median !== undefined ? stats.benign_median.toFixed(2) : '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-soc-bg border border-soc-border">
                      <span className="text-[10px] text-soc-muted uppercase block">Attack Median</span>
                      <span className="text-sm font-bold text-orange-400">
                        {stats.attack_median !== undefined ? stats.attack_median.toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Distribution Chart */}
                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="metric" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                        <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="Benign" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Attack" fill="#F97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center text-xs text-soc-muted border border-dashed border-soc-border rounded-xl">
              Select a feature from the directory to inspect its cybersecurity intelligence profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
