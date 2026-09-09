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

type Point = { x: number; y: number };
type ShapeKind = "line" | "rectangle" | "ellipse";
type ShapeColor = "black" | "red" | "blue" | "green";
type Shape = {
  kind: ShapeKind;
  color: ShapeColor;
  start: Point;
  end: Point;
};
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

function isShapeKind(value: unknown): value is ShapeKind {
  return value === "line" || value === "rectangle" || value === "ellipse";
}

function isShapeColor(value: unknown): value is ShapeColor {
  return (
    value === "black" ||
    value === "red" ||
    value === "blue" ||
    value === "green"
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

function loadShapesFromUrl(): Shape[] {
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

function updateUrl() {
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
  updateUrl();
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
    updateUrl();
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
    updateUrl();
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
