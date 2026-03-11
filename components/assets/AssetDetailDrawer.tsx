"use client";

import { Heart, Palette, X } from "lucide-react";
import { AssetCover } from "@/components/assets/AssetCover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AssetRecord, GraphNodeRecord } from "@/lib/resource-types";

type AssetDetailDrawerProps = {
  asset: AssetRecord | null;
  nodeMap: Record<string, GraphNodeRecord>;
  onClose: () => void;
  onToggleFavorite: (assetId: string) => void;
  onOpenNode: (nodeId: string) => void;
};

export function AssetDetailDrawer({ asset, nodeMap, onClose, onToggleFavorite, onOpenNode }: AssetDetailDrawerProps) {
  if (!asset) {
    return (
      <Card className="h-full rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="h-16 w-16 rounded-3xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--accent)/0.8)]" />
          <div className="text-lg font-semibold">选择一个素材</div>
          <div className="max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">点击素材卡片后，这里会显示更大预览、标签与关联知识节点。</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[22px] font-semibold tracking-tight">{asset.title}</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{asset.type} · {asset.style}</div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <AssetCover asset={asset} className="h-52" />

        <div className="text-sm leading-7 text-[hsl(var(--foreground))]">{asset.description}</div>

        <div className="flex flex-wrap gap-2">
          {asset.tags.map((tag, index) => (
            <span key={`${asset.id}:detail-tag:${index}:${tag}`} className="rounded-full border border-[hsl(var(--border)/0.68)] px-2.5 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
              {tag}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))] p-4">
          <div className="mb-3 text-sm font-medium">关联知识节点</div>
          <div className="flex flex-wrap gap-2">
            {asset.relatedNodeIds.map((nodeId) => {
              const node = nodeMap[nodeId];
              if (!node) {
                return null;
              }
              return (
                <button
                  key={nodeId}
                  type="button"
                  className="rounded-full bg-[hsl(var(--accent)/0.82)] px-3 py-1 text-xs text-[hsl(var(--primary))]"
                  onClick={() => onOpenNode(nodeId)}
                >
                  {node.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button type="button" variant={asset.isFavorite ? "default" : "outline"} onClick={() => onToggleFavorite(asset.id)}>
            <Heart className={`mr-1.5 h-4 w-4 ${asset.isFavorite ? "fill-current" : ""}`} />
            收藏素材
          </Button>
          <Button type="button" variant="outline">
            <Palette className="mr-1.5 h-4 w-4" />
            加入创作条件
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
