"use client";

/**
 * useSocket — lightweight Socket.IO hook for ELABS web.
 * Authenticates with the API using the stored JWT token,
 * joins the user's personal room and role rooms.
 */

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return _socket;
}

export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    socket.off("connected");
    socket.on("connected", () => {
      // Authenticate and join rooms
      socket.emit("join_room", { token });
    });

    return () => {
      // Don't disconnect on unmount — keep persistent connection
    };
  }, [token]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const socket = getSocket();
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    getSocket().emit(event, data);
  }, []);

  return { on, emit, socket: socketRef };
}