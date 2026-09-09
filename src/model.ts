export type Point = { x: number; y: number };

export type ShapeKind = "line" | "rectangle" | "ellipse";

export type ShapeColor = "black" | "red" | "blue" | "green";

export type Shape = {
  kind: ShapeKind;
  color: ShapeColor;
  start: Point;
  end: Point;
};

export function isShapeKind(value: unknown): value is ShapeKind {
  return value === "line" || value === "rectangle" || value === "ellipse";
}

export function isShapeColor(value: unknown): value is ShapeColor {
  return (
    value === "black" ||
    value === "red" ||
    value === "blue" ||
    value === "green"
  );
}
