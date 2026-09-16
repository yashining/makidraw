import {
  RemotePointerMoveMessageSchema,
  type PointerMoveMessage,
  type RemotePointerMoveMessage,
} from "../shared/multiplayer-contract";
import type { Point } from "./model";

type RemotePointerMoveHandler = (
  message: RemotePointerMoveMessage,
) => void;

export type MultiplayerClient = {
  sendPointerPosition(position: Point): void;
  disconnect(): void;
};

export function connectToMultiplayerRoom(
  roomId: string,
  onRemotePointerMove: RemotePointerMoveHandler,
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

    const result = RemotePointerMoveMessageSchema.safeParse(message);
    if (!result.success) {
      console.warn("Received invalid multiplayer message");
      return;
    }

    onRemotePointerMove(result.data);
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
    disconnect() {
      socket.close(1000, "Left shared drawing");
    },
  };
}
