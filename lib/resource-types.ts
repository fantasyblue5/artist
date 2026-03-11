export type ResourceMode = "graph" | "assets";

export type GraphSourceNode = {
  id?: string;
  name?: string;
  description?: string | null;
  children?: GraphSourceNode[];
};

export type GraphNodeRecord = {
  id: string;
  label: string;
  level: number;
  parent: string | null;
  children: string[];
  description: string | null;
  isLeaf: boolean;
  path: string[];
  pathIds: string[];
  count: number;
  favorite: boolean;
  siblingIds: string[];
  searchText: string;
};

export type GraphEdgeRecord = {
  id: string;
  source: string;
  target: string;
};

export type GraphData = {
  rootId: string;
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
  nodeMap: Record<string, GraphNodeRecord>;
  levelOneIds: string[];
  totalLeafCount: number;
  maxLevel: number;
};

export type GraphSearchItem = {
  id: string;
  label: string;
  level: number;
  pathText: string;
  description: string;
};

export type GraphNodePosition = {
  x: number;
  y: number;
};

export type AssetType = "构图模板" | "色彩方案" | "光影参考" | "笔触纹理" | "风格样本" | "透视空间";

export type AssetCategory = "全部素材" | AssetType | "收藏素材";

export type AssetSortMode = "热门" | "最新" | "收藏";

export type AssetItem = {
  id: string;
  title: string;
  description: string;
  type: AssetType;
  tags: string[];
  relatedNodeIds: string[];
  coverImage?: string;
  coverVariant?: string;
  isFavorite?: boolean;
  style: string;
  hotScore: number;
  createdAt: number;
};

export type AssetRecord = AssetItem;

export type AssetSearchItem = {
  id: string;
  title: string;
  description: string;
};
