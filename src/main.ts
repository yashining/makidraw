import "./style.css";

const canvas = document.querySelector("#drawing");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Drawing canvas was not found");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Could not get a drawing context");
}

context.strokeStyle = "#302d36";
context.lineWidth = 2;

type Point = { x: number; y: number };

let startPoint: Point | null = null;

canvas.addEventListener("click", (event) => {
  const bounds = canvas.getBoundingClientRect();
  const point = {
    x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
    y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
  };

  if (startPoint === null) {
    startPoint = point;
    return;
  }

  context.beginPath();
  context.moveTo(startPoint.x, startPoint.y);
  context.lineTo(point.x, point.y);
  context.stroke();

  startPoint = null;
});
