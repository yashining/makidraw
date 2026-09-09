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
const textEditorElement = document.querySelector("#text-editor");

if (!drawingContext) {
  throw new Error("Could not get a drawing context");
}

if (!(undoButtonElement instanceof HTMLButtonElement)) {
  throw new Error("Undo button was not found");
}

if (!(clearButtonElement instanceof HTMLButtonElement)) {
  throw new Error("Clear button was not found");
}

if (!(textEditorElement instanceof HTMLInputElement)) {
  throw new Error("Text editor was not found");
}

const context = drawingContext;
const undoButton = undoButtonElement;
const clearButton = clearButtonElement;
const textEditor = textEditorElement;

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
let textPosition: Point | null = null;
const dragThreshold = 4;
const geometricShapeOpacity = 0.6;
const textOpacity = 0.8;
const textFontSize = 20;

function getCanvasPoint(event: MouseEvent): Point {
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
  context.save();
  context.globalAlpha = geometricShapeOpacity;
  context.strokeStyle = shape.color;
  context.fillStyle = shape.color;

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
    case "text":
      context.globalAlpha = textOpacity;
      context.font = `${textFontSize}px system-ui`;
      context.textBaseline = "top";
      context.fillText(shape.text, shape.position.x, shape.position.y);
      break;
  }
  context.restore();
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const shape of shapes) {
    drawShape(shape);
  }

  if (
    selectedTool !== "text" &&
    startPoint !== null &&
    cursorPoint !== null
  ) {
    drawShape({
      kind: selectedTool,
      color: selectedColor,
      start: startPoint,
      end: cursorPoint,
    });
  }

  const hasDraft = startPoint !== null || textPosition !== null;

  undoButton.disabled = !hasDraft && undoStack.length === 0;
  clearButton.disabled = !hasDraft && shapes.length === 0;
}

function finishShape(endPoint: Point) {
  if (startPoint === null || selectedTool === "text") {
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

function closeTextEditor() {
  textPosition = null;
  textEditor.hidden = true;
  textEditor.value = "";
}

function cancelText() {
  closeTextEditor();
  render();
}

function commitText() {
  if (textPosition === null) {
    return;
  }

  const position = textPosition;
  const text = textEditor.value.trim();

  closeTextEditor();

  if (text.length === 0) {
    render();
    return;
  }

  undoStack.push([...shapes]);
  shapes.push({
    kind: "text",
    color: selectedColor,
    position,
    text,
  });
  saveShapesToUrl(shapes);
  render();
}

function openTextEditor(position: Point) {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = bounds.width / canvas.width;
  const scaleY = bounds.height / canvas.height;

  textPosition = position;
  textEditor.style.left = `${position.x * scaleX}px`;
  textEditor.style.top = `${position.y * scaleY}px`;
  textEditor.style.fontSize = `${textFontSize * scaleY}px`;
  textEditor.style.color = selectedColor;
  textEditor.hidden = false;
  textEditor.focus();
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

  if (textPosition !== null) {
    closeTextEditor();
  } else if (startPoint !== null) {
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
  const hasDraft = startPoint !== null || textPosition !== null;

  if (!hasDraft && shapes.length === 0) {
    return;
  }

  closeTextEditor();
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
  if (
    selectedTool === "text" ||
    event.button !== 0 ||
    activePointerId !== null
  ) {
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

canvas.addEventListener("click", (event) => {
  if (selectedTool !== "text") {
    return;
  }

  openTextEditor(getCanvasPoint(event));
});

textEditor.addEventListener("keydown", (event) => {
  event.stopPropagation();

  if (event.key === "Enter") {
    event.preventDefault();
    commitText();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelText();
  }
});

textEditor.addEventListener("blur", commitText);

const toolButtons = document.querySelectorAll<HTMLButtonElement>("[data-tool]");
const colorButtons =
  document.querySelectorAll<HTMLButtonElement>("[data-color]");

function selectTool(tool: ShapeKind) {
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
}

for (const button of toolButtons) {
  button.addEventListener("click", () => {
    const tool = button.dataset.tool;
    if (!isShapeKind(tool)) {
      return;
    }
    selectTool(tool);
  });
}

function selectColor(color: ShapeColor) {
  selectedColor = color;

  for (const colorButton of colorButtons) {
    colorButton.setAttribute(
      "aria-pressed",
      String(colorButton.dataset.color === selectedColor),
    );
  }

  render();
}

for (const button of colorButtons) {
  button.addEventListener("click", () => {
    const color = button.dataset.color;

    if (!isShapeColor(color)) {
      return;
    }

    selectColor(color);
  });
}

undoButton.addEventListener("click", undo);
clearButton.addEventListener("click", clearDrawing);

const toolShortcuts: Partial<Record<string, ShapeKind>> = {
  l: "line",
  r: "rectangle",
  e: "ellipse",
  t: "text",
};

const colorShortcuts: Partial<Record<string, ShapeColor>> = {
  1: "black",
  2: "red",
  3: "blue",
  4: "green",
};

document.addEventListener("keydown", (event) => {
  const isUndoShortcut =
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    event.key.toLowerCase() === "z";

  const isCancelShortcut =
    event.key === "Escape" && startPoint !== null;

  if (isUndoShortcut || isCancelShortcut) {
    event.preventDefault();
    undo();
  }

  const key = event.key.toLowerCase();
  const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

  const tool = toolShortcuts[key];
  if (tool !== undefined && !hasModifier) {
    selectTool(tool);
  }
  const color = colorShortcuts[key];
  if (color !== undefined && !hasModifier) {
    selectColor(color);
  }
});

render();
