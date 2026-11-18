import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Activity, ArrowRight } from 'lucide-react';
import { DatasetSelectionConfig, PreprocessingConfig, EnsembleConfig, ExperimentStatus, ExperimentResults } from '../../types/lab';
import { api } from '../../services/api';

interface ExecutionStageProps {
  datasetConfig: DatasetSelectionConfig;
  preprocessingConfig: PreprocessingConfig;
  ensembleConfig: EnsembleConfig;
  activeExperiment: ExperimentStatus | null;
  onExperimentStarted: (exp: ExperimentStatus) => void;
  onExperimentCompleted: (results: ExperimentResults, expId: string) => void;
  onNavigateToEvaluation: () => void;
}

export const ExecutionStage: React.FC<ExecutionStageProps> = ({
  datasetConfig,
  preprocessingConfig,
  ensembleConfig,
  activeExperiment,
  onExperimentStarted,
  onExperimentCompleted,
  onNavigateToEvaluation,
}) => {
  const [experimentName, setExperimentName] = useState(
    `${ensembleConfig.strategy.toUpperCase()} Experiment (${datasetConfig.task_type})`
  );
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poll status while running
  useEffect(() => {
    let interval: number | null = null;
    if (activeExperiment && activeExperiment.status === 'running') {
      interval = window.setInterval(async () => {
        try {
          const status = await api.getExperimentStatus(activeExperiment.id);
          onExperimentStarted(status);

          if (status.status === 'completed') {
            const results = await api.getExperimentResults(activeExperiment.id);
            onExperimentCompleted(results, activeExperiment.id);
          } else if (status.status === 'failed') {
            setErrorMsg(status.error_message || 'Experiment execution failed.');
          }
        } catch (err) {
          console.error('Error polling experiment status', err);
        }
      }, 750);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeExperiment]);

  const handleRun = async () => {
    setIsLaunching(true);
    setErrorMsg(null);
    try {
      const status = await api.createExperiment({
        name: experimentName.trim() || 'Custom Ensemble Experiment',
        dataset_config: datasetConfig,
        preprocessing_config: preprocessingConfig,
        ensemble_config: ensembleConfig,
      });
      onExperimentStarted(status);
    } catch (err: any) {
      console.error('Failed to launch experiment', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to start experiment.');
    } finally {
      setIsLaunching(false);
    }
  };

  const isRunning = activeExperiment?.status === 'running';
  const isCompleted = activeExperiment?.status === 'completed';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Experiment Launch Header */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-5">
        <div>
          <h3 className="text-base font-bold tracking-tight text-soc-text uppercase font-mono flex items-center gap-2">
            <Cpu className="w-5 h-5 text-soc-accent" />
            Execute Ensemble Training & Validation Run
          </h3>
          <p className="text-xs text-soc-muted mt-1">
            Transmits complete pipeline parameters to the backend engine to train models and evaluate on held-out test flows.
          </p>
        </div>

        {/* Experiment Name Input */}
        <div className="space-y-1.5 font-mono">
          <label className="text-xs text-soc-muted block">Experiment Tag / Label</label>
          <input
            type="text"
            value={experimentName}
            disabled={isRunning}
            onChange={(e) => setExperimentName(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-soc-bg border border-soc-border rounded-lg text-soc-text focus:outline-none focus:border-soc-accent"
          />
        </div>

        {/* Configuration Review Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-soc-secondary/40 border border-soc-border font-mono text-xs">
          <div>
            <span className="text-soc-muted text-[10px] uppercase block">Partition</span>
            <span className="text-soc-text font-bold mt-0.5 block">
              {datasetConfig.train_rows.toLocaleString()} train / {datasetConfig.test_rows.toLocaleString()} test
            </span>
          </div>

          <div>
            <span className="text-soc-muted text-[10px] uppercase block">Preprocessing</span>
            <span className="text-soc-accent font-bold mt-0.5 block">
              {preprocessingConfig.scaling_strategy} • {preprocessingConfig.imbalance_strategy}
            </span>
          </div>

          <div>
            <span className="text-soc-muted text-[10px] uppercase block">Ensemble</span>
            <span className="text-soc-low font-bold mt-0.5 block uppercase">
              {ensembleConfig.strategy}
            </span>
          </div>

          <div>
            <span className="text-soc-muted text-[10px] uppercase block">Base Models</span>
            <span className="text-soc-text font-bold mt-0.5 block">
              {ensembleConfig.base_classifiers.filter((c) => c.enabled).length} Enabled
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-soc-critical/15 border border-soc-critical/40 text-xs font-mono text-soc-critical flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Trigger Button */}
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning || isLaunching}
          className={`w-full py-3.5 rounded-xl text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-card ${
            isRunning
              ? 'bg-soc-secondary text-soc-muted border border-soc-border cursor-not-allowed'
              : 'bg-soc-accent text-soc-bg hover:bg-soc-accentHover shadow-glowAccent'
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-soc-accent" />
              Executing Experiment ({activeExperiment?.progress}%)...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Start Experiment Run
            </>
          )}
        </button>
      </div>

      {/* Live Execution Status Card */}
      {activeExperiment && (
        <div className="bg-soc-card border border-soc-border rounded-xl p-6 shadow-card space-y-5 animate-fade-in font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-soc-accent animate-pulse" />
              <h4 className="text-sm font-bold text-soc-text">
                Live Engine Execution Pipeline
              </h4>
            </div>

            <span
              className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                isCompleted
                  ? 'bg-soc-low/15 text-soc-low border border-soc-low/30'
                  : isRunning
                  ? 'bg-soc-accent/15 text-soc-accent border border-soc-accent/30 animate-pulse'
                  : 'bg-soc-critical/15 text-soc-critical border border-soc-critical/30'
              }`}
            >
              Status: {activeExperiment.status}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-soc-muted">Current Stage:</span>
              <span className="text-soc-text font-bold">{activeExperiment.stage}</span>
            </div>

            <div className="h-2.5 w-full bg-soc-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isCompleted ? 'bg-soc-low' : 'bg-soc-accent'
                }`}
                style={{ width: `${activeExperiment.progress}%` }}
              />
            </div>
          </div>

          {/* Stage Completion Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
            {[
              { label: 'Dataset Partition & Stratification', threshold: 15 },
              { label: 'Preprocessing (Train-Fit Only)', threshold: 35 },
              { label: 'Ensemble Meta Architecture', threshold: 55 },
              { label: 'Classifier Training Fit', threshold: 70 },
              { label: 'Held-out Test Inference', threshold: 85 },
              { label: 'Cybersecurity Trade-off Audit', threshold: 95 },
            ].map((step, idx) => {
              const isDone = activeExperiment.progress >= step.threshold;
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                    isDone
                      ? 'bg-soc-low/10 border-soc-low/30 text-soc-low'
                      : 'bg-soc-bg border-soc-border/60 text-soc-muted'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isDone ? 'text-soc-low' : 'text-soc-muted/40'}`} />
                  <span className="text-[11px] truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Navigation to Evaluation once completed */}
          {isCompleted && (
            <div className="pt-4 border-t border-soc-border flex items-center justify-between">
              <span className="text-xs text-soc-low font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Experiment Successfully Trained & Evaluated!
              </span>

              <button
                type="button"
                onClick={onNavigateToEvaluation}
                className="px-5 py-2.5 rounded-lg text-xs font-mono font-bold bg-soc-accent text-soc-bg hover:bg-soc-accentHover transition-colors flex items-center gap-2 shadow-glowAccent"
              >
                Inspect Evaluation & Security Trade-offs
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
