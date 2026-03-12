"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type GraphNodeTone = {
  background: string;
  border: string;
  text: string;
  glow: string;
  badgeBackground: string;
  badgeText: string;
};

export type GraphCanvasNodeData = {
  label: string;
  level: number;
  selected: boolean;
  inPath: boolean;
  matched: boolean;
  tone: GraphNodeTone;
};

const sourceHandles = [
  { id: "source-top", position: Position.Top },
  { id: "source-right", position: Position.Right },
  { id: "source-bottom", position: Position.Bottom },
  { id: "source-left", position: Position.Left },
] as const;

const targetHandles = [
  { id: "target-top", position: Position.Top },
  { id: "target-right", position: Position.Right },
  { id: "target-bottom", position: Position.Bottom },
  { id: "target-left", position: Position.Left },
] as const;

export function GraphNode({ data }: NodeProps<GraphCanvasNodeData>) {
  const isRoot = data.level === 0;
  const baseShadow = data.selected
    ? `0 16px 32px ${data.tone.glow}`
    : data.inPath
      ? `0 12px 26px ${data.tone.glow}`
      : "0 8px 20px rgba(48,72,101,0.06)";

  return (
    <div
      className={cn(
        "relative w-fit min-w-[112px] max-w-[196px] cursor-grab rounded-[20px] border px-4 py-3 transition-[box-shadow,border-color,background-image] duration-150 active:cursor-grabbing",
        isRoot ? "min-w-[214px] max-w-[280px] rounded-[22px] px-5 py-4" : "",
        data.selected ? "ring-2 ring-[hsl(var(--primary)/0.18)]" : "",
      )}
      style={{
        borderColor: data.tone.border,
        backgroundImage: data.tone.background,
        color: data.tone.text,
        boxShadow: baseShadow,
      }}
    >
      {targetHandles.map((handle) => (
        <Handle key={handle.id} id={handle.id} type="target" position={handle.position} style={{ opacity: 0, width: 10, height: 10 }} />
      ))}
      {sourceHandles.map((handle) => (
        <Handle key={handle.id} id={handle.id} type="source" position={handle.position} style={{ opacity: 0, width: 10, height: 10 }} />
      ))}

      {data.matched ? (
        <span
          className="absolute right-3 top-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: data.tone.badgeBackground, color: data.tone.badgeText }}
        >
          搜索
        </span>
      ) : null}

      <div className={cn("flex min-h-[40px] items-center justify-center text-center", isRoot ? "min-h-[52px]" : "")}>
        <div className={cn("max-w-full break-words font-semibold leading-[1.25]", isRoot ? "text-[26px]" : "text-[21px]")}>
          {data.label}
        </div>
      </div>
    </div>
  );
}
