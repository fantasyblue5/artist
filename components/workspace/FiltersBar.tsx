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
    <div className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="relative block flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            value={queryInput}
            onChange={(event) => onQueryInputChange(event.target.value)}
            placeholder="搜索项目名或标签"
            className="h-10 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] pl-10 pr-3 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.35)] focus:ring-2 focus:ring-[hsl(var(--ring)/0.18)]"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] px-3">
            <SlidersHorizontal className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">筛选</span>
          </div>
          <select
            value={timeRange}
            onChange={(event) => onTimeRangeChange(event.target.value as TimeRange)}
            className="h-10 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] px-3 text-sm"
          >
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="all">全部时间</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as SortBy)}
            className="h-10 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] px-3 text-sm"
          >
            <option value="updated">最近编辑</option>
            <option value="created">创建时间</option>
            <option value="name">名称</option>
          </select>

          {hasFilter ? (
            <Button variant="ghost" size="sm" className="h-10 rounded-2xl px-3" onClick={onClearFilters}>
              <X className="mr-1 h-3.5 w-3.5" />
              清空
            </Button>
          ) : null}
        </div>
      </div>

      {allTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {allTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.65)]",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
