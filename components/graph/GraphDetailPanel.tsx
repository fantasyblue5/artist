"use client";

import { useMemo, useState } from "react";
import { Heart, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GraphNodeRecord } from "@/lib/resource-types";
import { cn } from "@/lib/utils";

type GraphDetailPanelProps = {
  node: GraphNodeRecord | null;
  nodeMap: Record<string, GraphNodeRecord>;
  onSelectNode: (nodeId: string) => void;
  onToggleFavorite: (nodeId: string) => void;
  onClose?: () => void;
  className?: string;
};

export function GraphDetailPanel({
  node,
  nodeMap,
  onSelectNode,
  onToggleFavorite,
  onClose,
  className,
}: GraphDetailPanelProps) {
  const [message, setMessage] = useState<string | null>(null);

  const children = useMemo(
    () => (node ? node.children.map((id) => nodeMap[id]).filter(Boolean) : []),
    [node, nodeMap],
  );

  if (!node) {
    return (
      <Card className={cn("h-full rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none", className)}>
        <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="h-16 w-16 rounded-3xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--accent)/0.78)]" />
          <div className="text-lg font-semibold">请选择一个节点</div>
          <div className="max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">单击图谱节点后，这里会显示路径、解释与子节点，方便你聚焦当前结构。</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(244,248,253,0.92))] shadow-[0_18px_38px_rgba(35,56,84,0.12)] backdrop-blur-xl", className)}>
      <CardContent className="flex h-full flex-col gap-4 overflow-auto p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[22px] font-semibold tracking-tight">{node.label}</div>
              <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">第 {node.level} 层 · {node.isLeaf ? "叶子节点" : "分支节点"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant={node.favorite ? "default" : "outline"} size="sm" onClick={() => onToggleFavorite(node.id)}>
                <Heart className={`mr-1.5 h-4 w-4 ${node.favorite ? "fill-current" : ""}`} />
                收藏
              </Button>
              {onClose ? (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
            {node.path.map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-1">
                <span>{item}</span>
                {index < node.path.length - 1 ? <span>/</span> : null}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] p-4">
          <div className="mb-2 text-sm font-medium">节点解释</div>
          <div className="text-sm leading-7 text-[hsl(var(--foreground))]">
            {node.description || (node.isLeaf ? "当前叶子节点暂未补充说明。" : "当前节点用于组织更细粒度的评价结构。")}
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] p-4">
          <div className="mb-3 text-sm font-medium">子节点</div>
          <div className="flex flex-wrap gap-2">
            {children.length > 0 ? (
              children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className="rounded-full border border-[hsl(var(--border)/0.72)] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/0.32)] hover:text-[hsl(var(--primary))]"
                  onClick={() => onSelectNode(child.id)}
                >
                  {child.label}
                </button>
              ))
            ) : (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">当前节点没有子节点。</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(node.path.join(" / "));
              setMessage("路径已复制");
              window.setTimeout(() => setMessage(null), 1500);
            }}
          >
            <Link2 className="mr-1.5 h-4 w-4" />
            复制路径
          </Button>
        </div>

        {message ? <div className="rounded-xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--accent)/0.76)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">{message}</div> : null}
      </CardContent>
    </Card>
  );
}
