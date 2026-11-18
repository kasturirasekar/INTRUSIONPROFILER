import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Copy,
  Code,
  Sliders,
  Info,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  PredictionSchemaResponse,
  InteractivePredictionResponse,
  FeatureGroupMeta,
} from '../../types';
import { StudioExperimentResult } from '../../types/studio';

interface Step05ResultsProps {
  experimentResult?: StudioExperimentResult | null;
  onSelectFlowForExplain?: (recordIndex: number) => void;
  onRerun?: () => void;
}

export const Step05Results: React.FC<Step05ResultsProps> = () => {
  const [schema, setSchema] = useState<PredictionSchemaResponse | null>(null);
  const [loadingSchema, setLoadingSchema] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');

  // Input states
  const [featureValues, setFeatureValues] = useState<Record<string, string>>({});
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Search filter for manual form
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Inference states
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<InteractivePredictionResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<'benign' | 'attack' | 'custom'>('benign');

  // Load schema from backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSchema = async () => {
      try {
        setLoadingSchema(true);
        const data = await api.getPredictionSchema();
        if (!isMounted) return;
        setSchema(data);

        // Pre-populate with benign sample by default
        if (data.sample_benign && Object.keys(data.sample_benign).length > 0) {
          const strMap: Record<string, string> = {};
          data.feature_names.forEach((fn) => {
            strMap[fn] = String(data.sample_benign[fn] ?? 0);
          });
          setFeatureValues(strMap);
          setJsonInput(JSON.stringify(data.sample_benign, null, 2));
        }
      } catch (err: any) {
        console.error('Failed to load prediction schema:', err);
        setValidationError(err?.response?.data?.detail || 'Failed to connect to ML model schema service.');
      } finally {
        if (isMounted) setLoadingSchema(false);
      }
    };

    fetchSchema();
    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize manual form changes to JSON editor
  const handleFeatureChange = (name: string, value: string) => {
    const updated = { ...featureValues, [name]: value };
    setFeatureValues(updated);
    setActivePreset('custom');

    // Also update JSON text
    try {
      const numMap: Record<string, any> = {};
      Object.entries(updated).forEach(([k, v]) => {
        numMap[k] = v === '' ? null : Number(v) || v;
      });
      setJsonInput(JSON.stringify(numMap, null, 2));
      setJsonError(null);
    } catch {
      // ignore
    }
  };

  // Synchronize JSON editor changes to manual form
  const handleJsonChange = (rawJson: string) => {
    setJsonInput(rawJson);
    setActivePreset('custom');

    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('JSON must be a valid key-value object of network features.');
        return;
      }
      setJsonError(null);

      // Update form values
      const strMap: Record<string, string> = {};
      Object.entries(parsed).forEach(([k, v]) => {
        strMap[k] = v === null || v === undefined ? '' : String(v);
      });
      setFeatureValues(strMap);
    } catch (e: any) {
      setJsonError(`JSON Syntax Error: ${e.message}`);
    }
  };

  // Load known Benign sample
  const handleLoadBenign = () => {
    if (!schema?.sample_benign) return;
    const strMap: Record<string, string> = {};
    schema.feature_names.forEach((fn) => {
      strMap[fn] = String(schema.sample_benign[fn] ?? 0);
    });
    setFeatureValues(strMap);
    setJsonInput(JSON.stringify(schema.sample_benign, null, 2));
    setJsonError(null);
    setValidationError(null);
    setActivePreset('benign');
  };

  // Load known Cyber Attack sample
  const handleLoadAttack = () => {
    if (!schema?.sample_attack) return;
    const strMap: Record<string, string> = {};
    schema.feature_names.forEach((fn) => {
      strMap[fn] = String(schema.sample_attack[fn] ?? 0);
    });
    setFeatureValues(strMap);
    setJsonInput(JSON.stringify(schema.sample_attack, null, 2));
    setJsonError(null);
    setValidationError(null);
    setActivePreset('attack');
  };

  // Reset all fields
  const handleReset = () => {
    if (!schema) return;
    const emptyMap: Record<string, string> = {};
    schema.feature_names.forEach((fn) => {
      emptyMap[fn] = '';
    });
    setFeatureValues(emptyMap);
    setJsonInput('{}');
    setJsonError(null);
    setValidationError(null);
    setPredictionResult(null);
    setActivePreset('custom');
  };

  const toggleGroupCollapse = (catId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Check missing features
  const missingFeatures = useMemo(() => {
    if (!schema?.feature_names) return [];
    return schema.feature_names.filter((fn) => {
      const val = featureValues[fn];
      return val === undefined || val === null || val.trim() === '';
    });
  }, [schema, featureValues]);

  // Execute inference with strict validation
  const handlePredict = async () => {
    setValidationError(null);

    if (!schema) {
      setValidationError('Prediction schema is not loaded yet.');
      return;
    }

    // Check for missing features on client side first
    if (missingFeatures.length > 0) {
      setValidationError(
        `Incomplete input: Missing ${missingFeatures.length} of ${schema.feature_count} required feature(s). The trained ensemble requires all 78 network flow features for prediction.`
      );
      return;
    }

    // Convert values to numeric map
    const numericRecord: Record<string, number> = {};
    for (const fn of schema.feature_names) {
      const rawVal = featureValues[fn];
      const parsedNum = Number(rawVal);
      if (isNaN(parsedNum) || !isFinite(parsedNum)) {
        setValidationError(`Invalid numeric value for feature "${fn}": "${rawVal}" is not a valid number.`);
        return;
      }
      numericRecord[fn] = parsedNum;
    }

    setIsPredicting(true);
    try {
      const response = await api.predictInteractive(numericRecord);
      setPredictionResult(response);
      // Smooth scroll to top of prediction result
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Prediction request failed:', err);
      const detail = err?.response?.data?.detail;
      setValidationError(detail || 'Inference failed. Check that all network flow inputs are valid.');
    } finally {
      setIsPredicting(false);
    }
  };

  if (loadingSchema) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center max-w-xl mx-auto my-8 font-mono">
        <Cpu className="w-10 h-10 text-cyan-400 mx-auto mb-3 animate-pulse" />
        <h3 className="text-sm font-bold text-white mb-1">Connecting to Inference Engine</h3>
        <p className="text-slate-400 text-xs">
          Loading 78-feature schema and trained ensemble model pipeline...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Shield className="w-3.5 h-3.5" />
                Step 05 – Cyber Attack Prediction Interface
              </span>
              <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Active Model: Stacking Ensemble (LR + DT + RF)
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Network Flow Intrusion Predictor
            </h2>
            <p className="text-slate-400 text-xs">
              Enter network traffic characteristics to identify whether the flow is benign or malicious using the trained ensemble learning model.
            </p>
          </div>

          {/* Quick Action Sample Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadBenign}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                activePreset === 'benign'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Load Benign Flow
            </button>
            <button
              onClick={handleLoadAttack}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                activePreset === 'attack'
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              Load Cyber Attack Flow
            </button>
            <button
              onClick={handleReset}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Form
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Prediction Result Display */}
      {predictionResult && (
        <div
          className={`border-2 rounded-xl p-6 shadow-xl transition-all ${
            predictionResult.is_attack
              ? 'bg-red-950/40 border-red-500/60 shadow-red-950/30 text-red-200'
              : 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-950/30 text-emerald-200'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`p-3.5 rounded-xl border ${
                  predictionResult.is_attack
                    ? 'bg-red-900/40 border-red-500/50 text-red-400'
                    : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'
                }`}
              >
                {predictionResult.is_attack ? (
                  <ShieldAlert className="w-8 h-8" />
                ) : (
                  <ShieldCheck className="w-8 h-8" />
                )}
              </div>
              <div>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase mb-1 border ${
                    predictionResult.is_attack
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {predictionResult.is_attack ? 'Malicious Traffic Detected' : 'Clean Network Traffic'}
                </span>
                <h3 className="text-xl lg:text-2xl font-black tracking-tight text-white">
                  {predictionResult.verdict_title}
                </h3>
                <p
                  className={`text-sm font-semibold mt-0.5 ${
                    predictionResult.is_attack ? 'text-red-300' : 'text-emerald-300'
                  }`}
                >
                  Status: {predictionResult.status}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Inference Pipeline: {predictionResult.model_architecture} ({predictionResult.feature_count_used} features verified)
                </p>
              </div>
            </div>

            {/* Empirical Probability Indicators */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 min-w-[280px] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Class Probabilities:</span>
                <span className="text-slate-300 font-bold">Model Confidence</span>
              </div>

              {/* Benign Probability Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-emerald-400 font-semibold">Benign:</span>
                  <span className="text-slate-200 font-bold">
                    {predictionResult.benign_probability !== null && predictionResult.benign_probability !== undefined
                      ? `${(predictionResult.benign_probability * 100).toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        predictionResult.benign_probability !== null && predictionResult.benign_probability !== undefined
                          ? Math.min(100, Math.max(0, predictionResult.benign_probability * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Attack Probability Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-red-400 font-semibold">Cyber Attack:</span>
                  <span className="text-slate-200 font-bold">
                    {predictionResult.attack_probability !== null && predictionResult.attack_probability !== undefined
                      ? `${(predictionResult.attack_probability * 100).toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        predictionResult.attack_probability !== null && predictionResult.attack_probability !== undefined
                          ? Math.min(100, Math.max(0, predictionResult.attack_probability * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-red-300">Validation Error</h4>
            <p className="text-[11px] text-red-200 leading-relaxed">{validationError}</p>
          </div>
        </div>
      )}

      {/* Main Input Workspace */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Input Mode Toggle Bar & Controls */}
        <div className="bg-slate-950/70 border-b border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab('form')}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'form'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Method 1: Manual Input Form ({schema?.feature_count ?? 78} Features)
            </button>
            <button
              onClick={() => setActiveTab('json')}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'json'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Method 2: JSON Specification
            </button>
          </div>

          {/* Predict Attack CTA Button */}
          <div className="flex items-center gap-3">
            {missingFeatures.length > 0 && (
              <span className="text-[11px] text-amber-400">
                {missingFeatures.length} required field{missingFeatures.length > 1 ? 's' : ''} empty
              </span>
            )}
            <button
              onClick={handlePredict}
              disabled={isPredicting || missingFeatures.length > 0}
              type="button"
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                isPredicting || missingFeatures.length > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border border-cyan-400 shadow-cyan-500/20'
              }`}
            >
              {isPredicting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Inferring...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  PREDICT ATTACK
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Structured Manual Form */}
        {activeTab === 'form' && (
          <div className="p-5 space-y-6">
            {/* Search filter for finding features */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter network features by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-3">
                <span>Total Model Features: <strong className="text-white">{schema?.feature_count ?? 78}</strong></span>
                <span>•</span>
                <span>Filled: <strong className="text-emerald-400">{(schema?.feature_count ?? 78) - missingFeatures.length}</strong></span>
                {missingFeatures.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400">Remaining: <strong>{missingFeatures.length}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* Categorized Groups */}
            <div className="space-y-4">
              {schema?.groups.map((group: FeatureGroupMeta) => {
                const isCollapsed = !!collapsedGroups[group.category_id];
                const matchingFeatures = group.features.filter((f) =>
                  searchTerm.trim() === '' || f.name.toLowerCase().includes(searchTerm.toLowerCase())
                );

                if (searchTerm.trim() !== '' && matchingFeatures.length === 0) {
                  return null;
                }

                return (
                  <div
                    key={group.category_id}
                    className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.category_id)}
                      className="w-full px-4 py-3 bg-slate-950/90 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white tracking-wide">
                            {group.title}
                          </h4>
                          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.2 rounded">
                            {matchingFeatures.length} features
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{group.description}</p>
                      </div>
                      <div className="text-slate-400 p-1">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 border-t border-slate-800/80">
                        {matchingFeatures.map((feat) => {
                          const val = featureValues[feat.name] ?? '';
                          const isMissing = val.trim() === '';

                          return (
                            <div
                              key={feat.name}
                              className={`p-2.5 rounded-lg border transition-all ${
                                isMissing
                                  ? 'bg-slate-950/90 border-amber-500/30'
                                  : 'bg-slate-900/90 border-slate-800 focus-within:border-cyan-500'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <label
                                  htmlFor={`input-${feat.name}`}
                                  className="text-[11px] font-semibold text-slate-300 truncate max-w-[200px]"
                                  title={feat.name}
                                >
                                  {feat.label}
                                </label>
                                <div className="group relative flex items-center">
                                  <Info className="w-3 h-3 text-slate-500 hover:text-cyan-400 cursor-help" />
                                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-56 p-2 rounded bg-slate-950 text-slate-200 text-[10px] border border-slate-700 shadow-xl z-20 pointer-events-none">
                                    {feat.description}
                                  </div>
                                </div>
                              </div>

                              <input
                                id={`input-${feat.name}`}
                                type="number"
                                step="any"
                                value={val}
                                onChange={(e) => handleFeatureChange(feat.name, e.target.value)}
                                placeholder="0.0"
                                className={`w-full bg-slate-950 border rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none transition-colors ${
                                  isMissing
                                    ? 'border-amber-500/50 focus:border-amber-400'
                                    : 'border-slate-800 focus:border-cyan-500'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: JSON Specification */}
        {activeTab === 'json' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white">Direct JSON Feature Record</h4>
                <p className="text-[11px] text-slate-400">
                  Paste or edit complete network-flow key-value pairs. All {schema?.feature_count ?? 78} model features must be present.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(jsonInput);
                      setJsonInput(JSON.stringify(parsed, null, 2));
                      setJsonError(null);
                    } catch (e: any) {
                      setJsonError(`Cannot format invalid JSON: ${e.message}`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded text-[11px] text-slate-300 hover:text-white"
                >
                  <Code className="w-3.5 h-3.5" />
                  Format JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(jsonInput);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded text-[11px] text-slate-300 hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy JSON
                </button>
              </div>
            </div>

            {jsonError && (
              <div className="bg-red-950/60 border border-red-500/50 rounded-lg p-3 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="relative">
              <textarea
                rows={22}
                value={jsonInput}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="w-full bg-slate-950 font-mono text-xs text-cyan-300 border border-slate-800 rounded-lg p-4 focus:outline-none focus:border-cyan-500 leading-relaxed tracking-wide"
                placeholder='{ "Destination Port": 80, "Flow Duration": 12000, ... }'
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
