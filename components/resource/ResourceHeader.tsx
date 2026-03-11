"use client";

import { Clock3, Heart, HelpCircle, Search } from "lucide-react";
import { ResourceModeSwitch } from "@/components/resource/ResourceModeSwitch";
import { Button } from "@/components/ui/button";
import type { ResourceMode } from "@/lib/resource-types";

type ResourceHeaderProps = {
  mode: ResourceMode;
  onModeChange: (mode: ResourceMode) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenHelp: () => void;
  favoriteCount: number;
  recentCount: number;
};

export function ResourceHeader({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  onOpenHelp,
  favoriteCount,
  recentCount,
}: ResourceHeaderProps) {
  return (
    <div className="rounded-[28px] border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.78)] p-4 shadow-[0_18px_38px_rgba(41,65,92,0.06)] backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-[160px]">
            <div className="text-[26px] font-semibold tracking-tight text-[hsl(var(--foreground))]">资料库</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {mode === "graph" ? "结构浏览与关系理解" : "资源浏览与灵感查找"}
            </div>
          </div>
          <ResourceModeSwitch mode={mode} onChange={onModeChange} />
        </div>

        <div className="relative flex-1 xl:max-w-[620px]">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={mode === "graph" ? "搜索节点名称、路径或备注" : "搜索素材标题、标签或说明"}
            className="h-11 w-full rounded-2xl border border-[hsl(var(--border)/0.82)] bg-[hsl(var(--card))] pl-11 pr-4 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.35)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm">
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            收藏 {favoriteCount}
          </Button>
          <Button type="button" variant="outline" size="sm">
            <Clock3 className="mr-1.5 h-3.5 w-3.5" />
            最近使用 {recentCount}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onOpenHelp}>
            <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
            帮助
          </Button>
        </div>
      </div>
    </div>
  );
}
