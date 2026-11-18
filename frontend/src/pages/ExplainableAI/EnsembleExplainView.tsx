import React, { useState, useEffect } from 'react';
import {
  Layers,
  GitMerge,
  Cpu,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Activity,
  Award,
} from 'lucide-react';
import { api } from '../../services/api';
import { EnsembleExplainResponse } from '../../types/explainability';

interface EnsembleExplainViewProps {
  flowFeatures: Record<string, any> | null;
}

export const EnsembleExplainView: React.FC<EnsembleExplainViewProps> = ({ flowFeatures }) => {
  const [ensembleData, setEnsembleData] = useState<EnsembleExplainResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEnsemble = async () => {
      if (!flowFeatures) return;
      setIsLoading(true);
      try {
        const res = await api.getEnsembleExplanation({ flow_features: flowFeatures });
        setEnsembleData(res);
      } catch (err) {
        console.error('Failed to explain ensemble', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEnsemble();
  }, [flowFeatures]);

  if (!flowFeatures) {
    return (
      <div className="p-12 text-center text-soc-muted font-mono rounded-xl border border-dashed border-soc-border bg-soc-card/30">
        Select a flow in the Prediction Explainer tab to dissect multi-model ensemble consensus.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono animate-fade-in">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card">
        <span className="text-[10px] text-soc-accent uppercase font-bold tracking-wider">
          Ensemble Consensus & Disagreement Architecture
        </span>
        <h2 className="text-xl font-bold text-soc-text flex items-center gap-2 mt-1">
          <Layers className="w-5 h-5 text-soc-accent" />
          Ensemble Decision Dissection
        </h2>
        <p className="text-xs text-soc-muted mt-1 max-w-2xl">
          Dissects how individual base classifiers (Logistic Regression, Decision Tree, Random Forest) voted on this exact flow,
          and reveals how the Stacking meta-learner resolved disagreements into a single hardened verdict.
        </p>
      </div>

      {isLoading && (
        <div className="p-16 text-center text-soc-accent animate-pulse space-y-2">
          <Activity className="w-7 h-7 animate-spin mx-auto text-soc-accent" />
          <p className="text-sm font-bold">Querying Base Classifiers & Meta-Learner Weights...</p>
        </div>
      )}

      {ensembleData && !isLoading && (
        <div className="space-y-6">
          {/* Visual Architecture Flow: Base Models -> Meta Layer -> Final Verdict */}
          <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-soc-text flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-soc-accent" />
              Hierarchical Decision Aggregation Flow
            </h3>

            {/* Base Learner Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ensembleData.base_learners.map((learner) => {
                const isAttack = learner.predicted_class === 'Attack';
                return (
                  <div
                    key={learner.name}
                    className="p-4 rounded-xl bg-soc-bg border border-soc-border space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-soc-text font-mono">
                        {learner.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isAttack ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}
                      >
                        {learner.predicted_class}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-soc-muted">{learner.algorithm}</div>
                      <div className="text-lg font-bold text-soc-text font-mono">
                        {(learner.probability_attack * 100).toFixed(1)}% <span className="text-[10px] text-soc-muted">Attack Prob</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-soc-border overflow-hidden">
                        <div
                          className={`h-full ${isAttack ? 'bg-orange-500' : 'bg-cyan-500'}`}
                          style={{ width: `${learner.probability_attack * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-soc-border flex items-center justify-between text-[10px]">
                      <span className="text-soc-muted">Meta-Weight:</span>
                      <span className="text-soc-accent font-bold font-mono">
                        {learner.meta_weight > 0 ? `+${learner.meta_weight}` : learner.meta_weight}
                      </span>
                    </div>

                    <p className="text-[10px] text-soc-muted/80 font-sans">
                      {learner.role_description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Aggregation & Meta-Learner Layer */}
            <div className="p-4 rounded-xl bg-soc-accent/5 border border-soc-accent/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-soc-accent/20 text-soc-accent">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-soc-muted uppercase block">Meta-Learning Layer</span>
                  <h4 className="text-sm font-bold text-soc-text font-mono">
                    {ensembleData.meta_learner_name}
                  </h4>
                  <p className="text-xs text-soc-muted font-sans mt-0.5">
                    Evaluates out-of-fold probability vectors to output the hardened final prediction.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-soc-card border border-soc-border text-center">
                  <span className="text-[10px] text-soc-muted uppercase block">Final Verdict</span>
                  <span
                    className={`text-base font-bold ${
                      ensembleData.final_verdict === 'Attack' ? 'text-orange-400' : 'text-cyan-400'
                    }`}
                  >
                    {ensembleData.final_verdict}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-soc-card border border-soc-border text-center">
                  <span className="text-[10px] text-soc-muted uppercase block">Ensemble Confidence</span>
                  <span className="text-base font-bold text-soc-accent">
                    {(ensembleData.final_attack_prob * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conflict Resolution & Disagreement Narrative */}
          <div className="p-5 rounded-2xl bg-soc-card border border-soc-border shadow-card space-y-3 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-soc-accent font-mono">
              Consensus & Disagreement Analysis
            </h3>
            <p className="text-xs text-soc-text leading-relaxed">
              {ensembleData.resolution_narrative}
            </p>
            <p className="text-xs text-soc-muted leading-relaxed pt-2 border-t border-soc-border">
              {ensembleData.disagreement_analysis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
