import express from "express";
import { createServer } from "node:http";
import {
  type AiEditResponse,
  type ApiErrorResponse,
  validateAiEditRequest,
} from "../shared/ai-edit-contract.js";
import {
  DrawingAiConfigurationError,
  editDrawingWithAi,
} from "./drawing-ai.js";
import { initializeMultiplayerServer } from "./multiplayer.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "50kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/drawing/aiedit", async (request, response) => {
  const accessToken = process.env.AI_ACCESS_TOKEN;

  if (!accessToken) {
    const errorResponse: ApiErrorResponse = {
      error: "AI editing is not configured.",
    };
    response.status(503).json(errorResponse);
    return;
  }

  if (request.get("Authorization") !== `Bearer ${accessToken}`) {
    const errorResponse: ApiErrorResponse = {
      error: "The access token is invalid.",
    };
    response.status(401).json(errorResponse);
    return;
  }

  const body: unknown = request.body;
  const validation = validateAiEditRequest(body);

  if (!validation.ok) {
    const errorResponse: ApiErrorResponse = { error: validation.error };
    response.status(400).json(errorResponse);
    return;
  }

  try {
    const scene = await editDrawingWithAi(validation.value);
    const responseBody: AiEditResponse = { scene };
    response.json(responseBody);
  } catch (error) {
    console.error("AI drawing edit failed:", error);

    const errorResponse: ApiErrorResponse = {
      error:
        error instanceof DrawingAiConfigurationError
          ? "AI editing is not configured."
          : "The AI could not edit the drawing.",
    };
    const status = error instanceof DrawingAiConfigurationError ? 503 : 502;
    response.status(status).json(errorResponse);
  }
});

app.use(express.static("dist"));

const server = createServer(app);

initializeMultiplayerServer(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
