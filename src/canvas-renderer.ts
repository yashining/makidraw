import {
  drawingColors,
  drawingTextFont,
  drawingTextFontSize,
  remotePointerColor,
  remotePointerOutlineColor,
  selectionColor,
} from "./drawing-style";
import type { Point, Shape } from "./model";
import { getShapeBounds } from "./shape-geometry";

const primaryStrokeOpacity = 0.62;
const secondaryStrokeOpacity = 0.22;
const primaryStrokeWidth = 2.2;
const secondaryStrokeWidth = 1.2;
const textOpacity = 0.88;
const selectionPadding = 6;

function strokePath(
  context: CanvasRenderingContext2D,
  opacity: number,
  lineWidth: number,
  createPath: () => void,
) {
  context.save();
  context.globalAlpha = opacity;
  context.lineWidth = lineWidth;
  context.beginPath();
  createPath();
  context.stroke();
  context.restore();
}

function drawLine(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  const differenceX = end.x - start.x;
  const differenceY = end.y - start.y;
  const length = Math.hypot(differenceX, differenceY);
  const normalX = length === 0 ? 0 : -differenceY / length;
  const normalY = length === 0 ? 0 : differenceX / length;
  const midpointX = (start.x + end.x) / 2;
  const midpointY = (start.y + end.y) / 2;
  const bend = Math.min(1.8, length * 0.015);
  const direction = Math.sin(differenceX * 0.12 + differenceY * 0.19) >= 0 ? 1 : -1;

  strokePath(context, primaryStrokeOpacity, primaryStrokeWidth, () => {
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(
      midpointX + normalX * bend * direction,
      midpointY + normalY * bend * direction,
      end.x,
      end.y,
    );
  });

  strokePath(context, secondaryStrokeOpacity, secondaryStrokeWidth, () => {
    context.moveTo(
      start.x + normalX * 0.45 * direction,
      start.y + normalY * 0.45 * direction,
    );
    context.quadraticCurveTo(
      midpointX - normalX * bend * 0.55 * direction,
      midpointY - normalY * bend * 0.55 * direction,
      end.x - normalX * 0.35 * direction,
      end.y - normalY * 0.35 * direction,
    );
  });
}

function drawRectangle(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);
  const width = right - left;
  const height = bottom - top;
  const variation = Math.min(1.1, width / 12, height / 12);

  strokePath(context, primaryStrokeOpacity, primaryStrokeWidth, () => {
    context.moveTo(left + variation * 0.35, top);
    context.lineTo(right, top + variation * 0.25);
    context.lineTo(right - variation * 0.2, bottom);
    context.lineTo(left, bottom - variation * 0.3);
    context.closePath();
  });

  strokePath(context, secondaryStrokeOpacity, secondaryStrokeWidth, () => {
    context.moveTo(left, top + variation * 0.4);
    context.lineTo(right - variation * 0.3, top);
    context.lineTo(right, bottom - variation * 0.35);
    context.lineTo(left + variation * 0.25, bottom);
    context.closePath();
  });
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
  const variation = Math.min(0.75, radiusX * 0.08, radiusY * 0.08);
  const direction = Math.sin(radiusX * 0.17 + radiusY * 0.11) >= 0 ? 1 : -1;

  strokePath(context, primaryStrokeOpacity, primaryStrokeWidth, () => {
    context.ellipse(
      centerX + variation * 0.15 * direction,
      centerY - variation * 0.1 * direction,
      radiusX,
      radiusY,
      0.006 * direction,
      0,
      Math.PI * 2,
    );
  });

  strokePath(context, secondaryStrokeOpacity, secondaryStrokeWidth, () => {
    context.ellipse(
      centerX - variation * 0.35 * direction,
      centerY + variation * 0.25 * direction,
      radiusX + variation * 0.25,
      Math.max(0, radiusY - variation * 0.2),
      -0.008 * direction,
      0,
      Math.PI * 2,
    );
  });
}

export function drawShape(context: CanvasRenderingContext2D, shape: Shape) {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = drawingColors[shape.color];
  context.fillStyle = drawingColors[shape.color];

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
      context.font = drawingTextFont;
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
  context.font = drawingTextFont;
  const width = context.measureText(text).width;
  context.restore();

  return { width, height: drawingTextFontSize };
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
  context.strokeStyle = selectionColor;
  context.setLineDash([5, 4]);
  context.strokeRect(
    bounds.left - selectionPadding,
    bounds.top - selectionPadding,
    bounds.right - bounds.left + selectionPadding * 2,
    bounds.bottom - bounds.top + selectionPadding * 2,
  );
  context.restore();
}

export function drawRemotePointer(
  context: CanvasRenderingContext2D,
  position: Point,
) {
  context.save();
  context.translate(position.x, position.y);
  context.fillStyle = remotePointerColor;
  context.strokeStyle = remotePointerOutlineColor;
  context.lineJoin = "round";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(3, 16);
  context.lineTo(7, 11);
  context.lineTo(12, 16);
  context.lineTo(16, 12);
  context.lineTo(11, 7);
  context.lineTo(16, 4);
  context.closePath();
  context.stroke();
  context.fill();
  context.restore();
}
