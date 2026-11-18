import React, { useState } from 'react';
import {
  Layers,
  GitMerge,
  Cpu,
  Sliders,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { ModelConfigSpec, BaseLearnerSpec } from '../../types/studio';

interface Step02ConfigureProps {
  config: ModelConfigSpec;
  onChange: (cfg: ModelConfigSpec) => void;
  isLabeled: boolean;
  onProceed: () => void;
  onBack: () => void;
}

const AVAILABLE_BASE_MODELS = [
  { id: 'decision_tree', name: 'Decision Tree', desc: 'Fast, orthogonal rule partitioning', defaultWeight: 1.0 },
  { id: 'random_forest', name: 'Random Forest', desc: 'Bagged decision trees on random subspaces', defaultWeight: 2.0 },
  { id: 'logistic_regression', name: 'Logistic Regression', desc: 'Linear decision boundary & probability calibration', defaultWeight: 1.0 },
  { id: 'extra_trees', name: 'Extra Trees', desc: 'Extremely randomized trees with lower variance', defaultWeight: 1.5 },
  { id: 'gradient_boosting', name: 'Gradient Boosting', desc: 'Sequential gradient error minimization', defaultWeight: 1.5 },
  { id: 'adaboost', name: 'AdaBoost', desc: 'Adaptive boosting reweighting misclassified flows', defaultWeight: 1.0 },
  { id: 'knn', name: 'K-Nearest Neighbors', desc: 'Local instance Euclidean metric classification', defaultWeight: 1.0 },
  { id: 'svm', name: 'Support Vector Machine', desc: 'Maximum-margin separating hyperplane', defaultWeight: 1.0 },
  { id: 'naive_bayes', name: 'Gaussian Naive Bayes', desc: 'Probabilistic conditional independence classifier', defaultWeight: 0.8 },
];

export const Step02Configure: React.FC<Step02ConfigureProps> = ({
  config,
  onChange,
  isLabeled,
  onProceed,
  onBack,
}) => {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const strategies = [
    {
      id: 'stacking',
      name: 'Stacking Classifier',
      tag: 'Hierarchical Meta-Learning',
      desc: 'Feeds out-of-fold base learner predictions into a meta-classifier to learn optimal consensus weights.',
    },
    {
      id: 'voting',
      name: 'Voting Ensemble',
      tag: 'Democratic Consensus',
      desc: 'Aggregates predictions from all participating base learners via Soft (averaged probabilities) or Hard voting.',
    },
    {
      id: 'bagging',
      name: 'Bagging Classifier',
      tag: 'Variance Reduction',
      desc: 'Bootstrap aggregation of decision trees on random subsets of the uploaded flow dataset.',
    },
    {
      id: 'boosting',
      name: 'Boosting Classifier',
      tag: 'Sequential Error Correction',
      desc: 'Sequentially trains weak estimators where subsequent models prioritize previously misclassified flows.',
    },
    {
      id: 'individual',
      name: 'Individual Baseline',
      tag: 'Single Estimator',
      desc: 'Trains and evaluates a single standalone classifier for baseline benchmarking.',
    },
  ];

  const getBaseConfig = (id: string): BaseLearnerSpec => {
    const found = config.base_classifiers.find((b) => b.model_id === id);
    if (found) return found;
    return {
      model_id: id,
      enabled: id === 'decision_tree' || id === 'random_forest' || id === 'logistic_regression',
      hyperparameters: {},
      weight: 1.0,
    };
  };

  const updateBaseConfig = (id: string, updates: Partial<BaseLearnerSpec>) => {
    const existing = getBaseConfig(id);
    const updated = { ...existing, ...updates };
    const nextList = config.base_classifiers.filter((b) => b.model_id !== id);
    nextList.push(updated);
    onChange({ ...config, base_classifiers: nextList });
  };

  const activeBaseCount = AVAILABLE_BASE_MODELS.filter((m) => getBaseConfig(m.id).enabled).length;

  return (
    <div className="space-y-5 font-mono text-slate-200">
      {/* Strategy Selection Grid */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
            Architecture Strategy
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">
            Select Ensemble Learning Architecture
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Choose how multiple models coordinate to profile network flows and harden decision boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {strategies.map((strat) => {
            const isSelected = config.strategy === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => onChange({ ...config, strategy: strat.id as any })}
                className={`p-3.5 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-400'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">
                      {strat.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-semibold">
                      {strat.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    {strat.desc}
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-between text-[10px]">
                  <span className={isSelected ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                    {isSelected ? '✓ Active Strategy' : 'Select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategy-Specific Parameters Bar */}
      {config.strategy === 'stacking' && (
        <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-soc-text">
              Final Combining Model (Meta-Classifier)
            </h4>
            <p className="text-xs text-soc-muted font-sans mt-0.5">
              The final model learns how to combine predictions from each base model to maximize attack detection.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div>
              <label className="text-[10px] text-soc-muted uppercase block">Combining Classifier</label>
              <select
                value={config.meta_classifier_id}
                onChange={(e) => onChange({ ...config, meta_classifier_id: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg bg-soc-bg border border-soc-border text-soc-text focus:outline-none focus:border-soc-accent"
              >
                <option value="logistic_regression">Logistic Regression (Recommended)</option>
                <option value="decision_tree">Decision Tree</option>
                <option value="random_forest">Random Forest</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-soc-muted uppercase block">CV Folds ({config.cv_folds})</label>
              <input
                type="range"
                min={2}
                max={5}
                value={config.cv_folds}
                onChange={(e) => onChange({ ...config, cv_folds: +e.target.value })}
                className="w-20 accent-soc-accent"
              />
            </div>
          </div>
        </div>
      )}

      {config.strategy === 'voting' && (
        <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-soc-text">
              Voting Consensus Type
            </h4>
            <p className="text-xs text-soc-muted font-sans mt-0.5">
              Soft voting averages predicted threat probabilities; Hard voting sums discrete binary votes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-soc-bg p-1 rounded-xl border border-soc-border text-xs">
            <button
              onClick={() => onChange({ ...config, voting_type: 'soft' })}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                config.voting_type === 'soft' ? 'bg-soc-accent text-soc-bg' : 'text-soc-muted'
              }`}
            >
              Soft Voting (Recommended)
            </button>
            <button
              onClick={() => onChange({ ...config, voting_type: 'hard' })}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                config.voting_type === 'hard' ? 'bg-soc-accent text-soc-bg' : 'text-soc-muted'
              }`}
            >
              Hard Voting (Majority Count)
            </button>
          </div>
        </div>
      )}

      {/* Base Classifiers Selection Grid */}
      <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
              Participating Models ({activeBaseCount} Selected)
            </span>
            <h3 className="text-base font-bold text-soc-text mt-0.5">
              Configure Base Classifiers
            </h3>
            <p className="text-xs text-soc-muted font-sans mt-0.5">
              Toggle which algorithms participate in the ensemble and calibrate their consensus weights.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AVAILABLE_BASE_MODELS.map((model) => {
            const baseCfg = getBaseConfig(model.id);
            const isEnabled = baseCfg.enabled;
            const isExpanded = expandedModel === model.id;

            return (
              <div
                key={model.id}
                className={`p-4 rounded-xl border transition-all ${
                  isEnabled
                    ? 'bg-soc-bg border-soc-accent/40 shadow-sm'
                    : 'bg-soc-bg/50 border-soc-border opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-soc-text flex items-center gap-2">
                    <Cpu className={`w-3.5 h-3.5 ${isEnabled ? 'text-soc-accent' : 'text-soc-muted'}`} />
                    {model.name}
                  </span>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => updateBaseConfig(model.id, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-soc-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-soc-accent" />
                  </label>
                </div>

                <p className="text-[10px] text-soc-muted font-sans leading-relaxed">
                  {model.desc}
                </p>

                {isEnabled && (
                  <div className="pt-3 border-t border-soc-border/60 mt-3 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-soc-muted uppercase">Voting Weight: {baseCfg.weight}x</span>
                    <input
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.5}
                      value={baseCfg.weight}
                      onChange={(e) => updateBaseConfig(model.id, { weight: +e.target.value })}
                      className="w-20 accent-soc-accent"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Navigation Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="text-slate-400">
          Strategy: <strong className="text-white uppercase">{config.strategy}</strong> ({activeBaseCount} models active)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Data (01)
          </button>
          <button
            onClick={onProceed}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            Proceed to Train & Predict (03) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
