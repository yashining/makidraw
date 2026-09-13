import type { ShapeColor } from "./model";

export const drawingColors: Record<ShapeColor, string> = {
  black: "#3d3947",
  red: "#c65361",
  blue: "#4f69b3",
  green: "#4f8062",
};

export const selectionColor = "#7167c7";
export const drawingTextFontFamily = '"Kalam", cursive';
export const drawingTextFontSize = 24;
export const drawingTextFont =
  `400 ${drawingTextFontSize}px ${drawingTextFontFamily}`;
