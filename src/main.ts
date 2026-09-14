import "@fontsource/kalam/latin-400.css";
import { initializeAiEditor } from "./ai-editor";
import { loadShapesFromUrl, saveShapesToUrl } from "./drawing-url";
import {
  drawSelection,
  drawShape,
  measureShapeText,
} from "./canvas-renderer";
import { drawingColors, drawingTextFontSize } from "./drawing-style";
import {
  isGeometricShapeKind,
  isShapeColor,
  isShapeKind,
  type Point,
  type Shape,
  type ShapeColor,
  type ShapeKind,
} from "./model";
import {
  findShapeIndexAtPoint,
  translateShape,
} from "./shape-geometry";
import type { SceneV1 } from "../shared/ai-edit-contract";
import "./style.css";

type ToolKind = ShapeKind | "select";

const canvasElement = document.querySelector("#drawing");

if (!(canvasElement instanceof HTMLCanvasElement)) {
  throw new Error("Drawing canvas was not found");
}

const canvas = canvasElement;
const drawingContext = canvas.getContext("2d");
const sendToBackButtonElement = document.querySelector("#send-to-back");
const bringToFrontButtonElement = document.querySelector("#bring-to-front");
const undoButtonElement = document.querySelector("#undo");
const clearButtonElement = document.querySelector("#clear");
const textEditorElement = document.querySelector("#text-editor");

if (!drawingContext) {
  throw new Error("Could not get a drawing context");
}

if (!(undoButtonElement instanceof HTMLButtonElement)) {
  throw new Error("Undo button was not found");
}

if (!(sendToBackButtonElement instanceof HTMLButtonElement)) {
  throw new Error("Send to back button was not found");
}

if (!(bringToFrontButtonElement instanceof HTMLButtonElement)) {
  throw new Error("Bring to front button was not found");
}

if (!(clearButtonElement instanceof HTMLButtonElement)) {
  throw new Error("Clear button was not found");
}

if (!(textEditorElement instanceof HTMLInputElement)) {
  throw new Error("Text editor was not found");
}

const context = drawingContext;
const sendToBackButton = sendToBackButtonElement;
const bringToFrontButton = bringToFrontButtonElement;
const undoButton = undoButtonElement;
const clearButton = clearButtonElement;
const textEditor = textEditorElement;

const shapes = loadShapesFromUrl();
const undoStack: Shape[][] = [];
let selectedTool: ToolKind = "line";
let selectedColor: ShapeColor = "black";
let selectedShapeIndex: number | null = null;
let startPoint: Point | null = null;
let cursorPoint: Point | null = null;
let pressedCanvasPoint: Point | null = null;
let pressedClientPoint: Point | null = null;
let activePointerId: number | null = null;
let isDragging = false;
let textPosition: Point | null = null;
let movingShapeIndex: number | null = null;
let movingShapePreview: Shape | null = null;
const dragThreshold = 4;

function isToolKind(value: unknown): value is ToolKind {
  return value === "select" || isShapeKind(value);
}

function getCanvasPoint(event: MouseEvent): Point {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
    y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
  };
}

function measureText(text: string) {
  return measureShapeText(context, text);
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const [index, shape] of shapes.entries()) {
    const shapeToDraw =
      index === movingShapeIndex && movingShapePreview !== null
        ? movingShapePreview
        : shape;

    drawShape(context, shapeToDraw);
  }

  if (selectedShapeIndex !== null) {
    const selectedShape =
      selectedShapeIndex === movingShapeIndex && movingShapePreview !== null
        ? movingShapePreview
        : shapes[selectedShapeIndex];

    if (selectedShape !== undefined) {
      drawSelection(context, selectedShape);
    }
  }

  if (
    isGeometricShapeKind(selectedTool) &&
    startPoint !== null &&
    cursorPoint !== null
  ) {
    drawShape(context, {
      kind: selectedTool,
      color: selectedColor,
      start: startPoint,
      end: cursorPoint,
    });
  }

  const hasDraft = startPoint !== null || textPosition !== null;
  const selectedShapeExists =
    selectedShapeIndex !== null && shapes[selectedShapeIndex] !== undefined;

  sendToBackButton.disabled =
    !selectedShapeExists || selectedShapeIndex === 0;
  bringToFrontButton.disabled =
    !selectedShapeExists || selectedShapeIndex === shapes.length - 1;
  undoButton.disabled = !hasDraft && undoStack.length === 0;
  clearButton.disabled = !hasDraft && shapes.length === 0;
}

function finishShape(endPoint: Point) {
  if (startPoint === null || !isGeometricShapeKind(selectedTool)) {
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
  textEditor.style.fontSize = `${drawingTextFontSize * scaleY}px`;
  textEditor.style.color = drawingColors[selectedColor];
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
  movingShapeIndex = null;
  movingShapePreview = null;
}

function resetDrawingState() {
  resetPointerGesture();
  closeTextEditor();
  selectedShapeIndex = null;
  startPoint = null;
  cursorPoint = null;
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
      render();
      return;
    }

    shapes.length = 0;
    shapes.push(...previousShapes);
    selectedShapeIndex = null;
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
    selectedShapeIndex = null;
    saveShapesToUrl(shapes);
  }

  render();
}

function sendSelectedShapeToBack() {
  if (selectedShapeIndex === null || selectedShapeIndex === 0) {
    return;
  }

  const selectedShape = shapes[selectedShapeIndex];

  if (selectedShape === undefined) {
    return;
  }

  undoStack.push([...shapes]);
  shapes.splice(selectedShapeIndex, 1);
  shapes.unshift(selectedShape);
  selectedShapeIndex = 0;
  saveShapesToUrl(shapes);
  render();
}

function bringSelectedShapeToFront() {
  if (
    selectedShapeIndex === null ||
    selectedShapeIndex === shapes.length - 1
  ) {
    return;
  }

  const selectedShape = shapes[selectedShapeIndex];

  if (selectedShape === undefined) {
    return;
  }

  undoStack.push([...shapes]);
  shapes.splice(selectedShapeIndex, 1);
  shapes.push(selectedShape);
  selectedShapeIndex = shapes.length - 1;
  saveShapesToUrl(shapes);
  render();
}

function deleteSelectedShape() {
  if (selectedShapeIndex === null) {
    return;
  }

  const selectedShape = shapes[selectedShapeIndex];

  if (selectedShape === undefined) {
    return;
  }

  undoStack.push([...shapes]);
  shapes.splice(selectedShapeIndex, 1);
  selectedShapeIndex = null;
  saveShapesToUrl(shapes);
  render();
}

canvas.addEventListener("pointerdown", (event) => {
  if (
    event.button !== 0 ||
    activePointerId !== null
  ) {
    return;
  }

  if (selectedTool === "select") {
    const point = getCanvasPoint(event);
    selectedShapeIndex = findShapeIndexAtPoint(
      shapes,
      point,
      measureText,
    );

    if (selectedShapeIndex !== null) {
      movingShapeIndex = selectedShapeIndex;
      activePointerId = event.pointerId;
      pressedCanvasPoint = point;
      pressedClientPoint = { x: event.clientX, y: event.clientY };
      isDragging = false;
      canvas.setPointerCapture(event.pointerId);
    }

    render();
    return;
  }

  if (selectedTool === "text") {
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
    movingShapeIndex !== null &&
    activePointerId === event.pointerId &&
    pressedCanvasPoint !== null &&
    pressedClientPoint !== null
  ) {
    if (
      isDragging ||
      Math.hypot(
        event.clientX - pressedClientPoint.x,
        event.clientY - pressedClientPoint.y,
      ) >= dragThreshold
    ) {
      const originalShape = shapes[movingShapeIndex];

      if (originalShape !== undefined) {
        isDragging = true;
        movingShapePreview = translateShape(originalShape, {
          x: point.x - pressedCanvasPoint.x,
          y: point.y - pressedCanvasPoint.y,
        });
        render();
      }
    }

    return;
  }

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

  if (movingShapeIndex !== null) {
    const movedShapeIndex = movingShapeIndex;
    const originalShape = shapes[movedShapeIndex];
    const movedShape =
      isDragging && pressedCanvasPoint !== null && originalShape !== undefined
        ? translateShape(originalShape, {
            x: point.x - pressedCanvasPoint.x,
            y: point.y - pressedCanvasPoint.y,
          })
        : null;

    resetPointerGesture();

    if (movedShape !== null) {
      undoStack.push([...shapes]);
      shapes[movedShapeIndex] = movedShape;
      saveShapesToUrl(shapes);
    }

    render();
    return;
  }

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

function selectTool(tool: ToolKind) {
  resetPointerGesture();
  selectedTool = tool;
  startPoint = null;
  cursorPoint = null;

  if (tool !== "select") {
    selectedShapeIndex = null;
  }

  canvas.classList.toggle("selection-active", tool === "select");

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
    if (!isToolKind(tool)) {
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
  const color = button.dataset.color;

  if (!isShapeColor(color)) {
    continue;
  }

  button.style.setProperty("--swatch-color", drawingColors[color]);
  button.addEventListener("click", () => {
    selectColor(color);
  });
}

sendToBackButton.addEventListener("click", sendSelectedShapeToBack);
bringToFrontButton.addEventListener("click", bringSelectedShapeToFront);
undoButton.addEventListener("click", undo);
clearButton.addEventListener("click", clearDrawing);

const toolShortcuts: Partial<Record<string, ToolKind>> = {
  v: "select",
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
  const key = event.key.toLowerCase();
  const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

  const isUndoShortcut =
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    key === "z";

  const isCancelShortcut =
    key === "escape" && startPoint !== null;

  const isDeleteShortcut =
    key === "backspace" &&
    selectedShapeIndex !== null;

  if (isUndoShortcut || isCancelShortcut) {
    event.preventDefault();
    undo();
  }

  const tool = toolShortcuts[key];
  if (tool !== undefined && !hasModifier) {
    selectTool(tool);
  }
  const color = colorShortcuts[key];
  if (color !== undefined && !hasModifier) {
    selectColor(color);
  }

  if (isDeleteShortcut) {
    event.preventDefault();
    deleteSelectedShape();
  }
});

function applyScene(scene: SceneV1): boolean {
  const newShapes = scene.shapes;
  const shapesAreEqual =
    JSON.stringify(shapes) === JSON.stringify(newShapes);

  if (shapesAreEqual) {
    return false;
  }

  undoStack.push([...shapes]);
  resetDrawingState();
  shapes.splice(0, shapes.length, ...newShapes);
  saveShapesToUrl(shapes);
  render();
  return true;
}

initializeAiEditor({
  getScene: () => ({ version: 1, shapes }),
  applyScene,
});

render();
void document.fonts.ready.then(render);
