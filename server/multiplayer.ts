import type { Server } from "node:http";
import { type WebSocket, WebSocketServer } from "ws";

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
