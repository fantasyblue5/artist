"use client";

import dynamic from "next/dynamic";
import { LocateFixed, Minus, Plus, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import type { KnowledgeGraphLink, KnowledgeGraphNode } from "@/lib/library/types";
import type { ForceGraphMethods, ForceGraphProps } from "react-force-graph-2d";

type RenderNode = KnowledgeGraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

type RenderLink = {
  id: string;
  source: string | RenderNode;
  target: string | RenderNode;
};

type KnowledgeGraphProps = {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
  selectedNodeId: string | null;
  hoverNodeId: string | null;
  matchedNodeIds: Set<string>;
  focusNodeId: string | null;
  focusTick: number;
  onSelectNode: (nodeId: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
};

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});
const TypedForceGraph2D = ForceGraph2D as unknown as ComponentType<ForceGraphProps<RenderNode, RenderLink>>;

function getEntityId(entity: string | RenderNode | null | undefined) {
  if (!entity) {
    return "";
  }
  if (typeof entity === "string") {
    return entity;
  }
  return String(entity.id ?? "");
}

function hasPoint(node: RenderNode) {
  return typeof node.x === "number" && typeof node.y === "number";
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function colorByLevel(level: number) {
  if (level <= 0) {
    return {
      fill: "rgba(53, 87, 126, 0.96)",
      stroke: "rgba(221, 235, 252, 0.96)",
      text: "rgba(245, 250, 255, 0.98)",
      subtext: "rgba(215, 229, 245, 0.9)",
    };
  }

  if (level === 1) {
    return {
      fill: "rgba(84, 127, 171, 0.94)",
      stroke: "rgba(233, 243, 255, 0.94)",
      text: "rgba(247, 251, 255, 0.98)",
      subtext: "rgba(223, 236, 249, 0.92)",
    };
  }

  if (level === 2) {
    return {
      fill: "rgba(103, 145, 188, 0.9)",
      stroke: "rgba(229, 240, 251, 0.92)",
      text: "rgba(245, 250, 255, 0.96)",
      subtext: "rgba(218, 232, 246, 0.88)",
    };
  }

  return {
    fill: "rgba(240, 246, 253, 0.96)",
    stroke: "rgba(146, 174, 203, 0.92)",
    text: "rgba(47, 70, 98, 0.96)",
    subtext: "rgba(88, 114, 145, 0.9)",
  };
}

function clipText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function getLeafPreview(description: string | null) {
  if (!description) {
    return "";
  }

  const compact = description
    .replace(/\s+/g, " ")
    .replace(/^定义[:：]\s*/, "")
    .trim();

  if (!compact) {
    return "";
  }

  const firstSentence = compact.split(/[；。]/)[0]?.trim() ?? compact;
  return clipText(firstSentence, 18);
}

export function KnowledgeGraph({
  nodes,
  links,
  selectedNodeId,
  hoverNodeId,
  matchedNodeIds,
  focusNodeId,
  focusTick,
  onSelectNode,
  onHoverNode,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphMethods<RenderNode, RenderLink> | null>(null);
  const hasAutoFit = useRef(false);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [graphData, setGraphData] = useState<{ nodes: RenderNode[]; links: RenderLink[] }>({ nodes: [], links: [] });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setViewport({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setGraphData((prev) => {
      const prevById = new Map(prev.nodes.map((node) => [node.id, node]));
      const nextNodes = nodes.map((node) => {
        const prevNode = prevById.get(node.id);
        return {
          ...node,
          x: prevNode?.x,
          y: prevNode?.y,
          vx: prevNode?.vx,
          vy: prevNode?.vy,
        };
      });

      const nextLinks = links.map((link) => ({
        id: link.id,
        source: link.source,
        target: link.target,
      }));

      hasAutoFit.current = false;
      return { nodes: nextNodes, links: nextLinks };
    });
  }, [links, nodes]);

  const nodesById = useMemo(() => {
    return new Map(graphData.nodes.map((node) => [node.id, node]));
  }, [graphData.nodes]);

  const highlighted = useMemo(() => {
    const activeNodeIds = [hoverNodeId, selectedNodeId].filter((value): value is string => Boolean(value));
    const nodeIds = new Set<string>();
    const linkIds = new Set<string>();

    for (const link of graphData.links) {
      const sourceId = getEntityId(link.source);
      const targetId = getEntityId(link.target);

      for (const activeId of activeNodeIds) {
        if (sourceId === activeId || targetId === activeId) {
          nodeIds.add(sourceId);
          nodeIds.add(targetId);
          linkIds.add(link.id);
          break;
        }
      }
    }

    return { nodeIds, linkIds };
  }, [graphData.links, hoverNodeId, selectedNodeId]);

  const levelDistance = useMemo(() => {
    const base = Math.min(viewport.width, viewport.height);
    if (!base) {
      return 150;
    }
    return Math.max(135, Math.min(195, base / 4.4));
  }, [viewport.height, viewport.width]);

  useEffect(() => {
    if (hasAutoFit.current || !graphRef.current || graphData.nodes.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      graphRef.current?.zoomToFit(640, 110);
      hasAutoFit.current = true;
    }, 360);

    return () => {
      window.clearTimeout(timer);
    };
  }, [graphData.nodes.length, levelDistance, viewport.height, viewport.width]);

  useEffect(() => {
    if (!graphRef.current || !focusNodeId) {
      return;
    }

    const focus = () => {
      const node = nodesById.get(focusNodeId);
      if (!node || !hasPoint(node)) {
        return false;
      }

      graphRef.current?.centerAt(node.x, node.y, 560);
      const targetZoom = node.level <= 1 ? Math.max(0.95, zoom) : Math.max(1.25, zoom);
      graphRef.current?.zoom(Math.min(3.4, targetZoom), 320);
      return true;
    };

    if (focus()) {
      return;
    }

    const retryTimer = window.setTimeout(() => {
      focus();
    }, 260);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [focusNodeId, focusTick, nodesById, zoom]);

  const canRender = viewport.width > 0 && viewport.height > 0;

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[420px] overflow-hidden rounded-3xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.72)] shadow-[0_18px_40px_rgba(47,72,104,0.12)]"
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_18%,rgba(114,154,196,0.22),transparent_34%),radial-gradient(circle_at_82%_82%,rgba(170,197,223,0.16),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(132,161,194,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(132,161,194,0.14)_1px,transparent_1px)] bg-[size:34px_34px]" />

      <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.84)] px-3 py-2 text-xs leading-5 text-[hsl(var(--muted-foreground))] shadow-[0_12px_24px_rgba(49,75,109,0.1)] backdrop-blur">
        中心节点是评价体系，可拖拽查看，滚轮缩放，点击末级节点查看具体说明。
      </div>

      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.9)] p-1 shadow-[0_12px_24px_rgba(49,75,109,0.14)] backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => graphRef.current?.zoom(Math.max(0.35, zoom * 0.82), 160)}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <button
          type="button"
          className="min-w-[54px] rounded-xl px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.9)]"
          onClick={() => {
            graphRef.current?.centerAt(0, 0, 320);
            graphRef.current?.zoom(1, 320);
          }}
        >
          {Math.round(zoom * 100)}%
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => graphRef.current?.zoom(Math.min(5, zoom * 1.22), 160)}
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-xl px-2"
          onClick={() => graphRef.current?.zoomToFit(520, 100)}
        >
          <LocateFixed className="mr-1 h-3.5 w-3.5" />
          适配
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-xl px-2"
          onClick={() => {
            graphRef.current?.centerAt(0, 0, 360);
            graphRef.current?.zoom(1, 320);
            graphRef.current?.zoomToFit(560, 100);
          }}
        >
          <RefreshCcw className="mr-1 h-3.5 w-3.5" />
          重置
        </Button>
      </div>

      {canRender ? (
        <div className="relative z-10 h-full w-full">
          <TypedForceGraph2D
            ref={graphRef}
            width={viewport.width}
            height={viewport.height}
            graphData={graphData}
            nodeRelSize={18}
            dagMode="radialout"
            dagLevelDistance={levelDistance}
            nodeCanvasObjectMode={() => "replace"}
            linkDirectionalArrowLength={0}
            linkDirectionalArrowRelPos={1}
            enablePanInteraction
            enableZoomInteraction
            enableNodeDrag
            cooldownTicks={180}
            onZoomEnd={(transform) => {
              setZoom(transform.k);
            }}
            onNodeClick={(node) => {
              const nodeId = typeof node.id === "string" ? node.id : String(node.id ?? "");
              if (!nodeId) {
                return;
              }
              onSelectNode(nodeId);
            }}
            onNodeHover={(node) => {
              const nodeId = node ? (typeof node.id === "string" ? node.id : String(node.id ?? "")) : "";
              onHoverNode(nodeId || null);
            }}
            onBackgroundClick={() => {
              onSelectNode(null);
              onHoverNode(null);
            }}
            linkWidth={(link) => (highlighted.linkIds.has(link.id) ? 2.6 : 1.35)}
            linkColor={(link) => {
              if (highlighted.linkIds.has(link.id)) {
                return "rgba(63, 108, 159, 0.9)";
              }
              return "rgba(145, 171, 198, 0.58)";
            }}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const x = node.x ?? 0;
              const y = node.y ?? 0;

              const hovered = hoverNodeId === node.id;
              const selected = selectedNodeId === node.id;
              const matched = matchedNodeIds.has(node.id);
              const connected = highlighted.nodeIds.has(node.id);
              const isRoot = node.level === 0;

              const palette = colorByLevel(node.level);
              const titlePx = isRoot ? 20 : node.level === 1 ? 15 : 13;
              const metaPx = isRoot ? 12 : 11;
              const titleSize = titlePx / globalScale;
              const metaSize = metaPx / globalScale;
              const radius = (isRoot ? 11 : node.level === 1 ? 8.5 : 6.5) / globalScale;

              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.fillStyle = isRoot ? "rgba(71, 115, 163, 0.96)" : "rgba(113, 152, 192, 0.92)";
              ctx.fill();

              if (selected || hovered) {
                ctx.beginPath();
                ctx.arc(x, y, radius + 6 / globalScale, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(84, 129, 178, 0.16)";
                ctx.fill();
              }

              const showTitle = isRoot || node.level <= 1 || selected || hovered || matched || globalScale > 0.8;
              if (!showTitle) {
                return;
              }

              const leafPreview = node.isLeaf ? getLeafPreview(node.description) : "";
              const showPreview = Boolean(leafPreview) && (selected || hovered || globalScale > 1.35);

              const titleText = clipText(node.name, isRoot ? 14 : node.level === 1 ? 16 : 18);

              ctx.font = `600 ${titleSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
              const titleWidth = ctx.measureText(titleText).width;

              let previewWidth = 0;
              if (showPreview) {
                ctx.font = `500 ${metaSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
                previewWidth = ctx.measureText(leafPreview).width;
              }

              const horizontalPadding = (isRoot ? 18 : 14) / globalScale;
              const verticalPadding = (isRoot ? 12 : 10) / globalScale;
              const lineGap = showPreview ? 6 / globalScale : 0;
              const boxWidth = Math.max(titleWidth, previewWidth) + horizontalPadding * 2;
              const boxHeight = verticalPadding * 2 + titleSize + (showPreview ? metaSize + lineGap : 0);
              const boxX = x - boxWidth / 2;
              const boxY = y - boxHeight / 2;

              if (selected || hovered || matched || connected) {
                drawRoundedRect(ctx, boxX - 4 / globalScale, boxY - 4 / globalScale, boxWidth + 8 / globalScale, boxHeight + 8 / globalScale, 24 / globalScale);
                ctx.fillStyle = "rgba(100, 141, 186, 0.12)";
                ctx.fill();
              }

              drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, isRoot ? 24 / globalScale : 18 / globalScale);
              ctx.fillStyle = palette.fill;
              ctx.fill();
              ctx.lineWidth = selected ? 2.4 / globalScale : hovered ? 2 / globalScale : matched ? 1.8 / globalScale : 1.2 / globalScale;
              ctx.strokeStyle = selected
                ? "rgba(229, 240, 252, 0.98)"
                : hovered
                  ? "rgba(221, 235, 249, 0.94)"
                  : matched
                    ? "rgba(194, 215, 237, 0.96)"
                    : palette.stroke;
              ctx.stroke();

              ctx.textAlign = "center";
              ctx.textBaseline = "top";

              ctx.font = `600 ${titleSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
              ctx.fillStyle = palette.text;
              ctx.fillText(titleText, x, boxY + verticalPadding);

              if (showPreview) {
                ctx.font = `500 ${metaSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
                ctx.fillStyle = palette.subtext;
                ctx.fillText(leafPreview, x, boxY + verticalPadding + titleSize + lineGap);
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
