import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  Database,
  Sliders,
  PlayCircle,
  HelpCircle,
  Award,
  Shield,
} from 'lucide-react';
import {
  DatasetUploadResponse,
  ModelConfigSpec,
  StudioExperimentStatus,
  StudioExperimentResult,
} from '../../types/studio';
import { Step01Data } from './Step01Data';
import { Step02Configure } from './Step02Configure';
import { Step03TrainPredict } from './Step03TrainPredict';
import { Step04Explain } from './Step04Explain';
import { Step05Results } from './Step05Results';
import { EnsembleArchitectureCanvas } from '../../components/visual/EnsembleArchitectureCanvas';

export type StudioStep = 'data' | 'configure' | 'train' | 'explain' | 'results';

const DEFAULT_MODEL_CONFIG: ModelConfigSpec = {
  strategy: 'stacking',
  base_estimator_id: 'random_forest',
  voting_type: 'soft',
  meta_classifier_id: 'logistic_regression',
  meta_classifier_hyperparameters: { C: 1.0, max_iter: 200 },
  cv_folds: 5,
  n_estimators: 100,
  learning_rate: 0.1,
  max_depth: 12,
  base_classifiers: [
    {
      model_id: 'random_forest',
      enabled: true,
      hyperparameters: { n_estimators: 100, max_depth: 12 },
      weight: 2.0,
    },
    {
      model_id: 'extra_trees',
      enabled: true,
      hyperparameters: { n_estimators: 100, max_depth: 12 },
      weight: 1.5,
    },
    {
      model_id: 'decision_tree',
      enabled: true,
      hyperparameters: { max_depth: 10 },
      weight: 1.0,
    },
    {
      model_id: 'logistic_regression',
      enabled: true,
      hyperparameters: { C: 1.0, max_iter: 200 },
      weight: 1.0,
    },
  ],
};

export const Studio: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState<StudioStep>('data');
  const [uploadedDataset, setUploadedDataset] = useState<DatasetUploadResponse | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [modelSettings, setModelSettings] = useState<ModelConfigSpec>(DEFAULT_MODEL_CONFIG);

  const [activeStatus, setActiveStatus] = useState<StudioExperimentStatus | null>(null);
  const [experimentResult, setExperimentResult] = useState<StudioExperimentResult | null>(null);

  const stepsList: Array<{
    id: StudioStep;
    num: string;
    label: string;
    icon: React.ElementType;
    disabled: boolean;
  }> = [
    {
      id: 'data',
      num: '01',
      label: 'Data',
      icon: Database,
      disabled: false,
    },
    {
      id: 'configure',
      num: '02',
      label: 'Configure',
      icon: Sliders,
      disabled: !uploadedDataset,
    },
    {
      id: 'train',
      num: '03',
      label: 'Train & Predict',
      icon: PlayCircle,
      disabled: !uploadedDataset,
    },
    {
      id: 'explain',
      num: '04',
      label: 'Explain',
      icon: HelpCircle,
      disabled: !experimentResult,
    },
    {
      id: 'results',
      num: '05',
      label: 'Results',
      icon: Award,
      disabled: !experimentResult,
    },
  ];

  return (
    <div className="min-h-screen bg-soc-bg text-soc-text p-6 space-y-6">
      {/* Studio Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Shield className="w-3.5 h-3.5" />
                Cybersecurity Machine Learning Studio
              </span>
              {uploadedDataset && (
                <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
                  {uploadedDataset.filename} ({uploadedDataset.record_count.toLocaleString()} rows)
                </span>
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-mono font-bold text-white tracking-tight">
              Ensemble & Explainability Studio
            </h1>
            <p className="text-slate-400 text-xs">
              Configure models. Detect threats. Understand every prediction.
            </p>
          </div>

          {/* Step Indicator Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
            {stepsList.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isDone =
                (step.id === 'data' && !!uploadedDataset) ||
                (step.id === 'configure' && !!uploadedDataset) ||
                (step.id === 'train' && !!experimentResult) ||
                (step.id === 'explain' && !!experimentResult);

              return (
                <button
                  key={step.id}
                  onClick={() => !step.disabled && setCurrentStep(step.id)}
                  disabled={step.disabled}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-600 text-white'
                      : step.disabled
                      ? 'opacity-35 text-slate-600 cursor-not-allowed'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className={`text-[10px] ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {step.num}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{step.label}</span>
                  {isDone && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Studio Body Step Switcher with Motion Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
        >
          {currentStep === 'data' && (
            <Step01Data
              dataset={uploadedDataset}
              onDatasetLoaded={(ds) => setUploadedDataset(ds)}
              selectedTarget={selectedTarget}
              onTargetChange={(tgt) => setSelectedTarget(tgt)}
              selectedFeatures={selectedFeatures}
              onFeaturesChange={(fts) => setSelectedFeatures(fts)}
              onProceed={() => setCurrentStep('configure')}
            />
          )}

          {currentStep === 'configure' && (
            <div className="space-y-6">
              {/* Dynamic Live Ensemble Architecture Schematic */}
              <EnsembleArchitectureCanvas
                config={modelSettings}
                datasetName={uploadedDataset?.filename ?? 'Dataset unavailable'}
                recordCount={uploadedDataset?.record_count ?? 0}
                featureCount={selectedFeatures.length}
              />

              <Step02Configure
                config={modelSettings}
                onChange={(cfg: ModelConfigSpec) => setModelSettings(cfg)}
                isLabeled={!!selectedTarget}
                onProceed={() => setCurrentStep('train')}
                onBack={() => setCurrentStep('data')}
              />
            </div>
          )}

          {currentStep === 'train' && uploadedDataset && (
            <div className="space-y-6">
              {/* Dynamic Live Ensemble Architecture Schematic during Training */}
              <EnsembleArchitectureCanvas
                config={modelSettings}
                datasetName={uploadedDataset.filename}
                recordCount={uploadedDataset.record_count}
                featureCount={selectedFeatures.length}
                isTraining={activeStatus?.status === 'running'}
                verdictClass={experimentResult?.predictions_preview?.[0]?.prediction}
                verdictConfidence={experimentResult?.predictions_preview?.[0]?.confidence}
              />

              <Step03TrainPredict
                dataset={uploadedDataset}
                selectedTarget={selectedTarget}
                selectedFeatures={selectedFeatures}
                modelSettings={modelSettings}
                activeStatus={activeStatus}
                onStatusChange={(st) => setActiveStatus(st)}
                results={experimentResult}
                onResultsLoaded={(res) => setExperimentResult(res)}
                onNavigateToExplain={() => setCurrentStep('explain')}
                onNavigateToResults={() => setCurrentStep('results')}
                onBack={() => setCurrentStep('configure')}
              />
            </div>
          )}

          {currentStep === 'explain' && (
            <Step04Explain
              experimentResult={experimentResult}
              onNavigateToResults={() => setCurrentStep('results')}
            />
          )}

          {currentStep === 'results' && (
            <Step05Results
              experimentResult={experimentResult}
              onSelectFlowForExplain={(_recordIndex) => setCurrentStep('explain')}
              onRerun={() => setCurrentStep('configure')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
