import type { GraphData, GraphNodeRecord, GraphSearchItem, GraphSourceNode } from "@/lib/resource-types";

export const GRAPH_ROOT_ID = "graph-root";
export const GRAPH_ROOT_LABEL = "艺术评价体系";

const LEVEL_ONE_LABEL_OVERRIDES: Record<string, string> = {
  形状体态: "形状形态",
  "透视与空间": "透视空间",
};

const LEVEL_ONE_ORDER = ["构图", "光影", "色彩关系", "笔触与肌理", "形状形态", "边缘关系", "透视空间"];

type MutableNode = Omit<GraphNodeRecord, "children" | "count" | "siblingIds" | "searchText"> & {
  childSet: Set<string>;
  count: number;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function displayLabel(label: string, level: number) {
  if (level === 1 && LEVEL_ONE_LABEL_OVERRIDES[label]) {
    return LEVEL_ONE_LABEL_OVERRIDES[label];
  }
  return label;
}

function createNodeId(path: string[]) {
  return `g:${path.map((item) => encodeURIComponent(item)).join("/")}`;
}

function toArray(input: GraphSourceNode[] | GraphSourceNode | null | undefined) {
  if (!input) {
    return [] as GraphSourceNode[];
  }
  return Array.isArray(input) ? input : [input];
}

export function buildGraphData(source: GraphSourceNode[], favoriteIds: string[] = []): GraphData {
  const favoriteSet = new Set(favoriteIds);
  const map = new Map<string, MutableNode>();
  const seenEdges = new Set<string>();

  map.set(GRAPH_ROOT_ID, {
    id: GRAPH_ROOT_ID,
    label: GRAPH_ROOT_LABEL,
    level: 0,
    parent: null,
    childSet: new Set<string>(),
    description: "艺术评价体系总览。默认展示七个一级维度，双击节点继续向外展开。",
    isLeaf: false,
    path: [GRAPH_ROOT_LABEL],
    pathIds: [GRAPH_ROOT_ID],
    count: 0,
    favorite: favoriteSet.has(GRAPH_ROOT_ID),
  });

  const ensureNode = (parentId: string, rawLabel: string, level: number, description: string | null) => {
    const parent = map.get(parentId);
    const label = displayLabel(rawLabel, level);
    const rawPath = [...(parent?.path.slice(1) ?? []), label];
    const nodeId = createNodeId(rawPath);
    const existing = map.get(nodeId);

    if (existing) {
      if (!existing.description && description) {
        existing.description = description;
      }
      return existing;
    }

    const node: MutableNode = {
      id: nodeId,
      label,
      level,
      parent: parentId,
      childSet: new Set<string>(),
      description,
      isLeaf: true,
      path: [GRAPH_ROOT_LABEL, ...rawPath],
      pathIds: [...(parent?.pathIds ?? [GRAPH_ROOT_ID]), nodeId],
      count: 0,
      favorite: favoriteSet.has(nodeId),
    };

    map.set(nodeId, node);
    return node;
  };

  const walk = (nodes: GraphSourceNode[], parentId: string, level: number) => {
    nodes.forEach((item) => {
      const rawLabel = normalizeText(item?.name);
      if (!rawLabel) {
        return;
      }

      const description = normalizeText(item?.description) || null;
      const node = ensureNode(parentId, rawLabel, level, description);
      const edgeKey = `${parentId}->${node.id}`;

      if (!seenEdges.has(edgeKey)) {
        map.get(parentId)?.childSet.add(node.id);
        seenEdges.add(edgeKey);
      }

      const children = toArray(item?.children).filter((child) => normalizeText(child?.name));
      if (children.length > 0) {
        walk(children, node.id, level + 1);
      }
    });
  };

  walk(toArray(source), GRAPH_ROOT_ID, 1);

  const countLeaves = (nodeId: string): number => {
    const node = map.get(nodeId);
    if (!node) {
      return 0;
    }

    const childIds = Array.from(node.childSet);
    if (childIds.length === 0) {
      node.isLeaf = true;
      node.count = nodeId === GRAPH_ROOT_ID ? 0 : 1;
      return node.count;
    }

    node.isLeaf = false;
    node.count = childIds.reduce((sum, childId) => sum + countLeaves(childId), 0);
    return node.count;
  };

  countLeaves(GRAPH_ROOT_ID);

  const nodeMap: Record<string, GraphNodeRecord> = {};
  const nodes = Array.from(map.values())
    .map((node) => {
      const children = Array.from(node.childSet).sort((a, b) => {
        const orderA = LEVEL_ONE_ORDER.indexOf(map.get(a)?.label ?? "");
        const orderB = LEVEL_ONE_ORDER.indexOf(map.get(b)?.label ?? "");
        if (node.id === GRAPH_ROOT_ID && orderA !== -1 && orderB !== -1 && orderA !== orderB) {
          return orderA - orderB;
        }
        return (map.get(a)?.label ?? "").localeCompare(map.get(b)?.label ?? "", "zh-Hans");
      });

      const siblingIds = node.parent ? Array.from(map.get(node.parent)?.childSet ?? []).filter((id) => id !== node.id) : [];

      const record: GraphNodeRecord = {
        id: node.id,
        label: node.label,
        level: node.level,
        parent: node.parent,
        children,
        description: node.description,
        isLeaf: node.isLeaf,
        path: node.path,
        pathIds: node.pathIds,
        count: node.count,
        favorite: node.favorite,
        siblingIds,
        searchText: [node.label, node.path.join(" / "), node.description ?? ""].join(" ").toLowerCase(),
      };

      nodeMap[record.id] = record;
      return record;
    })
    .sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      if (a.parent === GRAPH_ROOT_ID && b.parent === GRAPH_ROOT_ID) {
        return LEVEL_ONE_ORDER.indexOf(a.label) - LEVEL_ONE_ORDER.indexOf(b.label);
      }
      return a.path.join("/").localeCompare(b.path.join("/"), "zh-Hans");
    });

  const edges = nodes
    .filter((node) => Boolean(node.parent))
    .map((node) => ({
      id: `edge:${node.parent}->${node.id}`,
      source: node.parent as string,
      target: node.id,
    }));

  const levelOneIds = nodes.filter((node) => node.parent === GRAPH_ROOT_ID).map((node) => node.id);
  const totalLeafCount = nodeMap[GRAPH_ROOT_ID]?.count ?? 0;
  const maxLevel = nodes.reduce((max, node) => Math.max(max, node.level), 0);

  return {
    rootId: GRAPH_ROOT_ID,
    nodes,
    edges,
    nodeMap,
    levelOneIds,
    totalLeafCount,
    maxLevel,
  };
}

export function getGraphSearchResults(graph: GraphData, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [] as GraphSearchItem[];
  }

  return graph.nodes
    .filter((node) => node.id !== graph.rootId)
    .filter((node) => node.searchText.includes(normalized))
    .map((node) => ({
      id: node.id,
      label: node.label,
      level: node.level,
      pathText: node.path.join(" / "),
      description: node.description ?? "",
    }))
    .sort((a, b) => {
      const startsA = a.label.toLowerCase().startsWith(normalized) ? 0 : 1;
      const startsB = b.label.toLowerCase().startsWith(normalized) ? 0 : 1;
      if (startsA !== startsB) {
        return startsA - startsB;
      }
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.pathText.localeCompare(b.pathText, "zh-Hans");
    });
}
