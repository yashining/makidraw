export type Point = { x: number; y: number };

export type GeometricShapeKind = "line" | "rectangle" | "ellipse";

export type ShapeKind = GeometricShapeKind | "text";

export type ShapeColor = "black" | "red" | "blue" | "green";

export type GeometricShape = {
  kind: GeometricShapeKind;
  color: ShapeColor;
  start: Point;
  end: Point;
};

export type TextShape = {
  kind: "text";
  color: ShapeColor;
  position: Point;
  text: string;
};

export type Shape = GeometricShape | TextShape;

export function isGeometricShapeKind(
  value: unknown,
): value is GeometricShapeKind {
  return value === "line" || value === "rectangle" || value === "ellipse";
}

export function isShapeKind(value: unknown): value is ShapeKind {
  return isGeometricShapeKind(value) || value === "text";
}

export function isShapeColor(value: unknown): value is ShapeColor {
  return (
    value === "black" ||
    value === "red" ||
    value === "blue" ||
    value === "green"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isPoint(value: unknown): value is Point {
  return (
    isObject(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

export function isShape(value: unknown): value is Shape {
  if (
    !isObject(value) ||
    !isShapeKind(value.kind) ||
    !isShapeColor(value.color)
  ) {
    return false;
  }

  if (value.kind === "text") {
    return isPoint(value.position) && typeof value.text === "string";
  }

  return isPoint(value.start) && isPoint(value.end);
}
