import { z } from "zod";
import { PointSchema } from "../src/model.js";
import { SceneV1Schema } from "./ai-edit-contract.js";

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

export const SceneUpdatedMessageSchema = z.strictObject({
  type: z.literal("scene-updated"),
  scene: SceneV1Schema,
});

export type SceneUpdatedMessage = z.infer<
  typeof SceneUpdatedMessageSchema
>;

export const ServerMultiplayerMessageSchema =
  z.discriminatedUnion("type", [
    RemotePointerMoveMessageSchema,
    ParticipantLeftMessageSchema,
    SceneUpdatedMessageSchema,
  ]);

export type ServerMultiplayerMessage = z.infer<
  typeof ServerMultiplayerMessageSchema
>;

export const ClientMultiplayerMessageSchema =
  z.discriminatedUnion("type", [
    PointerMoveMessageSchema,
    SceneUpdatedMessageSchema,
  ]);

export type ClientMultiplayerMessage = z.infer<
  typeof ClientMultiplayerMessageSchema
>;
