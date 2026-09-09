import { loadShapesFromUrl, saveShapesToUrl } from "./drawing-url";
import {
  isShapeColor,
  isShapeKind,
  type Point,
  type Shape,
  type ShapeColor,
  type ShapeKind,
} from "./model";
import "./style.css";

const canvasElement = document.querySelector("#drawing");

if (!(canvasElement instanceof HTMLCanvasElement)) {
  throw new Error("Drawing canvas was not found");
}

const canvas = canvasElement;
const drawingContext = canvas.getContext("2d");
const undoButtonElement = document.querySelector("#undo");
const clearButtonElement = document.querySelector("#clear");

if (!drawingContext) {
  throw new Error("Could not get a drawing context");
}

if (!(undoButtonElement instanceof HTMLButtonElement)) {
  throw new Error("Undo button was not found");
}

if (!(clearButtonElement instanceof HTMLButtonElement)) {
  throw new Error("Clear button was not found");
}

const context = drawingContext;
const undoButton = undoButtonElement;
const clearButton = clearButtonElement;

context.lineWidth = 2;

const shapes = loadShapesFromUrl();
const undoStack: Shape[][] = [];
let selectedTool: ShapeKind = "line";
let selectedColor: ShapeColor = "black";
let startPoint: Point | null = null;
let cursorPoint: Point | null = null;
let pressedCanvasPoint: Point | null = null;
let pressedClientPoint: Point | null = null;
let activePointerId: number | null = null;
let isDragging = false;
const dragThreshold = 4;

function getCanvasPoint(event: PointerEvent): Point {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
    y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
  };
}

function drawLine(start: Point, end: Point) {
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
}

function drawRectangle(start: Point, end: Point) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  context.strokeRect(left, top, width, height);
}

function drawEllipse(start: Point, end: Point) {
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;

  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();
}

function drawShape(shape: Shape) {
  context.strokeStyle = shape.color;

  switch (shape.kind) {
    case "line":
      drawLine(shape.start, shape.end);
      break;
    case "rectangle":
      drawRectangle(shape.start, shape.end);
      break;
    case "ellipse":
      drawEllipse(shape.start, shape.end);
      break;
  }
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const shape of shapes) {
    drawShape(shape);
  }

  if (startPoint !== null && cursorPoint !== null) {
    drawShape({
      kind: selectedTool,
      color: selectedColor,
      start: startPoint,
      end: cursorPoint,
    });
  }

  undoButton.disabled = startPoint === null && undoStack.length === 0;
  clearButton.disabled = startPoint === null && shapes.length === 0;
}

function finishShape(endPoint: Point) {
  if (startPoint === null) {
    return;
  }

  undoStack.push([...shapes]);
  shapes.push({
    kind: selectedTool,
    color: selectedColor,
    start: startPoint,
    end: endPoint,
  });
  saveShapesToUrl(shapes);
  startPoint = null;
  cursorPoint = null;
  render();
}

function resetPointerGesture() {
  if (
    activePointerId !== null &&
    canvas.hasPointerCapture(activePointerId)
  ) {
    canvas.releasePointerCapture(activePointerId);
  }

  activePointerId = null;
  pressedCanvasPoint = null;
  pressedClientPoint = null;
  isDragging = false;
}

function undo() {
  resetPointerGesture();

  if (startPoint !== null) {
    startPoint = null;
    cursorPoint = null;
  } else {
    const previousShapes = undoStack.pop();

    if (previousShapes === undefined) {
      return;
    }

    shapes.length = 0;
    shapes.push(...previousShapes);
    saveShapesToUrl(shapes);
  }

  render();
}

function clearDrawing() {
  resetPointerGesture();
  const hasDraft = startPoint !== null;

  if (!hasDraft && shapes.length === 0) {
    return;
  }

  startPoint = null;
  cursorPoint = null;

  if (shapes.length > 0) {
    undoStack.push([...shapes]);
    shapes.length = 0;
    saveShapesToUrl(shapes);
  }

  render();
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || activePointerId !== null) {
    return;
  }

  activePointerId = event.pointerId;
  pressedCanvasPoint = getCanvasPoint(event);
  pressedClientPoint = { x: event.clientX, y: event.clientY };
  isDragging = false;
  canvas.setPointerCapture(event.pointerId);

  if (startPoint !== null) {
    cursorPoint = pressedCanvasPoint;
    render();
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (activePointerId !== null && event.pointerId !== activePointerId) {
    return;
  }

  const point = getCanvasPoint(event);

  if (
    activePointerId === event.pointerId &&
    pressedCanvasPoint !== null &&
    pressedClientPoint !== null &&
    startPoint === null &&
    Math.hypot(
      event.clientX - pressedClientPoint.x,
      event.clientY - pressedClientPoint.y,
    ) >= dragThreshold
  ) {
    isDragging = true;
    startPoint = pressedCanvasPoint;
  }

  if (startPoint === null) {
    return;
  }

  cursorPoint = point;
  render();
});

canvas.addEventListener("pointerup", (event) => {
  if (event.pointerId !== activePointerId) {
    return;
  }

  const point = getCanvasPoint(event);
  const completedDrag = isDragging;
  resetPointerGesture();

  if (completedDrag) {
    finishShape(point);
    return;
  }

  if (startPoint === null) {
    startPoint = point;
    cursorPoint = point;
    render();
    return;
  }

  finishShape(point);
});

canvas.addEventListener("pointercancel", () => {
  resetPointerGesture();
  startPoint = null;
  cursorPoint = null;
  render();
});

canvas.addEventListener("pointerleave", () => {
  if (activePointerId !== null) {
    return;
  }

  cursorPoint = null;
  render();
});

const toolButtons = document.querySelectorAll<HTMLButtonElement>("[data-tool]");
const colorButtons =
  document.querySelectorAll<HTMLButtonElement>("[data-color]");

for (const button of toolButtons) {
  button.addEventListener("click", () => {
    const tool = button.dataset.tool;

    if (!isShapeKind(tool)) {
      return;
    }

    resetPointerGesture();
    selectedTool = tool;
    startPoint = null;
    cursorPoint = null;

    for (const toolButton of toolButtons) {
      toolButton.setAttribute(
        "aria-pressed",
        String(toolButton.dataset.tool === selectedTool),
      );
    }

    render();
  });
}

for (const button of colorButtons) {
  button.addEventListener("click", () => {
    const color = button.dataset.color;

    if (!isShapeColor(color)) {
      return;
    }

    selectedColor = color;

    for (const colorButton of colorButtons) {
      colorButton.setAttribute(
        "aria-pressed",
        String(colorButton.dataset.color === selectedColor),
      );
    }

    render();
  });
}

undoButton.addEventListener("click", undo);
clearButton.addEventListener("click", clearDrawing);

document.addEventListener("keydown", (event) => {
  const isUndoShortcut =
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    event.key.toLowerCase() === "z";

  if (isUndoShortcut) {
    event.preventDefault();
    undo();
  }
});

render();
