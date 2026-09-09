import {
  isShapeColor,
  isShapeKind,
  type Shape,
  type ShapeColor,
  type ShapeKind,
} from "./model";

type EncodedLine = [number, number, number, number];
type EncodedShapeV2 = [ShapeKind, number, number, number, number];
type EncodedShapeV3 = [
  ShapeKind,
  ShapeColor,
  number,
  number,
  number,
  number,
];
type DrawingDataV1 = {
  version: 1;
  lines: EncodedLine[];
};
type DrawingDataV2 = {
  version: 2;
  shapes: EncodedShapeV2[];
};
type DrawingDataV3 = {
  version: 3;
  shapes: EncodedShapeV3[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isEncodedLine(value: unknown): value is EncodedLine {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(isFiniteNumber)
  );
}

function isEncodedShapeV2(value: unknown): value is EncodedShapeV2 {
  return (
    Array.isArray(value) &&
    value.length === 5 &&
    isShapeKind(value[0]) &&
    value.slice(1).every(isFiniteNumber)
  );
}

function isEncodedShapeV3(value: unknown): value is EncodedShapeV3 {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    isShapeKind(value[0]) &&
    isShapeColor(value[1]) &&
    value.slice(2).every(isFiniteNumber)
  );
}

function isDrawingDataV1(value: unknown): value is DrawingDataV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("version" in value) || !("lines" in value)) {
    return false;
  }

  return (
    value.version === 1 &&
    Array.isArray(value.lines) &&
    value.lines.every(isEncodedLine)
  );
}

function isDrawingDataV2(value: unknown): value is DrawingDataV2 {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("version" in value) || !("shapes" in value)) {
    return false;
  }

  return (
    value.version === 2 &&
    Array.isArray(value.shapes) &&
    value.shapes.every(isEncodedShapeV2)
  );
}

function isDrawingDataV3(value: unknown): value is DrawingDataV3 {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("version" in value) || !("shapes" in value)) {
    return false;
  }

  return (
    value.version === 3 &&
    Array.isArray(value.shapes) &&
    value.shapes.every(isEncodedShapeV3)
  );
}

function removeDrawingFromUrl() {
  const urlWithoutFragment = window.location.pathname + window.location.search;

  window.history.replaceState(null, "", urlWithoutFragment);
}

export function loadShapesFromUrl(): Shape[] {
  const parameters = new URLSearchParams(window.location.hash.slice(1));
  const drawingJson = parameters.get("drawing");

  if (drawingJson === null) {
    return [];
  }

  try {
    const drawing: unknown = JSON.parse(drawingJson);

    if (isDrawingDataV3(drawing)) {
      return drawing.shapes.map(
        ([kind, color, startX, startY, endX, endY]) => ({
          kind,
          color,
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
        }),
      );
    }

    if (isDrawingDataV2(drawing)) {
      return drawing.shapes.map(
        ([kind, startX, startY, endX, endY]) => ({
          kind,
          color: "black",
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
        }),
      );
    }

    if (isDrawingDataV1(drawing)) {
      return drawing.lines.map(([startX, startY, endX, endY]) => ({
        kind: "line",
        color: "black",
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
      }));
    }
  } catch {
    removeDrawingFromUrl();
    return [];
  }

  removeDrawingFromUrl();
  return [];
}

export function saveShapesToUrl(shapes: Shape[]) {
  if (shapes.length === 0) {
    removeDrawingFromUrl();
    return;
  }

  const drawing: DrawingDataV3 = {
    version: 3,
    shapes: shapes.map<EncodedShapeV3>((shape) => [
      shape.kind,
      shape.color,
      Math.round(shape.start.x),
      Math.round(shape.start.y),
      Math.round(shape.end.x),
      Math.round(shape.end.y),
    ]),
  };
  const parameters = new URLSearchParams({
    drawing: JSON.stringify(drawing),
  });

  window.history.replaceState(null, "", `#${parameters.toString()}`);
}
