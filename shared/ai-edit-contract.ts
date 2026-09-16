import { z } from "zod";
import { SceneV1Schema } from "./scene-contract.js";

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
