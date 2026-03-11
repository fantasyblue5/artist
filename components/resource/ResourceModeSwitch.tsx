"use client";

import { Boxes, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResourceMode } from "@/lib/resource-types";

type ResourceModeSwitchProps = {
  mode: ResourceMode;
  onChange: (mode: ResourceMode) => void;
};

export function ResourceModeSwitch({ mode, onChange }: ResourceModeSwitchProps) {
  return (
    <div className="inline-flex items-center rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.92)] p-1">
      <button
        type="button"
        onClick={() => onChange("graph")}
        className={cn(
          "inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium transition",
          mode === "graph"
            ? "bg-[hsl(var(--foreground))] text-white"
            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.76)]",
        )}
      >
        <Network className="mr-1.5 h-4 w-4" />
        知识图谱
      </button>
      <button
        type="button"
        onClick={() => onChange("assets")}
        className={cn(
          "inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium transition",
          mode === "assets"
            ? "bg-[hsl(var(--foreground))] text-white"
            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.76)]",
        )}
      >
        <Boxes className="mr-1.5 h-4 w-4" />
        艺术素材
      </button>
    </div>
  );
}
