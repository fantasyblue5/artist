"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Info, PanelRightClose, PanelRightOpen, RefreshCw } from "lucide-react";
import { AssetDetailDrawer } from "@/components/assets/AssetDetailDrawer";
import { AssetGrid } from "@/components/assets/AssetGrid";
import { AssetSidebar } from "@/components/assets/AssetSidebar";
import { AssetToolbar } from "@/components/assets/AssetToolbar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphDetailPanel } from "@/components/graph/GraphDetailPanel";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { KnowledgeGraphHelpDialog } from "@/components/library/KnowledgeGraphHelpDialog";
import { ResourceHeader } from "@/components/resource/ResourceHeader";
import { Topbar } from "@/components/workspace/Topbar";
import { Button } from "@/components/ui/button";
import { buildAssetMockData, filterAssets } from "@/lib/asset-data";
import { GRAPH_ROOT_ID, buildGraphData, getGraphSearchResults } from "@/lib/graph-data";
import { buildRadialTreeLayout, collectAncestorIds, collectDescendantIds } from "@/lib/graph-layout";
import { getFavorites, toggleFavorite } from "@/lib/library/storage";
import type { AssetCategory, AssetRecord, AssetSortMode, GraphData, GraphNodePosition, GraphSourceNode, ResourceMode } from "@/lib/resource-types";

type ViewportCommand =
  | { type: "center-root"; tick: number }
  | { type: "focus-node"; tick: number; nodeId: string }
  | { type: "fit-all"; tick: number };

const allLevels = [1, 2, 3, 4, 5];
const GRAPH_LEVEL_GAP = 310;

function updateRecentIds(prev: string[], nextId: string) {
  return [nextId, ...prev.filter((id) => id !== nextId)].slice(0, 8);
}

export default function LibraryPage() {
  const [mode, setMode] = useState<ResourceMode>("graph");
  const [globalQuery, setGlobalQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [favoriteNodeIds, setFavoriteNodeIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const [treeSource, setTreeSource] = useState<GraphSourceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(GRAPH_ROOT_ID);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<number[]>(allLevels);
  const [expandedIds, setExpandedIds] = useState<string[]>([GRAPH_ROOT_ID]);
  const [viewportCommand, setViewportCommand] = useState<ViewportCommand>({ type: "center-root", tick: Date.now() });
  const [nodePositions, setNodePositions] = useState<Record<string, GraphNodePosition>>({});

  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assetCategory, setAssetCategory] = useState<AssetCategory>("全部素材");
  const [assetSort, setAssetSort] = useState<AssetSortMode>("热门");
  const [assetStyle, setAssetStyle] = useState<string | null>(null);
  const [assetNodeFilterId, setAssetNodeFilterId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  useEffect(() => {
    setFavoriteNodeIds(getFavorites());
  }, []);

  useEffect(() => {
    let active = true;

    const loadTree = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/knowledge/artist_prof_tree.json", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setTreeSource(Array.isArray(json) ? (json as GraphSourceNode[]) : []);
      } catch {
        if (!active) {
          return;
        }
        setError("资料库数据读取失败，请检查 public/knowledge/artist_prof_tree.json。");
        setTreeSource([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadTree();
    return () => {
      active = false;
    };
  }, []);

  const graphData = useMemo<GraphData>(() => buildGraphData(treeSource, favoriteNodeIds), [favoriteNodeIds, treeSource]);

  useEffect(() => {
    setAssets((prev) => {
      const favorites = new Set(prev.filter((item) => item.isFavorite).map((item) => item.id));
      return buildAssetMockData(graphData).map((asset) => ({
        ...asset,
        isFavorite: favorites.has(asset.id),
      }));
    });
  }, [graphData]);

  const selectedNode = graphData.nodeMap[selectedNodeId] ?? null;

  const graphSearchResults = useMemo(() => (mode === "graph" ? getGraphSearchResults(graphData, globalQuery) : []), [globalQuery, graphData, mode]);

  useEffect(() => {
    if (mode !== "graph") {
      return;
    }
    if (!globalQuery.trim() || graphSearchResults.length === 0) {
      return;
    }

    const first = graphSearchResults[0];
    const ancestors = collectAncestorIds(first.id, graphData.nodeMap);
    setExpandedIds((prev) => Array.from(new Set([...prev, ...ancestors])));
    setSelectedNodeId(first.id);
    setViewportCommand({ type: "focus-node", tick: Date.now(), nodeId: first.id });
  }, [globalQuery, graphData.nodeMap, graphSearchResults, mode]);

  const graphScopeIds = useMemo(() => {
    if (!selectedBranchId) {
      return new Set(graphData.nodes.map((node) => node.id));
    }

    const branchIds = collectDescendantIds(selectedBranchId, graphData.nodeMap);
    branchIds.add(graphData.rootId);
    return branchIds;
  }, [graphData.nodeMap, graphData.nodes, graphData.rootId, selectedBranchId]);

  const graphVisibleIds = useMemo(() => {
    const visible = new Set<string>([graphData.rootId]);
    const expandedSet = new Set(expandedIds);

    const walk = (nodeId: string) => {
      const node = graphData.nodeMap[nodeId];
      if (!node) {
        return;
      }

      visible.add(nodeId);

      if (nodeId !== graphData.rootId && !expandedSet.has(nodeId)) {
        return;
      }

      node.children.forEach((childId) => {
        const child = graphData.nodeMap[childId];
        if (!child || !graphScopeIds.has(childId)) {
          return;
        }
        if (!selectedLevels.includes(child.level)) {
          return;
        }
        walk(childId);
      });
    };

    walk(graphData.rootId);
    return visible;
  }, [expandedIds, graphData.nodeMap, graphData.rootId, graphScopeIds, selectedLevels]);

  const graphVisibleNodes = useMemo(() => graphData.nodes.filter((node) => graphVisibleIds.has(node.id)), [graphData.nodes, graphVisibleIds]);
  const graphVisibleEdges = useMemo(
    () => graphData.edges.filter((edge) => graphVisibleIds.has(edge.source) && graphVisibleIds.has(edge.target)),
    [graphData.edges, graphVisibleIds],
  );

  useEffect(() => {
    if (graphVisibleNodes.length === 0) {
      return;
    }

    const visibleIds = graphVisibleNodes.map((node) => node.id);
    const layout = buildRadialTreeLayout(graphData.rootId, graphData.nodeMap, visibleIds, {
      levelGap: GRAPH_LEVEL_GAP,
      rootRadius: 24,
      anglePadding: 0.12,
      nodeWidth: 188,
      minAngleGap: 0.24,
      branchFanAngle: 1.18,
    });

    setNodePositions((prev) => {
      const next: Record<string, GraphNodePosition> = {};
      let changed = false;

      visibleIds.forEach((nodeId) => {
        const position = layout[nodeId] ?? prev[nodeId];
        if (!position) {
          return;
        }

        next[nodeId] = position;
        const previous = prev[nodeId];
        if (!previous || previous.x !== position.x || previous.y !== position.y) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [graphData.nodeMap, graphData.rootId, graphVisibleNodes]);

  useEffect(() => {
    if (mode !== "graph") {
      return;
    }
    if (!graphVisibleIds.has(selectedNodeId)) {
      setSelectedNodeId(graphData.rootId);
    }
  }, [graphData.rootId, graphVisibleIds, mode, selectedNodeId]);

  useEffect(() => {
    if (mode === "graph" && selectedNodeId !== GRAPH_ROOT_ID) {
      setDetailOpen(true);
    }
  }, [mode, selectedNodeId]);

  const selectedPathIds = useMemo(() => new Set(collectAncestorIds(selectedNodeId, graphData.nodeMap)), [graphData.nodeMap, selectedNodeId]);
  const matchedNodeIds = useMemo(() => new Set(graphSearchResults.map((item) => item.id)), [graphSearchResults]);

  const assetCounts = useMemo<Record<AssetCategory, number>>(() => {
    const counts: Record<AssetCategory, number> = {
      全部素材: assets.length,
      构图模板: 0,
      色彩方案: 0,
      光影参考: 0,
      笔触纹理: 0,
      风格样本: 0,
      透视空间: 0,
      收藏素材: 0,
    };

    assets.forEach((asset) => {
      counts[asset.type] += 1;
      if (asset.isFavorite) {
        counts["收藏素材"] += 1;
      }
    });

    return counts;
  }, [assets]);

  const filteredAssets = useMemo(
    () =>
      filterAssets(assets, {
        category: assetCategory,
        query: mode === "assets" ? globalQuery : "",
        nodeId: assetNodeFilterId,
        style: assetStyle,
        sortMode: assetSort,
      }),
    [assetCategory, assetNodeFilterId, assetSort, assetStyle, assets, globalQuery, mode],
  );

  const selectedAsset = useMemo(() => filteredAssets.find((asset) => asset.id === selectedAssetId) ?? assets.find((asset) => asset.id === selectedAssetId) ?? null, [assets, filteredAssets, selectedAssetId]);

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setRecentIds((prev) => updateRecentIds(prev, nodeId));
    const ancestors = collectAncestorIds(nodeId, graphData.nodeMap);
    setExpandedIds((prev) => Array.from(new Set([...prev, ...ancestors])));
    setViewportCommand({ type: "focus-node", tick: Date.now(), nodeId });
  };

  const handleToggleNode = (nodeId: string) => {
    const node = graphData.nodeMap[nodeId];
    if (!node || node.children.length === 0) {
      return;
    }

    setExpandedIds((prev) => {
      const set = new Set(prev);
      if (set.has(nodeId)) {
        set.delete(nodeId);
      } else {
        set.add(nodeId);
      }
      set.add(graphData.rootId);
      return Array.from(set);
    });
  };

  const handleToggleNodeFavorite = (nodeId: string) => {
    setFavoriteNodeIds(toggleFavorite(nodeId));
  };

  const handleOpenGraphForNode = (nodeId: string) => {
    setMode("graph");
    setAssetNodeFilterId(null);
    handleSelectNode(nodeId);
  };

  const handleToggleAssetFavorite = (assetId: string) => {
    setAssets((prev) =>
      prev.map((asset) => (asset.id === assetId ? { ...asset, isFavorite: !asset.isFavorite } : asset)),
    );
  };

  const handleNodePositionChange = (nodeId: string, position: GraphNodePosition) => {
    setNodePositions((prev) => {
      const current = prev[nodeId];
      if (current && current.x === position.x && current.y === position.y) {
        return prev;
      }
      return { ...prev, [nodeId]: position };
    });
  };

  const handleAutoLayout = () => {
    const visibleIds = graphVisibleNodes.map((node) => node.id);
    const layout = buildRadialTreeLayout(graphData.rootId, graphData.nodeMap, visibleIds, {
      levelGap: GRAPH_LEVEL_GAP,
      rootRadius: 24,
      anglePadding: 0.12,
      nodeWidth: 188,
      minAngleGap: 0.24,
      branchFanAngle: 1.18,
    });

    setNodePositions((prev) => {
      const next = { ...prev };
      visibleIds.forEach((nodeId) => {
        if (layout[nodeId]) {
          next[nodeId] = layout[nodeId];
        }
      });
      return next;
    });

    setViewportCommand({ type: "fit-all", tick: Date.now() });
  };

  const branchItems = useMemo(
    () =>
      graphData.levelOneIds.map((id) => {
        const node = graphData.nodeMap[id];
        return {
          id,
          label: node.label,
          count: node.count,
        };
      }),
    [graphData.levelOneIds, graphData.nodeMap],
  );

  return (
    <AuthGuard>
      <div className="h-screen w-screen overflow-hidden bg-[hsl(var(--background))]">
        <Topbar />

        <main className="h-[calc(100vh-64px)] overflow-auto p-4">
          <div className="mx-auto flex min-h-full max-w-[1880px] flex-col gap-4">
            <ResourceHeader
              mode={mode}
              onModeChange={setMode}
              searchQuery={globalQuery}
              onSearchChange={setGlobalQuery}
              onOpenHelp={() => setHelpOpen(true)}
            />

            {loading ? (
              <div className="flex min-h-[480px] items-center justify-center rounded-[28px] border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.84)] text-sm text-[hsl(var(--muted-foreground))]">
                正在加载资料库...
              </div>
            ) : null}

            {!loading && error ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--border)/0.76)] bg-[hsl(var(--accent)/0.72)] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                <AlertCircle className="h-4 w-4" />
                {error}
                <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  重新载入
                </Button>
              </div>
            ) : null}

            {!loading && mode === "graph" ? (
              <div className="flex min-h-[calc(100vh-172px)] flex-col gap-2">
                <section className="min-h-0 flex-1">
                  <div className="rounded-[30px] border border-[hsl(var(--border)/0.62)] bg-[linear-gradient(180deg,rgba(249,252,255,0.9),rgba(244,248,252,0.84))] p-3 shadow-[0_20px_48px_rgba(34,55,82,0.06)] backdrop-blur">
                    <GraphToolbar
                      visibleCount={graphVisibleNodes.length}
                      levelFilters={allLevels}
                      selectedLevels={selectedLevels}
                      branches={branchItems}
                      selectedBranchId={selectedBranchId}
                      onSelectBranch={setSelectedBranchId}
                      onToggleLevel={(level) => {
                        setSelectedLevels((prev) => (prev.includes(level) ? prev.filter((item) => item !== level) : [...prev, level].sort((a, b) => a - b)));
                      }}
                      onAutoLayout={handleAutoLayout}
                      onResetFilters={() => {
                        setSelectedLevels(allLevels);
                        setSelectedBranchId(null);
                        setExpandedIds([GRAPH_ROOT_ID]);
                        setViewportCommand({ type: "center-root", tick: Date.now() });
                      }}
                    />
                    <div className="relative h-[calc(100vh-290px)] min-h-[700px]">
                      <GraphCanvas
                        rootId={graphData.rootId}
                        nodes={graphVisibleNodes}
                        edges={graphVisibleEdges}
                        nodeMap={graphData.nodeMap}
                        selectedNodeId={selectedNodeId}
                        pathNodeIds={selectedPathIds}
                        matchedNodeIds={matchedNodeIds}
                        viewportCommand={viewportCommand}
                        nodePositions={nodePositions}
                        onSelectNode={handleSelectNode}
                        onToggleNode={handleToggleNode}
                        onNodePositionChange={handleNodePositionChange}
                      />

                      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`h-10 rounded-2xl px-4 shadow-[0_12px_26px_rgba(34,56,84,0.08)] backdrop-blur ${
                            detailOpen ? "border-[hsl(var(--primary)/0.32)] bg-[hsl(var(--accent)/0.94)]" : "bg-white/88"
                          }`}
                          onClick={() => setDetailOpen((prev) => !prev)}
                        >
                          {detailOpen ? <PanelRightClose className="mr-1.5 h-4 w-4" /> : <PanelRightOpen className="mr-1.5 h-4 w-4" />}
                          节点详情
                        </Button>
                      </div>

                      {!detailOpen ? (
                        <div className="pointer-events-none absolute bottom-5 right-5 z-20 hidden rounded-2xl border border-[hsl(var(--border)/0.66)] bg-white/78 px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] shadow-[0_14px_30px_rgba(34,56,84,0.08)] backdrop-blur md:block">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            单击节点查看解释与子节点
                          </div>
                        </div>
                      ) : null}

                      {detailOpen ? (
                        <div className="absolute inset-y-4 right-4 z-30 w-[320px] max-w-[calc(100%-2rem)]">
                          <GraphDetailPanel
                            node={selectedNode}
                            nodeMap={graphData.nodeMap}
                            onSelectNode={handleSelectNode}
                            onToggleFavorite={handleToggleNodeFavorite}
                            onClose={() => setDetailOpen(false)}
                            className="h-full"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              </div>
            ) : null}

            {!loading && mode === "assets" ? (
              <div className="flex min-h-[760px] flex-col gap-4 xl:flex-row">
                <aside className="xl:w-[280px]">
                  <AssetSidebar category={assetCategory} onChangeCategory={setAssetCategory} counts={assetCounts} />
                </aside>

                <section className="min-h-0 flex-1">
                  <AssetToolbar
                    category={assetCategory}
                    selectedNodeId={assetNodeFilterId}
                    nodeMap={graphData.nodeMap}
                    styleFilter={assetStyle}
                    onChangeStyle={setAssetStyle}
                    sortMode={assetSort}
                    onChangeSort={setAssetSort}
                    onClearNodeFilter={() => setAssetNodeFilterId(null)}
                  />
                  <AssetGrid
                    assets={filteredAssets}
                    nodeMap={graphData.nodeMap}
                    onToggleFavorite={handleToggleAssetFavorite}
                    onSelect={(assetId) => {
                      setSelectedAssetId(assetId);
                      setRecentIds((prev) => updateRecentIds(prev, assetId));
                    }}
                    onOpenNode={handleOpenGraphForNode}
                  />
                </section>

                <aside className="xl:w-[360px]">
                  <AssetDetailDrawer
                    asset={selectedAsset}
                    nodeMap={graphData.nodeMap}
                    onClose={() => setSelectedAssetId(null)}
                    onToggleFavorite={handleToggleAssetFavorite}
                    onOpenNode={handleOpenGraphForNode}
                  />
                </aside>
              </div>
            ) : null}
          </div>
        </main>

        <KnowledgeGraphHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      </div>
    </AuthGuard>
  );
}
