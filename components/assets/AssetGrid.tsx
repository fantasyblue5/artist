"use client";

import { AssetCard } from "@/components/assets/AssetCard";
import type { AssetRecord, GraphNodeRecord } from "@/lib/resource-types";

type AssetGridProps = {
  assets: AssetRecord[];
  nodeMap: Record<string, GraphNodeRecord>;
  onToggleFavorite: (assetId: string) => void;
  onSelect: (assetId: string) => void;
  onOpenNode: (nodeId: string) => void;
};

export function AssetGrid({ assets, nodeMap, onToggleFavorite, onSelect, onOpenNode }: AssetGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          nodeMap={nodeMap}
          onToggleFavorite={onToggleFavorite}
          onSelect={onSelect}
          onOpenNode={onOpenNode}
        />
      ))}
    </div>
  );
}
