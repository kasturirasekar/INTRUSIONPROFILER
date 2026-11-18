import React, { useState } from 'react';
import { Cpu, Settings2, Sliders, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { BaseClassifierConfig, EnsembleConfig, ModelCatalogItem } from '../../types/lab';
import { TheoryDrawer } from './TheoryDrawer';

interface BaseClassifiersStageProps {
  availableModels: ModelCatalogItem[];
  ensembleConfig: EnsembleConfig;
  onChange: (cfg: EnsembleConfig) => void;
}

export const BaseClassifiersStage: React.FC<BaseClassifiersStageProps> = ({
  availableModels,
  ensembleConfig,
  onChange,
}) => {
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  const getModelConfig = (modelId: string): BaseClassifierConfig => {
    const existing = ensembleConfig.base_classifiers.find((c) => c.model_id === modelId);
    if (existing) return existing;
    return {
      model_id: modelId,
      enabled: modelId === 'decision_tree' || modelId === 'random_forest' || modelId === 'logistic_regression',
      hyperparameters: {},
      weight: 1.0,
    };
  };

  const handleToggleModel = (modelId: string) => {
    const current = getModelConfig(modelId);
    const updated = { ...current, enabled: !current.enabled };
    const nextList = ensembleConfig.base_classifiers.filter((c) => c.model_id !== modelId);
    onChange({ ...ensembleConfig, base_classifiers: [...nextList, updated] });
  };

  const handleWeightChange = (modelId: string, weight: number) => {
    const current = getModelConfig(modelId);
    const updated = { ...current, weight };
    const nextList = ensembleConfig.base_classifiers.filter((c) => c.model_id !== modelId);
    onChange({ ...ensembleConfig, base_classifiers: [...nextList, updated] });
  };

  const handleParamChange = (modelId: string, paramName: string, value: any) => {
    const current = getModelConfig(modelId);
    const updatedParams = { ...current.hyperparameters, [paramName]: value };
    const updated = { ...current, hyperparameters: updatedParams };
    const nextList = ensembleConfig.base_classifiers.filter((c) => c.model_id !== modelId);
    onChange({ ...ensembleConfig, base_classifiers: [...nextList, updated] });
  };

  const applyPreset = (preset: 'triad' | 'diversity' | 'trees') => {
    let enabledIds: string[] = [];
    if (preset === 'triad') {
      enabledIds = ['decision_tree', 'random_forest', 'logistic_regression'];
    } else if (preset === 'diversity') {
      enabledIds = ['decision_tree', 'logistic_regression', 'knn', 'naive_bayes'];
    } else {
      enabledIds = ['random_forest', 'extra_trees', 'gradient_boosting'];
    }

    const nextList = availableModels.map((m) => ({
      model_id: m.id,
      enabled: enabledIds.includes(m.id),
      hyperparameters: m.default_hyperparameters,
      weight: 1.0,
    }));

    onChange({ ...ensembleConfig, base_classifiers: nextList });
  };

  return (
    <div className="space-y-6">
      {/* Educational Guide Drawer */}
      <TheoryDrawer
        title="Base Learners Diversity & Theoretical Variance Reduction"
        cyberContext="Cyberattackers craft malicious payloads specifically designed to evade known detection signatures. A single classifier model always possesses structural blind spots: for example, linear classifiers struggle with non-linear multi-stage infiltrations, whereas deep decision trees can overfit to specific port scan anomalies. By deploying an ensemble of architecturally diverse base learners (tree-based, linear, distance-based, and probabilistic), an exploit that evades one paradigm is caught by another."
        mlConcept="Condorcet's Jury Theorem and the Bias-Variance Decomposition prove that if individual base learners have error rates < 0.5 and are statistically uncorrelated, the probability that the majority vote errs approaches zero as the number of estimators increases. This fundamental mathematical principle requires diversity in algorithmic assumptions (e.g. margin maximization vs Bayesian probability vs recursive partitioning)."
        keyTakeaway="Select at least 3 distinct base model categories (e.g., Tree + Linear + Distance) to maximize ensemble detection robustness against adversarial evasion."
        defaultOpen={false}
      />

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-soc-card border border-soc-border shadow-card">
        <span className="text-xs font-mono text-soc-muted">Quick Architecture Presets:</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('triad')}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-soc-secondary border border-soc-border text-soc-accent hover:border-soc-borderLight transition-colors"
          >
            Recommended Triad (DT + RF + LR)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('diversity')}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-soc-secondary border border-soc-border text-soc-accent hover:border-soc-borderLight transition-colors"
          >
            Maximum Diversity (Tree + Linear + KNN + Bayes)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('trees')}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-soc-secondary border border-soc-border text-soc-accent hover:border-soc-borderLight transition-colors"
          >
            Tree Ensembles (RF + Extra Trees + Boosting)
          </button>
        </div>
      </div>

      {/* Classifiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableModels.map((model) => {
          const cfg = getModelConfig(model.id);
          const isExpanded = expandedModelId === model.id;

          return (
            <div
              key={model.id}
              className={`rounded-xl border p-5 transition-all shadow-card flex flex-col justify-between ${
                cfg.enabled
                  ? 'bg-soc-card border-soc-accent/40 shadow-glowAccent/10'
                  : 'bg-soc-card/60 border-soc-border opacity-70 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                {/* Header & Toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-soc-secondary text-soc-muted uppercase tracking-wider">
                      {model.category}
                    </span>
                    <h4 className="text-sm font-bold font-mono text-soc-text mt-1.5">{model.name}</h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleModel(model.id)}
                    className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition-colors ${
                      cfg.enabled
                        ? 'bg-soc-accent/15 border-soc-accent text-soc-accent'
                        : 'bg-soc-secondary border-soc-border text-soc-muted'
                    }`}
                  >
                    {cfg.enabled ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>

                {/* Role Description */}
                <p className="text-xs text-soc-muted leading-relaxed font-sans">
                  {model.role_in_intrusion_detection}
                </p>

                {/* Voting Weight Slider */}
                {cfg.enabled && ensembleConfig.strategy === 'voting' && (
                  <div className="pt-2 border-t border-soc-border/60 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-soc-muted">Voting Consensus Weight</span>
                      <span className="text-soc-accent font-bold">{cfg.weight}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.2}
                      value={cfg.weight}
                      onChange={(e) => handleWeightChange(model.id, Number(e.target.value))}
                      className="w-full accent-soc-accent"
                    />
                  </div>
                )}
              </div>

              {/* Hyperparameter Settings Collapsible */}
              <div className="mt-4 pt-3 border-t border-soc-border/60">
                <button
                  type="button"
                  onClick={() => setExpandedModelId(isExpanded ? null : model.id)}
                  className="w-full flex items-center justify-between text-xs font-mono text-soc-muted hover:text-soc-accent transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Hyperparameter Controls ({model.hyperparameters.length})
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-3 pt-2 border-t border-soc-border/40 font-mono text-xs animate-fade-in">
                    {model.hyperparameters.map((hp) => {
                      const curVal = cfg.hyperparameters[hp.name] ?? hp.default;

                      return (
                        <div key={hp.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-soc-muted text-[11px]" title={hp.description}>
                              {hp.name}
                            </span>
                            <span className="text-soc-text font-bold text-[11px]">{String(curVal)}</span>
                          </div>

                          {hp.options ? (
                            <select
                              value={curVal}
                              onChange={(e) => handleParamChange(model.id, hp.name, e.target.value)}
                              className="w-full bg-soc-bg border border-soc-border text-soc-text text-[11px] rounded px-2 py-1 focus:outline-none focus:border-soc-accent"
                            >
                              {hp.options.map((opt) => (
                                <option key={String(opt)} value={String(opt)}>
                                  {String(opt)}
                                </option>
                              ))}
                            </select>
                          ) : hp.type === 'int' || hp.type === 'float' ? (
                            <input
                              type="range"
                              min={hp.min_value ?? 1}
                              max={hp.max_value ?? 100}
                              step={hp.type === 'float' ? 0.05 : 1}
                              value={Number(curVal)}
                              onChange={(e) =>
                                handleParamChange(
                                  model.id,
                                  hp.name,
                                  hp.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
                                )
                              }
                              className="w-full accent-soc-accent"
                            />
                          ) : (
                            <input
                              type="text"
                              value={curVal}
                              onChange={(e) => handleParamChange(model.id, hp.name, e.target.value)}
                              className="w-full bg-soc-bg border border-soc-border text-soc-text text-[11px] rounded px-2 py-1"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
