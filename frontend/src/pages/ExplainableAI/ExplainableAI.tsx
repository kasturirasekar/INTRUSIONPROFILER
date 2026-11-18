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
  Code,
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
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

  // Custom Flow / JSON state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customJsonInput, setCustomJsonInput] = useState('');
  const [customJsonError, setCustomJsonError] = useState<string | null>(null);

  const handleOpenCustomInput = () => {
    if (activeFlowFeatures) {
      setCustomJsonInput(JSON.stringify(activeFlowFeatures, null, 2));
    }
    setCustomJsonError(null);
    setIsCustomModalOpen(true);
  };

  const handleApplyCustomFlow = () => {
    try {
      const parsed = JSON.parse(customJsonInput);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setCustomJsonError('JSON must be a valid key-value object of network features.');
        return;
      }
      setActiveFlowFeatures(parsed);
      setSelectedFlowId('CUSTOM-FLOW-001');
      setIsCustomModalOpen(false);
      triggerExplain(parsed, 'CUSTOM-FLOW-001');
      setActiveTab('prediction');
    } catch (e: any) {
      setCustomJsonError(`JSON Syntax Error: ${e.message}`);
    }
  };

  const handleLoadPreset = (type: 'attack' | 'benign') => {
    const found = sampleFlows.find((s) => (type === 'attack' ? s.ground_truth === 'Attack' : s.ground_truth === 'Benign'));
    if (found) {
      setCustomJsonInput(JSON.stringify(found.features, null, 2));
      setCustomJsonError(null);
    }
  };

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

            <button
              onClick={handleOpenCustomInput}
              className="px-3 py-1.5 rounded-lg bg-soc-card border border-soc-border text-xs text-cyan-400 hover:border-cyan-400 hover:bg-cyan-950/20 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Code className="w-3.5 h-3.5" />
              Custom Flow / JSON
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

      {/* Custom Flow / JSON Input Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Input Custom Network Flow for Prediction & XAI</h3>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <p className="text-slate-400 text-xs">
                Provide custom network traffic feature values in JSON format to obtain real-time predictions and full explainability from the trained Stacking Ensemble.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadPreset('benign')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 rounded text-[11px]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Load Benign Sample
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('attack')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 hover:border-red-500/50 text-slate-300 hover:text-red-300 rounded text-[11px]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  Load Attack Sample
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const p = JSON.parse(customJsonInput);
                      setCustomJsonInput(JSON.stringify(p, null, 2));
                      setCustomJsonError(null);
                    } catch (e: any) {
                      setCustomJsonError(`Invalid JSON: ${e.message}`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 rounded text-[11px] ml-auto"
                >
                  <Code className="w-3.5 h-3.5" />
                  Format JSON
                </button>
              </div>

              {customJsonError && (
                <div className="bg-red-950/60 border border-red-500/50 rounded-lg p-3 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{customJsonError}</span>
                </div>
              )}

              <textarea
                rows={16}
                value={customJsonInput}
                onChange={(e) => setCustomJsonInput(e.target.value)}
                className="w-full bg-slate-950 font-mono text-xs text-cyan-300 border border-slate-800 rounded-lg p-4 focus:outline-none focus:border-cyan-500 leading-relaxed"
                placeholder='{ "Destination Port": 80, "Flow Duration": 12000, ... }'
                spellCheck={false}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomFlow}
                className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Predict & Explain Flow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
