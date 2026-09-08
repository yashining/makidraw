import "./style.css";

const canvasElement = document.querySelector("#drawing");

if (!(canvasElement instanceof HTMLCanvasElement)) {
  throw new Error("Drawing canvas was not found");
}

const canvas = canvasElement;
const drawingContext = canvas.getContext("2d");

if (!drawingContext) {
  throw new Error("Could not get a drawing context");
}

const context = drawingContext;

context.strokeStyle = "#302d36";
context.lineWidth = 2;

type Point = { x: number; y: number };
type Line = { start: Point; end: Point };
type EncodedLine = [number, number, number, number];
type DrawingData = {
  version: 1;
  lines: EncodedLine[];
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

function isDrawingData(value: unknown): value is DrawingData {
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

function removeDrawingFromUrl() {
  const urlWithoutFragment = window.location.pathname + window.location.search;

  window.history.replaceState(null, "", urlWithoutFragment);
}

function loadLinesFromUrl(): Line[] {
  const parameters = new URLSearchParams(window.location.hash.slice(1));
  const drawingJson = parameters.get("drawing");

  if (drawingJson === null) {
    return [];
  }

  try {
    const drawing: unknown = JSON.parse(drawingJson);

    if (!isDrawingData(drawing)) {
      removeDrawingFromUrl();
      return [];
    }

    return drawing.lines.map(([startX, startY, endX, endY]) => ({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
    }));
  } catch {
    removeDrawingFromUrl();
    return [];
  }
}

const lines = loadLinesFromUrl();
let startPoint: Point | null = null;
let cursorPoint: Point | null = null;

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

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const line of lines) {
    drawLine(line.start, line.end);
  }

  if (startPoint !== null && cursorPoint !== null) {
    drawLine(startPoint, cursorPoint);
  }
}

function updateUrl() {
  const drawing: DrawingData = {
    version: 1,
    lines: lines.map<EncodedLine>((line) => [
      Math.round(line.start.x),
      Math.round(line.start.y),
      Math.round(line.end.x),
      Math.round(line.end.y),
    ]),
  };
  const parameters = new URLSearchParams({
    drawing: JSON.stringify(drawing),
  });

  window.history.replaceState(null, "", `#${parameters.toString()}`);
}

canvas.addEventListener("click", (event) => {
  const point = getCanvasPoint(event);

  if (startPoint === null) {
    startPoint = point;
    cursorPoint = point;
    return;
  }

  lines.push({ start: startPoint, end: point });
  updateUrl();
  startPoint = null;
  cursorPoint = null;
  render();
});

canvas.addEventListener("mousemove", (event) => {
  if (startPoint === null) {
    return;
  }

  cursorPoint = getCanvasPoint(event);
  render();
});

canvas.addEventListener("mouseleave", () => {
  cursorPoint = null;
  render();
});

render();
