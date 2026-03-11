"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type GraphNodeData = {
  label: string;
  level: number;
  count: number;
  descriptionSnippet: string;
  isLeaf: boolean;
  selected: boolean;
  inPath: boolean;
  matched: boolean;
  flashed: boolean;
};

function levelLabel(level: number) {
  const labels = ["根", "一级", "二级", "三级", "四级", "五级", "六级"];
  return labels[level] ?? `${level}级`;
}

export function GraphNode({
  data,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
}: NodeProps<GraphNodeData>) {
  const isRoot = data.level === 0;

  return (
    <div
      className={cn(
        "group relative rounded-[22px] border transition-all",
        isRoot
          ? "min-w-[184px] border-[rgba(58,101,152,0.98)] bg-[linear-gradient(135deg,rgba(53,89,136,0.98),rgba(78,118,167,0.98))] px-5 py-4 text-white shadow-[0_18px_42px_rgba(56,93,138,0.34)]"
          : data.selected
            ? "min-w-[162px] border-[rgba(88,132,186,0.92)] bg-[linear-gradient(180deg,rgba(109,151,199,0.98),rgba(92,137,184,0.96))] px-4 py-3 text-white shadow-[0_16px_34px_rgba(59,97,144,0.28)]"
            : data.inPath
              ? "min-w-[150px] border-[rgba(128,165,205,0.82)] bg-[linear-gradient(180deg,rgba(229,239,249,0.98),rgba(214,229,245,0.96))] px-4 py-3 text-[hsl(var(--foreground))] shadow-[0_14px_28px_rgba(73,108,147,0.16)]"
              : data.isLeaf
                ? "min-w-[144px] border-[rgba(209,219,231,0.92)] bg-[rgba(244,247,251,0.98)] px-4 py-3 text-[hsl(var(--foreground))] shadow-[0_10px_22px_rgba(52,78,109,0.08)]"
                : "min-w-[148px] border-[rgba(170,193,217,0.78)] bg-[rgba(238,246,254,0.98)] px-4 py-3 text-[hsl(var(--foreground))] shadow-[0_10px_22px_rgba(52,78,109,0.1)]",
        data.flashed ? "animate-[pulse_1.2s_ease-in-out_2]" : "",
      )}
    >
      <Handle type="target" position={targetPosition} style={{ width: 8, height: 8, border: 0, background: "rgba(106,145,189,0.42)", opacity: 0 }} />
      <Handle type="source" position={sourcePosition} style={{ width: 8, height: 8, border: 0, background: "rgba(106,145,189,0.42)", opacity: 0 }} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn("truncate text-[13px] font-semibold", isRoot || data.selected ? "text-current" : "text-[hsl(var(--foreground))]")}>{data.label}</div>
          <div className={cn("mt-1 text-[11px]", isRoot || data.selected ? "text-[rgba(233,243,255,0.88)]" : "text-[hsl(var(--muted-foreground))]")}>
            {levelLabel(data.level)} · {data.isLeaf ? "叶子属性" : `${data.count} 个子叶`}
          </div>
        </div>
        {data.matched ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", isRoot || data.selected ? "bg-white/14 text-white" : "bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]")}>
            命中
          </span>
        ) : null}
      </div>

      {data.descriptionSnippet ? (
        <div className={cn("mt-2 line-clamp-2 text-[11px] leading-5", isRoot || data.selected ? "text-[rgba(238,246,255,0.9)]" : "text-[hsl(var(--muted-foreground))]")}>
          {data.descriptionSnippet}
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-1/2 top-0 z-30 w-[220px] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-2xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.98)] p-3 text-left opacity-0 shadow-[0_16px_28px_rgba(36,61,89,0.16)] transition group-hover:opacity-100">
        <div className="text-xs font-semibold text-[hsl(var(--foreground))]">{data.label}</div>
        <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{levelLabel(data.level)}</div>
        {data.descriptionSnippet ? <div className="mt-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{data.descriptionSnippet}</div> : null}
      </div>
    </div>
  );
}
