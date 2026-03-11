"use client";

import { Layers3, Network, Sparkles, TreePine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BranchSummary = {
  id: string;
  label: string;
  count: number;
  hasDescription: boolean;
};

type KnowledgeGraphSidebarProps = {
  totalNodes: number;
  totalLeafCount: number;
  visibleCount: number;
  branchSummaries: BranchSummary[];
  selectedBranchId: string | null;
  onSelectBranch: (branchId: string | null) => void;
};

export function KnowledgeGraphSidebar({
  totalNodes,
  totalLeafCount,
  visibleCount,
  branchSummaries,
  selectedBranchId,
  onSelectBranch,
}: KnowledgeGraphSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Card className="rounded-[28px] border-[hsl(var(--border)/0.76)] bg-[hsl(var(--card)/0.8)]">
        <CardHeader>
          <CardTitle>图谱概览</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--accent)/0.54)] p-3">
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <Network className="h-3.5 w-3.5" />
              当前可见节点
            </div>
            <div className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">{visibleCount}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.9)] p-3">
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <Layers3 className="h-3.5 w-3.5" />
                总节点
              </div>
              <div className="mt-2 text-xl font-semibold">{totalNodes}</div>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.9)] p-3">
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <Sparkles className="h-3.5 w-3.5" />
                叶子节点
              </div>
              <div className="mt-2 text-xl font-semibold">{totalLeafCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0 flex-1 rounded-[28px] border-[hsl(var(--border)/0.76)] bg-[hsl(var(--card)/0.8)]">
        <CardHeader>
          <CardTitle>一级分支</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 overflow-auto">
          <div className="space-y-2">
            {branchSummaries.map((branch) => {
              const active = selectedBranchId === branch.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left transition",
                    active
                      ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.14)]"
                      : "border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.9)] hover:bg-[hsl(var(--accent)/0.62)]",
                  )}
                  onClick={() => onSelectBranch(active ? null : branch.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[hsl(var(--foreground))]">{branch.label}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <TreePine className="h-3.5 w-3.5" />
                        <span>{branch.count} 个叶子属性</span>
                        {branch.hasDescription ? <span>含备注说明</span> : null}
                      </div>
                    </div>
                    <span className="rounded-full border border-[hsl(var(--border)/0.72)] px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      一级
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
