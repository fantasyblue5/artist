"use client";

import { useMemo, type ComponentType } from "react";
import { BookOpen, Boxes, ClipboardList, FileClock, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/lib/graph/types";

export type LibraryTab = "graph" | "assets" | "collections" | "imports" | "reviews";

type DimensionOption = {
  id: string;
  label: string;
};

type LibrarySidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchResults: GraphNode[];
  onSearchPick: (nodeId: string) => void;
  dimensionOptions: DimensionOption[];
  selectedDimensionId: string | "all";
  onDimensionChange: (dimensionId: string | "all") => void;
  leafOnly: boolean;
  onLeafOnlyChange: (next: boolean) => void;
  remarkOnly: boolean;
  onRemarkOnlyChange: (next: boolean) => void;
};

const tabItems: Array<{ id: LibraryTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "graph", label: "知识图谱", icon: BookOpen },
  { id: "assets", label: "素材资产", icon: Boxes },
  { id: "collections", label: "集合", icon: Sparkles },
  { id: "imports", label: "导入记录", icon: FileClock },
  { id: "reviews", label: "评审报告", icon: ClipboardList },
];

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.6)] px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-[hsl(var(--border))] accent-[hsl(var(--primary))]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function LibrarySidebar({
  collapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchResults,
  onSearchPick,
  dimensionOptions,
  selectedDimensionId,
  onDimensionChange,
  leafOnly,
  onLeafOnlyChange,
  remarkOnly,
  onRemarkOnlyChange,
}: LibrarySidebarProps) {
  const showSearchResult = useMemo(
    () => activeTab === "graph" && searchQuery.trim().length > 0 && searchResults.length > 0,
    [activeTab, searchQuery, searchResults.length],
  );

  if (collapsed) {
    return (
      <aside className="w-[76px] shrink-0 border-r border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.52)] p-3 backdrop-blur">
        <div className="flex h-full flex-col gap-2">
          <Button variant="outline" size="icon" onClick={onToggleCollapse} title="展开侧栏">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <div className="mt-1 flex flex-col gap-2">
            {tabItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                    active
                      ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.16)] text-[hsl(var(--primary))]"
                      : "border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.75)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[280px] shrink-0 border-r border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.52)] p-4 backdrop-blur">
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-[hsl(var(--foreground))]">资料库</h2>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            收起
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm transition",
                  active
                    ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]"
                    : "border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.75)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "graph" ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="搜索节点名 / 备注"
                className="h-10 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] pl-9 pr-3 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.5)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.15)]"
              />

              {showSearchResult ? (
                <Card className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.96)] backdrop-blur">
                  <CardContent className="max-h-64 overflow-auto p-2">
                    <div className="space-y-1">
                      {searchResults.slice(0, 8).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSearchPick(item.id)}
                          className="w-full rounded-xl px-2 py-2 text-left text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))]"
                        >
                          <div className="truncate text-sm font-medium text-[hsl(var(--foreground))]">{item.title}</div>
                          <div className="truncate">{item.path.join(" > ")}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <Card className="rounded-2xl border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.7)]">
              <CardContent className="space-y-3 p-3">
                <div className="text-xs font-medium text-[hsl(var(--muted-foreground))]">维度过滤</div>
                <select
                  value={selectedDimensionId}
                  onChange={(event) => onDimensionChange(event.target.value as string | "all")}
                  className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.9)] px-3 text-sm outline-none"
                >
                  <option value="all">全部一级目录</option>
                  {dimensionOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <CheckboxRow checked={leafOnly} onChange={onLeafOnlyChange} label="只看叶子节点" />
                <CheckboxRow checked={remarkOnly} onChange={onRemarkOnlyChange} label="只看有备注" />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="rounded-2xl border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.7)]">
            <CardContent className="space-y-2 p-3 text-sm text-[hsl(var(--muted-foreground))]">
              <div className="font-medium text-[hsl(var(--foreground))]">模块准备中</div>
              <p>当前优先完成知识图谱，本模块后续开放。</p>
            </CardContent>
          </Card>
        )}
      </div>
    </aside>
  );
}
