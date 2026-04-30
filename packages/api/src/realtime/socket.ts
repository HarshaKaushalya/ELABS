import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { SOCKET_EVENTS } from "./events";

export function attachSocket(server: HttpServer): Server {
  const io = new Server(server, { cors: { origin: "*" } });
  io.on("connection", (socket) => {
    socket.emit(SOCKET_EVENTS.CONNECTED, { id: socket.id, message: "Socket connected" });
  });
  return io;
}