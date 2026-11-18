import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Core, ElementDefinition } from 'cytoscape';
import { useReducedMotion } from 'framer-motion';
import { Network, MousePointer2 } from 'lucide-react';

type FlowRow = Record<string, unknown>;

interface NetworkFlowTopologyProps {
  rows: FlowRow[];
  title?: string;
  subtitle?: string;
  recordIndices?: number[];
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  height?: number;
}

const normalizedKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

function fieldValue(row: FlowRow, aliases: string[]): string | null {
  const keys = Object.keys(row);
  const match = keys.find((key) => aliases.includes(normalizedKey(key)));
  if (!match || row[match] === null || row[match] === undefined || row[match] === '') return null;
  return String(row[match]);
}

function displayEndpoint(value: string, limit = 24): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

export const NetworkFlowTopology: React.FC<NetworkFlowTopologyProps> = ({
  rows,
  title = 'Observed flow topology',
  subtitle,
  recordIndices,
  selectedIndex,
  onSelectIndex,
  height = 330,
}) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onSelectIndexRef = useRef(onSelectIndex);
  const selectedFlowRef = useRef<number | null>(selectedIndex ?? null);
  const [selectedFlow, setSelectedFlow] = useState<number | null>(selectedIndex ?? null);
  const [graphVersion, setGraphVersion] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => { onSelectIndexRef.current = onSelectIndex; }, [onSelectIndex]);
  useEffect(() => {
    selectedFlowRef.current = selectedFlow;
  }, [selectedFlow]);
  useEffect(() => setSelectedFlow(selectedIndex ?? null), [selectedIndex]);

  const graphElements = useMemo(() => {
    const sourceAliases = ['srcip', 'sourceip', 'sourceaddress', 'srcaddr', 'sourcehost', 'sourceipaddress'];
    const destinationAliases = ['dstip', 'destinationip', 'destinationaddress', 'dstaddr', 'destinationhost', 'destinationipaddress'];
    const sourcePortAliases = ['srcport', 'sourceport'];
    const destinationPortAliases = ['dstport', 'destinationport', 'destport'];
    const protocolAliases = ['protocol', 'protocolname'];
    const nodeMap = new Map<string, { label: string; kind: string; indices: number[] }>();
    const edgeMap = new Map<string, { source: string; target: string; indices: number[]; label: string }>();

    rows.forEach((row, position) => {
      const index = recordIndices?.[position] ?? position;
      const sourceIp = fieldValue(row, sourceAliases);
      const destinationIp = fieldValue(row, destinationAliases);
      const sourcePort = fieldValue(row, sourcePortAliases);
      const destinationPort = fieldValue(row, destinationPortAliases);
      const protocol = fieldValue(row, protocolAliases);
      const sourceLabel = sourceIp
        ? `${sourceIp}${sourcePort ? `:${sourcePort}` : ''}`
        : 'Capture preview';
      const targetLabel = destinationIp
        ? `${destinationIp}${destinationPort ? `:${destinationPort}` : ''}`
        : destinationPort
          ? `Destination port ${destinationPort}`
          : protocol
            ? `Protocol ${protocol}`
            : 'Destination fields unavailable';
      const sourceId = `src:${sourceLabel}`;
      const targetId = `dst:${targetLabel}`;
      const source = nodeMap.get(sourceId) ?? { label: sourceLabel, kind: sourceIp ? 'host' : 'capture', indices: [] };
      const target = nodeMap.get(targetId) ?? { label: targetLabel, kind: destinationIp ? 'host' : 'service', indices: [] };
      source.indices.push(index);
      target.indices.push(index);
      nodeMap.set(sourceId, source);
      nodeMap.set(targetId, target);
      const edgeId = `${sourceId}->${targetId}`;
      const edge = edgeMap.get(edgeId) ?? { source: sourceId, target: targetId, indices: [], label: '' };
      edge.indices.push(index);
      edge.label = `${edge.indices.length} flow${edge.indices.length === 1 ? '' : 's'}${protocol ? ` · ${protocol}` : ''}`;
      edgeMap.set(edgeId, edge);
    });

    const sources = [...nodeMap.entries()].filter(([id]) => id.startsWith('src:'));
    const targets = [...nodeMap.entries()].filter(([id]) => id.startsWith('dst:'));
    const positionFor = (id: string, idx: number, count: number) => {
      const x = id.startsWith('dst:') ? 575 : 135;
      return { x, y: ((idx + 1) * (height - 40)) / (count + 1) + 20 };
    };
    const nodeEls: ElementDefinition[] = [...nodeMap.entries()].map(([id, node]) => {
      const group = id.startsWith('src:') ? sources : targets;
      const idx = group.findIndex(([nodeId]) => nodeId === id);
      return {
        data: { id, label: displayEndpoint(node.label), fullLabel: node.label, kind: node.kind, count: node.indices.length, indices: node.indices },
        position: positionFor(id, Math.max(idx, 0), Math.max(group.length, 1)),
      };
    });
    const edgeEls: ElementDefinition[] = [...edgeMap.entries()].map(([id, edge]) => ({
      data: { id, source: edge.source, target: edge.target, label: edge.label, indices: edge.indices },
    }));
    return [...nodeEls, ...edgeEls];
  }, [rows, recordIndices, height]);

  useEffect(() => {
    if (!graphRef.current) return;
    let disposed = false;
    let cy: Core | null = null;
    let resize: ResizeObserver | null = null;
    import('cytoscape').then(({ default: cytoscape }) => {
      if (disposed || !graphRef.current) return;
      const graph = cytoscape({
      container: graphRef.current,
      elements: graphElements,
      layout: { name: 'preset', fit: true, padding: 26 },
      minZoom: 0.55,
      maxZoom: 1.6,
      style: [
        { selector: 'node', style: { 'background-color': '#12334a', 'border-width': 1, 'border-color': '#22d3ee', color: '#e2e8f0', label: 'data(label)', 'font-size': 10, 'font-family': 'ui-monospace, monospace', 'text-wrap': 'wrap', 'text-max-width': 115, width: 30, height: 30, 'text-valign': 'bottom', 'text-margin-y': 7 } },
        { selector: 'node[kind = "capture"]', style: { 'background-color': '#164e63', 'border-color': '#22d3ee', shape: 'round-rectangle', width: 42, height: 36 } },
        { selector: 'node[kind = "service"]', style: { 'background-color': '#102a43', 'border-color': '#60a5fa', shape: 'round-rectangle', width: 38, height: 32 } },
        { selector: 'edge', style: { width: 1.5, 'line-color': '#256579', 'target-arrow-color': '#22d3ee', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', opacity: 0.76, label: 'data(label)', color: '#94a3b8', 'font-size': 8, 'font-family': 'ui-monospace, monospace', 'text-background-color': '#0b1220', 'text-background-opacity': 0.85, 'text-background-padding': 2 } },
        { selector: '.selected-flow', style: { width: 3, 'line-color': '#22d3ee', 'target-arrow-color': '#22d3ee', opacity: 1, 'z-index': 5 } },
        { selector: '.selected-node', style: { 'border-color': '#a5f3fc', 'border-width': 3, 'z-index': 6 } },
      ],
      });
      cy = graph;
      cyRef.current = graph;
      graph.on('tap', 'edge', (event) => {
      const indices = event.target.data('indices') as number[];
      if (indices?.length) {
          const current = selectedFlowRef.current;
          const currentPosition = indices.indexOf(current ?? -1);
          const next = currentPosition < 0 ? indices[0] : indices[(currentPosition + 1) % indices.length];
          setSelectedFlow(next);
          onSelectIndexRef.current?.(next);
      }
      });
      graph.on('tap', 'node', (event) => {
      const indices = event.target.data('indices') as number[];
      if (indices?.length) {
        const current = selectedFlowRef.current;
        const next = indices.includes(current ?? -1) ? current! : indices[0];
        setSelectedFlow(next);
        onSelectIndexRef.current?.(next);
      }
      });
      resize = new ResizeObserver(() => graph.resize());
      resize.observe(graphRef.current);
      setGraphVersion((version) => version + 1);
    }).catch((error) => {
      console.error('Unable to load the interactive flow topology:', error);
    });
    return () => {
      disposed = true;
      resize?.disconnect();
      cy?.destroy();
      if (cyRef.current === cy) cyRef.current = null;
    };
  }, [graphElements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('selected-flow selected-node');
    if (selectedFlow === null) return;
    const selectedEdges = cy.edges().filter((edge) => (edge.data('indices') as number[]).includes(selectedFlow));
    selectedEdges.addClass('selected-flow');
    cy.nodes().filter((node) => (node.data('indices') as number[]).includes(selectedFlow)).addClass('selected-node');
    if (reduceMotion || selectedEdges.empty()) return;

    let cancelled = false;
    const flowEdge = selectedEdges.first();
    flowEdge.style({ 'line-style': 'dashed', 'line-dash-pattern': [5, 5], 'line-dash-offset': 0 });
    const advance = () => {
      if (cancelled) return;
      flowEdge.animate(
        { style: { 'line-dash-offset': -10 } },
        { duration: 900, easing: 'linear', complete: advance },
      );
    };
    advance();
    return () => {
      cancelled = true;
      flowEdge.stop(true);
      flowEdge.removeStyle('line-style line-dash-pattern line-dash-offset');
    };
  }, [selectedFlow, graphElements, reduceMotion, graphVersion]);

  const selectedRowPosition = selectedFlow === null ? -1 : (recordIndices?.indexOf(selectedFlow) ?? selectedFlow);
  const selectedRow = selectedRowPosition >= 0 ? rows[selectedRowPosition] : undefined;
  const selectedPort = selectedRow ? fieldValue(selectedRow, ['dstport', 'destinationport', 'destport']) : null;
  const selectedProtocol = selectedRow ? fieldValue(selectedRow, ['protocol', 'protocolname']) : null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
            <Network className="h-4 w-4 text-cyan-400" />{title}
          </div>
          <p className="mt-1 text-xs text-slate-500">{subtitle ?? `Derived from ${rows.length} available record${rows.length === 1 ? '' : 's'}; click a path to inspect its flow.`}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500"><MousePointer2 className="h-3.5 w-3.5" /> Select a node or path</div>
      </div>
      {rows.length ? <div ref={graphRef} className="w-full" style={{ height }} aria-label="Interactive observed network flow topology" /> : (
        <div className="flex h-36 items-center justify-center text-xs text-slate-500">Topology appears when records are available.</div>
      )}
      {selectedRow && <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-800 pt-3 text-[11px] font-mono text-slate-400">
        <span>Selected record <strong className="text-slate-200">#{selectedFlow}</strong></span>
        {selectedPort && <span>Destination port <strong className="text-slate-200">{selectedPort}</strong></span>}
        {selectedProtocol && <span>Protocol <strong className="text-slate-200">{selectedProtocol}</strong></span>}
      </div>}
    </section>
  );
};
