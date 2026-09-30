// Socket.IO events registry
export const SOCKET_EVENTS = {
  CONNECTED:        "connected",
  NOTIFICATION:     "notification",
  LAB_PRESENCE:     "lab:presence",
  NEW_MESSAGE:      "new_message",
  NEW_NOTIFICATION: "new_notification",
  JOIN_ROOM:        "join_room",
  MESSAGE_READ:     "message_read",
} as const;