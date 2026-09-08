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

const lines: Line[] = [];
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

canvas.addEventListener("click", (event) => {
  const point = getCanvasPoint(event);

  if (startPoint === null) {
    startPoint = point;
    cursorPoint = point;
    return;
  }

  lines.push({ start: startPoint, end: point });
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
