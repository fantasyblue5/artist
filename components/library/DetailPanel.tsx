"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Pin, PinOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/lib/graph/types";
import { isFavoriteNode, toggleFavoriteNode } from "@/lib/storage/favorites";

type DetailPanelProps = {
  node: GraphNode | null;
  childCount: number;
  pinned: boolean;
  onTogglePin: () => void;
  visible: boolean;
};

export function DetailPanel({ node, childCount, pinned, onTogglePin, visible }: DetailPanelProps) {
  const [favorite, setFavorite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!node) {
      setFavorite(false);
      return;
    }
    setFavorite(isFavoriteNode(node.id));
  }, [node]);

  const referenceText = useMemo(() => {
    if (!node) {
      return "";
    }
    return `@${node.path.join(">")}`;
  }, [node]);

  const summary = useMemo(() => {
    if (!node) {
      return [] as Array<{ label: string; value: string }>;
    }

    return [
      { label: "层级", value: `L${node.depth}` },
      { label: "子节点", value: String(childCount) },
      { label: "备注", value: node.hasRemark ? "有" : "无" },
    ];
  }, [childCount, node]);

  const onCopy = async () => {
    if (!referenceText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referenceText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const onToggleFavorite = () => {
    if (!node) {
      return;
    }

    const next = toggleFavoriteNode(node.id);
    setFavorite(next);
  };

  if (!visible) {
    return (
      <aside className="w-[380px] shrink-0 border-l border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.5)] p-4 backdrop-blur">
        <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.82)]">
          <CardContent className="flex h-full items-center justify-center p-4 text-sm text-[hsl(var(--muted-foreground))]">
            当前 Tab 暂无详情
          </CardContent>
        </Card>
      </aside>
    );
  }

  return (
    <aside className="w-[380px] shrink-0 border-l border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.5)] p-4 backdrop-blur">
      <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.84)]">
        <CardContent className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[20px] font-semibold tracking-tight text-[hsl(var(--foreground))]">
                {node?.title ?? "请选择节点"}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                {node ? node.path.join(" > ") : "点击图谱节点查看路径与描述"}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className={cn("h-9 w-9 rounded-xl", pinned && "border-[hsl(var(--primary)/0.45)] text-[hsl(var(--primary))]")}
              onClick={onTogglePin}
              disabled={!node}
              title={pinned ? "取消固定" : "固定详情"}
            >
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          </div>

          {node ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.68)] px-3 py-2"
                  >
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]">{item.label}</div>
                    <div className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card)/0.66)] p-3">
                <div className="mb-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {node.isLeaf ? "节点描述（备注）" : "节点摘要"}
                </div>
                {node.isLeaf ? (
                  <div className="space-y-2">
                    {node.remarks.length > 0 ? (
                      node.remarks.map((remark, index) => (
                        <p key={`${node.id}-remark-${index}`} className="text-sm leading-6 text-[hsl(var(--foreground))]">
                          {remark}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">该叶子节点暂无备注内容。</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    这是一个中间层级节点，包含 {childCount} 个直接子节点。
                    {node.hasRemark ? "该节点本身也有备注。" : "该节点本身暂无备注。"}
                  </p>
                )}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-2xl" onClick={onToggleFavorite}>
                  <Star className={cn("mr-2 h-4 w-4", favorite && "fill-current text-[hsl(var(--primary))]")} />
                  {favorite ? "已收藏" : "收藏"}
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={onCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "已复制" : "复制引用"}
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.68)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
              点击图谱节点后，这里将显示节点标题、路径、备注与快捷操作。
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
