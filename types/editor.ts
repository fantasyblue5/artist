export type EditorTool =
  | "select"
  | "frame"
  | "brush"
  | "eraser"
  | "text"
  | "annotate";

export type BrushType = "pencil" | "marker" | "spray";

export type Point = {
  x: number;
  y: number;
};

export type Viewport = {
  x: number;
  y: number;
  scale: number;
};

export type Stroke = {
  id: string;
  frameId: string;
  points: Point[];
  size: number;
  color: string;
  opacity: number;
  brushType: BrushType;
};

export type FrameObject = {
  id: string;
  type: "frame";
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  background: string;
};

export type TextObject = {
  id: string;
  type: "text";
  frameId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
};

export type AnnotationObject = {
  id: string;
  type: "annotation";
  frameId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  index: number;
};

export type EditorObject = FrameObject | TextObject | AnnotationObject;
