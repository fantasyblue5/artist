import type { FrameObject, Point, Stroke, Viewport } from "@/types/editor";

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  };
}

export function isPointInFrame(point: Point, frame: FrameObject): boolean {
  return (
    point.x >= frame.x &&
    point.x <= frame.x + frame.width &&
    point.y >= frame.y &&
    point.y <= frame.y + frame.height
  );
}

export function distancePointToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    const diffX = point.x - start.x;
    const diffY = point.y - start.y;
    return Math.hypot(diffX, diffY);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)),
  );
  const projX = start.x + t * dx;
  const projY = start.y + t * dy;

  return Math.hypot(point.x - projX, point.y - projY);
}

export function hitStroke(stroke: Stroke, point: Point, threshold: number): boolean {
  if (stroke.points.length === 0) {
    return false;
  }

  if (stroke.points.length === 1) {
    return Math.hypot(point.x - stroke.points[0].x, point.y - stroke.points[0].y) <= threshold;
  }

  for (let i = 1; i < stroke.points.length; i += 1) {
    const distance = distancePointToSegment(point, stroke.points[i - 1], stroke.points[i]);
    if (distance <= threshold + stroke.size * 0.5) {
      return true;
    }
  }

  return false;
}
