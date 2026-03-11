"use client";

import { memo, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "reactflow";
import { Compass, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GraphEdge, GraphNode } from "@/lib/graph/types";

type GraphViewProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  focusNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onCanvasClick: () => void;
};

type KnowledgeNodeData = {
  title: string;
  isLeaf: boolean;
  hasRemark: boolean;
  selected: boolean;
  highlighted: boolean;
};

const HORIZONTAL_GAP = 280;
const VERTICAL_GAP = 108;

function layoutTree(nodes: GraphNode[], edges: GraphEdge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const childrenMap = new Map<string, string[]>();

  for (const edge of edges) {
    const hasSource = nodeMap.has(edge.source);
    const hasTarget = nodeMap.has(edge.target);
    if (!hasSource || !hasTarget) {
      continue;
    }

    const children = childrenMap.get(edge.source) ?? [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  }

  for (const [key, value] of childrenMap.entries()) {
    value.sort((a, b) => {
      const titleA = nodeMap.get(a)?.title ?? "";
      const titleB = nodeMap.get(b)?.title ?? "";
      return titleA.localeCompare(titleB, "zh-Hans");
    });
    childrenMap.set(key, value);
  }

  const roots = nodes
    .filter((node) => node.parentId === null || !nodeMap.has(node.parentId))
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hans"));

  const positionMap = new Map<string, { x: number; y: number }>();
  let cursor = 0;

  const placeNode = (nodeId: string, depth: number): number => {
    const children = childrenMap.get(nodeId) ?? [];

    if (children.length === 0) {
      const y = cursor * VERTICAL_GAP;
      positionMap.set(nodeId, { x: depth * HORIZONTAL_GAP, y });
      cursor += 1;
      return y;
    }

    const childYs = children.map((childId) => placeNode(childId, depth + 1));
    const firstY = childYs[0] ?? cursor * VERTICAL_GAP;
    const lastY = childYs[childYs.length - 1] ?? firstY;
    const currentY = (firstY + lastY) / 2;

    positionMap.set(nodeId, { x: depth * HORIZONTAL_GAP, y: currentY });
    return currentY;
  };

  roots.forEach((rootId, index) => {
    if (index > 0) {
      cursor += 1;
    }
    placeNode(rootId.id, 0);
  });

  return positionMap;
}

function KnowledgeNode({ data }: NodeProps<KnowledgeNodeData>) {
  return (
    <div
      className={cn(
        "min-w-[136px] max-w-[220px] rounded-2xl border px-3 py-2 backdrop-blur transition-shadow",
        data.selected
          ? "border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--primary)/0.16)] shadow-[0_10px_24px_rgba(74,113,160,0.22)]"
          : "border-[hsl(var(--border)/0.9)] bg-[hsl(var(--card)/0.88)] shadow-[0_8px_20px_rgba(46,72,102,0.12)]",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 7, height: 7, border: 0, background: "hsl(var(--primary) / 0.42)" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 7, height: 7, border: 0, background: "hsl(var(--primary) / 0.42)" }}
      />

      <div className="truncate text-sm font-medium text-[hsl(var(--foreground))]">{data.title}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
        {data.isLeaf ? <span className="rounded-md bg-[hsl(var(--accent))] px-1.5 py-0.5">叶子</span> : null}
        {data.hasRemark ? <span className="rounded-md bg-[hsl(var(--accent))] px-1.5 py-0.5">备注</span> : null}
        {data.highlighted ? <span className="rounded-md bg-[hsl(var(--primary)/0.16)] px-1.5 py-0.5">路径</span> : null}
      </div>
    </div>
  );
}

const memoNode = memo(KnowledgeNode);
const nodeTypes = { knowledge: memoNode };

function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  highlightedNodeIds,
  focusNodeId,
  onNodeSelect,
  onCanvasClick,
}: GraphViewProps) {
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = useState(1);
  const reactFlow = useReactFlow();

  const highlightedSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);

  const positions = useMemo(() => layoutTree(nodes, edges), [nodes, edges]);

  const rfNodes = useMemo<Node<KnowledgeNodeData>[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: "knowledge",
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        data: {
          title: node.title,
          isLeaf: node.isLeaf,
          hasRemark: node.hasRemark,
          selected: node.id === selectedNodeId,
          highlighted: highlightedSet.has(node.id),
        },
      })),
    [highlightedSet, nodes, positions, selectedNodeId],
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => {
        const highlighted = highlightedSet.has(edge.source) && highlightedSet.has(edge.target);
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: false,
          style: {
            stroke: highlighted ? "hsl(var(--primary) / 0.72)" : "hsl(var(--border))",
            strokeWidth: highlighted ? 2.1 : 1.2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: highlighted ? "hsl(var(--primary) / 0.7)" : "hsl(var(--muted-foreground) / 0.35)",
            width: 16,
            height: 16,
          },
        };
      }),
    [edges, highlightedSet],
  );

  useEffect(() => {
    if (!instance) {
      return;
    }

    if (!focusNodeId) {
      return;
    }

    const targetNode = instance.getNode(focusNodeId);
    if (!targetNode) {
      return;
    }

    instance.fitView({
      duration: 280,
      padding: 0.35,
      nodes: [targetNode],
    });
  }, [focusNodeId, instance]);

  useEffect(() => {
    if (!instance || rfNodes.length === 0) {
      return;
    }

    instance.fitView({ duration: 260, padding: 0.28 });
  }, [instance, rfNodes.length]);

  return (
    <Card className="relative h-full rounded-3xl border-[hsl(var(--border)/0.78)] bg-[hsl(var(--card)/0.76)] backdrop-blur">
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] p-1 shadow-[0_10px_24px_rgba(44,70,99,0.12)]">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomOut({ duration: 120 })}>
          <Minus className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => reactFlow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })}
          className="min-w-[58px] rounded-xl px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomIn({ duration: 120 })}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 rounded-xl px-2" onClick={() => reactFlow.fitView({ duration: 220, padding: 0.28 })}>
          <Compass className="mr-1 h-3.5 w-3.5" />
          适配
        </Button>
      </div>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onInit={setInstance}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        onPaneClick={onCanvasClick}
        onMove={(_, viewport) => setZoom(viewport.zoom)}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2.8}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        panOnScroll
        selectionOnDrag={false}
        className="rounded-3xl"
      >
        <Background gap={22} color="rgba(113, 138, 169, 0.2)" />
        <MiniMap
          pannable
          zoomable
          nodeBorderRadius={10}
          style={{
            borderRadius: 16,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card) / 0.9)",
          }}
          maskColor="rgba(193, 211, 230, 0.24)"
        />
      </ReactFlow>
    </Card>
  );
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
