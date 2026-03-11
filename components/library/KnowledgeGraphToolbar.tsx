"use client";

import { Download, Filter, HelpCircle, RotateCcw, ScanSearch, Search, Sparkles, UnfoldHorizontal, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KnowledgeSearchResult } from "@/lib/library/types";
import { cn } from "@/lib/utils";

type BranchOption = {
  id: string;
  label: string;
};

type KnowledgeGraphToolbarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResults: KnowledgeSearchResult[];
  onPickSearchResult: (nodeId: string) => void;
  onlyLeaf: boolean;
  onToggleOnlyLeaf: () => void;
  onlyWithDescription: boolean;
  onToggleOnlyWithDescription: () => void;
  allExpanded: boolean;
  onToggleAllExpanded: () => void;
  onResetView: () => void;
  onCenterRoot: () => void;
  onExportPath: () => void;
  onOpenHelp: () => void;
  onAutoLayout: () => void;
  viewMode: "overview" | "branch";
  onToggleViewMode: () => void;
  resultCount: number;
  selectedLevels: number[];
  onToggleLevel: (level: number) => void;
  maxLevel: number;
  branchOptions: BranchOption[];
  selectedBranchId: string | null;
  onSelectBranch: (branchId: string | null) => void;
};

function levelLabel(level: number) {
  const labels = ["根节点", "一级", "二级", "三级", "四级", "五级", "六级"];
  return labels[level] ?? `${level}级`;
}

export function KnowledgeGraphToolbar({
  searchQuery,
  onSearchQueryChange,
  searchResults,
  onPickSearchResult,
  onlyLeaf,
  onToggleOnlyLeaf,
  onlyWithDescription,
  onToggleOnlyWithDescription,
  allExpanded,
  onToggleAllExpanded,
  onResetView,
  onCenterRoot,
  onExportPath,
  onOpenHelp,
  onAutoLayout,
  viewMode,
  onToggleViewMode,
  resultCount,
  selectedLevels,
  onToggleLevel,
  maxLevel,
  branchOptions,
  selectedBranchId,
  onSelectBranch,
}: KnowledgeGraphToolbarProps) {
  return (
    <div className="rounded-[28px] border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.74)] p-4 shadow-[0_20px_40px_rgba(43,69,98,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="min-w-[220px] xl:w-[240px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--accent)/0.72)] px-3 py-1 text-xs font-medium text-[hsl(var(--primary))]">
              <Workflow className="h-3.5 w-3.5" />
              AI 创作语义图谱
            </div>
            <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-[hsl(var(--foreground))]">艺术知识图谱</h1>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">以评价体系为中心，浏览从维度到细粒度属性的完整知识结构。</p>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="搜索节点名称、路径或备注，自动定位到知识图谱"
              className="h-12 w-full rounded-2xl border border-[hsl(var(--border)/0.82)] bg-[hsl(var(--card))] pl-11 pr-4 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.4)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.14)]"
            />

            {searchQuery.trim() && searchResults.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 rounded-3xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.98)] p-2 shadow-[0_18px_36px_rgba(40,64,92,0.14)] backdrop-blur">
                {searchResults.slice(0, 6).map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="flex w-full items-start justify-between rounded-2xl px-3 py-2 text-left transition hover:bg-[hsl(var(--accent)/0.72)]"
                    onClick={() => onPickSearchResult(result.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[hsl(var(--foreground))]">{result.label}</div>
                      <div className="truncate text-xs text-[hsl(var(--muted-foreground))]">{result.pathText}</div>
                      {result.descriptionSnippet ? <div className="mt-1 line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">{result.descriptionSnippet}</div> : null}
                    </div>
                    <span className="ml-3 rounded-full border border-[hsl(var(--border)/0.72)] px-2 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                      {levelLabel(result.level)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 xl:w-[520px]">
            <Button type="button" variant={onlyLeaf ? "default" : "outline"} size="sm" onClick={onToggleOnlyLeaf}>
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              仅看叶子节点
            </Button>
            <Button type="button" variant={onlyWithDescription ? "default" : "outline"} size="sm" onClick={onToggleOnlyWithDescription}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              仅看有备注节点
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onToggleAllExpanded}>
              <UnfoldHorizontal className="mr-1.5 h-3.5 w-3.5" />
              {allExpanded ? "收起全部" : "展开全部"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onAutoLayout}>
              <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
              自动布局
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onResetView}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              重置视图
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onExportPath}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              导出路径
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onOpenHelp}>
              <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
              帮助说明
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                viewMode === "overview"
                  ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]"
                  : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] text-[hsl(var(--muted-foreground))]",
              )}
              onClick={() => viewMode === "branch" && onToggleViewMode()}
            >
              全图模式
            </button>
            <button
              type="button"
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                viewMode === "branch"
                  ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]"
                  : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] text-[hsl(var(--muted-foreground))]",
              )}
              onClick={() => viewMode === "overview" && onToggleViewMode()}
            >
              当前分支聚焦
            </button>

            <button
              type="button"
              className="rounded-full border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.72)]"
              onClick={onCenterRoot}
            >
              回到中心 root
            </button>

            <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">当前结果：{resultCount}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">层级筛选</span>
            {Array.from({ length: Math.max(1, maxLevel) }, (_, index) => index + 1).map((level) => {
              const active = selectedLevels.includes(level);
              return (
                <button
                  key={level}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]"
                      : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] text-[hsl(var(--muted-foreground))]",
                  )}
                  onClick={() => onToggleLevel(level)}
                >
                  {levelLabel(level)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              selectedBranchId === null
                ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]"
                : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] text-[hsl(var(--muted-foreground))]",
            )}
            onClick={() => onSelectBranch(null)}
          >
            全部分支
          </button>

          {branchOptions.map((branch) => {
            const active = selectedBranchId === branch.id;
            return (
              <button
                key={branch.id}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]"
                    : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.92)] text-[hsl(var(--muted-foreground))]",
                )}
                onClick={() => onSelectBranch(active ? null : branch.id)}
              >
                {branch.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
