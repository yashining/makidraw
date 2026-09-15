import { z } from "zod";
import { PointSchema } from "../src/model.js";

export const PointerMoveMessageSchema = z.strictObject({
  type: z.literal("pointer-move"),
  position: PointSchema,
});

export type PointerMoveMessage = z.infer<typeof PointerMoveMessageSchema>;
