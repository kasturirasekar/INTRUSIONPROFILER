import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Core, ElementDefinition } from 'cytoscape';
import { ModelConfigSpec } from '../../types/studio';
import { Activity, CheckCircle2, GitBranch, MousePointer2 } from 'lucide-react';

interface EnsembleCanvasProps {
  config: ModelConfigSpec;
  datasetName: string;
  recordCount: number;
  featureCount: number;
  isTraining?: boolean;
  verdictClass?: string;
  verdictConfidence?: number;
  className?: string;
}

const MODEL_NAMES: Record<string, string> = {
  random_forest: 'Random Forest', rf: 'Random Forest',
  extra_trees: 'Extra Trees', et: 'Extra Trees',
  decision_tree: 'Decision Tree', dt: 'Decision Tree',
  logistic_regression: 'Logistic Regression', lr: 'Logistic Regression',
  gradient_boosting: 'Gradient Boosting', gb: 'Gradient Boosting',
  adaboost: 'AdaBoost', ada: 'AdaBoost', knn: 'K-Nearest Neighbors',
  svm: 'Support Vector Machine', naive_bayes: 'Gaussian Naive Bayes', nb: 'Gaussian Naive Bayes',
};
const modelName = (id: string) => MODEL_NAMES[id] ?? id.replace(/_/g, ' ');

export const EnsembleArchitectureCanvas: React.FC<EnsembleCanvasProps> = ({
  config,
  datasetName,
  recordCount,
  featureCount,
  isTraining = false,
  verdictClass,
  verdictConfidence,
  className = '',
}) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selected, setSelected] = useState<{ title: string; detail: string } | null>(null);
  const activeClassifiers = useMemo(() => (config.base_classifiers || []).filter((item) => item.enabled), [config.base_classifiers]);
  const architecture = useMemo(() => {
    const nodes: ElementDefinition[] = [];
    const edges: ElementDefinition[] = [];
    const node = (id: string, label: string, kind: string, x: number, y: number, detail: string) => {
      nodes.push({ data: { id, label, kind, detail }, position: { x, y } });
    };
    const edge = (source: string, target: string) => edges.push({ data: { id: `${source}-${target}`, source, target } });
    const midY = 154;
    node('dataset', `${datasetName}\n${recordCount.toLocaleString()} records`, 'data', 95, midY, `${datasetName} · ${recordCount.toLocaleString()} records · ${featureCount} selected features`);
    node('prepare', `Feature preparation\n${featureCount} selected features`, 'prepare', 280, midY, 'Numeric cleaning and train-fitted preprocessing. Training data fits preprocessing; held-out data uses the same fitted transformations.');
    edge('dataset', 'prepare');

    const learnerIds: string[] = [];
    if (activeClassifiers.length) {
      const spacing = 62;
      const firstY = midY - ((activeClassifiers.length - 1) * spacing) / 2;
      activeClassifiers.forEach((learner, index) => {
        const id = `learner-${index}`;
        const hp = Object.entries(learner.hyperparameters || {}).slice(0, 3).map(([key, value]) => `${key}=${value}`).join(' · ');
        const weight = config.strategy === 'voting' ? `\nweight ${learner.weight}` : '';
        node(id, `${modelName(learner.model_id)}${weight}`, 'learner', 505, firstY + index * spacing, `${modelName(learner.model_id)}${hp ? ` · ${hp}` : ''}${config.strategy === 'voting' ? ` · vote weight ${learner.weight}` : ''}`);
        edge('prepare', id);
        learnerIds.push(id);
      });
    } else {
      node('no-learners', 'No enabled classifiers', 'empty', 505, midY, 'Enable at least one classifier in the configuration step to create a learner branch.');
      edge('prepare', 'no-learners');
      learnerIds.push('no-learners');
    }

    let decisionId = 'decision';
    let decisionLabel = 'Model output';
    let decisionDetail = 'Prediction output for the configured model.';
    if (config.strategy === 'stacking') {
      decisionLabel = `${modelName(config.meta_classifier_id || 'logistic_regression')}\nmeta learner · ${config.cv_folds || 5}-fold CV`;
      decisionDetail = `Stacking meta learner: ${modelName(config.meta_classifier_id || 'logistic_regression')} · ${config.cv_folds || 5} cross-validation folds.`;
      node('aggregate', 'Out-of-fold\nmeta-features', 'aggregate', 715, midY, 'Base learners provide out-of-fold predictions to the meta learner.');
      learnerIds.forEach((id) => edge(id, 'aggregate'));
      node(decisionId, decisionLabel, 'decision', 915, midY, decisionDetail);
      edge('aggregate', decisionId);
    } else if (config.strategy === 'voting') {
      decisionLabel = `${config.voting_type === 'soft' ? 'Soft weighted vote' : 'Hard majority vote'}\nconsensus`;
      decisionDetail = config.voting_type === 'soft' ? 'Combines configured learner weights with predicted class probabilities.' : 'Combines base learner class votes using majority consensus.';
      node('aggregate', decisionLabel, 'aggregate', 715, midY, decisionDetail);
      learnerIds.forEach((id) => edge(id, 'aggregate'));
      node(decisionId, 'Security verdict', 'decision', 915, midY, 'Final class decision from the configured voting ensemble.');
      edge('aggregate', decisionId);
    } else {
      decisionId = 'decision';
      node(decisionId, 'Security verdict', 'decision', 850, midY, `${config.strategy.replace(/_/g, ' ')} model output.`);
      learnerIds.forEach((id) => edge(id, decisionId));
    }

    if (verdictClass) {
      const confidence = Number.isFinite(verdictConfidence) ? ` · ${(verdictConfidence! * 100).toFixed(1)}% confidence` : '';
      const verdictNode = nodes.find((item) => item.data?.id === decisionId);
      if (verdictNode) {
        verdictNode.data = { ...verdictNode.data, label: `${verdictClass}${confidence}`, kind: verdictClass.toLowerCase() === 'attack' ? 'attack' : 'benign' };
        verdictNode.data.detail = `Observed prediction: ${verdictClass}${confidence}.`;
      }
    }
    return [...nodes, ...edges];
  }, [activeClassifiers, config, datasetName, featureCount, recordCount, verdictClass, verdictConfidence]);

  useEffect(() => {
    if (!graphRef.current) return;
    let disposed = false;
    let cy: Core | null = null;
    let resize: ResizeObserver | null = null;
    import('cytoscape').then(({ default: cytoscape }) => {
      if (disposed || !graphRef.current) return;
      const graph = cytoscape({
      container: graphRef.current,
      elements: architecture,
      layout: { name: 'preset', fit: true, padding: 42 },
      minZoom: 0.45,
      maxZoom: 1.4,
      style: [
        { selector: 'node', style: { 'background-color': '#10283a', 'border-color': '#155e75', 'border-width': 1, label: 'data(label)', color: '#dbeafe', 'font-size': 10, 'font-family': 'ui-monospace, monospace', 'text-wrap': 'wrap', 'text-max-width': 150, width: 142, height: 48, shape: 'round-rectangle', 'text-valign': 'center', 'text-halign': 'center', padding: 8 } },
        { selector: 'node[kind = "data"]', style: { 'background-color': '#0e2935', 'border-color': '#22d3ee' } },
        { selector: 'node[kind = "prepare"]', style: { 'background-color': '#13233a', 'border-color': '#60a5fa' } },
        { selector: 'node[kind = "learner"]', style: { 'background-color': '#14243a', 'border-color': '#3b82f6', width: 156 } },
        { selector: 'node[kind = "aggregate"]', style: { 'background-color': '#20213c', 'border-color': '#a78bfa', width: 154 } },
        { selector: 'node[kind = "attack"]', style: { 'background-color': '#3b1824', 'border-color': '#fb7185', color: '#ffe4e6' } },
        { selector: 'node[kind = "benign"]', style: { 'background-color': '#12352e', 'border-color': '#34d399', color: '#d1fae5' } },
        { selector: 'node[kind = "empty"]', style: { 'background-color': '#292016', 'border-color': '#f59e0b', color: '#fde68a' } },
        { selector: 'node.selected-node', style: { 'border-width': 3, 'border-color': '#a5f3fc' } },
        { selector: 'edge', style: { width: isTraining ? 2.5 : 1.5, 'line-color': isTraining ? '#22d3ee' : '#315b70', 'target-arrow-color': isTraining ? '#22d3ee' : '#315b70', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
      ],
      });
      cy = graph;
      cyRef.current = graph;
      graph.on('tap', 'node', (event) => {
      const data = event.target.data();
      setSelected({ title: String(data.label).replace(/\n/g, ' · '), detail: data.detail });
        graph.nodes().removeClass('selected-node');
      event.target.addClass('selected-node');
      });
      resize = new ResizeObserver(() => graph.resize());
      resize.observe(graphRef.current);
    }).catch((error) => {
      console.error('Unable to load the interactive ensemble architecture:', error);
    });
    return () => {
      disposed = true;
      resize?.disconnect();
      cy?.destroy();
      if (cyRef.current === cy) cyRef.current = null;
    };
  }, [architecture, isTraining]);

  const strategy = config.strategy === 'stacking'
    ? `Stacking · ${config.cv_folds || 5}-fold`
    : config.strategy === 'voting'
      ? `${config.voting_type} voting`
      : config.strategy.replace(/_/g, ' ');

  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5 text-slate-200 ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-200"><GitBranch className="h-4 w-4 text-cyan-400" /> Ensemble architecture <span className="text-cyan-400">· {strategy}</span></div>
          <p className="mt-1 text-xs text-slate-500">Configured learners and their actual connection to the ensemble decision.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-mono text-slate-300">{activeClassifiers.length} configured learner{activeClassifiers.length === 1 ? '' : 's'}</span>
          {isTraining && <span className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-mono text-cyan-300"><Activity className="h-3 w-3" /> Training</span>}
        </div>
      </header>
      <div ref={graphRef} className="w-full" style={{ height: Math.max(300, 72 + Math.max(activeClassifiers.length, 1) * 62) }} aria-label="Interactive configured ensemble model architecture" />
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
        {selected ? <div className="text-xs"><span className="font-semibold text-cyan-300">{selected.title}</span><span className="ml-2 text-slate-400">{selected.detail}</span></div> : <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><MousePointer2 className="h-3.5 w-3.5" /> Select a component to inspect its configured role.</div>}
        {verdictClass && <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Latest preview: {verdictClass}{Number.isFinite(verdictConfidence) ? ` · ${(verdictConfidence! * 100).toFixed(1)}%` : ''}</div>}
      </div>
    </section>
  );
};
