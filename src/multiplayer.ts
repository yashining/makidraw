import {
  ServerMultiplayerMessageSchema,
  type PointerMoveMessage,
  type SceneUpdatedMessage,
} from "../shared/multiplayer-contract";
import {
  type Point,
  type Shape,
  type SceneV1,
} from "../shared/scene-contract";

export type MultiplayerHandlers = {
  onPointerMove(participantId: string, position: Point): void;
  onSceneUpdate(scene: SceneV1): void;
  onParticipantLeft(participantId: string): void;
};

export type MultiplayerClient = {
  sendPointerPosition(position: Point): void;
  sendSceneUpdate(shapes: readonly Shape[]): void;
  disconnect(): void;
};

export function connectToMultiplayerRoom(
  roomId: string,
  handlers: MultiplayerHandlers,
): MultiplayerClient {
  const endpoint = new URL("/api/multiplayer", window.location.href);

  endpoint.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  endpoint.searchParams.set("room", roomId);

  console.log(`[multiplayer] connecting to room ${roomId}`);

  const socket = new WebSocket(endpoint);

  socket.addEventListener("open", () => {
    console.log(`[multiplayer] connected to room ${roomId}`);
  });

  socket.addEventListener("close", (event) => {
    console.log(`[multiplayer] disconnected from room ${roomId}`, {
      code: event.code,
      reason: event.reason,
    });
  });

  socket.addEventListener("error", () => {
    console.error(`[multiplayer] connection error in room ${roomId}`);
  });

  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") {
      return;
    }

    let message: unknown;

    try {
      message = JSON.parse(event.data);
    } catch {
      console.warn("Received invalid JSON");
      return;
    }

    const result = ServerMultiplayerMessageSchema.safeParse(message);

    if (!result.success) {
      console.warn("Received invalid multiplayer message");
      return;
    }

    switch (result.data.type) {
      case "pointer-move":
        handlers.onPointerMove(
          result.data.participantId,
          result.data.position,
        );
        break;

      case "scene-updated":
        handlers.onSceneUpdate(result.data.scene);
        break;

      case "participant-left":
        handlers.onParticipantLeft(result.data.participantId);
        break;
    }
  });

  return {
    sendPointerPosition(position) {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const message: PointerMoveMessage = {
        type: "pointer-move",
        position,
      };

      socket.send(JSON.stringify(message));
    },
    sendSceneUpdate(shapes) {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const scene: SceneV1 = {
        version: 1,
        shapes: [...shapes],
      };
      const message: SceneUpdatedMessage = {
        type: "scene-updated",
        scene,
      };

      socket.send(JSON.stringify(message));
    },
    disconnect() {
      socket.close(1000, "Left shared drawing");
    },
  };
}
