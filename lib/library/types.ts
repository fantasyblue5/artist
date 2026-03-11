export type KnowledgeTreeSourceNode = {
  id?: string;
  name?: string;
  description?: string | null;
  children?: KnowledgeTreeSourceNode[];
};

export type KnowledgeNode = {
  id: string;
  name: string;
  description: string | null;
  children: KnowledgeNode[];
};

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  name: string;
  level: number;
  parentId: string | null;
  children: string[];
  childIds: string[];
  rawPath: string[];
  pathIds: string[];
  pathLabels: string[];
  rootId: string;
  description: string | null;
  isLeaf: boolean;
  count: number;
  hasDescription: boolean;
  favorite: boolean;
  siblingIds: string[];
};

export type KnowledgeGraphTree = {
  id: string;
  children: KnowledgeGraphTree[];
};

export type KnowledgeGraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type KnowledgeGraphLink = KnowledgeGraphEdge;

export type KnowledgeGraphData = {
  rootId: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  nodeMap: Record<string, KnowledgeGraphNode>;
  tree: KnowledgeGraphTree;
  rootChildrenIds: string[];
  totalLeafCount: number;
  maxLevel: number;
};

export type KnowledgeSearchResult = {
  id: string;
  label: string;
  level: number;
  pathText: string;
  descriptionSnippet: string;
};

export type KnowledgeResource = {
  id: string;
  title: string;
  type: "构图模板" | "色彩方案" | "笔触纹理" | "光影参考" | "风格参考";
  image: string;
  tags: string[];
  linkedNodeIds: string[];
  favorite: boolean;
};

export type LibraryAsset = {
  id: string;
  title: string;
  tags: string[];
  previewDataUrl?: string;
  mimeType?: string;
  createdAt: number;
};

export type PromptSnippet = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};
