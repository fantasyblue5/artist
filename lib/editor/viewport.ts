import type { Point, Viewport } from "@/types/editor";

export type ViewportBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

/**
 * Clamp viewport scale into the expected interaction range.
 */
export function clampViewportScale(value: number, min = 0.2, max = 4): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert a screen point (px) to world coordinates under the current viewport.
 */
export function screenToWorldPoint(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}

/**
 * Convert a world point to screen coordinates under the current viewport.
 */
export function worldToScreenPoint(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

/**
 * Zoom around a fixed screen anchor so the anchor maps to the same world point after zoom.
 */
export function zoomViewportToPoint(
  viewport: Viewport,
  nextScale: number,
  anchorScreenPoint: Point,
  minScale = 0.2,
  maxScale = 4,
): Viewport {
  const clamped = clampViewportScale(nextScale, minScale, maxScale);
  const anchorWorld = screenToWorldPoint(anchorScreenPoint, viewport);
  return {
    scale: clamped,
    x: anchorScreenPoint.x - anchorWorld.x * clamped,
    y: anchorScreenPoint.y - anchorWorld.y * clamped,
  };
}

/**
 * Fit world bounds into viewport size with padding and center the result.
 */
export function fitViewportToBounds(
  bounds: ViewportBounds | null,
  viewportSize: ViewportSize,
  options?: {
    padding?: number;
    minScale?: number;
    maxScale?: number;
  },
): Viewport | null {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const padding = options?.padding ?? 48;
  const minScale = options?.minScale ?? 0.2;
  const maxScale = options?.maxScale ?? 4;

  const availableWidth = Math.max(1, viewportSize.width - padding * 2);
  const availableHeight = Math.max(1, viewportSize.height - padding * 2);
  const scale = clampViewportScale(
    Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
    minScale,
    maxScale,
  );

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    scale,
    x: viewportSize.width / 2 - centerX * scale,
    y: viewportSize.height / 2 - centerY * scale,
  };
}
