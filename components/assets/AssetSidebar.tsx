"use client";

import { Boxes, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AssetCategory } from "@/lib/resource-types";

type AssetSidebarProps = {
  category: AssetCategory;
  onChangeCategory: (category: AssetCategory) => void;
  counts: Record<AssetCategory, number>;
};

const categories: AssetCategory[] = ["全部素材", "构图模板", "色彩方案", "光影参考", "笔触纹理", "风格样本", "透视空间", "收藏素材"];

export function AssetSidebar({ category, onChangeCategory, counts }: AssetSidebarProps) {
  return (
    <Card className="h-full rounded-[26px] border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.86)] shadow-none">
      <CardHeader>
        <CardTitle>资源分类</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChangeCategory(item)}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition",
              category === item
                ? "border-[hsl(var(--primary)/0.32)] bg-[hsl(var(--accent)/0.88)]"
                : "border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card))]",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {item === "收藏素材" ? <Heart className="h-3.5 w-3.5" /> : <Boxes className="h-3.5 w-3.5" />}
              {item}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">{counts[item] ?? 0}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
