import React from 'react';
import { GitMerge, Layers, Cpu, Zap, ShieldAlert } from 'lucide-react';
import { EnsembleConfig } from '../../types/lab';
import { TheoryDrawer } from './TheoryDrawer';

interface EnsembleStrategyStageProps {
  config: EnsembleConfig;
  onChange: (cfg: EnsembleConfig) => void;
}

export const EnsembleStrategyStage: React.FC<EnsembleStrategyStageProps> = ({ config, onChange }) => {
  const strategies = [
    {
      id: 'voting',
      name: 'Voting Classifier',
      subtitle: 'Democratic Consensus',
      desc: 'Aggregates predictions from all enabled base learners. Hard voting uses majority count; Soft voting averages predicted threat probabilities.',
      tag: 'Multi-Model',
    },
    {
      id: 'stacking',
      name: 'Stacking Classifier',
      subtitle: 'Meta-Learning Architecture',
      desc: 'Uses out-of-fold cross-validated predictions from base models as inputs to train a higher-level meta-classifier that decides the final verdict.',
      tag: 'Hierarchical',
    },
    {
      id: 'bagging',
      name: 'Bootstrap Aggregating',
      subtitle: 'Variance Minimizer',
      desc: 'Trains multiple homogeneous estimators on random bootstrap subsets of flows with replacement, smoothing out variance and outlier noise.',
      tag: 'Parallel',
    },
    {
      id: 'boosting',
      name: 'Sequential Boosting',
      subtitle: 'Iterative Error Correction',
      desc: 'Sequentially trains weak estimators where each successive stage increases weight on malicious flows misclassified by prior stages.',
      tag: 'Sequential',
    },
    {
      id: 'random_forest',
      name: 'Random Forest (Tree Subspace)',
      subtitle: 'Industry Benchmark',
      desc: 'Ensemble of decorrelated decision trees using both bootstrap sampling and random feature sub-selection at each split node.',
      tag: 'Tree Bagging',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Educational Guide Drawer */}
      <TheoryDrawer
        title="Ensemble Learning Paradigms: Bagging vs Boosting vs Stacking"
        cyberContext="Different network threats demand different algorithmic combinations. Volumetric attacks (DDoS, Brute Force) generate millions of predictable packets best handled by parallel Bagging consensus. Conversely, Advanced Persistent Threats (APTs) and stealthy infiltration flows produce subtle footprints easily swamped by benign noise—these are prime targets for sequential Boosting (which forces weak learners to isolate hard-to-classify samples) or Stacking (which lets a meta-learner weigh specialized models according to the attack signature)."
        mlConcept="Bagging (Variance Reduction): multiple independent estimators trained in parallel on bootstrap samples. Prediction variance decays as 1/M without altering model bias. Boosting (Bias Reduction): sequential additive models where each learner fits the pseudo-residuals of preceding models. Stacking (Meta-Learning): learns an optimal linear or non-linear combination of base model decision spaces via cross-validated out-of-fold predictions to prevent in-sample overfitting."
        keyTakeaway="Use Soft Voting or Stacking when combining diverse model architectures (Trees + Linear + Bayesian); use Random Forest or Gradient Boosting when training high-efficiency homogeneous tree ensembles."
        defaultOpen={false}
      />

      {/* Strategy Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strat) => (
          <button
            key={strat.id}
            type="button"
            onClick={() => onChange({ ...config, strategy: strat.id as any })}
            className={`p-5 rounded-xl border text-left transition-all shadow-card flex flex-col justify-between ${
              config.strategy === strat.id
                ? 'bg-soc-card border-soc-accent text-soc-text shadow-glowAccent/20'
                : 'bg-soc-card/70 border-soc-border text-soc-muted hover:border-soc-borderLight hover:text-soc-text'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-soc-secondary text-soc-accent uppercase font-bold">
                  {strat.tag}
                </span>
                {config.strategy === strat.id && (
                  <span className="w-2 h-2 rounded-full bg-soc-accent animate-pulse" />
                )}
              </div>
              <h4 className="text-base font-bold font-mono text-soc-text mt-2">{strat.name}</h4>
              <span className="text-xs text-soc-accent font-mono block mb-1">{strat.subtitle}</span>
              <p className="text-xs text-soc-muted leading-relaxed font-sans">{strat.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Strategy-Specific Configuration Panel */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-5">
        <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-soc-accent" />
          Strategy Tuning: {config.strategy.toUpperCase()}
        </h3>

        {/* Voting Options */}
        {config.strategy === 'voting' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-soc-muted block">Voting Consensus Mechanism</label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => onChange({ ...config, voting_type: 'soft' })}
                  className={`p-3 rounded-lg border font-mono text-xs text-left transition-colors ${
                    config.voting_type === 'soft'
                      ? 'bg-soc-accent/15 border-soc-accent text-soc-accent font-bold'
                      : 'bg-soc-bg border-soc-border text-soc-muted'
                  }`}
                >
                  <span className="block font-bold">Soft Voting (Probability)</span>
                  <span className="text-[10px] text-soc-muted mt-0.5 block">Weights probability outputs across models</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ ...config, voting_type: 'hard' })}
                  className={`p-3 rounded-lg border font-mono text-xs text-left transition-colors ${
                    config.voting_type === 'hard'
                      ? 'bg-soc-accent/15 border-soc-accent text-soc-accent font-bold'
                      : 'bg-soc-bg border-soc-border text-soc-muted'
                  }`}
                >
                  <span className="block font-bold">Hard Voting (Majority)</span>
                  <span className="text-[10px] text-soc-muted mt-0.5 block">Counts discrete predicted class labels</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stacking Options */}
        {config.strategy === 'stacking' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="space-y-1.5">
              <label className="text-soc-muted block">Meta-Learner Classifier</label>
              <select
                value={config.meta_classifier_id}
                onChange={(e) => onChange({ ...config, meta_classifier_id: e.target.value })}
                className="w-full bg-soc-bg border border-soc-border text-soc-text rounded-lg px-3 py-2 focus:outline-none focus:border-soc-accent"
              >
                <option value="logistic_regression">Logistic Regression (Linear combiner)</option>
                <option value="decision_tree">Decision Tree (Non-linear meta-rules)</option>
                <option value="random_forest">Random Forest (Meta-tree ensemble)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-soc-muted">Out-of-Fold CV Folds</span>
                <span className="text-soc-accent font-bold">{config.cv_folds} Folds</span>
              </div>
              <input
                type="range"
                min={2}
                max={5}
                value={config.cv_folds}
                onChange={(e) => onChange({ ...config, cv_folds: Number(e.target.value) })}
                className="w-full accent-soc-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-soc-muted block">Passthrough Original Features</label>
              <button
                type="button"
                onClick={() => onChange({ ...config, passthrough: !config.passthrough })}
                className={`w-full py-2 rounded-lg border font-bold transition-colors ${
                  config.passthrough
                    ? 'bg-soc-low/15 border-soc-low text-soc-low'
                    : 'bg-soc-bg border-soc-border text-soc-muted'
                }`}
              >
                {config.passthrough ? 'Passthrough: Enabled' : 'Passthrough: Disabled'}
              </button>
            </div>
          </div>
        )}

        {/* Bagging Options */}
        {config.strategy === 'bagging' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-soc-muted">Number of Estimators</span>
                <span className="text-soc-accent font-bold">{config.n_estimators}</span>
              </div>
              <input
                type="range"
                min={10}
                max={150}
                step={10}
                value={config.n_estimators}
                onChange={(e) => onChange({ ...config, n_estimators: Number(e.target.value) })}
                className="w-full accent-soc-accent"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-soc-muted">Bootstrap Sample Ratio</span>
                <span className="text-soc-accent font-bold">{(config.max_samples * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.0}
                step={0.1}
                value={config.max_samples}
                onChange={(e) => onChange({ ...config, max_samples: Number(e.target.value) })}
                className="w-full accent-soc-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-soc-muted block">Base Learner Algorithm</label>
              <select
                value={config.base_estimator_id}
                onChange={(e) => onChange({ ...config, base_estimator_id: e.target.value })}
                className="w-full bg-soc-bg border border-soc-border text-soc-text rounded-lg px-3 py-2"
              >
                <option value="decision_tree">Decision Tree Stumps</option>
                <option value="knn">K-Nearest Neighbors</option>
              </select>
            </div>
          </div>
        )}

        {/* Boosting Options */}
        {config.strategy === 'boosting' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="space-y-1.5">
              <label className="text-soc-muted block">Boosting Algorithm</label>
              <select
                value={config.base_estimator_id}
                onChange={(e) => onChange({ ...config, base_estimator_id: e.target.value })}
                className="w-full bg-soc-bg border border-soc-border text-soc-text rounded-lg px-3 py-2"
              >
                <option value="adaboost">AdaBoost (Adaptive Reweighting)</option>
                <option value="gradient_boosting">Gradient Boosting (Residual Minimization)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-soc-muted">Boosting Iterations (Estimators)</span>
                <span className="text-soc-accent font-bold">{config.n_estimators}</span>
              </div>
              <input
                type="range"
                min={10}
                max={150}
                step={10}
                value={config.n_estimators}
                onChange={(e) => onChange({ ...config, n_estimators: Number(e.target.value) })}
                className="w-full accent-soc-accent"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-soc-muted">Learning Rate (Shrinkage)</span>
                <span className="text-soc-accent font-bold">{config.learning_rate}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.5}
                step={0.02}
                value={config.learning_rate}
                onChange={(e) => onChange({ ...config, learning_rate: Number(e.target.value) })}
                className="w-full accent-soc-accent"
              />
            </div>
          </div>
        )}

        {/* Random Forest Options */}
        {config.strategy === 'random_forest' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-soc-muted">Number of Trees in Forest</span>
                <span className="text-soc-accent font-bold">{config.n_estimators} Trees</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={10}
                value={config.n_estimators}
                onChange={(e) => onChange({ ...config, n_estimators: Number(e.target.value) })}
                className="w-full accent-soc-accent"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-soc-muted">Bootstrap Sample Sub-sampling</span>
                <span className="text-soc-accent font-bold">{(config.max_samples * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.0}
                step={0.05}
                value={config.max_samples}
                onChange={(e) => onChange({ ...config, max_samples: Number(e.target.value) })}
                className="w-full accent-soc-accent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
