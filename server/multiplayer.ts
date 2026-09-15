import type { Server } from "node:http";
import { type WebSocket, WebSocketServer } from "ws";
import { PointerMoveMessageSchema } from "../shared/multiplayer-contract.js";

const maxRoomSize = 4;
const roomIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function initializeMultiplayerServer(server: Server) {
  const rooms = new Map<string, Set<WebSocket>>();
  const webSocketServer = new WebSocketServer({
    server,
    path: "/api/multiplayer",
    maxPayload: 4 * 1024,
    perMessageDeflate: false,
  });

  webSocketServer.on("connection", (socket, request) => {
    const requestUrl = new URL(
      request.url ?? "",
      `http://${request.headers.host ?? "localhost"}`,
    );
    const roomId = requestUrl.searchParams.get("room");

    if (roomId === null || !roomIdPattern.test(roomId)) {
      socket.close(1008, "A valid room ID is required.");
      return;
    }

    let room = rooms.get(roomId);

    if (room === undefined) {
      room = new Set<WebSocket>();
      rooms.set(roomId, room);
    }

    if (room.size >= maxRoomSize) {
      socket.close(
        4001,
        `Maximum room size of ${maxRoomSize} reached.`,
      );
      return;
    }

    room.add(socket);
    console.log(
      `[multiplayer] joined room ${roomId.slice(0, 8)} (${room.size} connected)`,
    );

    socket.on("error", (error) => {
      console.error(
        `[multiplayer] socket error in room ${roomId.slice(0, 8)}:`,
        error,
      );
    });

    socket.on("message", (data, isBinary) => {
      if (isBinary) {
        socket.close(1003, "Multiplayer messages must be text.");
        return;
      }

      let message: unknown;

      try {
        message = JSON.parse(data.toString());
      } catch {
        socket.close(1007, "Multiplayer messages must be valid JSON.");
        return;
      }

      const result = PointerMoveMessageSchema.safeParse(message);

      if (!result.success) {
        socket.close(1008, "Unsupported multiplayer message.");
        return;
      }

      console.log(
        `[multiplayer] pointer in room ${roomId.slice(0, 8)}`,
        result.data.position,
      );
    });

    socket.on("close", () => {
      room.delete(socket);

      if (room.size === 0) {
        rooms.delete(roomId);
      }

      console.log(
        `[multiplayer] left room ${roomId.slice(0, 8)} (${room.size} connected)`,
      );
    });
  });
}
