"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Boxes, Network } from "lucide-react";
import { Topbar } from "@/components/workspace/Topbar";
import { Card, CardContent } from "@/components/ui/card";
import { DetailPanel } from "@/components/library/DetailPanel";
import { GraphView } from "@/components/library/GraphView";
import { LibrarySidebar, type LibraryTab } from "@/components/library/LibrarySidebar";
import type { GraphLoadResult, GraphNode } from "@/lib/graph/types";

type LibraryLayoutProps = {
  graphResult: GraphLoadResult;
};

function collectAncestorIds(nodeId: string, nodeMap: Map<string, GraphNode>) {
  const path: string[] = [];
  let cursor = nodeMap.get(nodeId) ?? null;

  while (cursor) {
    path.unshift(cursor.id);
    cursor = cursor.parentId ? (nodeMap.get(cursor.parentId) ?? null) : null;
  }

  return path;
}

export function LibraryLayout({ graphResult }: LibraryLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<LibraryTab>("graph");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [selectedDimensionId, setSelectedDimensionId] = useState<string | "all">("all");
  const [leafOnly, setLeafOnly] = useState(false);
  const [remarkOnly, setRemarkOnly] = useState(false);

  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);

  const graph = graphResult.ok ? graphResult.data : null;

  const nodeMap = useMemo(() => new Map((graph?.nodes ?? []).map((node) => [node.id, node])), [graph?.nodes]);
  const edgeMap = useMemo(() => new Map((graph?.edges ?? []).map((edge) => [edge.id, edge])), [graph?.edges]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!graph || activeNodeId) {
      return;
    }
    setActiveNodeId(graph.rootIds[0] ?? null);
  }, [activeNodeId, graph]);

  useEffect(() => {
    if (!graph) {
      return;
    }

    if (selectedDimensionId !== "all" && !nodeMap.has(selectedDimensionId)) {
      setSelectedDimensionId("all");
    }
  }, [graph, nodeMap, selectedDimensionId]);

  const dimensionOptions = useMemo(() => {
    if (!graph) {
      return [] as Array<{ id: string; label: string }>;
    }

    return graph.levelOneNodeIds
      .map((id) => nodeMap.get(id))
      .filter((item): item is GraphNode => Boolean(item))
      .map((item) => ({ id: item.id, label: item.title }));
  }, [graph, nodeMap]);

  const searchResults = useMemo(() => {
    if (!graph || !debouncedQuery) {
      return [] as GraphNode[];
    }

    const keyword = debouncedQuery.toLowerCase();

    return graph.nodes
      .filter((node) => {
        const inTitle = node.title.toLowerCase().includes(keyword);
        const inRemark = node.remarks.join("\n").toLowerCase().includes(keyword);
        return inTitle || inRemark;
      })
      .sort((a, b) => {
        const startsA = a.title.toLowerCase().startsWith(keyword) ? 0 : 1;
        const startsB = b.title.toLowerCase().startsWith(keyword) ? 0 : 1;
        if (startsA !== startsB) {
          return startsA - startsB;
        }
        return a.path.join(">").localeCompare(b.path.join(">"), "zh-Hans");
      });
  }, [debouncedQuery, graph]);

  const visibleGraph = useMemo(() => {
    if (!graph) {
      return {
        nodes: [] as GraphNode[],
        edges: [] as Array<{ id: string; source: string; target: string }>,
      };
    }

    const filterMode = leafOnly || remarkOnly;
    const rootIds = selectedDimensionId === "all" ? graph.rootIds : [selectedDimensionId];

    const visibleNodeIds = new Set<string>();
    const visibleEdgeIds = new Set<string>();

    const matchNode = (node: GraphNode) => {
      if (leafOnly && !node.isLeaf) {
        return false;
      }
      if (remarkOnly && !node.hasRemark) {
        return false;
      }
      return true;
    };

    const visit = (nodeId: string): boolean => {
      const node = nodeMap.get(nodeId);
      if (!node) {
        return false;
      }

      const childrenToVisit = filterMode
        ? node.childIds
        : expandedNodeIds.has(nodeId)
          ? node.childIds
          : [];

      let hasVisibleChild = false;
      for (const childId of childrenToVisit) {
        const childVisible = visit(childId);
        if (childVisible) {
          hasVisibleChild = true;
          const edgeId = `edge:${nodeId}->${childId}`;
          if (edgeMap.has(edgeId)) {
            visibleEdgeIds.add(edgeId);
          }
        }
      }

      const keep = node.depth === 1 || matchNode(node) || hasVisibleChild;
      if (keep) {
        visibleNodeIds.add(nodeId);
      }

      return keep;
    };

    for (const rootId of rootIds) {
      visit(rootId);
    }

    return {
      nodes: Array.from(visibleNodeIds)
        .map((id) => nodeMap.get(id))
        .filter((item): item is GraphNode => Boolean(item)),
      edges: Array.from(visibleEdgeIds)
        .map((id) => edgeMap.get(id))
        .filter((item): item is { id: string; source: string; target: string } => Boolean(item)),
    };
  }, [edgeMap, expandedNodeIds, graph, leafOnly, nodeMap, remarkOnly, selectedDimensionId]);

  const highlightedNodeIds = useMemo(() => {
    if (!activeNodeId) {
      return [] as string[];
    }
    return collectAncestorIds(activeNodeId, nodeMap);
  }, [activeNodeId, nodeMap]);

  const detailNode = useMemo(() => {
    if (pinnedNodeId) {
      return nodeMap.get(pinnedNodeId) ?? null;
    }
    if (activeNodeId) {
      return nodeMap.get(activeNodeId) ?? null;
    }
    return null;
  }, [activeNodeId, nodeMap, pinnedNodeId]);

  const detailChildCount = useMemo(() => {
    if (!detailNode) {
      return 0;
    }
    return detailNode.childIds.length;
  }, [detailNode]);

  const handleGraphNodeSelect = (nodeId: string) => {
    const nextNode = nodeMap.get(nodeId);
    if (!nextNode) {
      return;
    }

    setActiveNodeId(nodeId);
    setFocusNodeId(nodeId);

    if (!nextNode.isLeaf) {
      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
    }
  };

  const handleSearchPick = (nodeId: string) => {
    if (!graph) {
      return;
    }

    const ancestors = collectAncestorIds(nodeId, nodeMap);
    setActiveTab("graph");
    setActiveNodeId(nodeId);
    setFocusNodeId(nodeId);
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleTogglePin = () => {
    if (pinnedNodeId) {
      setPinnedNodeId(null);
      return;
    }

    if (detailNode) {
      setPinnedNodeId(detailNode.id);
    }
  };

  const renderCenter = () => {
    if (activeTab === "assets") {
      return (
        <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.82)]">
          <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <Boxes className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
            <h3 className="text-xl font-semibold tracking-tight">资料资产即将开放</h3>
            <p className="max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              参考图、纹理、配色、模板等资产管理能力将逐步上线。
            </p>
          </CardContent>
        </Card>
      );
    }

    if (activeTab !== "graph") {
      return (
        <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.82)]">
          <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Network className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
            <h3 className="text-xl font-semibold tracking-tight">模块建设中</h3>
            <p className="max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">该模块将与知识图谱联动，稍后开放。</p>
          </CardContent>
        </Card>
      );
    }

    if (!graphResult.ok) {
      return (
        <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.82)]">
          <CardContent className="space-y-4 p-6">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.7)] px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">
              <AlertCircle className="h-4 w-4" />
              <span>知识图谱加载失败</span>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.68)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <p>{graphResult.error}</p>
              <p className="mt-3 text-xs">已尝试路径：</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                {graphResult.checkedPaths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <GraphView
        nodes={visibleGraph.nodes}
        edges={visibleGraph.edges}
        selectedNodeId={activeNodeId}
        highlightedNodeIds={highlightedNodeIds}
        focusNodeId={focusNodeId}
        onNodeSelect={handleGraphNodeSelect}
        onCanvasClick={() => {
          setActiveNodeId(null);
          setFocusNodeId(null);
        }}
      />
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[hsl(var(--background))]">
      <Topbar />
      <div className="h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_14%_16%,rgba(111,146,188,0.12),transparent_30%),radial-gradient(circle_at_88%_88%,rgba(155,183,212,0.15),transparent_36%)]">
        <div className="flex h-full">
          <LibrarySidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            onSearchPick={handleSearchPick}
            dimensionOptions={dimensionOptions}
            selectedDimensionId={selectedDimensionId}
            onDimensionChange={setSelectedDimensionId}
            leafOnly={leafOnly}
            onLeafOnlyChange={setLeafOnly}
            remarkOnly={remarkOnly}
            onRemarkOnlyChange={setRemarkOnly}
          />

          <main className="min-w-0 flex-1 p-4">{renderCenter()}</main>

          <DetailPanel
            node={detailNode}
            childCount={detailChildCount}
            pinned={Boolean(pinnedNodeId)}
            onTogglePin={handleTogglePin}
            visible={activeTab === "graph"}
          />
        </div>
      </div>
    </div>
  );
}
