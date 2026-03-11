"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type GraphCanvasNodeData = {
  label: string;
  level: number;
  count: number;
  description: string;
  isLeaf: boolean;
  selected: boolean;
  inPath: boolean;
  matched: boolean;
};

function levelTone(level: number, isLeaf: boolean) {
  if (level === 0) {
    return "border-[rgba(50,87,134,0.96)] bg-[linear-gradient(135deg,rgba(49,83,128,0.98),rgba(69,106,154,0.98))] text-white";
  }
  if (level === 1) {
    return "border-[rgba(170,194,220,0.88)] bg-[rgba(233,242,250,0.98)] text-[hsl(var(--foreground))]";
  }
  if (isLeaf) {
    return "border-[rgba(214,223,233,0.92)] bg-[rgba(246,248,251,0.98)] text-[hsl(var(--foreground))]";
  }
  return "border-[rgba(220,228,237,0.94)] bg-[rgba(255,255,255,0.98)] text-[hsl(var(--foreground))]";
}

export function GraphNode({
  data,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
}: NodeProps<GraphCanvasNodeData>) {
  return (
    <div
      className={cn(
        "group relative min-w-[138px] cursor-grab rounded-[20px] border px-4 py-3 shadow-[0_8px_20px_rgba(48,72,101,0.06)] transition-all active:cursor-grabbing",
        levelTone(data.level, data.isLeaf),
        data.selected ? "ring-2 ring-[hsl(var(--primary)/0.28)] shadow-[0_14px_30px_rgba(62,94,133,0.14)]" : "",
        data.inPath && !data.selected ? "border-[rgba(123,160,198,0.78)] shadow-[0_10px_24px_rgba(77,114,154,0.08)]" : "",
      )}
    >
      <Handle type="target" position={targetPosition} style={{ opacity: 0, width: 8, height: 8 }} />
      <Handle type="source" position={sourcePosition} style={{ opacity: 0, width: 8, height: 8 }} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn("truncate text-[13px] font-semibold", data.level === 0 ? "text-white" : "text-[hsl(var(--foreground))]")}>{data.label}</div>
          <div className={cn("mt-1 text-[11px]", data.level === 0 ? "text-white/78" : "text-[hsl(var(--muted-foreground))]")}>
            {data.level === 0 ? "root" : `L${data.level}`} · {data.isLeaf ? "叶子" : `${data.count} 子叶`}
          </div>
        </div>
        {data.matched ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", data.level === 0 ? "bg-white/14 text-white" : "bg-[hsl(var(--accent))] text-[hsl(var(--primary))]")}>
            搜索
          </span>
        ) : null}
      </div>

      {data.description ? (
        <div className={cn("mt-2 line-clamp-2 text-[11px] leading-5", data.level === 0 ? "text-white/82" : "text-[hsl(var(--muted-foreground))]")}>
          {data.description}
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-1/2 top-0 z-30 w-[220px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.98)] p-3 text-left opacity-0 shadow-[0_12px_24px_rgba(34,56,84,0.14)] transition group-hover:opacity-100">
        <div className="text-xs font-semibold text-[hsl(var(--foreground))]">{data.label}</div>
        <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{data.level === 0 ? "根节点" : `第 ${data.level} 层`}</div>
        {data.description ? <div className="mt-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{data.description}</div> : null}
      </div>
    </div>
  );
}
