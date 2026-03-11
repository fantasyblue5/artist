import type { KnowledgeGraphData, KnowledgeGraphNode, KnowledgeGraphTree, KnowledgeTreeSourceNode } from "@/lib/library/types";

export const KNOWLEDGE_GRAPH_ROOT_ID = "knowledge-root";
export const KNOWLEDGE_GRAPH_ROOT_LABEL = "艺术评价体系";

type MutableNode = Omit<KnowledgeGraphNode, "children" | "childIds" | "count" | "siblingIds"> & {
  childIdSet: Set<string>;
  count: number;
  siblingIds: string[];
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function createNodeId(pathLabels: string[]) {
  return `kg:${pathLabels.map((item) => encodeURIComponent(item)).join("/")}`;
}

function toArray(input: KnowledgeTreeSourceNode[] | KnowledgeTreeSourceNode | null | undefined) {
  if (!input) {
    return [] as KnowledgeTreeSourceNode[];
  }
  return Array.isArray(input) ? input : [input];
}

function summarizeDescription(description: string | null, maxLength = 54) {
  if (!description) {
    return "";
  }

  const compact = description.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength)}...`;
}

export function buildKnowledgeGraphFromTree(
  source: KnowledgeTreeSourceNode[] | KnowledgeTreeSourceNode,
  favoriteIds: string[] = [],
): KnowledgeGraphData {
  const favoriteSet = new Set(favoriteIds);
  const mutableMap = new Map<string, MutableNode>();
  const parentChildKeys = new Set<string>();

  const rootNode: MutableNode = {
    id: KNOWLEDGE_GRAPH_ROOT_ID,
    label: KNOWLEDGE_GRAPH_ROOT_LABEL,
    name: KNOWLEDGE_GRAPH_ROOT_LABEL,
    level: 0,
    parentId: null,
    childIdSet: new Set<string>(),
    rawPath: [],
    pathIds: [KNOWLEDGE_GRAPH_ROOT_ID],
    pathLabels: [KNOWLEDGE_GRAPH_ROOT_LABEL],
    rootId: KNOWLEDGE_GRAPH_ROOT_ID,
    description: "艺术评价体系总览。点击节点查看定义、路径、子节点与可复用的评价说明。",
    isLeaf: false,
    hasDescription: true,
    favorite: favoriteSet.has(KNOWLEDGE_GRAPH_ROOT_ID),
    count: 0,
    siblingIds: [],
  };

  mutableMap.set(rootNode.id, rootNode);

  const ensureNode = (parentId: string, label: string, description: string | null, level: number) => {
    const parent = mutableMap.get(parentId);
    const rawPath = [...(parent?.rawPath ?? []), label];
    const pathLabels = [KNOWLEDGE_GRAPH_ROOT_LABEL, ...rawPath];
    const nodeId = createNodeId(rawPath);
    const existing = mutableMap.get(nodeId);

    if (existing) {
      if (!existing.description && description) {
        existing.description = description;
        existing.hasDescription = true;
      }
      return existing;
    }

    const rootId = level === 1 ? nodeId : (parent?.rootId ?? KNOWLEDGE_GRAPH_ROOT_ID);

    const node: MutableNode = {
      id: nodeId,
      label,
      name: label,
      level,
      parentId,
      childIdSet: new Set<string>(),
      rawPath,
      pathIds: [...(parent?.pathIds ?? [KNOWLEDGE_GRAPH_ROOT_ID]), nodeId],
      pathLabels,
      rootId,
      description,
      isLeaf: true,
      hasDescription: Boolean(description),
      favorite: favoriteSet.has(nodeId),
      count: 0,
      siblingIds: [],
    };

    mutableMap.set(nodeId, node);
    return node;
  };

  const walk = (items: KnowledgeTreeSourceNode[], parentId: string, level: number) => {
    for (const item of items) {
      const label = normalizeText(item?.name);
      if (!label) {
        continue;
      }

      const description = normalizeText(item?.description) || null;
      const node = ensureNode(parentId, label, description, level);
      const relationKey = `${parentId}->${node.id}`;

      if (!parentChildKeys.has(relationKey)) {
        mutableMap.get(parentId)?.childIdSet.add(node.id);
        parentChildKeys.add(relationKey);
      }

      const children = toArray(item?.children).filter((child) => normalizeText(child?.name));
      if (children.length > 0) {
        walk(children, node.id, level + 1);
      }
    }
  };

  walk(toArray(source), KNOWLEDGE_GRAPH_ROOT_ID, 1);

  const countLeaves = (nodeId: string): number => {
    const node = mutableMap.get(nodeId);
    if (!node) {
      return 0;
    }

    const childIds = Array.from(node.childIdSet);
    if (childIds.length === 0) {
      node.isLeaf = true;
      node.count = nodeId === KNOWLEDGE_GRAPH_ROOT_ID ? 0 : 1;
      return node.count;
    }

    node.isLeaf = false;
    node.count = childIds.reduce((sum, childId) => sum + countLeaves(childId), 0);
    return node.count;
  };

  countLeaves(KNOWLEDGE_GRAPH_ROOT_ID);

  const nodeMap: Record<string, KnowledgeGraphNode> = {};
  const nodes = Array.from(mutableMap.values())
    .map((node) => {
      const childIds = Array.from(node.childIdSet);
      const siblingIds = node.parentId
        ? Array.from(mutableMap.get(node.parentId)?.childIdSet ?? []).filter((item) => item !== node.id)
        : [];

      const normalized: KnowledgeGraphNode = {
        id: node.id,
        label: node.label,
        name: node.name,
        level: node.level,
        parentId: node.parentId,
        children: childIds,
        childIds,
        rawPath: node.rawPath,
        pathIds: node.pathIds,
        pathLabels: node.pathLabels,
        rootId: node.rootId,
        description: node.description,
        isLeaf: node.isLeaf,
        count: node.count,
        hasDescription: Boolean(node.description),
        favorite: node.favorite,
        siblingIds,
      };

      nodeMap[normalized.id] = normalized;
      return normalized;
    })
    .sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.pathLabels.join("/").localeCompare(b.pathLabels.join("/"), "zh-Hans");
    });

  const edges = nodes
    .filter((node) => Boolean(node.parentId))
    .map((node) => ({
      id: `edge:${node.parentId}->${node.id}`,
      source: node.parentId as string,
      target: node.id,
    }));

  const buildTree = (nodeId: string): KnowledgeGraphTree => {
    const node = nodeMap[nodeId];
    return {
      id: nodeId,
      children: [...node.children]
        .sort((a, b) => nodeMap[a].label.localeCompare(nodeMap[b].label, "zh-Hans"))
        .map((childId) => buildTree(childId)),
    };
  };

  const rootChildrenIds = [...(nodeMap[KNOWLEDGE_GRAPH_ROOT_ID]?.children ?? [])];
  const maxLevel = nodes.reduce((max, node) => Math.max(max, node.level), 0);

  return {
    rootId: KNOWLEDGE_GRAPH_ROOT_ID,
    nodes,
    edges,
    nodeMap,
    tree: buildTree(KNOWLEDGE_GRAPH_ROOT_ID),
    rootChildrenIds,
    totalLeafCount: nodeMap[KNOWLEDGE_GRAPH_ROOT_ID]?.count ?? 0,
    maxLevel,
  };
}

export function getNodePathText(node: KnowledgeGraphNode) {
  return node.pathLabels.join(" / ");
}

export function getNodeDescriptionSnippet(node: KnowledgeGraphNode, maxLength = 54) {
  return summarizeDescription(node.description, maxLength);
}
