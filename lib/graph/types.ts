export type GraphNode = {
  id: string;
  title: string;
  depth: number;
  parentId: string | null;
  childIds: string[];
  path: string[];
  remarks: string[];
  hasRemark: boolean;
  isLeaf: boolean;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootIds: string[];
  levelOneNodeIds: string[];
  sourcePath: string;
  rowCount: number;
};

export type GraphLoadResult =
  | {
      ok: true;
      data: GraphData;
    }
  | {
      ok: false;
      error: string;
      checkedPaths: string[];
    };
