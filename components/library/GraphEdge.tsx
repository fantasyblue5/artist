"use client";

import { BaseEdge, getStraightPath, type EdgeProps } from "reactflow";

export function GraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: selected ? "rgba(72,115,165,0.74)" : "rgba(145,161,181,0.3)",
        strokeWidth: selected ? 1.6 : 1,
      }}
    />
  );
}
