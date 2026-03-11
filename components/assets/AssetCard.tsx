"use client";

import { Heart } from "lucide-react";
import { AssetCover } from "@/components/assets/AssetCover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AssetRecord, GraphNodeRecord } from "@/lib/resource-types";

type AssetCardProps = {
  asset: AssetRecord;
  nodeMap: Record<string, GraphNodeRecord>;
  onToggleFavorite: (assetId: string) => void;
  onSelect: (assetId: string) => void;
  onOpenNode: (nodeId: string) => void;
};

export function AssetCard({ asset, nodeMap, onToggleFavorite, onSelect, onOpenNode }: AssetCardProps) {
  return (
    <Card className="group overflow-hidden rounded-[24px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.94)] shadow-none transition-transform duration-200 hover:-translate-y-1">
      <button type="button" className="block w-full text-left" onClick={() => onSelect(asset.id)}>
        <AssetCover asset={asset} className="h-44 w-full rounded-none border-x-0 border-t-0" />
      </button>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <button type="button" className="min-w-0 text-left" onClick={() => onSelect(asset.id)}>
            <div className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{asset.title}</div>
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{asset.description}</div>
          </button>
          <Button type="button" variant={asset.isFavorite ? "default" : "outline"} size="icon" className="h-8 w-8 rounded-xl" onClick={() => onToggleFavorite(asset.id)}>
            <Heart className={`h-4 w-4 ${asset.isFavorite ? "fill-current" : ""}`} />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {asset.tags.slice(0, 3).map((tag, index) => (
            <span key={`${asset.id}:tag:${index}:${tag}`} className="rounded-full border border-[hsl(var(--border)/0.68)] px-2.5 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {asset.relatedNodeIds.slice(0, 2).map((nodeId) => {
            const node = nodeMap[nodeId];
            if (!node) {
              return null;
            }
            return (
              <button
                key={nodeId}
                type="button"
                className="rounded-full bg-[hsl(var(--accent)/0.72)] px-2.5 py-1 text-[11px] text-[hsl(var(--primary))]"
                onClick={() => onOpenNode(nodeId)}
              >
                {node.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
