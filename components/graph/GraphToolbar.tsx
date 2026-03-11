"use client";

import { LayoutGrid, ListFilter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GraphToolbarProps = {
  visibleCount: number;
  levelFilters: number[];
  selectedLevels: number[];
  onToggleLevel: (level: number) => void;
  onAutoLayout: () => void;
  onResetFilters: () => void;
};

export function GraphToolbar({ visibleCount, levelFilters, selectedLevels, onToggleLevel, onAutoLayout, onResetFilters }: GraphToolbarProps) {
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.88)] p-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <ListFilter className="h-4 w-4" />
        当前可见节点 <span className="font-semibold text-[hsl(var(--foreground))]">{visibleCount}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {levelFilters.map((level) => {
          const active = selectedLevels.includes(level);
          return (
            <button
              key={level}
              type="button"
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                active
                  ? "border-[hsl(var(--primary)/0.36)] bg-[hsl(var(--accent)/0.9)] text-[hsl(var(--primary))]"
                  : "border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]",
              )}
              onClick={() => onToggleLevel(level)}
            >
              第 {level} 层
            </button>
          );
        })}

        <Button type="button" variant="outline" size="sm" onClick={onAutoLayout}>
          <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
          自动布局
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          重置筛选
        </Button>
      </div>
    </div>
  );
}
