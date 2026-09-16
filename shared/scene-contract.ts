import { z } from "zod";
import { ShapeSchema } from "../src/model.js";

export const SceneV1Schema = z.strictObject({
  version: z.literal(1),
  shapes: z.array(ShapeSchema),
});

export type SceneV1 = z.infer<typeof SceneV1Schema>;

export function isSceneV1(value: unknown): value is SceneV1 {
  return SceneV1Schema.safeParse(value).success;
}
