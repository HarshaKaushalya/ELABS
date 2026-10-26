import { pool } from "../../db/mysql";
import { getIO } from "../../realtime/socket";
import { SOCKET_EVENTS } from "../../realtime/events";

export type NotificationType =
  | "BORROW_REQUESTED"
  | "BORROW_APPROVED"
  | "BORROW_REJECTED"
  | "BORROW_RETURNED"
  | "BORROW_OVERDUE"
  | "LAB_REMINDER"
  | "ASSIGNMENT_PUBLISHED"
  | "ASSIGNMENT_GRADED"
  | "FIRE_ALERT"
  | "BROADCAST"
  | "SYSTEM";

/**
 * Create a notification for one user and push it over Socket.IO in real time.
 */
export async function createNotification(
  userId: number,
  type: NotificationType | string,
  title: string,
  body: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
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

    // Push to the user's personal WebSocket room
    try {
      getIO().to(`user:${userId}`).emit(SOCKET_EVENTS.NEW_NOTIFICATION, notif);
    } catch {
      // Socket may not be ready in tests or background script — ignore safely
    }
  } catch (err) {
    console.error(`Failed to create notification for user ${userId}:`, err);
  }
}

/**
 * Notify all users holding any of the specified roles (e.g. ['SYSTEM_ADMIN', 'TECHNICIAN']).
 */
export async function notifyUsersByRole(
  roleNames: string[],
  type: NotificationType | string,
  title: string,
  body: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const [userRows] = await pool.query(
      `
      SELECT DISTINCT u.id
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.name IN (?)
      `,
      [roleNames]
    );

    const users = userRows as { id: number }[];
    for (const u of users) {
      await createNotification(u.id, type, title, body, meta);
    }
  } catch (err) {
    console.error("notifyUsersByRole failed:", err);
  }
}
