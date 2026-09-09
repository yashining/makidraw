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
