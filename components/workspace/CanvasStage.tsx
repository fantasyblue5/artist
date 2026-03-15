"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fitViewportToBounds,
  screenToWorldPoint,
  worldToScreenPoint,
  type ViewportBounds,
  zoomViewportToPoint,
} from "@/lib/editor/viewport";
import type { CanvasDocState } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import type {
  AnnotationObject,
  BrushType,
  EditorObject,
  EditorTool,
  FrameObject,
  ImageObject,
  Point,
  Stroke,
  TextObject,
  Viewport,
} from "@/types/editor";
import { hitStroke, isPointInFrame } from "@/utils/coords";
import {
  Brush,
  Eraser,
  Focus,
  Frame,
  MessageCircleMore,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Type,
  Undo2,
  type LucideIcon,
} from "lucide-react";

const COLOR_PRESETS = ["#365f95", "#516f95", "#64748b", "#334155", "#b45372", "#c2415b"];

const FONT_OPTIONS = ["Inter", "Source Han Sans", "Serif"];

const FONT_SIZE_OPTIONS = [14, 16, 20, 24];

type Selection =
  | {
      kind: "object";
      id: string;
    }
  | {
      kind: "stroke";
      id: string;
    }
  | null;

type EditorDoc = CanvasDocState;

type CanvasStageProps = {
  initialDoc?: CanvasDocState;
  generatedImageRequest?: {
    requestId: string;
    status: "loading" | "ready" | "error";
    prompt: string;
    src?: string;
    sourceType?: "data-url" | "url";
    insertedLabel?: string;
  } | null;
  emptyMessage?: string | null;
  onDocChange?: (doc: CanvasDocState) => void;
  onSnapshotProvider?: (getSnapshot: () => string | null) => void;
};

type ToolConfig = {
  key: EditorTool;
  label: string;
  icon: LucideIcon;
  hotkey: string;
};

type DraftFrame = {
  start: Point;
  current: Point;
};

type BrushSettings = {
  size: number;
  color: string;
  opacity: number;
  brushType: BrushType;
};

type GenerationPreview = {
  requestId: string;
  frameId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt: string;
};

const IMAGE_PLACEMENT_OFFSETS: Point[] = [
  { x: 0, y: 0 },
  { x: 48, y: 48 },
  { x: -48, y: 48 },
  { x: 48, y: -48 },
  { x: -48, y: -48 },
  { x: 96, y: 0 },
  { x: 0, y: 96 },
  { x: -96, y: 0 },
  { x: 0, y: -96 },
];

function isSameGenerationPreview(a: GenerationPreview | null, b: GenerationPreview | null) {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return (
    a.requestId === b.requestId &&
    a.frameId === b.frameId &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.prompt === b.prompt
  );
}

type TextSettings = {
  fontFamily: string;
  fontSize: number;
  color: string;
};

type EraserMode = "stroke" | "tap";

type ResizeHandle = "nw" | "ne" | "sw" | "se";

type FramePresetKey = "custom" | "1:1" | "4:3" | "16:9" | "a4";

type HistoryAction =
  | { type: "addStroke"; stroke: Stroke }
  | { type: "removeStroke"; stroke: Stroke }
  | { type: "removeManyStrokes"; strokes: Stroke[] }
  | { type: "addObject"; object: EditorObject }
  | {
      type: "removeObject";
      object: EditorObject;
      removedObjects?: EditorObject[];
      removedStrokes?: Stroke[];
    }
  | { type: "updateObject"; before: EditorObject; after: EditorObject }
  | { type: "batch"; actions: HistoryAction[] };

const TOOLBAR_TOOLS: ToolConfig[] = [
  { key: "select", label: "选择", icon: MousePointer2, hotkey: "V" },
  { key: "frame", label: "新建画布", icon: Frame, hotkey: "F" },
  { key: "brush", label: "画笔", icon: Brush, hotkey: "B" },
  { key: "eraser", label: "橡皮", icon: Eraser, hotkey: "E" },
  { key: "text", label: "文字", icon: Type, hotkey: "T" },
  { key: "annotate", label: "标注", icon: MessageCircleMore, hotkey: "C" },
];

const FRAME_PRESETS: Array<{
  key: Exclude<FramePresetKey, "custom">;
  label: string;
  width: number;
  height: number;
}> = [
  { key: "1:1", label: "1:1", width: 1024, height: 1024 },
  { key: "4:3", label: "4:3", width: 1024, height: 768 },
  { key: "16:9", label: "16:9", width: 1280, height: 720 },
  { key: "a4", label: "A4", width: 2480, height: 3508 },
];

const RESIZE_HANDLE_META: Array<{ handle: ResizeHandle; className: string }> = [
  { handle: "nw", className: "-left-1.5 -top-1.5 cursor-nwse-resize" },
  { handle: "ne", className: "-right-1.5 -top-1.5 cursor-nesw-resize" },
  { handle: "sw", className: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
  { handle: "se", className: "-bottom-1.5 -right-1.5 cursor-nwse-resize" },
];

const FLOATING_OBJECT_FRAME_ID = "__stage__";

function normalizeFrame(start: Point, end: Point) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

function frameObjectsOf(objects: EditorObject[]) {
  return objects.filter((obj): obj is FrameObject => obj.type === "frame");
}

function getObjectById(objects: EditorObject[], id: string) {
  return objects.find((obj) => obj.id === id) ?? null;
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function extractTrailingNumber(value: string) {
  const match = value.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : 0;
}

function createUniqueId(baseId: string, usedIds: Set<string>) {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  const prefixMatch = baseId.match(/^(.*?)(?:-(\d+))?$/);
  const prefix = prefixMatch?.[1] || baseId;
  let nextNumber = Math.max(1, extractTrailingNumber(baseId));
  let candidate = `${prefix}-${nextNumber}`;

  while (usedIds.has(candidate)) {
    nextNumber += 1;
    candidate = `${prefix}-${nextNumber}`;
  }

  usedIds.add(candidate);
  return candidate;
}

function normalizeDocIdentifiers(doc: EditorDoc): EditorDoc {
  const usedObjectIds = new Set<string>();
  const usedStrokeIds = new Set<string>();
  let nextActiveFrameId = doc.activeFrameId;

  const objects = doc.objects.map((object) => {
    const nextId = createUniqueId(object.id, usedObjectIds);
    if (nextId === object.id) {
      return object;
    }

    if (object.type === "frame" && nextActiveFrameId === object.id) {
      nextActiveFrameId = nextId;
    }

    return {
      ...object,
      id: nextId,
    };
  });

  const strokes = doc.strokes.map((stroke) => {
    const nextId = createUniqueId(stroke.id, usedStrokeIds);
    return nextId === stroke.id ? stroke : { ...stroke, id: nextId };
  });

  return {
    ...doc,
    objects,
    strokes,
    activeFrameId: nextActiveFrameId,
  };
}

function getNextPointerCounter(doc: EditorDoc) {
  const objectMax = doc.objects.reduce((max, object) => Math.max(max, extractTrailingNumber(object.id)), 0);
  const strokeMax = doc.strokes.reduce((max, stroke) => Math.max(max, extractTrailingNumber(stroke.id)), 0);
  return Math.max(objectMax, strokeMax, 0) + 1;
}

function getNextFrameCounter(doc: EditorDoc) {
  const frameIndexMax = doc.objects.reduce(
    (max, object) => (object.type === "frame" ? Math.max(max, extractTrailingNumber(object.name)) : max),
    0,
  );
  const frameCount = doc.objects.filter((object) => object.type === "frame").length;
  return Math.max(frameIndexMax, frameCount) + 1;
}

function getNextAnnotationCounter(doc: EditorDoc) {
  const maxIndex = doc.objects.reduce(
    (max, object) => (object.type === "annotation" ? Math.max(max, object.index) : max),
    0,
  );
  return maxIndex + 1;
}

function ensureActiveFrame(doc: EditorDoc): EditorDoc {
  const frames = frameObjectsOf(doc.objects);
  if (frames.length === 0) {
    return { ...doc, activeFrameId: null };
  }

  const exists = doc.activeFrameId && frames.some((frame) => frame.id === doc.activeFrameId);
  if (exists) {
    return doc;
  }

  return { ...doc, activeFrameId: frames[frames.length - 1].id };
}

function applyHistoryAction(doc: EditorDoc, action: HistoryAction, mode: "do" | "undo"): EditorDoc {
  const applySingle = (base: EditorDoc, single: HistoryAction, direction: "do" | "undo"): EditorDoc => {
    switch (single.type) {
      case "addStroke": {
        if (direction === "do") {
          return { ...base, strokes: [...base.strokes, single.stroke] };
        }
        return {
          ...base,
          strokes: base.strokes.filter((stroke) => stroke.id !== single.stroke.id),
        };
      }

      case "removeStroke": {
        if (direction === "do") {
          return {
            ...base,
            strokes: base.strokes.filter((stroke) => stroke.id !== single.stroke.id),
          };
        }
        if (base.strokes.some((stroke) => stroke.id === single.stroke.id)) {
          return base;
        }
        return { ...base, strokes: [...base.strokes, single.stroke] };
      }

      case "removeManyStrokes": {
        if (direction === "do") {
          const ids = new Set(single.strokes.map((stroke) => stroke.id));
          return {
            ...base,
            strokes: base.strokes.filter((stroke) => !ids.has(stroke.id)),
          };
        }

        const existingIds = new Set(base.strokes.map((stroke) => stroke.id));
        const restored = single.strokes.filter((stroke) => !existingIds.has(stroke.id));
        return { ...base, strokes: [...base.strokes, ...restored] };
      }

      case "addObject": {
        if (direction === "do") {
          const next = { ...base, objects: [...base.objects, single.object] };
          if (single.object.type === "frame") {
            next.activeFrameId = single.object.id;
          }
          return ensureActiveFrame(next);
        }

        return ensureActiveFrame({
          ...base,
          objects: base.objects.filter((obj) => obj.id !== single.object.id),
        });
      }

      case "removeObject": {
        if (direction === "do") {
          const removedChildren =
            single.object.type === "frame"
              ? single.removedObjects ??
                base.objects.filter(
                  (obj) => obj.type !== "frame" && "frameId" in obj && obj.frameId === single.object.id,
                )
              : [];
          const removedStrokes =
            single.object.type === "frame"
              ? single.removedStrokes ??
                base.strokes.filter((stroke) => stroke.frameId === single.object.id)
              : [];

          const removedIds = new Set([single.object.id, ...removedChildren.map((obj) => obj.id)]);

          return ensureActiveFrame({
            ...base,
            objects: base.objects.filter((obj) => !removedIds.has(obj.id)),
            strokes:
              single.object.type === "frame"
                ? base.strokes.filter((stroke) => stroke.frameId !== single.object.id)
                : base.strokes,
          });
        }

        const existingObjectIds = new Set(base.objects.map((obj) => obj.id));
        const restoreObjects = [single.object, ...(single.removedObjects ?? [])].filter(
          (obj) => !existingObjectIds.has(obj.id),
        );

        const existingStrokeIds = new Set(base.strokes.map((stroke) => stroke.id));
        const restoreStrokes = (single.removedStrokes ?? []).filter(
          (stroke) => !existingStrokeIds.has(stroke.id),
        );

        return ensureActiveFrame({
          ...base,
          objects: [...base.objects, ...restoreObjects],
          strokes: [...base.strokes, ...restoreStrokes],
          activeFrameId: single.object.type === "frame" ? single.object.id : base.activeFrameId,
        });
      }

      case "updateObject": {
        const source = direction === "do" ? single.before : single.after;
        const target = direction === "do" ? single.after : single.before;

        return {
          ...base,
          objects: base.objects.map((obj) => (obj.id === source.id ? target : obj)),
        };
      }

      case "batch": {
        const sequence = direction === "do" ? single.actions : [...single.actions].reverse();
        return sequence.reduce((acc, item) => applySingle(acc, item, direction), base);
      }

      default:
        return base;
    }
  };

  return ensureActiveFrame(applySingle(doc, action, mode));
}

function makeRemoveObjectAction(target: EditorObject, doc: EditorDoc): HistoryAction {
  if (target.type !== "frame") {
    return { type: "removeObject", object: target };
  }

  const removedObjects = doc.objects.filter(
    (obj) => obj.type !== "frame" && "frameId" in obj && obj.frameId === target.id,
  );
  const removedStrokes = doc.strokes.filter((stroke) => stroke.frameId === target.id);

  return {
    type: "removeObject",
    object: target,
    removedObjects,
    removedStrokes,
  };
}

function findStrokeAtPoint(strokes: Stroke[], frameId: string, point: Point, threshold: number): Stroke | null {
  for (let i = strokes.length - 1; i >= 0; i -= 1) {
    const stroke = strokes[i];
    if (stroke.frameId !== frameId) {
      continue;
    }

    if (hitStroke(stroke, point, threshold)) {
      return stroke;
    }
  }

  return null;
}

function findObjectAtPoint(
  doc: EditorDoc,
  point: Point,
  activeFrameId: string | null,
  includeFrames: boolean,
): EditorObject | null {
  for (let i = doc.objects.length - 1; i >= 0; i -= 1) {
    const object = doc.objects[i];

    if (object.type === "frame") {
      if (includeFrames && isPointInFrame(point, object)) {
        return object;
      }
      continue;
    }

    if (activeFrameId && object.frameId !== activeFrameId) {
      continue;
    }

    const hit =
      point.x >= object.x &&
      point.x <= object.x + object.width &&
      point.y >= object.y &&
      point.y <= object.y + object.height;

    if (hit) {
      return object;
    }
  }

  return null;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, selected = false) {
  if (stroke.points.length === 0) {
    return;
  }

  const isMarker = stroke.brushType === "marker";
  const isSpray = stroke.brushType === "spray";

  ctx.save();
  ctx.globalAlpha = selected
    ? Math.min(1, stroke.opacity + 0.25)
    : isMarker
      ? Math.max(0.08, stroke.opacity * 0.72)
      : stroke.opacity;
  ctx.lineWidth = selected ? stroke.size + 2 : isMarker ? stroke.size * 1.3 : stroke.size;
  ctx.strokeStyle = selected ? "#2f65a6" : stroke.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (isSpray) {
    ctx.shadowBlur = selected ? 3 : 5;
    ctx.shadowColor = stroke.color;
  }

  ctx.beginPath();
  const [firstPoint, ...restPoints] = stroke.points;
  ctx.moveTo(firstPoint.x, firstPoint.y);
  restPoints.forEach((point) => {
    ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();
}

function resizeTextRect(
  before: TextObject,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
): Pick<TextObject, "x" | "y" | "width" | "height"> {
  const minWidth = 80;
  const minHeight = 32;

  let x = before.x;
  let y = before.y;
  let width = before.width;
  let height = before.height;

  if (handle.includes("e")) {
    width = before.width + deltaX;
  }
  if (handle.includes("s")) {
    height = before.height + deltaY;
  }
  if (handle.includes("w")) {
    width = before.width - deltaX;
    x = before.x + deltaX;
  }
  if (handle.includes("n")) {
    height = before.height - deltaY;
    y = before.y + deltaY;
  }

  if (width < minWidth) {
    if (handle.includes("w")) {
      x -= minWidth - width;
    }
    width = minWidth;
  }

  if (height < minHeight) {
    if (handle.includes("n")) {
      y -= minHeight - height;
    }
    height = minHeight;
  }

  return { x, y, width, height };
}

function resizeFrameRect(
  before: FrameObject,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
): Pick<FrameObject, "x" | "y" | "width" | "height"> {
  const minWidth = 180;
  const minHeight = 120;

  let x = before.x;
  let y = before.y;
  let width = before.width;
  let height = before.height;

  if (handle.includes("e")) {
    width = before.width + deltaX;
  }
  if (handle.includes("s")) {
    height = before.height + deltaY;
  }
  if (handle.includes("w")) {
    width = before.width - deltaX;
    x = before.x + deltaX;
  }
  if (handle.includes("n")) {
    height = before.height - deltaY;
    y = before.y + deltaY;
  }

  if (width < minWidth) {
    if (handle.includes("w")) {
      x -= minWidth - width;
    }
    width = minWidth;
  }

  if (height < minHeight) {
    if (handle.includes("n")) {
      y -= minHeight - height;
    }
    height = minHeight;
  }

  return { x, y, width, height };
}

function resizeImageRect(
  before: ImageObject,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
): Pick<ImageObject, "x" | "y" | "width" | "height"> {
  const minWidth = 80;
  const minHeight = 80;
  const rawWidth = handle.includes("w") ? before.width - deltaX : before.width + deltaX;
  const rawHeight = handle.includes("n") ? before.height - deltaY : before.height + deltaY;
  const scaleFromWidth = rawWidth / Math.max(1, before.width);
  const scaleFromHeight = rawHeight / Math.max(1, before.height);
  const useWidthScale = Math.abs(scaleFromWidth - 1) >= Math.abs(scaleFromHeight - 1);
  const minScale = Math.max(minWidth / Math.max(1, before.width), minHeight / Math.max(1, before.height));
  const nextScale = Math.max(minScale, useWidthScale ? scaleFromWidth : scaleFromHeight);
  const width = Math.max(minWidth, Math.round(before.width * nextScale));
  const height = Math.max(minHeight, Math.round(before.height * nextScale));
  const x = handle.includes("w") ? before.x + before.width - width : before.x;
  const y = handle.includes("n") ? before.y + before.height - height : before.y;

  return { x, y, width, height };
}

function pushRecentColor(list: string[], nextColor: string) {
  const normalized = nextColor.toLowerCase();
  const filtered = list.filter((item) => item.toLowerCase() !== normalized);
  return [nextColor, ...filtered].slice(0, 8);
}

function getFramePresetByKey(key: FramePresetKey) {
  return FRAME_PRESETS.find((preset) => preset.key === key) ?? null;
}

function getDocWorldBounds(doc: EditorDoc): ViewportBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const pushPoint = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  doc.objects.forEach((object) => {
    pushPoint(object.x, object.y);
    pushPoint(object.x + object.width, object.y + object.height);
  });

  doc.strokes.forEach((stroke) => {
    stroke.points.forEach((point) => {
      pushPoint(point.x, point.y);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function loadImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width || 1024,
        height: image.naturalHeight || image.height || 1024,
      });
    };
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}

function fitImageSizeIntoBounds(
  bounds: { width: number; height: number },
  naturalSize?: { width: number; height: number },
) {
  const aspect =
    naturalSize && naturalSize.width > 0 && naturalSize.height > 0
      ? naturalSize.width / naturalSize.height
      : 1;

  let width = bounds.width;
  let height = width / Math.max(0.01, aspect);

  if (height > bounds.height) {
    height = bounds.height;
    width = height * aspect;
  }

  width = Math.max(120, Math.round(width));
  height = Math.max(120, Math.round(height));

  return { width, height };
}

function getImagePlacement(frame: FrameObject, naturalSize?: { width: number; height: number }) {
  const { width, height } = fitImageSizeIntoBounds(
    {
      width: frame.width * 0.84,
      height: frame.height * 0.84,
    },
    naturalSize,
  );

  return {
    width,
    height,
    x: frame.x + (frame.width - width) / 2,
    y: frame.y + (frame.height - height) / 2,
  };
}

function getFloatingImagePlacement(
  viewport: Viewport,
  canvasSize: { width: number; height: number },
  naturalSize?: { width: number; height: number },
) {
  const centerWorld = screenToWorldPoint(
    { x: canvasSize.width / 2, y: canvasSize.height / 2 },
    viewport,
  );
  const visibleWorldWidth = canvasSize.width / Math.max(0.2, viewport.scale);
  const visibleWorldHeight = canvasSize.height / Math.max(0.2, viewport.scale);
  const { width, height } = fitImageSizeIntoBounds(
    {
      width: visibleWorldWidth * 0.42,
      height: visibleWorldHeight * 0.42,
    },
    naturalSize,
  );

  return {
    x: centerWorld.x - width / 2,
    y: centerWorld.y - height / 2,
    width,
    height,
  };
}

function getFrameById(doc: EditorDoc, frameId: string | null | undefined) {
  if (!frameId || frameId === FLOATING_OBJECT_FRAME_ID) {
    return null;
  }

  return doc.objects.find((object): object is FrameObject => object.type === "frame" && object.id === frameId) ?? null;
}

function toPreviewPlacement(preview: GenerationPreview) {
  return {
    x: preview.x,
    y: preview.y,
    width: preview.width,
    height: preview.height,
  };
}

function placementsOverlap(
  placement: { x: number; y: number; width: number; height: number },
  image: ImageObject,
) {
  const overlapWidth =
    Math.min(placement.x + placement.width, image.x + image.width) - Math.max(placement.x, image.x);
  const overlapHeight =
    Math.min(placement.y + placement.height, image.y + image.height) - Math.max(placement.y, image.y);

  if (overlapWidth <= 0 || overlapHeight <= 0) {
    return false;
  }

  const overlapArea = overlapWidth * overlapHeight;
  return overlapArea > Math.min(placement.width * placement.height, image.width * image.height) * 0.2;
}

function offsetPlacement(
  basePlacement: { x: number; y: number; width: number; height: number },
  delta: Point,
  frame: FrameObject | null,
) {
  const nextX = basePlacement.x + delta.x;
  const nextY = basePlacement.y + delta.y;

  if (!frame) {
    return {
      ...basePlacement,
      x: nextX,
      y: nextY,
    };
  }

  return {
    ...basePlacement,
    x: clamp(nextX, frame.x, frame.x + frame.width - basePlacement.width),
    y: clamp(nextY, frame.y, frame.y + frame.height - basePlacement.height),
  };
}

function findAvailableImagePlacement(
  doc: EditorDoc,
  basePlacement: { x: number; y: number; width: number; height: number },
  frame: FrameObject | null,
) {
  const frameId = frame?.id ?? FLOATING_OBJECT_FRAME_ID;
  const existingImages = doc.objects.filter(
    (object): object is ImageObject => object.type === "image" && object.frameId === frameId,
  );

  for (const delta of IMAGE_PLACEMENT_OFFSETS) {
    const candidate = offsetPlacement(basePlacement, delta, frame);
    if (!existingImages.some((image) => placementsOverlap(candidate, image))) {
      return candidate;
    }
  }

  return offsetPlacement(basePlacement, { x: existingImages.length * 40, y: existingImages.length * 40 }, frame);
}

export function CanvasStage({
  initialDoc,
  generatedImageRequest,
  emptyMessage = "按 F 或点击 Frame 工具创建画布",
  onDocChange,
  onSnapshotProvider,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorOverlayRef = useRef<HTMLDivElement | null>(null);

  const pointerCounterRef = useRef(1);
  const frameCounterRef = useRef(1);
  const annotationCounterRef = useRef(1);

  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const [tool, setTool] = useState<EditorTool>("select");
  const [viewport, setViewport] = useState<Viewport>({ x: 140, y: 80, scale: 1 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const [doc, setDoc] = useState<EditorDoc>(
    ensureActiveFrame(
      normalizeDocIdentifiers(
        initialDoc ?? {
          objects: [],
          strokes: [],
          activeFrameId: null,
        },
      ),
    ),
  );
  const docRef = useRef(doc);

  const [selection, setSelection] = useState<Selection>(null);
  const selectionRef = useRef(selection);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toolPanels, setToolPanels] = useState({
    brush: true,
    text: true,
    annotate: true,
  });

  const [draftStroke, setDraftStroke] = useState<Stroke | null>(null);
  const [draftFrame, setDraftFrame] = useState<DraftFrame | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [generationPreview, setGenerationPreview] = useState<GenerationPreview | null>(null);
  const draftStrokeRef = useRef<Stroke | null>(null);
  const draftFrameRef = useRef<DraftFrame | null>(null);

  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 6,
    color: COLOR_PRESETS[0],
    opacity: 0.9,
    brushType: "pencil",
  });
  const [brushRecentColors, setBrushRecentColors] = useState<string[]>(COLOR_PRESETS);

  const [eraserMode, setEraserMode] = useState<EraserMode>("tap");
  const [eraserSize, setEraserSize] = useState(12);

  const [defaultTextSettings, setDefaultTextSettings] = useState<TextSettings>({
    fontFamily: FONT_OPTIONS[0],
    fontSize: 16,
    color: "#334155",
  });
  const [textRecentColors, setTextRecentColors] = useState<string[]>(COLOR_PRESETS);

  const [framePresetKey, setFramePresetKey] = useState<FramePresetKey>("custom");
  const [customFrameSize, setCustomFrameSize] = useState({ width: 1024, height: 1024 });

  const undoStackRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);
  const handledGeneratedImageRef = useRef<string | null>(null);
  const pendingGeneratedImageRef = useRef<string | null>(null);
  const [, setHistoryTick] = useState(0);

  const panStateRef = useRef<{
    pointerId: number;
    startClient: Point;
    originViewport: { x: number; y: number };
  } | null>(null);

  const objectDragRef = useRef<{
    pointerId: number;
    id: string;
    startWorld: Point;
    before: EditorObject;
  } | null>(null);
  const generationPreviewDragRef = useRef<{
    pointerId: number;
    startWorld: Point;
    before: GenerationPreview;
  } | null>(null);

  const textResizeRef = useRef<{
    pointerId: number;
    id: string;
    startWorld: Point;
    before: TextObject;
    handle: ResizeHandle;
  } | null>(null);

  const frameResizeRef = useRef<{
    pointerId: number;
    id: string;
    startWorld: Point;
    before: FrameObject;
    handle: ResizeHandle;
  } | null>(null);

  const imageResizeRef = useRef<{
    pointerId: number;
    id: string;
    startWorld: Point;
    before: ImageObject;
    handle: ResizeHandle;
  } | null>(null);

  const editingSessionRef = useRef<{
    id: string;
    before: TextObject | AnnotationObject;
    isNew: boolean;
  } | null>(null);

  const brushPointerRef = useRef<number | null>(null);
  const framePointerRef = useRef<number | null>(null);
  const eraserSessionRef = useRef<{
    pointerId: number;
    frameId: string;
    removedMap: Map<string, Stroke>;
  } | null>(null);

  useEffect(() => {
    docRef.current = doc;
    pointerCounterRef.current = Math.max(pointerCounterRef.current, getNextPointerCounter(doc));
    frameCounterRef.current = Math.max(frameCounterRef.current, getNextFrameCounter(doc));
    annotationCounterRef.current = Math.max(annotationCounterRef.current, getNextAnnotationCounter(doc));
  }, [doc]);

  useEffect(() => {
    if (!initialDoc) {
      return;
    }

    const hydrated = ensureActiveFrame(normalizeDocIdentifiers(initialDoc));
    setDoc(hydrated);
    docRef.current = hydrated;
    pointerCounterRef.current = getNextPointerCounter(hydrated);
    frameCounterRef.current = getNextFrameCounter(hydrated);
    annotationCounterRef.current = getNextAnnotationCounter(hydrated);
    setSelection(null);
    setHoverId(null);
    setEditingId(null);
    setGenerationPreview(null);
    editingSessionRef.current = null;
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryTick((prev) => prev + 1);
  }, [initialDoc]);

  useEffect(() => {
    onDocChange?.(doc);
  }, [doc, onDocChange]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    draftStrokeRef.current = draftStroke;
  }, [draftStroke]);

  useEffect(() => {
    draftFrameRef.current = draftFrame;
  }, [draftFrame]);

  useEffect(() => {
    if (!onSnapshotProvider) {
      return;
    }

    onSnapshotProvider(() => {
      const source = canvasRef.current;
      if (!source) {
        return null;
      }

      try {
        const output = document.createElement("canvas");
        output.width = source.width;
        output.height = source.height;
        const ctx = output.getContext("2d");
        if (!ctx) {
          return null;
        }
        ctx.fillStyle = "#edf3fb";
        ctx.fillRect(0, 0, output.width, output.height);
        ctx.drawImage(source, 0, 0);
        return output.toDataURL("image/jpeg", 0.78);
      } catch {
        return null;
      }
    });
  }, [doc.strokes, onSnapshotProvider]);

  const frameObjects = useMemo(() => frameObjectsOf(doc.objects), [doc.objects]);

  const activeFrame = useMemo(
    () => frameObjects.find((frame) => frame.id === doc.activeFrameId) ?? null,
    [doc.activeFrameId, frameObjects],
  );

  useEffect(() => {
    if (!generatedImageRequest) {
      return;
    }

    if (generatedImageRequest.status === "loading") {
      setGenerationPreview((prev) => {
        if (prev?.requestId === generatedImageRequest.requestId) {
          return prev;
        }

        const basePlacement = activeFrame
          ? getImagePlacement(activeFrame)
          : getFloatingImagePlacement(viewport, canvasSize);
        const placement = findAvailableImagePlacement(docRef.current, basePlacement, activeFrame);
        const nextPreview: GenerationPreview = {
          requestId: generatedImageRequest.requestId,
          frameId: activeFrame?.id ?? FLOATING_OBJECT_FRAME_ID,
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          prompt: generatedImageRequest.prompt,
        };
        console.info("[CanvasStage] generation preview created", nextPreview);
        return isSameGenerationPreview(prev, nextPreview) ? prev : nextPreview;
      });
      return;
    }

    if (generatedImageRequest.status === "error") {
      console.warn("[CanvasStage] generation preview cleared after error", {
        requestId: generatedImageRequest.requestId,
      });
      generationPreviewDragRef.current = null;
      setGenerationPreview((prev) =>
        prev?.requestId === generatedImageRequest.requestId ? null : prev,
      );
      return;
    }

    if (!generatedImageRequest.src || !generatedImageRequest.sourceType) {
      return;
    }

    const generatedImageSrc = generatedImageRequest.src;
    const generatedImageSourceType = generatedImageRequest.sourceType;

    if (
      handledGeneratedImageRef.current === generatedImageRequest.requestId ||
      pendingGeneratedImageRef.current === generatedImageRequest.requestId
    ) {
      return;
    }
    pendingGeneratedImageRef.current = generatedImageRequest.requestId;

    let cancelled = false;

    const insertImage = async () => {
      try {
        console.info("[CanvasStage] insert generated image start", {
          requestId: generatedImageRequest.requestId,
          sourceType: generatedImageSourceType,
          hasActiveFrame: Boolean(activeFrame),
          canvasSize,
          viewport,
        });
        let naturalSize: { width: number; height: number } | undefined;
        let preloadFailed = false;

        try {
          naturalSize = await loadImageDimensions(generatedImageSrc);
          console.info("[CanvasStage] generated image dimensions loaded", {
            requestId: generatedImageRequest.requestId,
            naturalSize,
          });
        } catch (error) {
          preloadFailed = true;
          console.warn("[CanvasStage] image preload failed", {
            requestId: generatedImageRequest.requestId,
            message: error instanceof Error ? error.message : "unknown",
          });
        }

        if (cancelled) {
          return;
        }

        const previewPlacement =
          generationPreview?.requestId === generatedImageRequest.requestId ? generationPreview : null;
        const previewFrame = getFrameById(docRef.current, previewPlacement?.frameId);
        const targetFrame = previewFrame ?? activeFrame ?? null;
        const basePlacement = targetFrame
          ? getImagePlacement(targetFrame, naturalSize)
          : getFloatingImagePlacement(viewport, canvasSize, naturalSize);
        const placement = previewPlacement
          ? toPreviewPlacement(previewPlacement)
          : findAvailableImagePlacement(docRef.current, basePlacement, targetFrame);
        const targetFrameId = previewFrame?.id ?? targetFrame?.id ?? FLOATING_OBJECT_FRAME_ID;

        const imageObject: ImageObject = {
          id: `image-${pointerCounterRef.current++}`,
          type: "image",
          frameId: targetFrameId,
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          src: generatedImageSrc,
          alt: generatedImageRequest.prompt,
          generationSlot: "inspiration",
        };

        console.info("[CanvasStage] image object created", {
          requestId: generatedImageRequest.requestId,
          frameId: targetFrameId,
          placement,
          previewFrameId: previewPlacement?.frameId,
        });
        performAction({ type: "addObject", object: imageObject });
        setSelection({ kind: "object", id: imageObject.id });
        setTool("select");
        handledGeneratedImageRef.current = generatedImageRequest.requestId;
        generationPreviewDragRef.current = null;
        setGenerationPreview((prev) =>
          prev?.requestId === generatedImageRequest.requestId ? null : prev,
        );

        const focusBounds = targetFrame
          ? {
              x: targetFrame.x,
              y: targetFrame.y,
              width: targetFrame.width,
              height: targetFrame.height,
            }
          : {
              x: placement.x,
              y: placement.y,
              width: placement.width,
              height: placement.height,
            };
        const nextViewport = fitViewportToBounds(focusBounds, canvasSize, {
          padding: 56,
          minScale: 0.2,
          maxScale: 4,
        });
        if (nextViewport) {
          console.info("[CanvasStage] viewport recentered to generated image frame", {
            requestId: generatedImageRequest.requestId,
            nextViewport,
            mode: targetFrame ? "frame" : "floating-image",
          });
          setViewport(nextViewport);
        }

        const insertedLabel = generatedImageRequest.insertedLabel ?? "生成图片";
        setStatusMessage(
          preloadFailed
            ? "图片已插入，但预加载失败，请检查接口返回的图片格式"
            : targetFrame
              ? `${insertedLabel}已放置到当前画布中央`
              : `${insertedLabel}已放置到当前视口中央`,
        );
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "生成图片插入失败";
          console.error("[CanvasStage] insert generated image failed", {
            requestId: generatedImageRequest.requestId,
            message,
          });
          setStatusMessage(message);
        }
      } finally {
        if (pendingGeneratedImageRef.current === generatedImageRequest.requestId) {
          pendingGeneratedImageRef.current = null;
        }
      }
    };

    void insertImage();

    return () => {
      cancelled = true;
    };
  }, [activeFrame, canvasSize, generatedImageRequest, generationPreview, viewport]);

  const selectedObject = useMemo(() => {
    if (selection?.kind !== "object") {
      return null;
    }
    return getObjectById(doc.objects, selection.id);
  }, [doc.objects, selection]);

  const selectedTextObject = useMemo(
    () => (selectedObject?.type === "text" ? selectedObject : null),
    [selectedObject],
  );

  const editingObject = useMemo(() => {
    if (!editingId) {
      return null;
    }
    const obj = getObjectById(doc.objects, editingId);
    if (!obj || (obj.type !== "text" && obj.type !== "annotation")) {
      return null;
    }
    return obj;
  }, [doc.objects, editingId]);

  const editingScreenRect = useMemo(() => {
    if (!editingObject) {
      return null;
    }
    const screen = worldToScreenPoint({ x: editingObject.x, y: editingObject.y }, viewport);
    return {
      left: screen.x,
      top: screen.y,
      width: Math.max(80, editingObject.width * viewport.scale),
      height: Math.max(32, editingObject.height * viewport.scale),
    };
  }, [editingObject, viewport]);

  const textSettings = selectedTextObject
    ? {
        fontFamily: selectedTextObject.fontFamily,
        fontSize: selectedTextObject.fontSize,
        color: selectedTextObject.color,
      }
    : defaultTextSettings;

  const isBrushPanelOpen = tool === "brush" && toolPanels.brush;
  const isAnnotatePanelOpen = tool === "annotate" && toolPanels.annotate;
  const isTextPanelOpen =
    (tool === "text" && toolPanels.text) || (tool !== "text" && selectedTextObject !== null);

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  const draftFrameRect = useMemo(() => {
    if (!draftFrame) {
      return null;
    }
    return normalizeFrame(draftFrame.start, draftFrame.current);
  }, [draftFrame]);

  const stageCursor = useMemo(() => {
    if (isPanning) {
      return "cursor-grabbing";
    }
    if (isSpacePressed || tool === "select") {
      return "cursor-grab";
    }

    if (tool === "frame" || tool === "brush" || tool === "annotate") {
      return "cursor-crosshair";
    }
    if (tool === "eraser") {
      return "cursor-cell";
    }
    if (tool === "text") {
      return "cursor-text";
    }

    return "cursor-default";
  }, [isPanning, isSpacePressed, tool]);

  const clearTransientStates = () => {
    panStateRef.current = null;
    objectDragRef.current = null;
    generationPreviewDragRef.current = null;
    textResizeRef.current = null;
    frameResizeRef.current = null;
    imageResizeRef.current = null;
    brushPointerRef.current = null;
    framePointerRef.current = null;
    eraserSessionRef.current = null;
    setDraftStroke(null);
    setDraftFrame(null);
    draftStrokeRef.current = null;
    draftFrameRef.current = null;
    setIsPanning(false);
  };

  const pushHistory = (action: HistoryAction) => {
    undoStackRef.current.push(action);
    redoStackRef.current = [];
    setHistoryTick((prev) => prev + 1);
  };

  const performAction = (action: HistoryAction) => {
    setDoc((prev) => applyHistoryAction(prev, action, "do"));
    pushHistory(action);
  };

  const recordAction = (action: HistoryAction) => {
    pushHistory(action);
  };

  const handleUndo = () => {
    const action = undoStackRef.current.pop();
    if (!action) {
      return;
    }

    setDoc((prev) => applyHistoryAction(prev, action, "undo"));
    redoStackRef.current.push(action);
    setSelection(null);
    setHoverId(null);
    setEditingId(null);
    editingSessionRef.current = null;
    clearTransientStates();
    setHistoryTick((prev) => prev + 1);
  };

  const handleRedo = () => {
    const action = redoStackRef.current.pop();
    if (!action) {
      return;
    }

    setDoc((prev) => applyHistoryAction(prev, action, "do"));
    undoStackRef.current.push(action);
    setSelection(null);
    setHoverId(null);
    setEditingId(null);
    editingSessionRef.current = null;
    clearTransientStates();
    setHistoryTick((prev) => prev + 1);
  };

  const deleteSelected = () => {
    const currentSelection = selectionRef.current;
    const currentDoc = docRef.current;

    if (!currentSelection) {
      return;
    }

    if (currentSelection.kind === "object") {
      const object = getObjectById(currentDoc.objects, currentSelection.id);
      if (!object) {
        setSelection(null);
        return;
      }

      performAction(makeRemoveObjectAction(object, currentDoc));
      if (editingId === object.id) {
        setEditingId(null);
        editingSessionRef.current = null;
      }
      setSelection(null);
      return;
    }

    const stroke = currentDoc.strokes.find((item) => item.id === currentSelection.id);
    if (!stroke) {
      setSelection(null);
      return;
    }

    performAction({ type: "removeStroke", stroke });
    setSelection(null);
  };

  const fitToContent = () => {
    const bounds = getDocWorldBounds(docRef.current);
    const next = fitViewportToBounds(bounds, canvasSize, {
      padding: 56,
      minScale: 0.2,
      maxScale: 4,
    });
    if (!next) {
      return;
    }
    setViewport(next);
  };

  const getLocalPointFromClient = (clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const getLocalPoint = (event: React.PointerEvent): Point =>
    getLocalPointFromClient(event.clientX, event.clientY);

  const releasePointerIfNeeded = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    panStateRef.current = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      originViewport: { x: viewport.x, y: viewport.y },
    };
    setIsPanning(true);
  };

  const zoomAtCenter = (nextScale: number) => {
    setViewport((prev) => {
      const centerScreen = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
      return zoomViewportToPoint(prev, nextScale, centerScreen, 0.2, 4);
    });
  };

  const handleStageWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const anchor = getLocalPointFromClient(event.clientX, event.clientY);

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0018);
      setViewport((prev) => zoomViewportToPoint(prev, prev.scale * factor, anchor, 0.2, 4));
      return;
    }

    // Default wheel gesture pans the viewport instead of scrolling the page.
    event.preventDefault();
    setViewport((prev) => ({
      ...prev,
      x: prev.x - event.deltaX,
      y: prev.y - event.deltaY,
    }));
  };

  const updateObjectLive = (id: string, updater: (obj: EditorObject) => EditorObject) => {
    setDoc((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) => (obj.id === id ? updater(obj) : obj)),
    }));
  };

  const finalizeObjectUpdateHistory = (before: EditorObject | null, id: string) => {
    if (!before) {
      return;
    }

    const current = getObjectById(docRef.current.objects, id);
    if (!current) {
      return;
    }

    if (JSON.stringify(before) === JSON.stringify(current)) {
      return;
    }

    recordAction({ type: "updateObject", before, after: current });
  };

  const beginEditingObject = (object: TextObject | AnnotationObject, isNew = false) => {
    setSelection({ kind: "object", id: object.id });
    setEditingId(object.id);
    editingSessionRef.current = {
      id: object.id,
      before: object,
      isNew,
    };
  };

  const finishEditingObject = (options?: { cancel?: boolean }) => {
    const session = editingSessionRef.current;
    const currentEditingId = editingId;

    setEditingId(null);
    editingSessionRef.current = null;

    if (!session || !currentEditingId) {
      return;
    }

    const current = getObjectById(docRef.current.objects, currentEditingId);
    if (!current || (current.type !== "text" && current.type !== "annotation")) {
      return;
    }

    if (options?.cancel) {
      if (session.isNew && current.type === "annotation" && current.text.trim() === "") {
        performAction(makeRemoveObjectAction(current, docRef.current));
        setSelection(null);
        return;
      }

      setDoc((prev) => ({
        ...prev,
        objects: prev.objects.map((obj) => (obj.id === session.id ? session.before : obj)),
      }));
      return;
    }

    if (JSON.stringify(session.before) === JSON.stringify(current)) {
      return;
    }

    recordAction({ type: "updateObject", before: session.before, after: current });
  };

  const createFrameAtCenter = (width: number, height: number) => {
    const centerWorld = screenToWorldPoint(
      { x: canvasSize.width / 2, y: canvasSize.height / 2 },
      viewport,
    );

    const index = frameCounterRef.current;
    frameCounterRef.current += 1;

    const frame: FrameObject = {
      id: `frame-${pointerCounterRef.current++}`,
      type: "frame",
      x: centerWorld.x - width / 2,
      y: centerWorld.y - height / 2,
      width,
      height,
      name: `Frame ${String(index).padStart(2, "0")}`,
      background: "#FFFFFF",
    };

    performAction({ type: "addObject", object: frame });
    setSelection({ kind: "object", id: frame.id });
    return frame;
  };

  const eraseBySmearAtPoint = (worldPoint: Point, frameId: string) => {
    const threshold = eraserSize / Math.max(0.5, viewport.scale);
    const session = eraserSessionRef.current;
    if (!session) {
      return;
    }

    setDoc((prev) => {
      const removed: Stroke[] = [];
      const nextStrokes = prev.strokes.filter((stroke) => {
        if (stroke.frameId !== frameId) {
          return true;
        }

        if (hitStroke(stroke, worldPoint, threshold)) {
          removed.push(stroke);
          return false;
        }

        return true;
      });

      removed.forEach((stroke) => {
        if (!session.removedMap.has(stroke.id)) {
          session.removedMap.set(stroke.id, stroke);
        }
      });

      return removed.length > 0 ? { ...prev, strokes: nextStrokes } : prev;
    });
  };

  const applyTextSettings = (patch: Partial<Pick<TextObject, "fontFamily" | "fontSize" | "color">>) => {
    setDefaultTextSettings((prev) => ({ ...prev, ...patch }));

    if (!selectedTextObject) {
      if (patch.color) {
        setTextRecentColors((prev) => pushRecentColor(prev, patch.color!));
      }
      return;
    }

    const before = selectedTextObject;
    const after: TextObject = { ...selectedTextObject, ...patch };
    if (JSON.stringify(before) === JSON.stringify(after)) {
      return;
    }

    updateObjectLive(selectedTextObject.id, (obj) => {
      if (obj.type !== "text") {
        return obj;
      }
      return { ...obj, ...patch };
    });

    if (editingSessionRef.current?.id === selectedTextObject.id) {
      // Keep a single history record when editing ends.
      return;
    }

    recordAction({ type: "updateObject", before, after });

    if (patch.color) {
      setTextRecentColors((prev) => pushRecentColor(prev, patch.color!));
    }
  };

  useEffect(() => {
    if (!editingId) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const editable = editorOverlayRef.current?.querySelector<HTMLElement>(
        `[data-editor-input-id="${editingId}"]`,
      );
      if (!editable) {
        return;
      }

      editable.focus();
      if (editable instanceof HTMLTextAreaElement) {
        const length = editable.value.length;
        editable.setSelectionRange(length, length);
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [editingId, doc.objects]);

  const handleToolbarToolClick = (nextTool: EditorTool) => {
    if (editingId) {
      finishEditingObject();
    }

    if (tool === nextTool) {
      if (nextTool === "brush" || nextTool === "text" || nextTool === "annotate") {
        setToolPanels((prev) => ({ ...prev, [nextTool]: !prev[nextTool] }));
      }
      return;
    }

    setTool(nextTool);
    if (nextTool === "brush" || nextTool === "text" || nextTool === "annotate") {
      setToolPanels((prev) => ({ ...prev, [nextTool]: true }));
    }
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setCanvasSize({
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setStatusMessage(null), 1800);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTyping =
        !!activeElement &&
        (activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "INPUT" ||
          activeElement.isContentEditable);
      const metaOrCtrl = event.metaKey || event.ctrlKey;
      const currentEditingObject = editingId
        ? getObjectById(docRef.current.objects, editingId)
        : null;

      if (isTyping && currentEditingObject && event.key === "Escape") {
        event.preventDefault();
        if (currentEditingObject.type === "annotation") {
          finishEditingObject({ cancel: true });
        } else {
          finishEditingObject();
        }
        return;
      }

      if (isTyping && currentEditingObject && metaOrCtrl && event.key === "Enter") {
        event.preventDefault();
        finishEditingObject();
        return;
      }

      if (
        isTyping &&
        currentEditingObject?.type === "annotation" &&
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        finishEditingObject();
        return;
      }

      if (isTyping) {
        return;
      }

      if (metaOrCtrl && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (metaOrCtrl && event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (editingId) {
          const editingObject = getObjectById(docRef.current.objects, editingId);
          if (editingObject?.type === "annotation") {
            finishEditingObject({ cancel: true });
          } else {
            finishEditingObject();
          }
          return;
        }

        setSelection(null);
        setHoverId(null);
        setDraftFrame(null);
        setDraftStroke(null);
        return;
      }

      if (editingId) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "v") setTool("select");
      if (key === "f") setTool("frame");
      if (key === "b") setTool("brush");
      if (key === "e") setTool("eraser");
      if (key === "t") setTool("text");
      if (key === "c") setTool("annotate");
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [editingId]);

  useEffect(() => {
    const onPointerUp = () => {
      setIsPanning(false);
    };

    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  useEffect(() => {
    clearTransientStates();
    setHoverId(null);
  }, [tool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.floor(canvasSize.width * dpr));
    const pixelHeight = Math.max(1, Math.floor(canvasSize.height * dpr));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(
      viewport.scale * dpr,
      0,
      0,
      viewport.scale * dpr,
      viewport.x * dpr,
      viewport.y * dpr,
    );

    frameObjects.forEach((frame) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(frame.x, frame.y, frame.width, frame.height);
      ctx.clip();

      doc.strokes
        .filter((stroke) => stroke.frameId === frame.id)
        .forEach((stroke) => {
          drawStroke(ctx, stroke, selection?.kind === "stroke" && selection.id === stroke.id);
        });

      if (draftStroke && draftStroke.frameId === frame.id) {
        drawStroke(ctx, draftStroke);
      }

      ctx.restore();
    });
  }, [canvasSize.height, canvasSize.width, doc.strokes, draftStroke, frameObjects, selection, viewport]);

  const handleStagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) {
      return;
    }

    if (event.button === 1) {
      event.preventDefault();
      setSelection(null);
      startPan(event);
      return;
    }

    const worldPoint = screenToWorldPoint(getLocalPoint(event), viewport);

    if (editingId) {
      const target = event.target as Node | null;
      if (target && editorOverlayRef.current?.contains(target)) {
        return;
      }
      finishEditingObject();
      return;
    }

    if (isSpacePressed) {
      event.preventDefault();
      setSelection(null);
      startPan(event);
      return;
    }

    if (tool === "select") {
      if (activeFrame && isPointInFrame(worldPoint, activeFrame)) {
        const stroke = findStrokeAtPoint(
          docRef.current.strokes,
          activeFrame.id,
          worldPoint,
          8 / Math.max(0.5, viewport.scale),
        );
        if (stroke) {
          setSelection({ kind: "stroke", id: stroke.id });
          return;
        }
      }

      setSelection(null);
      startPan(event);
      return;
    }

    if (tool === "frame") {
      const preset = getFramePresetByKey(framePresetKey);
      if (preset) {
        createFrameAtCenter(preset.width, preset.height);
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      framePointerRef.current = event.pointerId;
      const nextDraftFrame = { start: worldPoint, current: worldPoint };
      draftFrameRef.current = nextDraftFrame;
      setDraftFrame(nextDraftFrame);
      return;
    }

    if (!activeFrame) {
      setStatusMessage("请先创建画布 Frame");
      return;
    }

    if (!isPointInFrame(worldPoint, activeFrame)) {
      if (tool === "text" || tool === "annotate" || tool === "brush" || tool === "eraser") {
        return;
      }
    }

    if (tool === "brush") {
      event.currentTarget.setPointerCapture(event.pointerId);
      brushPointerRef.current = event.pointerId;
      const nextDraftStroke: Stroke = {
        id: `stroke-draft-${pointerCounterRef.current++}`,
        frameId: activeFrame.id,
        points: [worldPoint],
        size: brushSettings.size,
        color: brushSettings.color,
        opacity: brushSettings.opacity,
        brushType: brushSettings.brushType,
      };
      draftStrokeRef.current = nextDraftStroke;
      setDraftStroke(nextDraftStroke);
      return;
    }

    if (tool === "eraser") {
      if (eraserMode === "tap") {
        const objectHit = findObjectAtPoint(docRef.current, worldPoint, activeFrame.id, false);
        if (objectHit) {
          performAction(makeRemoveObjectAction(objectHit, docRef.current));
          setSelection(null);
          return;
        }

        const strokeHit = findStrokeAtPoint(
          docRef.current.strokes,
          activeFrame.id,
          worldPoint,
          8 / Math.max(0.5, viewport.scale),
        );
        if (strokeHit) {
          performAction({ type: "removeStroke", stroke: strokeHit });
          setSelection(null);
        }
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      eraserSessionRef.current = {
        pointerId: event.pointerId,
        frameId: activeFrame.id,
        removedMap: new Map<string, Stroke>(),
      };
      eraseBySmearAtPoint(worldPoint, activeFrame.id);
      return;
    }

    if (tool === "text") {
      const newId = `text-${pointerCounterRef.current++}`;
      const textObject: TextObject = {
        id: newId,
        type: "text",
        frameId: activeFrame.id,
        x: worldPoint.x,
        y: worldPoint.y,
        width: 220,
        height: 80,
        text: "",
        fontFamily: defaultTextSettings.fontFamily,
        fontSize: defaultTextSettings.fontSize,
        color: defaultTextSettings.color,
      };

      performAction({ type: "addObject", object: textObject });
      beginEditingObject(textObject, true);
      return;
    }

    if (tool === "annotate") {
      const newId = `anno-${pointerCounterRef.current++}`;
      const index = annotationCounterRef.current;
      annotationCounterRef.current += 1;

      const annotation: AnnotationObject = {
        id: newId,
        type: "annotation",
        frameId: activeFrame.id,
        x: worldPoint.x,
        y: worldPoint.y,
        width: 210,
        height: 44,
        text: "",
        index,
      };

      performAction({ type: "addObject", object: annotation });
      beginEditingObject(annotation, true);
    }
  };

  const handleStagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) {
      return;
    }

    const worldPoint = screenToWorldPoint(getLocalPoint(event), viewport);

    const panState = panStateRef.current;
    if (panState?.pointerId === event.pointerId) {
      const deltaX = event.clientX - panState.startClient.x;
      const deltaY = event.clientY - panState.startClient.y;
      setViewport((prev) => ({
        ...prev,
        x: panState.originViewport.x + deltaX,
        y: panState.originViewport.y + deltaY,
      }));
      return;
    }

    const previewDragState = generationPreviewDragRef.current;
    if (previewDragState?.pointerId === event.pointerId) {
      const deltaX = worldPoint.x - previewDragState.startWorld.x;
      const deltaY = worldPoint.y - previewDragState.startWorld.y;
      setGenerationPreview((prev) => {
        if (!prev || prev.requestId !== previewDragState.before.requestId) {
          return prev;
        }

        return {
          ...prev,
          x: previewDragState.before.x + deltaX,
          y: previewDragState.before.y + deltaY,
        };
      });
      return;
    }

    if (brushPointerRef.current === event.pointerId) {
      setDraftStroke((prev) => {
        if (!prev) {
          return prev;
        }

        const frame = frameObjectsOf(docRef.current.objects).find((item) => item.id === prev.frameId);
        if (!frame || !isPointInFrame(worldPoint, frame)) {
          return prev;
        }

        const last = prev.points[prev.points.length - 1];
        if (last && Math.hypot(last.x - worldPoint.x, last.y - worldPoint.y) < 0.45) {
          return prev;
        }

        const next = { ...prev, points: [...prev.points, worldPoint] };
        draftStrokeRef.current = next;
        return next;
      });
      return;
    }

    if (framePointerRef.current === event.pointerId) {
      setDraftFrame((prev) => {
        if (!prev) {
          return prev;
        }
        const next = { ...prev, current: worldPoint };
        draftFrameRef.current = next;
        return next;
      });
      return;
    }

    const eraserSession = eraserSessionRef.current;
    if (eraserSession?.pointerId === event.pointerId && eraserMode === "stroke") {
      eraseBySmearAtPoint(worldPoint, eraserSession.frameId);
      return;
    }

    const dragState = objectDragRef.current;
    if (dragState?.pointerId === event.pointerId) {
      const deltaX = worldPoint.x - dragState.startWorld.x;
      const deltaY = worldPoint.y - dragState.startWorld.y;
      updateObjectLive(dragState.id, (obj) => {
        if (obj.id !== dragState.id) {
          return obj;
        }
        return {
          ...obj,
          x: dragState.before.x + deltaX,
          y: dragState.before.y + deltaY,
        };
      });
      return;
    }

    const resizeState = textResizeRef.current;
    if (resizeState?.pointerId === event.pointerId) {
      const deltaX = worldPoint.x - resizeState.startWorld.x;
      const deltaY = worldPoint.y - resizeState.startWorld.y;
      const nextRect = resizeTextRect(resizeState.before, resizeState.handle, deltaX, deltaY);
      updateObjectLive(resizeState.id, (obj) => {
        if (obj.type !== "text") {
          return obj;
        }

        return {
          ...obj,
          ...nextRect,
        };
      });
      return;
    }

    const frameResizeState = frameResizeRef.current;
    if (frameResizeState?.pointerId === event.pointerId) {
      const deltaX = worldPoint.x - frameResizeState.startWorld.x;
      const deltaY = worldPoint.y - frameResizeState.startWorld.y;
      const nextRect = resizeFrameRect(frameResizeState.before, frameResizeState.handle, deltaX, deltaY);
      updateObjectLive(frameResizeState.id, (obj) => {
        if (obj.type !== "frame") {
          return obj;
        }
        return {
          ...obj,
          ...nextRect,
        };
      });
      return;
    }

    const imageResizeState = imageResizeRef.current;
    if (imageResizeState?.pointerId === event.pointerId) {
      const deltaX = worldPoint.x - imageResizeState.startWorld.x;
      const deltaY = worldPoint.y - imageResizeState.startWorld.y;
      const nextRect = resizeImageRect(imageResizeState.before, imageResizeState.handle, deltaX, deltaY);
      updateObjectLive(imageResizeState.id, (obj) => {
        if (obj.type !== "image") {
          return obj;
        }
        return {
          ...obj,
          ...nextRect,
        };
      });
    }
  };

  const handleStagePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) {
      return;
    }

    if (panStateRef.current?.pointerId === event.pointerId) {
      panStateRef.current = null;
      setIsPanning(false);
      releasePointerIfNeeded(event);
    }

    if (brushPointerRef.current === event.pointerId) {
      const doneStroke = draftStrokeRef.current;
      brushPointerRef.current = null;
      draftStrokeRef.current = null;
      setDraftStroke(null);
      if (doneStroke && doneStroke.points.length > 0) {
        performAction({
          type: "addStroke",
          stroke: {
            ...doneStroke,
            id: `stroke-${pointerCounterRef.current++}`,
          },
        });
      }
      releasePointerIfNeeded(event);
    }

    if (framePointerRef.current === event.pointerId) {
      const doneDraftFrame = draftFrameRef.current;
      framePointerRef.current = null;
      draftFrameRef.current = null;
      setDraftFrame(null);
      if (doneDraftFrame) {
        const rect = normalizeFrame(doneDraftFrame.start, doneDraftFrame.current);
        if (rect.width > 12 && rect.height > 12) {
          const index = frameCounterRef.current;
          frameCounterRef.current += 1;

          const frameObject: FrameObject = {
            id: `frame-${pointerCounterRef.current++}`,
            type: "frame",
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            name: `Frame ${String(index).padStart(2, "0")}`,
            background: "#FFFFFF",
          };

          performAction({ type: "addObject", object: frameObject });
          setSelection({ kind: "object", id: frameObject.id });
        }
      }
      releasePointerIfNeeded(event);
    }

    const eraserSession = eraserSessionRef.current;
    if (eraserSession?.pointerId === event.pointerId) {
      eraserSessionRef.current = null;
      if (eraserSession.removedMap.size > 0) {
        recordAction({
          type: "removeManyStrokes",
          strokes: Array.from(eraserSession.removedMap.values()),
        });
      }
      releasePointerIfNeeded(event);
    }

    const dragState = objectDragRef.current;
    if (dragState?.pointerId === event.pointerId) {
      objectDragRef.current = null;
      finalizeObjectUpdateHistory(dragState.before, dragState.id);
      releasePointerIfNeeded(event);
    }

    const previewDragState = generationPreviewDragRef.current;
    if (previewDragState?.pointerId === event.pointerId) {
      generationPreviewDragRef.current = null;
      releasePointerIfNeeded(event);
    }

    const resizeState = textResizeRef.current;
    if (resizeState?.pointerId === event.pointerId) {
      textResizeRef.current = null;
      finalizeObjectUpdateHistory(resizeState.before, resizeState.id);
      releasePointerIfNeeded(event);
    }

    const frameResizeState = frameResizeRef.current;
    if (frameResizeState?.pointerId === event.pointerId) {
      frameResizeRef.current = null;
      finalizeObjectUpdateHistory(frameResizeState.before, frameResizeState.id);
      releasePointerIfNeeded(event);
    }

    const imageResizeState = imageResizeRef.current;
    if (imageResizeState?.pointerId === event.pointerId) {
      imageResizeRef.current = null;
      finalizeObjectUpdateHistory(imageResizeState.before, imageResizeState.id);
      releasePointerIfNeeded(event);
    }
  };

  const handleObjectPointerDown = (event: React.PointerEvent<HTMLDivElement>, object: EditorObject) => {
    if (isSpacePressed) {
      return;
    }

    event.stopPropagation();

    if (editingId === object.id) {
      return;
    }

    setSelection({ kind: "object", id: object.id });
    setHoverId(object.id);

    setDoc((prev) =>
      ensureActiveFrame({
        ...prev,
        activeFrameId: object.type === "frame" ? object.id : object.frameId,
      }),
    );

    if (object.type === "text" && tool === "text") {
      beginEditingObject(object, false);
      return;
    }

    if (object.type === "annotation" && tool === "annotate") {
      beginEditingObject(object, false);
      return;
    }

    if (tool !== "select") {
      return;
    }

    const stage = containerRef.current;
    if (stage) {
      stage.setPointerCapture(event.pointerId);
    }

    const worldPoint = screenToWorldPoint(getLocalPoint(event), viewport);
    objectDragRef.current = {
      pointerId: event.pointerId,
      id: object.id,
      startWorld: worldPoint,
      before: object,
    };
  };

  const startTextResize = (
    event: React.PointerEvent<HTMLDivElement>,
    object: TextObject,
    handle: ResizeHandle,
  ) => {
    event.stopPropagation();

    if (tool !== "select") {
      return;
    }

    const stage = containerRef.current;
    if (stage) {
      stage.setPointerCapture(event.pointerId);
    }

    const worldPoint = screenToWorldPoint(getLocalPoint(event), viewport);
    textResizeRef.current = {
      pointerId: event.pointerId,
      id: object.id,
      startWorld: worldPoint,
      before: object,
      handle,
    };
  };

  const startFrameResize = (
    event: React.PointerEvent<HTMLDivElement>,
    object: FrameObject,
    handle: ResizeHandle,
  ) => {
    event.stopPropagation();

    if (tool !== "select") {
      return;
    }

    const stage = containerRef.current;
    if (stage) {
      stage.setPointerCapture(event.pointerId);
    }

    const worldPoint = screenToWorldPoint(getLocalPoint(event), viewport);
    frameResizeRef.current = {
      pointerId: event.pointerId,
      id: object.id,
      startWorld: worldPoint,
      before: object,
      handle,
    };
  };

  const startImageResize = (
    event: React.PointerEvent<HTMLDivElement>,
    object: ImageObject,
    handle: ResizeHandle,
  ) => {
    event.stopPropagation();

    if (tool !== "select") {
      return;
    }

    const stage = containerRef.current;
    if (stage) {
      stage.setPointerCapture(event.pointerId);
    }

    const worldPoint = screenToWorldPoint(getLocalPoint(event), viewport);
    imageResizeRef.current = {
      pointerId: event.pointerId,
      id: object.id,
      startWorld: worldPoint,
      before: object,
      handle,
    };
  };

  const handleObjectHoverEnter = (id: string) => {
    if (tool === "select") {
      setHoverId(id);
    }
  };

  const handleObjectHoverLeave = (id: string) => {
    setHoverId((prev) => (prev === id ? null : prev));
  };

  const handleGenerationPreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || !generationPreview) {
      return;
    }

    event.stopPropagation();

    const stage = containerRef.current;
    if (stage) {
      stage.setPointerCapture(event.pointerId);
    }

    const worldPoint = screenToWorldPoint(getLocalPoint(event), viewport);
    generationPreviewDragRef.current = {
      pointerId: event.pointerId,
      startWorld: worldPoint,
      before: generationPreview,
    };
  };

  const handleTextValueChange = (id: string, value: string) => {
    updateObjectLive(id, (obj) => {
      if (obj.type === "text") {
        return { ...obj, text: value };
      }
      if (obj.type === "annotation") {
        return { ...obj, text: value };
      }
      return obj;
    });
  };

  const worldLayerStyle = useMemo(
    () => ({
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
      transformOrigin: "0 0",
    }),
    [viewport],
  );

  const canFitContent = useMemo(() => Boolean(getDocWorldBounds(doc)), [doc]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-hidden bg-[hsl(var(--muted)/0.52)]", stageCursor)}
      onPointerDown={handleStagePointerDown}
      onPointerMove={handleStagePointerMove}
      onPointerUp={handleStagePointerUp}
      onPointerCancel={handleStagePointerUp}
      onWheel={handleStageWheel}
    >
      <div className="pointer-events-none absolute inset-0 z-[1]" style={worldLayerStyle}>
        {frameObjects.map((frame) => {
          return (
            <div
              key={`frame-bg-${frame.id}`}
              className="absolute"
              style={{
                left: frame.x,
                top: frame.y,
                width: frame.width,
                height: frame.height,
                background: frame.background || "#FFFFFF",
              }}
            />
          );
        })}
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[2] h-full w-full" />

      <div className="absolute inset-0 z-[3]" style={worldLayerStyle}>
        {doc.objects.map((object) => {
          const isSelected = selection?.kind === "object" && selection.id === object.id;
          const isHovered = hoverId === object.id;
          const isEditing = editingId === object.id;
          const isActiveFrame = object.type === "frame" && doc.activeFrameId === object.id;

          if (object.type === "frame") {
            const isInteractive = tool === "select";
            return (
              <div
                key={object.id}
                className={cn(
                  "absolute border border-dashed",
                  isSelected
                    ? "border-2 border-[hsl(var(--primary))]"
                    : isHovered
                      ? "border-[hsl(var(--primary)/0.5)]"
                      : isActiveFrame
                        ? "border-[hsl(var(--primary)/0.65)]"
                        : "border-[hsl(var(--border))]",
                  isInteractive ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
                )}
                style={{
                  left: object.x,
                  top: object.y,
                  width: object.width,
                  height: object.height,
                }}
                onPointerDown={(event) => handleObjectPointerDown(event, object)}
                onPointerEnter={() => handleObjectHoverEnter(object.id)}
                onPointerLeave={() => handleObjectHoverLeave(object.id)}
              >
                <div className="absolute left-3 top-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.95)] px-2 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {object.name}
                </div>

                {isSelected && tool === "select"
                  ? RESIZE_HANDLE_META.map((item) => (
                      <div
                        key={item.handle}
                        className={cn(
                          "pointer-events-auto absolute h-3 w-3 rounded-full border border-[hsl(var(--primary))] bg-[hsl(var(--card))]",
                          item.className,
                        )}
                        onPointerDown={(event) => startFrameResize(event, object, item.handle)}
                      />
                    ))
                  : null}
              </div>
            );
          }

          if (object.type === "text") {
            const isInteractive = tool === "select" || tool === "text" || isEditing;
            return (
              <div
                key={object.id}
                className={cn(
                  "absolute rounded-md",
                  isSelected
                    ? "ring-2 ring-[hsl(var(--primary))]"
                    : isHovered
                      ? "ring-1 ring-[hsl(var(--primary)/0.45)]"
                      : "",
                  isInteractive ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
                )}
                style={{
                  left: object.x,
                  top: object.y,
                  width: object.width,
                  height: object.height,
                }}
                onPointerDown={(event) => handleObjectPointerDown(event, object)}
                onPointerEnter={() => handleObjectHoverEnter(object.id)}
                onPointerLeave={() => handleObjectHoverLeave(object.id)}
                onDoubleClick={() => beginEditingObject(object, false)}
              >
                <div
                  className="h-full w-full overflow-hidden whitespace-pre-wrap break-words bg-transparent px-2 py-1"
                  style={{
                    fontFamily: object.fontFamily,
                    fontSize: `${object.fontSize}px`,
                    color: object.color,
                  }}
                >
                  {object.text || "文本"}
                </div>

                {isSelected && !isEditing
                  ? RESIZE_HANDLE_META.map((item) => (
                      <div
                        key={item.handle}
                        className={cn(
                          "pointer-events-auto absolute h-3 w-3 rounded-full border border-[hsl(var(--primary))] bg-[hsl(var(--card))]",
                          item.className,
                        )}
                        onPointerDown={(event) => startTextResize(event, object, item.handle)}
                      />
                    ))
                  : null}
              </div>
            );
          }

          if (object.type === "image") {
            const isInteractive = tool === "select";
            return (
              <div
                key={object.id}
                className={cn(
                  "absolute overflow-hidden rounded-lg bg-white/80",
                  isSelected
                    ? "ring-2 ring-[hsl(var(--primary))]"
                    : isHovered
                      ? "ring-1 ring-[hsl(var(--primary)/0.45)]"
                      : "",
                  isInteractive ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
                )}
                style={{
                  left: object.x,
                  top: object.y,
                  width: object.width,
                  height: object.height,
                }}
                onPointerDown={(event) => handleObjectPointerDown(event, object)}
                onPointerEnter={() => handleObjectHoverEnter(object.id)}
                onPointerLeave={() => handleObjectHoverLeave(object.id)}
              >
                <img
                  src={object.src}
                  alt={object.alt || "AI生成图片"}
                  draggable={false}
                  crossOrigin="anonymous"
                  className="h-full w-full select-none object-cover"
                  onLoad={() => {
                    console.info("[CanvasStage] image rendered", {
                      objectId: object.id,
                      frameId: object.frameId,
                      width: object.width,
                      height: object.height,
                      srcPreview: object.src.slice(0, 120),
                    });
                  }}
                  onError={() => {
                    console.error("[CanvasStage] image render failed", {
                      objectId: object.id,
                      frameId: object.frameId,
                      srcPreview: object.src.slice(0, 120),
                    });
                  }}
                />

                {isSelected
                  ? RESIZE_HANDLE_META.map((item) => (
                      <div
                        key={item.handle}
                        className={cn(
                          "pointer-events-auto absolute h-3 w-3 rounded-full border border-[hsl(var(--primary))] bg-[hsl(var(--card))]",
                          item.className,
                        )}
                        onPointerDown={(event) => startImageResize(event, object, item.handle)}
                      />
                    ))
                  : null}
              </div>
            );
          }

          const isInteractive = tool === "select" || tool === "annotate" || isEditing;
          return (
            <div
              key={object.id}
              className={cn(
                "absolute inline-flex items-start gap-2 rounded-lg",
                isSelected
                  ? "ring-2 ring-[hsl(var(--primary))]"
                  : isHovered
                    ? "ring-1 ring-[hsl(var(--primary)/0.45)]"
                    : "",
                isInteractive ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
              )}
              style={{
                left: object.x,
                top: object.y,
                width: object.width,
                minHeight: object.height,
              }}
              onPointerDown={(event) => handleObjectPointerDown(event, object)}
              onPointerEnter={() => handleObjectHoverEnter(object.id)}
              onPointerLeave={() => handleObjectHoverLeave(object.id)}
              onDoubleClick={() => beginEditingObject(object, false)}
            >
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-semibold text-[hsl(var(--primary-foreground))]">
                {object.index}
              </span>
              <div className="h-full w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-sm text-[hsl(var(--foreground))]">
                {object.text || `标注 ${object.index}`}
              </div>
            </div>
          );
        })}
      </div>

      {editingObject && editingScreenRect ? (
        <div ref={editorOverlayRef} className="absolute inset-0 z-[12] pointer-events-none">
          {editingObject.type === "text" ? (
            <textarea
              autoFocus
              data-editor-input-id={editingObject.id}
              value={editingObject.text}
              onChange={(event) => handleTextValueChange(editingObject.id, event.target.value)}
              onBlur={() => finishEditingObject()}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  finishEditingObject();
                }
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  finishEditingObject();
                }
              }}
              className="pointer-events-auto absolute resize-none rounded-md border border-[hsl(var(--primary)/0.55)] bg-[hsl(var(--card))] px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)]"
              style={{
                left: editingScreenRect.left,
                top: editingScreenRect.top,
                width: editingScreenRect.width,
                height: editingScreenRect.height,
                fontFamily: editingObject.fontFamily,
                fontSize: `${Math.max(12, editingObject.fontSize * viewport.scale)}px`,
                color: editingObject.color,
                caretColor: editingObject.color,
                lineHeight: 1.4,
              }}
            />
          ) : (
            <div
              className="pointer-events-none absolute flex items-start gap-2"
              style={{
                left: editingScreenRect.left,
                top: editingScreenRect.top,
                width: Math.max(160, editingScreenRect.width),
                minHeight: Math.max(40, editingScreenRect.height),
              }}
            >
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[10px] font-semibold text-[hsl(var(--primary-foreground))]">
                {editingObject.index}
              </span>
              <textarea
                autoFocus
                data-editor-input-id={editingObject.id}
                value={editingObject.text}
                onChange={(event) => handleTextValueChange(editingObject.id, event.target.value)}
                onBlur={() => finishEditingObject()}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    finishEditingObject();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    finishEditingObject({ cancel: true });
                  }
                }}
                className="pointer-events-auto min-h-[40px] w-full resize-none rounded-md border border-[hsl(var(--primary)/0.55)] bg-[hsl(var(--card))] px-2 py-1 text-sm text-[hsl(var(--foreground))] outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.25)]"
                style={{
                  minWidth: Math.max(140, editingScreenRect.width - 28),
                  lineHeight: 1.4,
                }}
              />
            </div>
          )}
        </div>
      ) : null}

      {draftFrameRect ? (
        <div className="pointer-events-none absolute inset-0 z-[4]" style={worldLayerStyle}>
          <div
            className="absolute border border-dashed border-[hsl(var(--primary)/0.55)] bg-[hsl(var(--card)/0.2)]"
            style={{
              left: draftFrameRect.x,
              top: draftFrameRect.y,
              width: draftFrameRect.width,
              height: draftFrameRect.height,
            }}
          />
        </div>
      ) : null}

      {generationPreview ? (
        <div className="pointer-events-none absolute inset-0 z-[7]" style={worldLayerStyle}>
          <div
            className="pointer-events-auto absolute cursor-move overflow-hidden rounded-[28px] border border-[rgba(136,168,205,0.55)] bg-[linear-gradient(145deg,rgba(246,249,252,0.88),rgba(224,233,242,0.82))] shadow-[0_24px_60px_rgba(75,97,126,0.24)]"
            style={{
              left: generationPreview.x,
              top: generationPreview.y,
              width: generationPreview.width,
              height: generationPreview.height,
            }}
            onPointerDown={handleGenerationPreviewPointerDown}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_58%)]" />
            <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,rgba(83,118,162,0.14),rgba(232,180,84,0.18),rgba(118,170,132,0.14))]" />
            <div className="relative flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="relative grid h-20 w-20 place-items-center [animation:workspace-loader-float_2.4s_ease-in-out_infinite]">
                <div className="absolute inset-[3px] rounded-full bg-[conic-gradient(from_180deg,#476f9e,#7fb0d6,#d1a849,#79aa84,#476f9e)] opacity-35 blur-[8px] [animation:workspace-loader-spin_1.15s_linear_infinite]" />
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,#476f9e,#7fb0d6,#d1a849,#79aa84,#476f9e)] [animation:workspace-loader-spin_1.15s_linear_infinite]" />
                <div className="absolute inset-[10px] rounded-full bg-[rgba(241,246,251,0.92)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]" />
                <div className="absolute inset-[10px] rounded-full border border-[rgba(71,111,158,0.1)]" />
                <div className="absolute inset-[15px] [animation:workspace-loader-orbit_2.8s_linear_infinite]">
                  <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#f7fbff] shadow-[0_0_0_4px_rgba(255,255,255,0.24),0_4px_12px_rgba(95,129,168,0.26)]" />
                </div>
              </div>
              <p className="bg-[linear-gradient(90deg,#476f9e,#7fb0d6,#d1a849,#476f9e)] bg-[length:220%_100%] bg-clip-text text-xl font-semibold tracking-[0.08em] text-transparent [animation:workspace-gradient-shift_2.2s_linear_infinite]">
                生成中...
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {emptyMessage && frameObjects.length === 0 && doc.objects.length === 0 && doc.strokes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center">
          <p className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.95)] px-4 py-2 text-sm text-[hsl(var(--muted-foreground))]">
            {emptyMessage}
          </p>
        </div>
      ) : null}

      {statusMessage ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[6] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          {statusMessage}
        </div>
      ) : null}

      {tool === "frame" ? (
        <div
          className="absolute bottom-[64px] left-1/2 z-[20] -translate-x-1/2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] p-3 shadow-[0_8px_20px_rgba(43,67,95,0.16)] backdrop-blur"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p className="mb-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">画布预设</p>
          <div className="mb-2 flex items-center gap-1">
            {FRAME_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setFramePresetKey(preset.key)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs",
                  framePresetKey === preset.key
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]"
                    : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFramePresetKey("custom")}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                framePresetKey === "custom"
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
              )}
            >
              自定义拖拽
            </button>
          </div>

          <div className="mb-2 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span>W</span>
            <input
              type="number"
              min={64}
              value={customFrameSize.width}
              onChange={(event) =>
                setCustomFrameSize((prev) => ({
                  ...prev,
                  width: Math.max(64, Number(event.target.value) || 64),
                }))
              }
              className="h-7 w-20 rounded-md border border-[hsl(var(--border))] bg-transparent px-2"
            />
            <span>H</span>
            <input
              type="number"
              min={64}
              value={customFrameSize.height}
              onChange={(event) =>
                setCustomFrameSize((prev) => ({
                  ...prev,
                  height: Math.max(64, Number(event.target.value) || 64),
                }))
              }
              className="h-7 w-20 rounded-md border border-[hsl(var(--border))] bg-transparent px-2"
            />
            <button
              type="button"
              className="rounded-md border border-[hsl(var(--border))] px-2 py-1"
              onClick={() => createFrameAtCenter(customFrameSize.width, customFrameSize.height)}
            >
              居中创建
            </button>
          </div>

          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            选中预设后，点击画布即可创建固定尺寸 Frame（位于视口中心）
          </p>
        </div>
      ) : null}

      {isBrushPanelOpen ? (
        <div
          className="absolute bottom-[64px] left-1/2 z-[20] -translate-x-1/2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] p-3 shadow-[0_8px_20px_rgba(43,67,95,0.16)] backdrop-blur"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <span className="w-12 text-xs text-[hsl(var(--muted-foreground))]">粗细</span>
              <input
                type="range"
                min={1}
                max={24}
                value={brushSettings.size}
                onChange={(event) =>
                  setBrushSettings((prev) => ({ ...prev, size: Number(event.target.value) }))
                }
              />
              <span className="w-10 text-right text-xs text-[hsl(var(--muted-foreground))]">
                {brushSettings.size}px
              </span>
              <div className="ml-1 flex items-center gap-1">
                {[2, 6, 12].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="rounded-md border border-[hsl(var(--border))] px-1.5 py-0.5 text-[11px]"
                    onClick={() => setBrushSettings((prev) => ({ ...prev, size }))}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-12 text-xs text-[hsl(var(--muted-foreground))]">不透明</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={brushSettings.opacity}
                onChange={(event) =>
                  setBrushSettings((prev) => ({ ...prev, opacity: Number(event.target.value) }))
                }
              />
              <span className="w-10 text-right text-xs text-[hsl(var(--muted-foreground))]">
                {Math.round(brushSettings.opacity * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-12 text-xs text-[hsl(var(--muted-foreground))]">笔刷</span>
              <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] p-0.5">
                {(["pencil", "marker", "spray"] as BrushType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={cn(
                      "rounded-md px-2 py-1 text-xs",
                      brushSettings.brushType === type
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                        : "text-[hsl(var(--muted-foreground))]",
                    )}
                    onClick={() => setBrushSettings((prev) => ({ ...prev, brushType: type }))}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-12 text-xs text-[hsl(var(--muted-foreground))]">颜色</span>
              <input
                type="color"
                value={brushSettings.color}
                onChange={(event) => {
                  const color = event.target.value;
                  setBrushSettings((prev) => ({ ...prev, color }));
                  setBrushRecentColors((prev) => pushRecentColor(prev, color));
                }}
                className="h-7 w-10 cursor-pointer rounded border border-[hsl(var(--border))] bg-transparent p-0"
              />
              <div className="flex items-center gap-1">
                {brushRecentColors.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded-full border-2",
                      brushSettings.color.toLowerCase() === color.toLowerCase()
                        ? "border-[hsl(var(--primary))]"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setBrushSettings((prev) => ({ ...prev, color }));
                      setBrushRecentColors((prev) => pushRecentColor(prev, color));
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tool === "eraser" ? (
        <div
          className="absolute bottom-[64px] left-1/2 z-[20] -translate-x-1/2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] p-2 shadow-[0_8px_20px_rgba(43,67,95,0.16)] backdrop-blur"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded-md px-2 py-1 text-xs",
                  eraserMode === "tap"
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
                onClick={() => setEraserMode("tap")}
              >
                点击
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-2 py-1 text-xs",
                  eraserMode === "stroke"
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
                onClick={() => setEraserMode("stroke")}
              >
                涂抹
              </button>
            </div>
            {eraserMode === "stroke" ? (
              <>
                <input
                  type="range"
                  min={4}
                  max={48}
                  value={eraserSize}
                  onChange={(event) => setEraserSize(Number(event.target.value))}
                />
                <span className="w-10 text-right text-xs text-[hsl(var(--muted-foreground))]">
                  {eraserSize}px
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {isAnnotatePanelOpen ? (
        <div
          className="absolute bottom-[64px] right-4 z-[20] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] px-3 py-2 shadow-[0_8px_20px_rgba(43,67,95,0.16)] backdrop-blur"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            点击画布可创建标注，再次点击工具可收起此面板
          </p>
        </div>
      ) : null}

      {isTextPanelOpen ? (
        <div
          className="absolute bottom-[64px] right-4 z-[20] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] p-3 shadow-[0_8px_20px_rgba(43,67,95,0.16)] backdrop-blur"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-10 text-[hsl(var(--muted-foreground))]">字体</span>
              <select
                value={textSettings.fontFamily}
                onChange={(event) => applyTextSettings({ fontFamily: event.target.value })}
                className="h-7 rounded-md border border-[hsl(var(--border))] bg-transparent px-2"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="w-10 text-[hsl(var(--muted-foreground))]">字号</span>
              <div className="flex items-center gap-1">
                {FONT_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="rounded-md border border-[hsl(var(--border))] px-1.5 py-0.5"
                    onClick={() => applyTextSettings({ fontSize: size })}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={10}
                max={96}
                value={textSettings.fontSize}
                onChange={(event) =>
                  applyTextSettings({ fontSize: Math.max(10, Number(event.target.value) || 10) })
                }
                className="h-7 w-16 rounded-md border border-[hsl(var(--border))] bg-transparent px-2"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="w-10 text-[hsl(var(--muted-foreground))]">颜色</span>
              <input
                type="color"
                value={textSettings.color}
                onChange={(event) => {
                  const color = event.target.value;
                  applyTextSettings({ color });
                  setTextRecentColors((prev) => pushRecentColor(prev, color));
                }}
                className="h-7 w-10 cursor-pointer rounded border border-[hsl(var(--border))] bg-transparent p-0"
              />
              <div className="flex items-center gap-1">
                {textRecentColors.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded-full border-2",
                      textSettings.color.toLowerCase() === color.toLowerCase()
                        ? "border-[hsl(var(--primary))]"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      applyTextSettings({ color });
                      setTextRecentColors((prev) => pushRecentColor(prev, color));
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="absolute bottom-4 left-1/2 z-[20] flex h-12 -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] px-2 shadow-[0_8px_20px_rgba(43,67,95,0.16)] backdrop-blur"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {TOOLBAR_TOOLS.map((item) => {
          const Icon = item.icon;
          const isActive = tool === item.key;

          return (
            <div key={item.key} className="group relative flex items-center">
              <Button
                variant={isActive ? "default" : "ghost"}
                size="icon"
                className={cn("h-8 w-8 rounded-xl", isActive ? "" : "text-[hsl(var(--muted-foreground))]")}
                onClick={() => handleToolbarToolClick(item.key)}
                aria-label={item.label}
                title={`${item.label} (${item.hotkey})`}
              >
                <Icon className="h-4 w-4" />
              </Button>
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </div>
          );
        })}

        <div className="mx-1 h-6 w-px bg-[hsl(var(--border))]" />

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="撤销"
          title="撤销"
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label="重做"
          title="重做"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          onClick={fitToContent}
          disabled={!canFitContent}
          aria-label="适配视图"
          title="适配视图"
        >
          <Focus className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-6 w-px bg-[hsl(var(--border))]" />

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          onClick={() => zoomAtCenter(viewport.scale - 0.1)}
          aria-label="缩小"
          title="缩小"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <button
          type="button"
          className="w-12 rounded-md px-1 py-1 text-center text-sm text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))]"
          onClick={() => zoomAtCenter(1)}
          title="重置到 100%"
        >
          {Math.round(viewport.scale * 100)}%
        </button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          onClick={() => zoomAtCenter(viewport.scale + 0.1)}
          aria-label="放大"
          title="放大"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
