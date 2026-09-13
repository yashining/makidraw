import express from "express";
import {
  type AiEditResponse,
  type ApiErrorResponse,
  validateAiEditRequest,
} from "../shared/ai-edit-contract.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "50kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/drawing/aiedit", (request, response) => {
  const body: unknown = request.body;
  const validation = validateAiEditRequest(body);

  if (!validation.ok) {
    const errorResponse: ApiErrorResponse = { error: validation.error };
    response.status(400).json(errorResponse);
    return;
  }

  const responseBody: AiEditResponse = { scene: validation.value.scene };
  response.json(responseBody);
});

app.use(express.static("dist"));

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
