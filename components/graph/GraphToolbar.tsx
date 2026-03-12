"use client";

import { FolderTree, LayoutGrid, ListFilter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BranchItem = {
  id: string;
  label: string;
  count: number;
};

type GraphToolbarProps = {
  visibleCount: number;
  levelFilters: number[];
  selectedLevels: number[];
  branches: BranchItem[];
  selectedBranchId: string | null;
  onSelectBranch: (branchId: string | null) => void;
  onToggleLevel: (level: number) => void;
  onAutoLayout: () => void;
  onResetFilters: () => void;
};

export function GraphToolbar({
  visibleCount,
  levelFilters,
  selectedLevels,
  branches,
  selectedBranchId,
  onSelectBranch,
  onToggleLevel,
  onAutoLayout,
  onResetFilters,
}: GraphToolbarProps) {
  return (
    <div className="mb-2 rounded-[22px] border border-[hsl(var(--border)/0.68)] bg-[hsl(var(--card)/0.82)] px-3 py-2 shadow-[0_10px_24px_rgba(42,64,92,0.04)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
            <ListFilter className="h-4 w-4" />
            当前可见节点 <span className="font-semibold text-[hsl(var(--foreground))]">{visibleCount}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {levelFilters.map((level) => {
              const active = selectedLevels.includes(level);
              return (
                <button
                  key={level}
                  type="button"
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
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

            <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl px-3" onClick={onAutoLayout}>
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              自动布局
            </Button>

            <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl px-3" onClick={onResetFilters}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              重置筛选
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden shrink-0 items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] xl:flex">
            <FolderTree className="h-4 w-4" />
            一级维度
          </div>
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                selectedBranchId === null
                  ? "border-[hsl(var(--primary)/0.36)] bg-[hsl(var(--accent)/0.9)] text-[hsl(var(--primary))]"
                  : "border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]",
              )}
              onClick={() => onSelectBranch(null)}
            >
              全部维度
            </button>
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  selectedBranchId === branch.id
                    ? "border-[hsl(var(--primary)/0.36)] bg-[hsl(var(--accent)/0.9)] text-[hsl(var(--primary))]"
                    : "border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]",
                )}
                onClick={() => onSelectBranch(branch.id)}
              >
                {branch.label} {branch.count}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
