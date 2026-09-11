import type { Point, Shape } from "./model";

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type TextMeasurement = {
  width: number;
  height: number;
};

type MeasureText = (text: string) => TextMeasurement;

const hitTolerance = 8;

function translatePoint(point: Point, offset: Point): Point {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
  };
}

export function translateShape(shape: Shape, offset: Point): Shape {
  if (shape.kind === "text") {
    return {
      ...shape,
      position: translatePoint(shape.position, offset),
    };
  }

  return {
    ...shape,
    start: translatePoint(shape.start, offset),
    end: translatePoint(shape.end, offset),
  };
}

export function getShapeBounds(
  shape: Shape,
  measureText: MeasureText,
): Bounds {
  if (shape.kind === "text") {
    const measurement = measureText(shape.text);

    return {
      left: shape.position.x,
      top: shape.position.y,
      right: shape.position.x + measurement.width,
      bottom: shape.position.y + measurement.height,
    };
  }

  return {
    left: Math.min(shape.start.x, shape.end.x),
    top: Math.min(shape.start.y, shape.end.y),
    right: Math.max(shape.start.x, shape.end.x),
    bottom: Math.max(shape.start.y, shape.end.y),
  };
}

function isPointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.left - hitTolerance &&
    point.x <= bounds.right + hitTolerance &&
    point.y >= bounds.top - hitTolerance &&
    point.y <= bounds.bottom + hitTolerance
  );
}

function distanceFromLineSegment(
  point: Point,
  start: Point,
  end: Point,
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection =
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
    segmentLengthSquared;
  const positionOnSegment = Math.max(0, Math.min(1, projection));
  const closestX = start.x + positionOnSegment * segmentX;
  const closestY = start.y + positionOnSegment * segmentY;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

function containsPoint(
  shape: Shape,
  point: Point,
  measureText: MeasureText,
): boolean {
  switch (shape.kind) {
    case "line":
      return distanceFromLineSegment(point, shape.start, shape.end) <= hitTolerance;
    case "rectangle":
    case "text":
      return isPointInBounds(point, getShapeBounds(shape, measureText));
    case "ellipse": {
      const centerX = (shape.start.x + shape.end.x) / 2;
      const centerY = (shape.start.y + shape.end.y) / 2;
      const radiusX = Math.abs(shape.end.x - shape.start.x) / 2 + hitTolerance;
      const radiusY = Math.abs(shape.end.y - shape.start.y) / 2 + hitTolerance;
      const normalizedX = (point.x - centerX) / radiusX;
      const normalizedY = (point.y - centerY) / radiusY;

      return normalizedX ** 2 + normalizedY ** 2 <= 1;
    }
  }
}

export function findShapeIndexAtPoint(
  shapes: readonly Shape[],
  point: Point,
  measureText: MeasureText,
): number | null {
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    if (containsPoint(shapes[index], point, measureText)) {
      return index;
    }
  }

  return null;
}
