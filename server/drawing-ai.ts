import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { AiEditRequest } from "../shared/ai-edit-contract.js";
import {
  type SceneV1,
  SceneV1Schema,
} from "../shared/scene-contract.js";

export const DRAWING_EDITOR_INSTRUCTIONS = `
You are the drawing editor for MakiDraw.

Apply the user's instruction to the current scene and return the complete
resulting scene. Return the entire scene, not a list of changes.

Drawing rules:
- The canvas is 800 pixels wide and 500 pixels high.
- The origin (0, 0) is the top-left corner.
- x increases to the right and y increases downward.
- Keep shapes within the canvas where practical.
- Preserve shapes that the user did not ask to change.
- A line's start and end are its two endpoints.
- A rectangle's start and end are opposite corners.
- An ellipse fits inside the rectangle defined by start and end.
- When the user asks for a circle, create an ellipse with equal width and height.
- A text shape's position is its top-left corner.
- Keep text on one line.
- Shapes are drawn in array order: the first is at the back and the last is at
  the front.
- Add new shapes at the front unless the user asks otherwise.
- When placement or size is unspecified, choose a clear, balanced layout.
- Follow the required output schema exactly.
- Do not include explanations or commentary.
`;

export class DrawingAiConfigurationError extends Error {}

export async function editDrawingWithAi(
  request: AiEditRequest,
): Promise<SceneV1> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new DrawingAiConfigurationError("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";

  const response = await openai.responses.parse({
    model,
    instructions: DRAWING_EDITOR_INSTRUCTIONS,
    input: JSON.stringify({
      instruction: request.prompt,
      currentScene: request.scene,
    }),
    text: {
      format: zodTextFormat(SceneV1Schema, "drawing_scene"),
    },
    reasoning: { effort: "low" },
    store: false,
  });

  if (!response.output_parsed) {
    throw new Error("The model did not return a drawing scene.");
  }

  return response.output_parsed;
}
