declare module "react-force-graph-2d" {
  import * as React from "react";

  export type NodeObject = {
    id?: string | number;
    [key: string]: unknown;
  };

  export type LinkObject<NodeType extends NodeObject = NodeObject> = {
    source?: string | number | NodeType;
    target?: string | number | NodeType;
    [key: string]: unknown;
  };

  export type ForceGraphMethods<NodeType extends NodeObject = NodeObject, LinkType extends LinkObject<NodeType> = LinkObject<NodeType>> = {
    zoom: (zoomLevel: number, ms?: number) => void;
    centerAt: (x?: number, y?: number, ms?: number) => void;
    zoomToFit: (ms?: number, padding?: number, nodeFilter?: (node: NodeType) => boolean) => void;
    d3Force: (name: string, forceFn?: unknown) => unknown;
    d3ReheatSimulation: () => void;
  };

  export type ForceGraphProps<NodeType extends NodeObject = NodeObject, LinkType extends LinkObject<NodeType> = LinkObject<NodeType>> = {
    ref?: React.Ref<ForceGraphMethods<NodeType, LinkType>>;
    width?: number;
    height?: number;
    graphData?: {
      nodes: NodeType[];
      links: LinkType[];
    };
    nodeRelSize?: number;
    cooldownTicks?: number;
    enablePanInteraction?: boolean;
    enableZoomInteraction?: boolean;
    enableNodeDrag?: boolean;
    dagMode?: "td" | "bu" | "lr" | "rl" | "zin" | "zout" | "radialin" | "radialout";
    dagLevelDistance?: number | null;
    linkDirectionalArrowLength?: number;
    linkDirectionalArrowRelPos?: number;
    nodeCanvasObject?: (node: NodeType, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    nodeCanvasObjectMode?: string | ((node: NodeType) => string);
    linkWidth?: number | ((link: LinkType) => number);
    linkColor?: string | ((link: LinkType) => string);
    onNodeClick?: (node: NodeType, event: MouseEvent) => void;
    onNodeHover?: (node: NodeType | null, previousNode: NodeType | null) => void;
    onBackgroundClick?: (event: MouseEvent) => void;
    onZoomEnd?: (transform: { k: number; x: number; y: number }) => void;
  };

  const ForceGraph2D: React.ComponentType<ForceGraphProps>;
  export default ForceGraph2D;
}
