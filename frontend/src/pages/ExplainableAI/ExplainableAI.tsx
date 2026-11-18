import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Search,
  Upload,
  Layers,
  Sparkles,
  Compass,
  GitFork,
  BookOpen,
  GitBranch,
  FileText,
  Activity,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  SampleFlowItem,
  PredictionExplanationResponse,
} from '../../types/explainability';

import { PredictionExplainer } from './PredictionExplainer';
import { ShapAnalysisView } from './ShapAnalysisView';
import { LimeExplainerView } from './LimeExplainerView';
import { CounterfactualView } from './CounterfactualView';
import { EnsembleExplainView } from './EnsembleExplainView';
import { FeatureIntelligenceView } from './FeatureIntelligenceView';
import { ModelInterpretabilityView } from './ModelInterpretabilityView';
import { ExplainabilityReportView } from './ExplainabilityReportView';

type XaiSubTab =
  | 'prediction'
  | 'shap'
  | 'lime'
  | 'counterfactual'
  | 'ensemble'
  | 'features'
  | 'interpretability'
  | 'report';

export const ExplainableAI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<XaiSubTab>('prediction');
  const [sampleFlows, setSampleFlows] = useState<SampleFlowItem[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [activeFlowFeatures, setActiveFlowFeatures] = useState<Record<string, any> | null>(null);

  const [explanation, setExplanation] = useState<PredictionExplanationResponse | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [targetedFeatureDeepDive, setTargetedFeatureDeepDive] = useState<string | undefined>(undefined);

  // Load sample flows on mount
  useEffect(() => {
    const init = async () => {
      try {
        const samples = await api.getSampleFlows();
        setSampleFlows(samples);
        if (samples.length > 0) {
          // Default to attack sample for dramatic demonstration
          const attackSample = samples.find((s) => s.ground_truth === 'Attack') || samples[0];
          setSelectedFlowId(attackSample.id);
          setActiveFlowFeatures(attackSample.features);
          triggerExplain(attackSample.features, attackSample.id);
        }
      } catch (err) {
        console.error('Failed to load sample flows', err);
      }
    };
    init();
  }, []);

  const triggerExplain = async (features: Record<string, any>, flowId?: string) => {
    setIsLoadingExplanation(true);
    try {
      const res = await api.explainPrediction({
        flow_id: flowId || selectedFlowId,
        flow_features: features,
        num_features: 8,
      });
      setExplanation(res);
    } catch (err) {
      console.error('Failed to explain flow', err);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleSelectFlow = (flowId: string) => {
    setSelectedFlowId(flowId);
    const found = sampleFlows.find((s) => s.id === flowId);
    if (found) {
      setActiveFlowFeatures(found.features);
      triggerExplain(found.features, found.id);
    }
  };

  const handleNavigateToFeatureIntelligence = (featureName: string) => {
    setTargetedFeatureDeepDive(featureName);
    setActiveTab('features');
  };

  const subNavItems = [
    { id: 'prediction' as XaiSubTab, label: 'Prediction Explainer', icon: BrainCircuit },
    { id: 'shap' as XaiSubTab, label: 'SHAP Studio', icon: Sparkles },
    { id: 'lime' as XaiSubTab, label: 'LIME Local Explainer', icon: Compass },
    { id: 'counterfactual' as XaiSubTab, label: 'Counterfactual Recourse', icon: GitFork },
    { id: 'ensemble' as XaiSubTab, label: 'Ensemble Dissection', icon: Layers },
    { id: 'features' as XaiSubTab, label: 'Feature Intelligence', icon: BookOpen },
    { id: 'interpretability' as XaiSubTab, label: 'Model Interpretability', icon: GitBranch },
    { id: 'report' as XaiSubTab, label: 'Audit Report Dossier', icon: FileText },
  ];

  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* Workspace Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-soc-card via-soc-card/90 to-soc-bg border border-soc-border shadow-card relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-soc-accent/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-soc-accent/20 text-soc-accent border border-soc-accent/40 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-soc-accent animate-pulse" />
                Explainable AI (XAI) Suite
              </span>
              <span className="text-[10px] text-soc-muted">
                Transparent & Interpretable Cyber Threat Intelligence
              </span>
            </div>

            <h1 className="text-2xl font-bold text-soc-text flex items-center gap-3">
              <BrainCircuit className="w-7 h-7 text-soc-accent" />
              Explainable AI — Cyber Threat Intelligence
            </h1>

            <p className="text-xs text-soc-muted mt-1 max-w-3xl leading-relaxed font-sans">
              Transform black-box network intrusion classifications into transparent, auditable security forensics.
              Inspect game-theoretic Shapley attributions, local LIME decision rules, constrained counterfactual paths,
              and multi-model ensemble consensus to understand exactly <strong>why</strong> a network flow was flagged.
            </p>
          </div>

          {/* Flow Selection Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-soc-bg/80 p-3 rounded-xl border border-soc-border shrink-0">
            <span className="text-[10px] text-soc-muted uppercase tracking-wider font-bold">
              Select Network Flow:
            </span>
            <select
              value={selectedFlowId}
              onChange={(e) => handleSelectFlow(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-soc-card border border-soc-border text-xs text-soc-text focus:outline-none focus:border-soc-accent"
            >
              {sampleFlows.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.name} ({flow.ground_truth})
                </option>
              ))}
            </select>

            <button
              onClick={() => activeFlowFeatures && triggerExplain(activeFlowFeatures, selectedFlowId)}
              disabled={isLoadingExplanation}
              className="px-3 py-1.5 rounded-lg bg-soc-accent text-soc-bg font-bold text-xs flex items-center gap-1.5 hover:bg-soc-accent/90 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExplanation ? 'animate-spin' : ''}`} />
              Explain Flow
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="rounded-xl border border-soc-border bg-soc-card/70 p-1.5 overflow-x-auto shadow-card">
        <div className="flex items-center min-w-max gap-1">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-soc-accent text-soc-bg font-bold shadow-md'
                    : 'text-soc-muted hover:text-soc-text hover:bg-soc-border/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Workspace */}
      <div className="min-h-[550px]">
        {activeTab === 'prediction' && (
          <PredictionExplainer
            explanation={explanation}
            isLoading={isLoadingExplanation}
            onSelectFeatureForDeepDive={handleNavigateToFeatureIntelligence}
          />
        )}

        {activeTab === 'shap' && (
          <ShapAnalysisView localExplanation={explanation} />
        )}

        {activeTab === 'lime' && (
          <LimeExplainerView flowFeatures={activeFlowFeatures} />
        )}

        {activeTab === 'counterfactual' && (
          <CounterfactualView flowFeatures={activeFlowFeatures} />
        )}

        {activeTab === 'ensemble' && (
          <EnsembleExplainView flowFeatures={activeFlowFeatures} />
        )}

        {activeTab === 'features' && (
          <FeatureIntelligenceView initialSelectedFeature={targetedFeatureDeepDive} />
        )}

        {activeTab === 'interpretability' && (
          <ModelInterpretabilityView />
        )}

        {activeTab === 'report' && (
          <ExplainabilityReportView explanation={explanation} />
        )}
      </div>
    </div>
  );
};
