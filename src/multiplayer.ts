export function connectToMultiplayerRoom(roomId: string): WebSocket {
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

  return socket;
}
