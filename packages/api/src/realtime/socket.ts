import type { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { SOCKET_EVENTS } from "./events";
import { verifyAccessToken } from "../modules/auth/jwt";

let _io: Server | null = null;

/** Return the Socket.IO server singleton (must call attachSocket first). */
export function getIO(): Server {
  if (!_io) throw new Error("Socket.IO not initialised yet");
  return _io;
}

export function attachSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    // Expect client to emit { token } immediately after connecting
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (data: { token?: string }) => {
      if (!data?.token) return;

      try {
        const payload = verifyAccessToken(data.token);
        const userId = String(payload.sub);

        // Join personal room + role room (fetched from JWT if included, else skip role room)
        socket.join(`user:${userId}`);

        // If token contains roles, join each role room
        const roles = (payload as any).roles as string[] | undefined;
        if (Array.isArray(roles)) {
          for (const role of roles) {
            socket.join(`role:${role}`);
          }
        }

        socket.emit(SOCKET_EVENTS.CONNECTED, {
          id: socket.id,
          userId,
          message: "Authenticated and joined rooms",
        });
      } catch {
        socket.emit(SOCKET_EVENTS.CONNECTED, {
          id: socket.id,
          message: "Anonymous connection (no auth)",
        });
      }
    });

    // Unauthenticated fallback welcome
    socket.emit(SOCKET_EVENTS.CONNECTED, {
      id: socket.id,
      message: "Connected — send join_room with your token",
    });
  });

  _io = io;
  return io;
}