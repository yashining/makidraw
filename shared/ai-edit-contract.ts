import { isShape, type Shape } from "../src/model.js";

export type SceneV1 = {
  version: 1;
  shapes: Shape[];
};

export type AiEditRequest = {
  prompt: string;
  scene: SceneV1;
};

export type AiEditResponse = {
  scene: SceneV1;
};

export type ApiErrorResponse = {
  error: string;
};

export type AiEditRequestValidation =
  | { ok: true; value: AiEditRequest }
  | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isSceneV1(value: unknown): value is SceneV1 {
  return (
    isObject(value) &&
    value.version === 1 &&
    Array.isArray(value.shapes) &&
    value.shapes.every(isShape)
  );
}

export function validateAiEditRequest(
  value: unknown,
): AiEditRequestValidation {
  if (!isObject(value) || typeof value.prompt !== "string") {
    return { ok: false, error: "A prompt string is required." };
  }

  if (value.prompt.trim().length === 0) {
    return { ok: false, error: "The prompt cannot be empty." };
  }

  if (!isSceneV1(value.scene)) {
    return { ok: false, error: "A valid version 1 scene is required." };
  }

  return {
    ok: true,
    value: {
      prompt: value.prompt,
      scene: value.scene,
    },
  };
}

export function isAiEditResponse(value: unknown): value is AiEditResponse {
  return isObject(value) && isSceneV1(value.scene);
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isObject(value) && typeof value.error === "string";
}
