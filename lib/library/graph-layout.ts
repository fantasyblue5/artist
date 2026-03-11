import type { KnowledgeGraphNode } from "@/lib/library/types";

export type GraphPoint = {
  x: number;
  y: number;
};

type LayoutOptions = {
  levelGap?: number;
  rootRadius?: number;
  anglePadding?: number;
  startAngle?: number;
};

function getVisibleChildren(node: KnowledgeGraphNode, visibleSet: Set<string>) {
  return node.children.filter((childId) => visibleSet.has(childId));
}

export function collectAncestorIds(nodeId: string | null, nodeMap: Record<string, KnowledgeGraphNode>) {
  const ids: string[] = [];
  let cursor = nodeId ? nodeMap[nodeId] : undefined;

  while (cursor) {
    ids.unshift(cursor.id);
    cursor = cursor.parentId ? nodeMap[cursor.parentId] : undefined;
  }

  return ids;
}

export function collectDescendantIds(nodeId: string, nodeMap: Record<string, KnowledgeGraphNode>) {
  const result = new Set<string>();

  const walk = (currentId: string) => {
    result.add(currentId);
    const node = nodeMap[currentId];
    if (!node) {
      return;
    }

    for (const childId of node.children) {
      walk(childId);
    }
  };

  walk(nodeId);
  return result;
}

export function buildRadialLayout(
  rootId: string,
  nodeMap: Record<string, KnowledgeGraphNode>,
  visibleNodeIds: string[],
  options: LayoutOptions = {},
) {
  const visibleSet = new Set(visibleNodeIds);
  const positions: Record<string, GraphPoint> = {};
  const levelGap = options.levelGap ?? 250;
  const rootRadius = options.rootRadius ?? 0;
  const anglePadding = options.anglePadding ?? 0.08;
  const startAngle = options.startAngle ?? -Math.PI / 2;

  const countLeaves = (nodeId: string): number => {
    const node = nodeMap[nodeId];
    if (!node) {
      return 0;
    }

    const children = getVisibleChildren(node, visibleSet);
    if (children.length === 0) {
      return 1;
    }

    return children.reduce((sum, childId) => sum + countLeaves(childId), 0);
  };

  const place = (nodeId: string, level: number, angleFrom: number, angleTo: number) => {
    const node = nodeMap[nodeId];
    if (!node) {
      return;
    }

    const angle = (angleFrom + angleTo) / 2;
    const radius = level === 0 ? rootRadius : levelGap * level;
    positions[nodeId] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };

    const children = getVisibleChildren(node, visibleSet);
    if (children.length === 0) {
      return;
    }

    const totalLeaves = children.reduce((sum, childId) => sum + countLeaves(childId), 0);
    let cursor = angleFrom;

    children.forEach((childId) => {
      const ratio = countLeaves(childId) / Math.max(1, totalLeaves);
      const fullSpan = (angleTo - angleFrom) * ratio;
      const childFrom = cursor + Math.min(anglePadding, fullSpan * 0.18);
      const childTo = cursor + fullSpan - Math.min(anglePadding, fullSpan * 0.18);
      place(childId, level + 1, childFrom, childTo);
      cursor += fullSpan;
    });
  };

  place(rootId, 0, startAngle, startAngle + Math.PI * 2);
  return positions;
}
