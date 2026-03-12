"use client";

import { HelpCircle, Search } from "lucide-react";
import { ResourceModeSwitch } from "@/components/resource/ResourceModeSwitch";
import { Button } from "@/components/ui/button";
import type { ResourceMode } from "@/lib/resource-types";

type ResourceHeaderProps = {
  mode: ResourceMode;
  onModeChange: (mode: ResourceMode) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenHelp: () => void;
};

export function ResourceHeader({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  onOpenHelp,
}: ResourceHeaderProps) {
  if (mode === "graph") {
    return (
      <div className="rounded-[24px] border border-[hsl(var(--border)/0.62)] bg-[linear-gradient(180deg,rgba(248,251,255,0.92),rgba(243,248,253,0.88))] px-4 py-3 shadow-[0_14px_32px_rgba(38,60,88,0.06)] backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
          <div className="flex items-center gap-3 xl:min-w-[220px]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">Knowledge Graph</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">知识图谱工作区</div>
            </div>
            <ResourceModeSwitch mode={mode} onChange={onModeChange} />
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索节点名称、路径或备注"
              className="h-11 w-full rounded-2xl border border-[hsl(var(--border)/0.78)] bg-white/90 pl-11 pr-4 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.35)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
            />
          </div>

          <div className="flex justify-end xl:flex-none">
            <Button type="button" variant="outline" size="sm" className="h-11 rounded-2xl px-4" onClick={onOpenHelp}>
              <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
              帮助
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.78)] px-5 py-4 shadow-[0_18px_38px_rgba(41,65,92,0.06)] backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
          <div className="min-w-[160px]">
            <div className="text-[26px] font-semibold tracking-tight text-[hsl(var(--foreground))]">资料库</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">资源浏览与灵感查找</div>
          </div>
          <ResourceModeSwitch mode={mode} onChange={onModeChange} />
        </div>

        <div className="relative flex-1 xl:max-w-none">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索素材标题、标签或说明"
            className="h-11 w-full rounded-2xl border border-[hsl(var(--border)/0.82)] bg-[hsl(var(--card))] pl-11 pr-4 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.35)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
          />
        </div>

        <div className="flex justify-end xl:flex-none">
          <Button type="button" variant="outline" size="sm" onClick={onOpenHelp}>
            <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
            帮助
          </Button>
        </div>
      </div>
    </div>
  );
}
