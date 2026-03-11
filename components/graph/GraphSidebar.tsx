"use client";

import { Heart, Layers3, Network, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BranchItem = {
  id: string;
  label: string;
  count: number;
  favorite: boolean;
};

type GraphSidebarProps = {
  visibleCount: number;
  totalNodes: number;
  leafCount: number;
  branches: BranchItem[];
  selectedBranchId: string | null;
  onSelectBranch: (branchId: string | null) => void;
  favoriteNodes: BranchItem[];
};

export function GraphSidebar({
  visibleCount,
  totalNodes,
  leafCount,
  branches,
  selectedBranchId,
  onSelectBranch,
  favoriteNodes,
}: GraphSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Card className="rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none">
        <CardHeader>
          <CardTitle>图谱概览</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] p-3">
              <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                <Network className="h-3.5 w-3.5" />
                可见
              </div>
              <div className="mt-2 text-lg font-semibold">{visibleCount}</div>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] p-3">
              <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                <Layers3 className="h-3.5 w-3.5" />
                总数
              </div>
              <div className="mt-2 text-lg font-semibold">{totalNodes}</div>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card))] p-3">
              <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                <Sparkles className="h-3.5 w-3.5" />
                叶子
              </div>
              <div className="mt-2 text-lg font-semibold">{leafCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none">
        <CardHeader>
          <CardTitle>一级维度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            type="button"
            onClick={() => onSelectBranch(null)}
            className={cn(
              "w-full rounded-2xl border px-3 py-2 text-left text-sm transition",
              selectedBranchId === null
                ? "border-[hsl(var(--primary)/0.32)] bg-[hsl(var(--accent)/0.88)]"
                : "border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))]",
            )}
          >
            全部维度
          </button>
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => onSelectBranch(branch.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition",
                selectedBranchId === branch.id
                  ? "border-[hsl(var(--primary)/0.32)] bg-[hsl(var(--accent)/0.88)]"
                  : "border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))]",
              )}
            >
              <span>{branch.label}</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{branch.count}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="min-h-0 flex-1 rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none">
        <CardHeader>
          <CardTitle>收藏节点</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 overflow-auto space-y-2">
          {favoriteNodes.length > 0 ? (
            favoriteNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectBranch(node.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] px-3 py-2 text-left text-sm"
              >
                <span className="truncate">{node.label}</span>
                <Heart className="h-3.5 w-3.5 fill-current text-[hsl(var(--primary))]" />
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[hsl(var(--border)/0.72)] p-3 text-sm text-[hsl(var(--muted-foreground))]">
              当前还没有收藏节点。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
