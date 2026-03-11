"use client";

import { ArrowDownWideNarrow, Filter } from "lucide-react";
import type { AssetCategory, AssetSortMode, GraphNodeRecord } from "@/lib/resource-types";

type AssetToolbarProps = {
  category: AssetCategory;
  selectedNodeId: string | null;
  nodeMap: Record<string, GraphNodeRecord>;
  styleFilter: string | null;
  onChangeStyle: (style: string | null) => void;
  sortMode: AssetSortMode;
  onChangeSort: (mode: AssetSortMode) => void;
  onClearNodeFilter: () => void;
};

const styles = ["东方写意", "现代抽象", "印象派", "古典写实", "实验混合"];
const sortModes: AssetSortMode[] = ["热门", "最新", "收藏"];

export function AssetToolbar({
  category,
  selectedNodeId,
  nodeMap,
  styleFilter,
  onChangeStyle,
  sortMode,
  onChangeSort,
  onClearNodeFilter,
}: AssetToolbarProps) {
  const linkedNode = selectedNodeId ? nodeMap[selectedNodeId] : null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.9)] p-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <Filter className="h-4 w-4" />
        <span>当前分类：{category}</span>
        {linkedNode ? (
          <button
            type="button"
            className="rounded-full bg-[hsl(var(--accent)/0.82)] px-3 py-1 text-xs text-[hsl(var(--primary))]"
            onClick={onClearNodeFilter}
          >
            节点筛选：{linkedNode.label} ×
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={styleFilter ?? ""}
          onChange={(event) => onChangeStyle(event.target.value || null)}
          className="h-9 rounded-xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] px-3 text-sm outline-none"
        >
          <option value="">全部风格</option>
          {styles.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>

        <div className="inline-flex items-center rounded-xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] p-1">
          {sortModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeSort(mode)}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition ${sortMode === mode ? "bg-[hsl(var(--foreground))] text-white" : "text-[hsl(var(--muted-foreground))]"}`}
            >
              <ArrowDownWideNarrow className="mr-1 h-3.5 w-3.5" />
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
