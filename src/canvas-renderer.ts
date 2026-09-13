import type { Point, Shape } from "./model";
import { getShapeBounds } from "./shape-geometry";

const geometricShapeOpacity = 0.6;
const textOpacity = 0.8;
export const textFontSize = 20;
const selectionPadding = 6;

function drawLine(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
}

function drawRectangle(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  context.strokeRect(left, top, width, height);
}

function drawEllipse(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;

  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();
}

export function drawShape(context: CanvasRenderingContext2D, shape: Shape) {
  context.save();
  context.globalAlpha = geometricShapeOpacity;
  context.lineWidth = 2;
  context.strokeStyle = shape.color;
  context.fillStyle = shape.color;

  switch (shape.kind) {
    case "line":
      drawLine(context, shape.start, shape.end);
      break;
    case "rectangle":
      drawRectangle(context, shape.start, shape.end);
      break;
    case "ellipse":
      drawEllipse(context, shape.start, shape.end);
      break;
    case "text":
      context.globalAlpha = textOpacity;
      context.font = `${textFontSize}px system-ui`;
      context.textBaseline = "top";
      context.fillText(shape.text, shape.position.x, shape.position.y);
      break;
  }

  context.restore();
}

export function measureShapeText(
  context: CanvasRenderingContext2D,
  text: string,
) {
  context.save();
  context.font = `${textFontSize}px system-ui`;
  const width = context.measureText(text).width;
  context.restore();

  return { width, height: textFontSize };
}

export function drawSelection(
  context: CanvasRenderingContext2D,
  shape: Shape,
) {
  const bounds = getShapeBounds(shape, (text) =>
    measureShapeText(context, text),
  );

  context.save();
  context.globalAlpha = 1;
  context.lineWidth = 1;
  context.strokeStyle = "#2563eb";
  context.setLineDash([5, 4]);
  context.strokeRect(
    bounds.left - selectionPadding,
    bounds.top - selectionPadding,
    bounds.right - bounds.left + selectionPadding * 2,
    bounds.bottom - bounds.top + selectionPadding * 2,
  );
  context.restore();
}
