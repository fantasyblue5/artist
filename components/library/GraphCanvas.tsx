"use client";

import { memo, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import { Compass, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraphEdge } from "@/components/library/GraphEdge";
import { GraphNode, type GraphNodeData } from "@/components/library/GraphNode";
import { buildRadialLayout } from "@/lib/library/graph-layout";
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from "@/lib/library/types";
import { getNodeDescriptionSnippet, KNOWLEDGE_GRAPH_ROOT_ID } from "@/lib/library/tree-adapter";

type ViewportCommand =
  | { type: "center-root"; tick: number }
  | { type: "fit-all"; tick: number }
  | { type: "focus-node"; tick: number; nodeId: string }
  | { type: "auto-layout"; tick: number };

type GraphCanvasProps = {
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

const nodeTypes = {
  knowledge: memo(GraphNode),
};

const edgeTypes = {
  straightEdge: GraphEdge,
};

function getHandlePositions(x: number, y: number) {
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
  flashNodeId,
  viewportCommand,
  onSelectNode,
  onHoverNode,
  onToggleNode,
}: GraphCanvasProps) {
  const reactFlow = useReactFlow();
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = useState(0.92);

  const layout = useMemo(() => buildRadialLayout(rootId, nodeMap, nodes.map((node) => node.id), { levelGap: 250 }), [nodeMap, nodes, rootId]);
  const pathSet = useMemo(() => new Set(pathNodeIds), [pathNodeIds]);
  const matchedSet = useMemo(() => new Set(matchedNodeIds), [matchedNodeIds]);

  const rfNodes = useMemo<Node<GraphNodeData>[]>(
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
        const targetNode = nodeMap[edge.target];
        const inPath = pathSet.has(edge.source) && pathSet.has(edge.target) && targetNode?.pathIds.includes(edge.source);
        const adjacent = hoveredNodeId ? edge.source === hoveredNodeId || edge.target === hoveredNodeId : false;

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "straightEdge",
          animated: false,
          selected: inPath || adjacent,
          style: {
            stroke: inPath ? "rgba(72,115,165,0.74)" : adjacent ? "rgba(96,131,170,0.46)" : "rgba(145,161,181,0.3)",
            strokeWidth: inPath ? 1.6 : adjacent ? 1.2 : 1,
          },
        };
      }),
    [edges, hoveredNodeId, nodeMap, pathSet],
  );

  useEffect(() => {
    if (!instance) {
      return;
    }

    if (viewportCommand.type === "center-root") {
      instance.setCenter(0, 0, { zoom: 0.92, duration: 260 });
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
      instance.setCenter(target.position.x + 80, target.position.y + 48, { zoom: 1.05, duration: 260 });
    }
  }, [instance, viewportCommand]);

  useEffect(() => {
    if (!instance || rfNodes.length === 0) {
      return;
    }
    instance.setCenter(0, 0, { zoom: 0.92, duration: 0 });
  }, [instance, rfNodes.length]);

  return (
    <Card className="relative h-full rounded-[30px] border-[hsl(var(--border)/0.74)] bg-[hsl(var(--card)/0.72)] shadow-[0_18px_40px_rgba(43,69,98,0.1)]">
      <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_18%_18%,rgba(111,153,196,0.18),transparent_28%),radial-gradient(circle_at_84%_82%,rgba(167,193,221,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.88)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] shadow-[0_12px_24px_rgba(49,75,109,0.1)] backdrop-blur">
        root 固定在中心，默认只展开一级节点，双击任意节点向外扩展子节点。
      </div>

      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] p-1 shadow-[0_12px_24px_rgba(49,75,109,0.12)]">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => reactFlow.zoomOut({ duration: 140 })}>
          <Minus className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="min-w-[54px] rounded-xl px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.9)]"
          onClick={() => reactFlow.setCenter(0, 0, { zoom: 0.92, duration: 220 })}
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
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 0.92 }}
        minZoom={0.28}
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

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
