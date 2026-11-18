import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  DatasetUploadResponse,
  ModelConfigSpec,
  StudioExperimentStatus,
  StudioExperimentResult,
} from '../../types/studio';

interface Step03TrainPredictProps {
  dataset: DatasetUploadResponse;
  selectedTarget: string | null;
  selectedFeatures: string[];
  modelSettings: ModelConfigSpec;
  activeStatus: StudioExperimentStatus | null;
  onStatusChange: (status: StudioExperimentStatus | null) => void;
  results: StudioExperimentResult | null;
  onResultsLoaded: (res: StudioExperimentResult) => void;
  onNavigateToExplain: () => void;
  onNavigateToResults: () => void;
  onBack: () => void;
}

export const Step03TrainPredict: React.FC<Step03TrainPredictProps> = ({
  dataset,
  selectedTarget,
  selectedFeatures,
  modelSettings,
  activeStatus,
  onStatusChange,
  results,
  onResultsLoaded,
  onNavigateToExplain,
  onNavigateToResults,
  onBack,
}) => {
  const [experimentName, setExperimentName] = useState(
    `${modelSettings.strategy.toUpperCase()} Pipeline (${dataset.filename.replace('.csv', '')})`
  );
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [samplePrediction, setSamplePrediction] = useState<import('../../types/studio').StudioSamplePredictionResponse | null>(null);
  const [isPredictingSample, setIsPredictingSample] = useState(false);

  // Poll status while running
  useEffect(() => {
    let interval: number | null = null;
    if (activeStatus && (activeStatus.status === 'running' || activeStatus.status === 'queued')) {
      interval = window.setInterval(async () => {
        try {
          const status = await api.getStudioExperimentStatus(activeStatus.experiment_id);
          onStatusChange(status);

          if (status.status === 'completed') {
            const res = await api.getStudioExperimentResults(activeStatus.experiment_id);
            onResultsLoaded(res);
          } else if (status.status === 'failed') {
            setErrorMsg(status.error_message || 'Experiment execution failed.');
          }
        } catch (err: any) {
          console.error('Error polling studio status', err);
        }
      }, 700);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeStatus]);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setErrorMsg(null);
    try {
      const status = await api.createStudioExperiment({
        experiment_name: experimentName,
        dataset_id: dataset.dataset_id,
        target_column: selectedTarget,
        feature_columns: selectedFeatures,
        test_split_ratio: 0.20,
        random_seed: 42,
        model_settings: modelSettings,
      });
      onStatusChange(status);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start experiment.');
    } finally {
      setIsLaunching(false);
    }
  };

  const handleSamplePrediction = async () => {
    if (!results) return;
    setIsPredictingSample(true);
    setErrorMsg(null);
    try {
      const prediction = await api.predictStudioHeldoutSample(results.experiment_id, sampleIndex);
      setSamplePrediction(prediction);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not predict the selected sample flow.');
    } finally {
      setIsPredictingSample(false);
    }
  };

  const isRunning = activeStatus?.status === 'running' || activeStatus?.status === 'queued';
  const isCompleted = activeStatus?.status === 'completed';

  return (
    <div className="space-y-5 font-mono text-slate-200">
      {/* Execution Setup & Launch Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
              Step 03 — Execution Engine
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              Execute Model Training & Threat Profiling
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              {selectedTarget
                ? 'Supervised Mode: Trains ensemble on 80% train partition and evaluates genuine metrics on 20% holdout test partition.'
                : 'Inference Mode: Profiles unlabeled user flow captures using the configured ensemble.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={experimentName}
              onChange={(e) => setExperimentName(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white w-64 focus:outline-none focus:border-cyan-400"
              placeholder="Experiment run name..."
            />
          </div>
        </div>

        {/* Experiment Specs Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Target Dimension</span>
            <span className="text-xs font-bold text-slate-200 truncate block">
              {selectedTarget || 'Unlabeled (Inference Only)'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Total Records</span>
            <span className="text-xs font-bold text-cyan-400 block">
              {dataset.record_count.toLocaleString()} Flows
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Strategy</span>
            <span className="text-xs font-bold text-white uppercase block">
              {modelSettings.strategy}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Feature Space</span>
            <span className="text-xs font-bold text-slate-200 block">
              {selectedFeatures.length} Active Features
            </span>
          </div>
        </div>

        {/* Action Button */}
        {!isRunning && !isCompleted && (
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLaunching ? 'Initializing Pipeline...' : 'Run Experiment Pipeline'}</span>
            </button>
          </div>
        )}

        {/* Live Progress Bar & Stage Tracker */}
        {isRunning && (
          <div className="p-5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-400 font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 animate-spin text-cyan-400" />
                {activeStatus.stage}
              </span>
              <span className="text-white font-bold">{activeStatus.progress}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
                style={{ width: `${activeStatus.progress}%` }}
              />
            </div>

            <span className="text-[10px] text-slate-500 block text-center">
              Fitting preprocessing transformers and ensemble estimators on backend thread pool...
            </span>
          </div>
        )}

        {/* Completion Success Summary */}
        {isCompleted && results && (
          <div className="p-5 rounded-lg bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Pipeline Execution Complete
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Duration: {(results.training_time_seconds + results.prediction_time_seconds).toFixed(2)}s
              </div>
            </div>

            {results.is_labeled ? (
              <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Holdout accuracy</span>
                  <span className="text-base font-bold text-white">
                    {(results.accuracy! * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Train accuracy</span>
                  <span className="text-base font-bold text-slate-200">
                    {results.training_accuracy == null ? 'N/A' : `${(results.training_accuracy * 100).toFixed(2)}%`}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Train–holdout gap</span>
                  <span className={`text-base font-bold ${(results.generalization_gap ?? 0) > 0.05 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {results.generalization_gap == null ? 'N/A' : `${(results.generalization_gap * 100).toFixed(2)} pp`}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Intrusion Recall</span>
                  <span className="text-base font-bold text-cyan-400">
                    {(results.recall! * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Precision</span>
                  <span className="text-base font-bold text-cyan-400">
                    {(results.precision! * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">F1-Score</span>
                  <span className="text-base font-bold text-emerald-400">
                    {(results.f1_score! * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Try a sample flow with this trained model</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Choose a record from this dataset’s held-out partition. The saved experiment preprocessing and trained model will profile it.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-[10px] uppercase tracking-wide text-slate-500">
                    Held-out sample index (0–{Math.max(0, results.total_evaluated_records - 1)})
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, results.total_evaluated_records - 1)}
                      value={sampleIndex}
                      onChange={(e) => {
                        setSampleIndex(Math.max(0, Math.min(results.total_evaluated_records - 1, Number(e.target.value) || 0)));
                        setSamplePrediction(null);
                      }}
                      className="block mt-1 w-32 px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </label>
                  <button
                    onClick={handleSamplePrediction}
                    disabled={isPredictingSample || !results.total_evaluated_records}
                    className="px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-semibold"
                  >
                    {isPredictingSample ? 'Profiling…' : 'Predict sample flow'}
                  </button>
                </div>
                {samplePrediction && (
                  <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 p-3 rounded-md bg-slate-950 border border-slate-800">
                    <div className="min-w-36">
                      <span className="text-[10px] text-slate-500 uppercase block">Model prediction</span>
                      <span className={`text-base font-bold ${samplePrediction.prediction.toLowerCase().includes('benign') ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {samplePrediction.prediction}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-1">
                        Confidence {(samplePrediction.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">Sample features</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(samplePrediction.features).slice(0, 8).map(([name, value]) => (
                          <span key={name} className="max-w-full truncate px-2 py-1 rounded bg-slate-900 text-[10px] text-slate-300" title={`${name}: ${String(value)}`}>
                            {name}: {value === null ? 'missing' : String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Total Profiled</span>
                  <span className="text-base font-bold text-white">
                    {results.total_evaluated_records.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Attack Flows</span>
                  <span className="text-base font-bold text-rose-400">
                    {(results.predicted_class_counts?.['Attack'] || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Mean Confidence</span>
                  <span className="text-base font-bold text-cyan-400">
                    {(results.mean_confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Quick Actions Post-Run */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={onNavigateToExplain}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Explain Flow Predictions (04)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNavigateToResults}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>View Results & Compare (05)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Bottom Back Button */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Configure (02)
        </button>
      </div>
    </div>
  );
};
