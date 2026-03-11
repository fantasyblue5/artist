"use client";

import { memo, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  BaseEdge,
  MiniMap,
  Position,
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
import { buildRadialTreeLayout } from "@/lib/graph-layout";
import type { GraphEdgeRecord, GraphNodePosition, GraphNodeRecord } from "@/lib/resource-types";
import { GRAPH_ROOT_ID } from "@/lib/graph-data";
import { GraphNode, type GraphCanvasNodeData } from "@/components/graph/GraphNode";

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
  hoveredNodeId: string | null;
  pathNodeIds: Set<string>;
  matchedNodeIds: Set<string>;
  viewportCommand: ViewportCommand;
  nodePositions: Record<string, GraphNodePosition>;
  onSelectNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  onToggleNode: (nodeId: string) => void;
  onNodePositionChange: (nodeId: string, position: GraphNodePosition) => void;
};

function StraightGraphEdge({ id, sourceX, sourceY, targetX, targetY, selected }: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected ? "rgba(95,128,166,0.58)" : "rgba(145,161,181,0.3)",
        strokeWidth: selected ? 1.2 : 1,
      }}
    />
  );
}

const nodeTypes = { knowledge: memo(GraphNode) };
const edgeTypes = { straightLine: StraightGraphEdge };

function getHandlePosition(x: number, y: number) {
  if (Math.abs(x) > Math.abs(y)) {
    return x >= 0 ? { source: Position.Right, target: Position.Left } : { source: Position.Left, target: Position.Right };
  }
  return y >= 0 ? { source: Position.Bottom, target: Position.Top } : { source: Position.Top, target: Position.Bottom };
}

function GraphCanvasInner({
  rootId,
  nodes,
  edges,
  nodeMap,
  selectedNodeId,
  hoveredNodeId,
  pathNodeIds,
  matchedNodeIds,
  viewportCommand,
  nodePositions,
  onSelectNode,
  onHoverNode,
  onToggleNode,
  onNodePositionChange,
}: GraphCanvasProps) {
  const reactFlow = useReactFlow();
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = useState(0.9);

  const layout = useMemo(() => buildRadialTreeLayout(rootId, nodeMap, nodes.map((node) => node.id), { levelGap: 220 }), [nodeMap, nodes, rootId]);
  const pathSet = useMemo(() => new Set(pathNodeIds), [pathNodeIds]);
  const matchedSet = useMemo(() => new Set(matchedNodeIds), [matchedNodeIds]);

  const flowNodes = useMemo<Node<GraphCanvasNodeData>[]>(
    () =>
      nodes.map((node) => {
        const position = nodePositions[node.id] ?? layout[node.id] ?? { x: 0, y: 0 };
        const handles = node.id === GRAPH_ROOT_ID ? { source: Position.Right, target: Position.Left } : getHandlePosition(position.x, position.y);
        return {
          id: node.id,
          type: "knowledge",
          position,
          sourcePosition: handles.source,
          targetPosition: handles.target,
          draggable: true,
          selectable: true,
          data: {
            label: node.label,
            level: node.level,
            count: node.count,
            description: node.description ?? "",
            isLeaf: node.isLeaf,
            selected: node.id === selectedNodeId,
            inPath: pathSet.has(node.id),
            matched: matchedSet.has(node.id),
          },
        };
      }),
    [layout, matchedSet, nodePositions, nodes, pathSet, selectedNodeId],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => {
        const inPath = pathSet.has(edge.source) && pathSet.has(edge.target);
        const nearHovered = hoveredNodeId ? edge.source === hoveredNodeId || edge.target === hoveredNodeId : false;
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "straightLine",
          selected: inPath || nearHovered,
        };
      }),
    [edges, hoveredNodeId, pathSet],
  );

  useEffect(() => {
    if (!instance) {
      return;
    }

    if (viewportCommand.type === "center-root") {
      instance.setCenter(0, 0, { zoom: 0.9, duration: 220 });
      return;
    }

    if (viewportCommand.type === "fit-all") {
      instance.fitView({ padding: 0.28, duration: 220 });
      return;
    }

    const node = instance.getNode(viewportCommand.nodeId);
    if (node) {
      instance.setCenter(node.position.x + 70, node.position.y + 48, { zoom: 1.04, duration: 220 });
    }
  }, [instance, viewportCommand]);

  return (
    <Card className="relative h-full rounded-[28px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.82)] shadow-[0_10px_26px_rgba(40,62,88,0.05)]">
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.96)] p-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomOut({ duration: 120 })}>
          <Minus className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="min-w-[54px] rounded-xl px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.7)]"
          onClick={() => reactFlow.setCenter(0, 0, { zoom: 0.9, duration: 220 })}
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomIn({ duration: 120 })}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl px-2" onClick={() => reactFlow.fitView({ padding: 0.28, duration: 180 })}>
          <LocateFixed className="mr-1 h-3.5 w-3.5" />
          适配
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl px-2" onClick={() => reactFlow.setCenter(0, 0, { zoom: 0.9, duration: 220 })}>
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
        onNodeMouseEnter={(_, node) => onHoverNode(node.id)}
        onNodeMouseLeave={() => onHoverNode(null)}
        onNodeDragStop={(_, node) => onNodePositionChange(node.id, node.position)}
        onPaneClick={() => onHoverNode(null)}
        onMove={(_, viewport) => setZoom(viewport.zoom)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        minZoom={0.28}
        maxZoom={1.8}
        nodesDraggable
        nodesConnectable={false}
        panOnDrag
        panOnScroll
        zoomOnDoubleClick={false}
        selectionOnDrag={false}
        fitView={false}
        className="rounded-[28px]"
      >
        <Background gap={42} color="rgba(135,153,175,0.12)" />
        <MiniMap
          pannable
          zoomable
          nodeBorderRadius={14}
          style={{
            borderRadius: 16,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card) / 0.96)",
          }}
          maskColor="rgba(190, 206, 224, 0.18)"
        />
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
