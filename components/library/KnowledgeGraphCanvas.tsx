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
import { buildRadialLayout } from "@/lib/library/graph-layout";
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from "@/lib/library/types";
import { getNodeDescriptionSnippet, KNOWLEDGE_GRAPH_ROOT_ID } from "@/lib/library/tree-adapter";
import { cn } from "@/lib/utils";

type ViewportCommand =
  | { type: "center-root"; tick: number }
  | { type: "fit-all"; tick: number }
  | { type: "focus-node"; tick: number; nodeId: string }
  | { type: "auto-layout"; tick: number };

type CanvasNodeData = {
  label: string;
  level: number;
  count: number;
  descriptionSnippet: string;
  isLeaf: boolean;
  selected: boolean;
  inPath: boolean;
  matched: boolean;
  flashed: boolean;
};

type KnowledgeGraphCanvasProps = {
  rootId: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  nodeMap: Record<string, KnowledgeGraphNode>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  pathNodeIds: Set<string>;
  matchedNodeIds: Set<string>;
  flashNodeId: string | null;
  viewportCommand: ViewportCommand;
  onSelectNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  onToggleNode: (nodeId: string) => void;
};

function levelLabel(level: number) {
  const labels = ["根", "一级", "二级", "三级", "四级", "五级", "六级"];
  return labels[level] ?? `${level}级`;
}

function getHandlePositions(x: number, y: number) {
  if (Math.abs(x) > Math.abs(y)) {
    return x >= 0 ? { source: Position.Right, target: Position.Left } : { source: Position.Left, target: Position.Right };
  }

  return y >= 0 ? { source: Position.Bottom, target: Position.Top } : { source: Position.Top, target: Position.Bottom };
}

function KnowledgeMapNode({
  data,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
}: NodeProps<CanvasNodeData>) {
  const isRoot = data.level === 0;

  return (
    <div
      className={cn(
        "group relative rounded-[22px] border transition-all",
        isRoot
          ? "min-w-[184px] border-[rgba(72,113,162,0.95)] bg-[linear-gradient(135deg,rgba(67,107,155,0.98),rgba(89,130,178,0.96))] px-5 py-4 text-white shadow-[0_18px_42px_rgba(56,93,138,0.34)]"
          : data.selected
            ? "min-w-[168px] border-[rgba(84,128,181,0.86)] bg-[linear-gradient(180deg,rgba(108,150,196,0.96),rgba(92,137,184,0.94))] px-4 py-3 text-white shadow-[0_16px_34px_rgba(59,97,144,0.28)]"
            : data.inPath
              ? "min-w-[156px] border-[rgba(116,156,198,0.82)] bg-[linear-gradient(180deg,rgba(229,239,249,0.98),rgba(214,229,245,0.96))] px-4 py-3 text-[hsl(var(--foreground))] shadow-[0_14px_28px_rgba(73,108,147,0.16)]"
              : "min-w-[148px] border-[hsl(var(--border)/0.78)] bg-[rgba(249,252,255,0.96)] px-4 py-3 text-[hsl(var(--foreground))] shadow-[0_10px_22px_rgba(52,78,109,0.1)]",
        data.isLeaf && !data.selected && !isRoot ? "ring-1 ring-[rgba(130,163,197,0.18)]" : "",
        data.flashed ? "animate-[pulse_1.2s_ease-in-out_2]" : "",
      )}
    >
      <Handle
        type="target"
        position={targetPosition}
        style={{ width: 8, height: 8, border: 0, background: "rgba(106,145,189,0.42)", opacity: 0 }}
      />
      <Handle
        type="source"
        position={sourcePosition}
        style={{ width: 8, height: 8, border: 0, background: "rgba(106,145,189,0.42)", opacity: 0 }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn("truncate text-[13px] font-semibold", isRoot || data.selected ? "text-current" : "text-[hsl(var(--foreground))]")}>{data.label}</div>
          <div className={cn("mt-1 text-[11px]", isRoot || data.selected ? "text-[rgba(233,243,255,0.88)]" : "text-[hsl(var(--muted-foreground))]")}>
            {levelLabel(data.level)} · {data.isLeaf ? "叶子属性" : `${data.count} 个子叶`}
          </div>
        </div>
        {data.matched ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", isRoot || data.selected ? "bg-white/14 text-white" : "bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]")}>
            命中
          </span>
        ) : null}
      </div>

      {data.descriptionSnippet ? (
        <div className={cn("mt-2 line-clamp-2 text-[11px] leading-5", isRoot || data.selected ? "text-[rgba(238,246,255,0.9)]" : "text-[hsl(var(--muted-foreground))]")}>
          {data.descriptionSnippet}
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-1/2 top-0 z-30 w-[220px] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.98)] p-3 text-left opacity-0 shadow-[0_16px_28px_rgba(36,61,89,0.16)] transition group-hover:opacity-100">
        <div className="text-xs font-semibold text-[hsl(var(--foreground))]">{data.label}</div>
        <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{levelLabel(data.level)}</div>
        {data.descriptionSnippet ? <div className="mt-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{data.descriptionSnippet}</div> : null}
      </div>
    </div>
  );
}

const nodeTypes = {
  knowledge: memo(KnowledgeMapNode),
};

function KnowledgeGraphCanvasInner({
  rootId,
  nodes,
  edges,
  nodeMap,
  selectedNodeId,
  hoveredNodeId,
  pathNodeIds,
  matchedNodeIds,
  flashNodeId,
  viewportCommand,
  onSelectNode,
  onHoverNode,
  onToggleNode,
}: KnowledgeGraphCanvasProps) {
  const reactFlow = useReactFlow();
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = useState(0.9);

  const layout = useMemo(() => buildRadialLayout(rootId, nodeMap, nodes.map((node) => node.id), { levelGap: 250 }), [nodeMap, nodes, rootId]);
  const pathSet = useMemo(() => new Set(pathNodeIds), [pathNodeIds]);
  const matchedSet = useMemo(() => new Set(matchedNodeIds), [matchedNodeIds]);

  const rfNodes = useMemo<Node<CanvasNodeData>[]>(
    () =>
      nodes.map((node) => {
        const position = layout[node.id] ?? { x: 0, y: 0 };
        const handlePositions = node.id === KNOWLEDGE_GRAPH_ROOT_ID ? { source: Position.Right, target: Position.Left } : getHandlePositions(position.x, position.y);

        return {
          id: node.id,
          type: "knowledge",
          position,
          sourcePosition: handlePositions.source,
          targetPosition: handlePositions.target,
          draggable: false,
          selectable: true,
          data: {
            label: node.label,
            level: node.level,
            count: node.count,
            descriptionSnippet: getNodeDescriptionSnippet(node, node.level <= 1 ? 64 : 46),
            isLeaf: node.isLeaf,
            selected: node.id === selectedNodeId,
            inPath: pathSet.has(node.id),
            matched: matchedSet.has(node.id),
            flashed: flashNodeId === node.id,
          },
        };
      }),
    [flashNodeId, layout, matchedSet, nodes, pathSet, selectedNodeId],
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => {
        const sourceNode = nodeMap[edge.source];
        const targetNode = nodeMap[edge.target];
        const inPath = pathSet.has(edge.source) && pathSet.has(edge.target) && targetNode?.pathIds.includes(edge.source);
        const adjacent = hoveredNodeId ? edge.source === hoveredNodeId || edge.target === hoveredNodeId : false;

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          animated: false,
          style: {
            stroke: inPath ? "rgba(72,115,165,0.9)" : adjacent ? "rgba(93,132,177,0.76)" : "rgba(157,181,207,0.56)",
            strokeWidth: inPath ? 2.3 : adjacent ? 1.7 : 1.15,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: inPath ? "rgba(72,115,165,0.9)" : "rgba(157,181,207,0.56)",
          },
          zIndex: inPath ? 8 : 1,
          interactionWidth: 18,
          data: { sourceNode, targetNode },
        };
      }),
    [edges, hoveredNodeId, nodeMap, pathSet],
  );

  useEffect(() => {
    if (!instance) {
      return;
    }

    if (viewportCommand.type === "center-root") {
      instance.setCenter(0, 0, { zoom: 0.88, duration: 260 });
      return;
    }

    if (viewportCommand.type === "fit-all" || viewportCommand.type === "auto-layout") {
      instance.fitView({ padding: 0.24, duration: 260 });
      return;
    }

    if (viewportCommand.type === "focus-node") {
      const target = instance.getNode(viewportCommand.nodeId);
      if (!target) {
        return;
      }

      instance.setCenter(target.position.x + 80, target.position.y + 48, { zoom: 1.08, duration: 260 });
    }
  }, [instance, viewportCommand]);

  useEffect(() => {
    if (!instance || rfNodes.length === 0) {
      return;
    }

    instance.setCenter(0, 0, { zoom: 0.88, duration: 0 });
  }, [instance, rfNodes.length]);

  return (
    <Card className="relative h-full rounded-[30px] border-[hsl(var(--border)/0.74)] bg-[hsl(var(--card)/0.72)] shadow-[0_18px_40px_rgba(43,69,98,0.1)]">
      <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_18%_18%,rgba(111,153,196,0.18),transparent_28%),radial-gradient(circle_at_84%_82%,rgba(167,193,221,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.88)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] shadow-[0_12px_24px_rgba(49,75,109,0.1)] backdrop-blur">
        root 固定为中心语义节点，双击任意节点可展开或收起子树。
      </div>

      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] p-1 shadow-[0_12px_24px_rgba(49,75,109,0.12)]">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomOut({ duration: 140 })}>
          <Minus className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="min-w-[54px] rounded-xl px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.9)]"
          onClick={() => reactFlow.setCenter(0, 0, { zoom: 0.88, duration: 220 })}
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomIn({ duration: 140 })}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl px-2" onClick={() => reactFlow.fitView({ padding: 0.24, duration: 220 })}>
          <Compass className="mr-1 h-3.5 w-3.5" />
          适配
        </Button>
      </div>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onInit={setInstance}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onNodeDoubleClick={(_, node) => onToggleNode(node.id)}
        onNodeMouseEnter={(_, node) => onHoverNode(node.id)}
        onNodeMouseLeave={() => onHoverNode(null)}
        onPaneClick={() => onHoverNode(null)}
        onMove={(_, viewport) => setZoom(viewport.zoom)}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 0.88 }}
        minZoom={0.26}
        maxZoom={1.8}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        panOnScroll
        zoomOnDoubleClick={false}
        selectionOnDrag={false}
        fitView={false}
        className="rounded-[30px]"
      >
        <Background gap={34} color="rgba(117, 142, 173, 0.16)" />
        <MiniMap
          pannable
          zoomable
          nodeBorderRadius={18}
          maskColor="rgba(186, 206, 228, 0.22)"
          style={{
            borderRadius: 18,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card) / 0.92)",
          }}
        />
      </ReactFlow>
    </Card>
  );
}

export function KnowledgeGraphCanvas(props: KnowledgeGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
