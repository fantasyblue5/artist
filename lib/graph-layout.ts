import type { GraphNodeRecord } from "@/lib/resource-types";

export type GraphPoint = {
  x: number;
  y: number;
};

type LayoutOptions = {
  levelGap?: number;
  rootRadius?: number;
  anglePadding?: number;
  startAngle?: number;
  nodeWidth?: number;
  minAngleGap?: number;
  branchFanAngle?: number;
};

function getVisibleChildren(node: GraphNodeRecord, visibleSet: Set<string>) {
  return node.children.filter((childId) => visibleSet.has(childId));
}

export function collectAncestorIds(nodeId: string | null, nodeMap: Record<string, GraphNodeRecord>) {
  const result: string[] = [];
  let cursor = nodeId ? nodeMap[nodeId] : undefined;

  while (cursor) {
    result.unshift(cursor.id);
    cursor = cursor.parent ? nodeMap[cursor.parent] : undefined;
  }

  return result;
}

export function collectDescendantIds(nodeId: string, nodeMap: Record<string, GraphNodeRecord>) {
  const result = new Set<string>();

  const walk = (currentId: string) => {
    result.add(currentId);
    const node = nodeMap[currentId];
    if (!node) {
      return;
    }

    node.children.forEach((childId) => walk(childId));
  };

  walk(nodeId);
  return result;
}

export function buildRadialTreeLayout(
  rootId: string,
  nodeMap: Record<string, GraphNodeRecord>,
  visibleNodeIds: string[],
  options: LayoutOptions = {},
) {
  const visibleSet = new Set(visibleNodeIds);
  const positions: Record<string, GraphPoint> = {};
  const levelGap = options.levelGap ?? 220;
  const rootRadius = options.rootRadius ?? 0;
  const anglePadding = options.anglePadding ?? 0.06;
  const startAngle = options.startAngle ?? -Math.PI / 2;
  const nodeWidth = options.nodeWidth ?? 220;
  const explicitMinAngleGap = options.minAngleGap;
  const branchFanAngle = options.branchFanAngle ?? 1.18;
  const leafCountCache = new Map<string, number>();

  const countLeaves = (nodeId: string): number => {
    const cached = leafCountCache.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }

    const node = nodeMap[nodeId];
    if (!node) {
      return 0;
    }

    const children = getVisibleChildren(node, visibleSet);
    if (children.length === 0) {
      leafCountCache.set(nodeId, 1);
      return 1;
    }

    const leafCount = children.reduce((sum, childId) => sum + countLeaves(childId), 0);
    leafCountCache.set(nodeId, leafCount);
    return leafCount;
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
    const nextRadius = levelGap * (level + 1);
    const minGap = explicitMinAngleGap ?? Math.min(0.88, nodeWidth / Math.max(nextRadius, 1) + anglePadding * 0.55);
    const availableSpan = angleTo - angleFrom;
    let childFrom = angleFrom;
    let childTo = angleTo;

    if (level > 0) {
      const minimumSpan = Math.max(children.length * minGap, minGap * 1.2);
      const preferredSpan = Math.min(branchFanAngle, minimumSpan + Math.log(totalLeaves + 1) * 0.12);
      const centeredSpan = Math.min(availableSpan, Math.max(minimumSpan, preferredSpan));
      childFrom = angle - centeredSpan / 2;
      childTo = angle + centeredSpan / 2;
    }

    let cursor = childFrom;

    children.forEach((childId) => {
      const ratio = countLeaves(childId) / Math.max(1, totalLeaves);
      const span = (childTo - childFrom) * ratio;
      const padding = Math.min(anglePadding, span * 0.18);
      const nextFrom = cursor + padding;
      const nextTo = cursor + span - padding;
      place(childId, level + 1, nextFrom, nextTo);
      cursor += span;
    });
  };

  place(rootId, 0, startAngle, startAngle + Math.PI * 2);

  return positions;
}
