export type SocketHandle = { connected: boolean };

export function connectSocket(): SocketHandle {
  return { connected: false };
}