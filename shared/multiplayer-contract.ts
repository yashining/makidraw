import { z } from "zod";
import { PointSchema } from "../src/model.js";

export const PointerMoveMessageSchema = z.strictObject({
  type: z.literal("pointer-move"),
  position: PointSchema,
});

export type PointerMoveMessage = z.infer<typeof PointerMoveMessageSchema>;

export const RemotePointerMoveMessageSchema = z.strictObject({
  type: z.literal("pointer-move"),
  participantId: z.string().uuid(),
  position: PointSchema,
});

export type RemotePointerMoveMessage = z.infer<
  typeof RemotePointerMoveMessageSchema
>;

export const ParticipantLeftMessageSchema = z.strictObject({
  type: z.literal("participant-left"),
  participantId: z.string().uuid(),
});

export type ParticipantLeftMessage = z.infer<
  typeof ParticipantLeftMessageSchema
>;

export const ServerMultiplayerMessageSchema =
  z.discriminatedUnion("type", [
    RemotePointerMoveMessageSchema,
    ParticipantLeftMessageSchema,
  ]);
