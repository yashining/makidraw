import { z } from "zod";
import { ShapeSchema } from "../src/model.js";

export const SceneV1Schema = z.strictObject({
  version: z.literal(1),
  shapes: z.array(ShapeSchema),
});

export type SceneV1 = z.infer<typeof SceneV1Schema>;

const PromptSchema = z
  .string({ error: "A prompt string is required." })
  .refine((prompt) => prompt.trim().length > 0, {
    error: "The prompt cannot be empty.",
  });

export const AiEditRequestSchema = z.strictObject({
  prompt: PromptSchema,
  scene: SceneV1Schema,
});

export type AiEditRequest = z.infer<typeof AiEditRequestSchema>;

export const AiEditResponseSchema = z.strictObject({
  scene: SceneV1Schema,
});

export type AiEditResponse = z.infer<typeof AiEditResponseSchema>;

export const ApiErrorResponseSchema = z.strictObject({
  error: z.string(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export type AiEditRequestValidation =
  | { ok: true; value: AiEditRequest }
  | { ok: false; error: string };

export function isSceneV1(value: unknown): value is SceneV1 {
  return SceneV1Schema.safeParse(value).success;
}

export function validateAiEditRequest(
  value: unknown,
): AiEditRequestValidation {
  const result = AiEditRequestSchema.safeParse(value);

  if (result.success) {
    return { ok: true, value: result.data };
  }

  const promptIssue = result.error.issues.find(
    (issue) => issue.path[0] === "prompt",
  );

  return {
    ok: false,
    error: promptIssue?.message ?? "A valid version 1 scene is required.",
  };
}
