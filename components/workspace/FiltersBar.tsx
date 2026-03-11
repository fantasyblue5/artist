"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type TimeRange = "7d" | "30d" | "all";
export type SortBy = "updated" | "created" | "name";

type FiltersBarProps = {
  queryInput: string;
  onQueryInputChange: (value: string) => void;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  sortBy: SortBy;
  onSortByChange: (sortBy: SortBy) => void;
  onClearFilters: () => void;
};

export function FiltersBar({
  queryInput,
  onQueryInputChange,
  allTags,
  selectedTags,
  timeRange,
  sortBy,
  onToggleTag,
  onTimeRangeChange,
  onSortByChange,
  onClearFilters,
}: FiltersBarProps) {
  const hasFilter =
    queryInput.trim().length > 0 || selectedTags.length > 0 || timeRange !== "all" || sortBy !== "updated";

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-[0_8px_20px_rgba(40,60,88,0.08)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            value={queryInput}
            onChange={(event) => onQueryInputChange(event.target.value)}
            placeholder="搜索项目名或标签"
            className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
          />
        </label>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <select
            value={timeRange}
            onChange={(event) => onTimeRangeChange(event.target.value as TimeRange)}
            className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
          >
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="all">全部时间</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as SortBy)}
            className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
          >
            <option value="updated">最近编辑</option>
            <option value="created">创建时间</option>
            <option value="name">名称</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {allTags.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={cn(
                "rounded-xl border px-2.5 py-1 text-xs transition",
                active
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {hasFilter ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {queryInput.trim() ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--accent))] px-2 py-1 text-xs">
              搜索: {queryInput.trim()}
            </span>
          ) : null}

          {selectedTags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--accent))] px-2 py-1 text-xs">
              标签: {tag}
            </span>
          ))}

          {timeRange !== "all" ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--accent))] px-2 py-1 text-xs">
              时间: {timeRange === "7d" ? "7天" : "30天"}
            </span>
          ) : null}

          {sortBy !== "updated" ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--accent))] px-2 py-1 text-xs">
              排序: {sortBy === "created" ? "创建时间" : "名称"}
            </span>
          ) : null}

          <Button variant="ghost" size="sm" className="h-7 rounded-lg" onClick={onClearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            清除筛选
          </Button>
        </div>
      ) : null}
    </div>
  );
}
