import React from 'react';
import { Network, Layers, GitMerge, Cpu, ArrowDown, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { EnsembleConfig, PreprocessingConfig, BaseClassifierConfig, ModelCatalogItem } from '../../types/lab';

interface VisualEnsembleBuilderProps {
  ensembleConfig: EnsembleConfig;
  preprocessingConfig: PreprocessingConfig;
  availableModels: ModelCatalogItem[];
  featureCount?: number;
}

export const VisualEnsembleBuilder: React.FC<VisualEnsembleBuilderProps> = ({
  ensembleConfig,
  preprocessingConfig,
  availableModels,
  featureCount = 78,
}) => {
  // Find active base models
  const activeBaseConfigs = ensembleConfig.base_classifiers.filter((c) => c.enabled);
  const activeCatalogModels = activeBaseConfigs.map((cfg) => {
    const found = availableModels.find((m) => m.id === cfg.model_id);
    return {
      cfg,
      info: found || {
        id: cfg.model_id,
        name: cfg.model_id.toUpperCase(),
        category: 'Classifier',
        role_in_intrusion_detection: 'Flow profiler',
      },
    };
  });

  const getAggregationTitle = () => {
    if (ensembleConfig.strategy === 'voting') {
      return `Voting Layer (${ensembleConfig.voting_type.toUpperCase()} Voting)`;
    } else if (ensembleConfig.strategy === 'stacking') {
      return `Stacking Meta-Learner (${ensembleConfig.meta_classifier_id.replace('_', ' ').toUpperCase()})`;
    } else if (ensembleConfig.strategy === 'bagging') {
      return `Bagging Aggregator (${ensembleConfig.n_estimators} Estimators)`;
    } else if (ensembleConfig.strategy === 'boosting') {
      return `Boosting Sequential Combiner (LR: ${ensembleConfig.learning_rate})`;
    } else {
      return `Random Forest Ensemble (${ensembleConfig.n_estimators} Trees)`;
    }
  };

  const getAggregationSubtitle = () => {
    if (ensembleConfig.strategy === 'voting') {
      return ensembleConfig.voting_type === 'soft'
        ? 'Averages posterior probability vectors across models'
        : 'Selects the class label receiving majority consensus';
    } else if (ensembleConfig.strategy === 'stacking') {
      return `Trains ${ensembleConfig.meta_classifier_id} on ${ensembleConfig.cv_folds}-fold out-of-fold base predictions`;
    } else if (ensembleConfig.strategy === 'bagging') {
      return `Bootstrap sampling with ${ensembleConfig.max_samples * 100}% sample ratio`;
    } else {
      return 'Sequentially minimizes residual intrusion classification error';
    }
  };

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-soc-accent" />
            Visual Architecture Canvas
          </h3>
          <p className="text-xs text-soc-muted mt-0.5">
            Dynamic pipeline schematic showing how input flows traverse preprocessing, parallel learners, and ensemble aggregation
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-soc-accent/10 text-soc-accent border border-soc-accent/30 font-bold uppercase">
          Strategy: {ensembleConfig.strategy}
        </span>
      </div>

      {/* Schematic Diagram Flow */}
      <div className="flex flex-col items-center space-y-3 font-mono">
        {/* Node 1: Input Data */}
        <div className="w-full max-w-md p-3.5 rounded-xl bg-soc-bg border border-soc-border flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-soc-secondary text-soc-muted">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-soc-text block">1. Network Flows Input</span>
              <span className="text-[11px] text-soc-muted">CIC-IDS-2017 Feature Matrix</span>
            </div>
          </div>
          <span className="text-xs text-soc-accent font-bold">{featureCount} Features</span>
        </div>

        <ArrowDown className="w-4 h-4 text-soc-muted" />

        {/* Node 2: Preprocessing Pipeline */}
        <div className="w-full max-w-md p-3.5 rounded-xl bg-soc-secondary/50 border border-soc-border flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-soc-secondary text-soc-accent">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-soc-text block">2. Preprocessing Pipeline</span>
              <span className="text-[11px] text-soc-muted">
                {preprocessingConfig.missing_value_strategy} Imputer • {preprocessingConfig.scaling_strategy} Scaler • {preprocessingConfig.imbalance_strategy}
              </span>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-soc-card text-soc-low border border-soc-border">
            Fitted on Train
          </span>
        </div>

        <ArrowDown className="w-4 h-4 text-soc-muted" />

        {/* Node 3: Base Learners Parallel Layer */}
        <div className="w-full space-y-2">
          <div className="text-center text-[11px] text-soc-muted uppercase tracking-wider font-bold">
            3. Parallel Base Classifiers Layer ({activeCatalogModels.length} Active)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeCatalogModels.length === 0 ? (
              <div className="col-span-full p-4 rounded-xl border border-dashed border-soc-critical text-center text-xs text-soc-critical">
                No base classifiers selected! Enable at least one model in Base Classifier Configuration.
              </div>
            ) : (
              activeCatalogModels.map(({ cfg, info }) => (
                <div
                  key={cfg.model_id}
                  className="p-3 rounded-xl bg-soc-bg border border-soc-border hover:border-soc-accent/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-soc-text truncate" title={info.name}>
                      {info.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-soc-secondary text-soc-muted">
                      w={cfg.weight}
                    </span>
                  </div>
                  <p className="text-[11px] text-soc-muted line-clamp-2 leading-tight">
                    {info.role_in_intrusion_detection}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-soc-muted" />

        {/* Node 4: Ensemble Aggregation Layer */}
        <div className="w-full max-w-lg p-4 rounded-xl bg-soc-card border border-soc-accent/40 shadow-glowAccent/10 space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-soc-accent uppercase">
            <Cpu className="w-4 h-4" />
            <span>4. {getAggregationTitle()}</span>
          </div>
          <p className="text-xs text-soc-muted">{getAggregationSubtitle()}</p>
        </div>

        <ArrowDown className="w-4 h-4 text-soc-muted" />

        {/* Node 5: Output Verdict */}
        <div className="w-full max-w-md p-3.5 rounded-xl bg-soc-bg border border-soc-border flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-soc-critical/10 text-soc-critical">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-soc-text block">5. Final Intrusion Classification</span>
              <span className="text-[11px] text-soc-muted">Confidence Score & Severity Profiling</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-soc-accent/10 text-soc-accent border border-soc-accent/30 font-bold">
              BENIGN
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-soc-critical/10 text-soc-critical border border-soc-critical/30 font-bold">
              ATTACK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
