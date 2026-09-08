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
