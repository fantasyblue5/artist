"use client";

import { memo, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  BaseEdge,
  ReactFlowProvider,
  getStraightPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import { LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GRAPH_ROOT_LABEL } from "@/lib/graph-data";
import { buildRadialTreeLayout } from "@/lib/graph-layout";
import type { GraphEdgeRecord, GraphNodePosition, GraphNodeRecord } from "@/lib/resource-types";
import { GraphNode, type GraphCanvasNodeData, type GraphNodeTone } from "@/components/graph/GraphNode";

type ViewportCommand =
  | { type: "center-root"; tick: number }
  | { type: "focus-node"; tick: number; nodeId: string }
  | { type: "fit-all"; tick: number };

type GraphCanvasProps = {
  rootId: string;
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
  nodeMap: Record<string, GraphNodeRecord>;
  selectedNodeId: string | null;
  pathNodeIds: Set<string>;
  matchedNodeIds: Set<string>;
  viewportCommand: ViewportCommand;
  nodePositions: Record<string, GraphNodePosition>;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
  onNodePositionChange: (nodeId: string, position: GraphNodePosition) => void;
};

type GraphEdgeTone = {
  defaultStroke: string;
  activeStroke: string;
};

const BRANCH_TONES: Record<string, { gradientFrom: string; gradientTo: string; border: string; text: string; edge: string; edgeActive: string; glow: string; badge: string; badgeText: string }> = {
  构图: {
    gradientFrom: "rgba(216,228,239,0.98)",
    gradientTo: "rgba(205,220,235,0.96)",
    border: "rgba(159,183,205,0.9)",
    text: "rgba(42,62,82,0.96)",
    edge: "rgba(138,166,194,0.52)",
    edgeActive: "rgba(96,131,168,0.82)",
    glow: "rgba(122,154,188,0.22)",
    badge: "rgba(255,255,255,0.7)",
    badgeText: "rgba(58,88,117,0.92)",
  },
  光影: {
    gradientFrom: "rgba(237,230,218,0.98)",
    gradientTo: "rgba(230,221,206,0.96)",
    border: "rgba(199,181,152,0.88)",
    text: "rgba(86,69,44,0.96)",
    edge: "rgba(189,171,136,0.52)",
    edgeActive: "rgba(154,129,82,0.82)",
    glow: "rgba(188,168,129,0.2)",
    badge: "rgba(255,248,239,0.8)",
    badgeText: "rgba(118,95,58,0.94)",
  },
  色彩关系: {
    gradientFrom: "rgba(234,225,229,0.98)",
    gradientTo: "rgba(224,213,219,0.96)",
    border: "rgba(192,166,176,0.88)",
    text: "rgba(88,60,74,0.96)",
    edge: "rgba(183,156,168,0.52)",
    edgeActive: "rgba(148,104,124,0.82)",
    glow: "rgba(183,148,163,0.2)",
    badge: "rgba(255,248,251,0.82)",
    badgeText: "rgba(118,78,95,0.94)",
  },
  笔触与肌理: {
    gradientFrom: "rgba(225,234,231,0.98)",
    gradientTo: "rgba(213,226,220,0.96)",
    border: "rgba(169,193,183,0.88)",
    text: "rgba(54,79,72,0.96)",
    edge: "rgba(153,180,170,0.52)",
    edgeActive: "rgba(95,139,125,0.82)",
    glow: "rgba(140,175,163,0.2)",
    badge: "rgba(244,252,249,0.84)",
    badgeText: "rgba(73,111,98,0.94)",
  },
  形状形态: {
    gradientFrom: "rgba(229,235,224,0.98)",
    gradientTo: "rgba(218,227,212,0.96)",
    border: "rgba(178,194,165,0.88)",
    text: "rgba(67,82,54,0.96)",
    edge: "rgba(164,181,150,0.52)",
    edgeActive: "rgba(116,146,90,0.82)",
    glow: "rgba(159,177,140,0.2)",
    badge: "rgba(247,252,242,0.84)",
    badgeText: "rgba(86,112,63,0.94)",
  },
  边缘关系: {
    gradientFrom: "rgba(224,232,236,0.98)",
    gradientTo: "rgba(211,221,228,0.96)",
    border: "rgba(167,183,195,0.88)",
    text: "rgba(55,72,88,0.96)",
    edge: "rgba(149,170,186,0.52)",
    edgeActive: "rgba(97,125,150,0.82)",
    glow: "rgba(146,166,183,0.2)",
    badge: "rgba(245,249,252,0.84)",
    badgeText: "rgba(76,102,125,0.94)",
  },
  透视空间: {
    gradientFrom: "rgba(226,229,238,0.98)",
    gradientTo: "rgba(214,219,232,0.96)",
    border: "rgba(172,181,204,0.88)",
    text: "rgba(57,66,92,0.96)",
    edge: "rgba(157,168,196,0.52)",
    edgeActive: "rgba(108,123,170,0.82)",
    glow: "rgba(152,164,196,0.2)",
    badge: "rgba(245,247,255,0.84)",
    badgeText: "rgba(79,92,137,0.94)",
  },
};

const ROOT_TONE: GraphNodeTone = {
  background: "linear-gradient(135deg, rgba(73,110,161,0.98), rgba(58,92,140,0.98))",
  border: "rgba(58,93,143,0.96)",
  text: "rgba(255,255,255,0.98)",
  glow: "rgba(82,118,168,0.3)",
  badgeBackground: "rgba(255,255,255,0.16)",
  badgeText: "rgba(255,255,255,0.96)",
};

const FALLBACK_BRANCH_TONE = BRANCH_TONES["边缘关系"];

function resolveBranchLabel(node: GraphNodeRecord) {
  return node.path[1] ?? GRAPH_ROOT_LABEL;
}

function mixBranchTone(node: GraphNodeRecord): GraphNodeTone {
  if (node.level === 0) {
    return ROOT_TONE;
  }

  const branchTone = BRANCH_TONES[resolveBranchLabel(node)] ?? FALLBACK_BRANCH_TONE;
  const isLevelOne = node.level === 1;

  return {
    background: isLevelOne
      ? `linear-gradient(135deg, ${branchTone.gradientFrom}, ${branchTone.gradientTo})`
      : `linear-gradient(135deg, rgba(255,255,255,0.94), ${branchTone.gradientFrom})`,
    border: branchTone.border,
    text: branchTone.text,
    glow: branchTone.glow,
    badgeBackground: branchTone.badge,
    badgeText: branchTone.badgeText,
  };
}

function resolveEdgeTone(edge: GraphEdgeRecord, nodeMap: Record<string, GraphNodeRecord>): GraphEdgeTone {
  const targetNode = nodeMap[edge.target];
  const branchTone = targetNode ? BRANCH_TONES[resolveBranchLabel(targetNode)] ?? FALLBACK_BRANCH_TONE : FALLBACK_BRANCH_TONE;

  return {
    defaultStroke: branchTone.edge,
    activeStroke: branchTone.edgeActive,
  };
}

function StraightGraphEdge({ id, sourceX, sourceY, targetX, targetY, selected, data }: EdgeProps<GraphEdgeTone>) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected ? data?.activeStroke ?? "rgba(84,118,161,0.74)" : data?.defaultStroke ?? "rgba(136,153,176,0.44)",
        strokeWidth: selected ? 2.8 : 2.05,
      }}
    />
  );
}

const nodeTypes = { knowledge: memo(GraphNode) };
const edgeTypes = { straightLine: StraightGraphEdge };

function getHandleSide(x: number, y: number) {
  if (Math.abs(x) > Math.abs(y)) {
    return x >= 0 ? "right" : "left";
  }
  return y >= 0 ? "bottom" : "top";
}

function getHandleIds(sourcePosition: GraphNodePosition, targetPosition: GraphNodePosition) {
  const deltaX = targetPosition.x - sourcePosition.x;
  const deltaY = targetPosition.y - sourcePosition.y;
  const sourceSide = getHandleSide(deltaX, deltaY);
  const targetSide = getHandleSide(-deltaX, -deltaY);

  return {
    sourceHandle: `source-${sourceSide}`,
    targetHandle: `target-${targetSide}`,
  };
}

function GraphCanvasInner({
  rootId,
  nodes,
  edges,
  nodeMap,
  selectedNodeId,
  pathNodeIds,
  matchedNodeIds,
  viewportCommand,
  nodePositions,
  onSelectNode,
  onToggleNode,
  onNodePositionChange,
}: GraphCanvasProps) {
  const reactFlow = useReactFlow();
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = useState(1.02);

  const layout = useMemo(
    () =>
      buildRadialTreeLayout(rootId, nodeMap, nodes.map((node) => node.id), {
        levelGap: 310,
        rootRadius: 24,
        anglePadding: 0.12,
        nodeWidth: 188,
        minAngleGap: 0.24,
        branchFanAngle: 1.18,
      }),
    [nodeMap, nodes, rootId],
  );
  const pathSet = useMemo(() => new Set(pathNodeIds), [pathNodeIds]);
  const matchedSet = useMemo(() => new Set(matchedNodeIds), [matchedNodeIds]);
  const resolvedPositions = useMemo(
    () =>
      Object.fromEntries(
        nodes.map((node) => [node.id, nodePositions[node.id] ?? layout[node.id] ?? { x: 0, y: 0 }]),
      ) as Record<string, GraphNodePosition>,
    [layout, nodePositions, nodes],
  );

  const flowNodes = useMemo<Node<GraphCanvasNodeData>[]>(
    () =>
      nodes.map((node) => {
        const position = resolvedPositions[node.id] ?? { x: 0, y: 0 };
        return {
          id: node.id,
          type: "knowledge",
          position,
          draggable: true,
          selectable: true,
          data: {
            label: node.label,
            level: node.level,
            selected: node.id === selectedNodeId,
            inPath: pathSet.has(node.id),
            matched: matchedSet.has(node.id),
            tone: mixBranchTone(node),
          },
        };
      }),
    [matchedSet, nodes, pathSet, resolvedPositions, selectedNodeId],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => {
        const sourcePosition = resolvedPositions[edge.source] ?? { x: 0, y: 0 };
        const targetPosition = resolvedPositions[edge.target] ?? { x: 0, y: 0 };
        const handles = getHandleIds(sourcePosition, targetPosition);
        const inPath = pathSet.has(edge.source) && pathSet.has(edge.target);
        const edgeTone = resolveEdgeTone(edge, nodeMap);
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "straightLine",
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          selected: inPath,
          data: edgeTone,
        };
      }),
    [edges, nodeMap, pathSet, resolvedPositions],
  );

  useEffect(() => {
    if (!instance) {
      return;
    }

    if (viewportCommand.type === "center-root") {
      instance.setCenter(0, 0, { zoom: 1.02, duration: 220 });
      return;
    }

    if (viewportCommand.type === "fit-all") {
      instance.fitView({ padding: 0.22, duration: 220 });
      return;
    }

    const node = instance.getNode(viewportCommand.nodeId);
    if (node) {
      const width = node.width ?? 0;
      const height = node.height ?? 0;
      instance.setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom: 1.08, duration: 220 });
    }
  }, [instance, viewportCommand]);

  return (
    <Card className="relative h-full overflow-hidden rounded-[30px] border-[hsl(var(--border)/0.62)] bg-[linear-gradient(180deg,rgba(252,254,255,0.98),rgba(243,248,253,0.96))] shadow-[0_24px_60px_rgba(30,52,80,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.75),transparent_58%),radial-gradient(circle_at_18%_18%,rgba(126,160,204,0.08),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(215,187,150,0.08),transparent_24%)]" />
      <div className="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-[hsl(var(--border)/0.72)] bg-white/88 p-1 shadow-[0_12px_28px_rgba(34,56,84,0.08)] backdrop-blur">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomOut({ duration: 120 })}>
          <Minus className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="min-w-[54px] rounded-xl px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.7)]"
          onClick={() => reactFlow.setCenter(0, 0, { zoom: 1.02, duration: 220 })}
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomIn({ duration: 120 })}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl px-2" onClick={() => reactFlow.fitView({ padding: 0.22, duration: 180 })}>
          <LocateFixed className="mr-1 h-3.5 w-3.5" />
          适配
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl px-2" onClick={() => reactFlow.setCenter(0, 0, { zoom: 1.02, duration: 220 })}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          重置视图
        </Button>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onInit={setInstance}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onNodeDoubleClick={(_, node) => onToggleNode(node.id)}
        onNodeDragStop={(_, node) => onNodePositionChange(node.id, node.position)}
        onMoveEnd={(_, viewport) => setZoom(viewport.zoom)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1.02 }}
        minZoom={0.28}
        maxZoom={2.1}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
        nodesFocusable={false}
        panOnDrag
        panOnScroll
        zoomOnDoubleClick={false}
        selectionOnDrag={false}
        fitView={false}
        onlyRenderVisibleElements
        elevateNodesOnSelect={false}
        nodeDragThreshold={1}
        className="rounded-[30px]"
      >
        <Background gap={48} color="rgba(122,145,171,0.16)" />
      </ReactFlow>
    </Card>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
