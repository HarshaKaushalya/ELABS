import { pool } from "../../db/mysql";
import { getIO } from "../../realtime/socket";
import { SOCKET_EVENTS } from "../../realtime/events";

export type NotificationType =
  | "BORROW_APPROVED"
  | "BORROW_OVERDUE"
  | "BORROW_RETURNED"
  | "LAB_REMINDER"
  | "FIRE_ALERT"
  | "BROADCAST"
  | "SYSTEM";

/**
 * Create a notification for one user and push it over Socket.IO.
 */
export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  body: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, meta)
     VALUES (:uid, :type, :title, :body, :meta)`,
    { uid: userId, type, title, body, meta: meta ? JSON.stringify(meta) : null }
  );

  const notif = {
    id: (result as any).insertId,
    userId,
    type,
    title,
    body,
    meta,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  // Push to the user's personal room
  try {
    getIO().to(`user:${userId}`).emit(SOCKET_EVENTS.NEW_NOTIFICATION, notif);
  } catch {
    // Socket may not be ready in tests — ignore
  }
}
