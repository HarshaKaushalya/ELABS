import { pool } from "../../db/mysql";
import { getIO } from "../../realtime/socket";
import { SOCKET_EVENTS } from "../../realtime/events";
import { createNotification } from "../notifications/notifications.service";

/**
 * Send a broadcast message to ALL students, a specific GROUP, or a single USER.
 * Also creates notifications for each recipient and pushes via Socket.IO.
 */
export async function sendMessage(
  senderId: number,
  subject: string,
  body: string,
  targetType: "ALL" | "GROUP" | "USER",
  targetGroup?: string,
  targetUser?: number
): Promise<number> {
  // Insert the broadcast message
  const [msgResult] = await pool.query(
    `INSERT INTO broadcast_messages (sender_id, subject, body, target_type, target_group, target_user)
     VALUES (:sid, :subject, :body, :targetType, :targetGroup, :targetUser)`,
    {
      sid: senderId,
      subject,
      body,
      targetType,
      targetGroup: targetGroup ?? null,
      targetUser: targetUser ?? null,
    }
  );
  const messageId = (msgResult as any).insertId as number;

  // Resolve recipient user IDs
  let recipientIds: number[] = [];

  if (targetType === "ALL") {
    const [rows] = await pool.query(
      `SELECT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.name = 'STUDENT' AND u.is_active = 1`
    );
    recipientIds = (rows as any[]).map((r) => r.id);
  } else if (targetType === "GROUP" && targetGroup) {
    const [rows] = await pool.query(
      `SELECT u.id FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       WHERE sp.group_code = :group AND u.is_active = 1`,
      { group: targetGroup }
    );
    recipientIds = (rows as any[]).map((r) => r.id);
  } else if (targetType === "USER" && targetUser) {
    recipientIds = [targetUser];
  }

  // Get sender name for the notification
  const [senderRows] = await pool.query(
    `SELECT full_name FROM users WHERE id = :sid`,
    { sid: senderId }
  );
  const senderName = (senderRows as any[])[0]?.full_name ?? "Admin";

  // Bulk Insert & push socket
  if (recipientIds.length > 0) {
    // Bulk message_recipients
    const mrValues = recipientIds.map((uid) => [messageId, uid]);
    await pool.query(
      `INSERT IGNORE INTO message_recipients (message_id, user_id) VALUES ?`,
      [mrValues]
    );

    // Bulk notifications
    const notifType = "BROADCAST";
    const notifTitle = `📢 ${subject}`;
    const metaObj = { messageId, senderName };
    const metaStr = JSON.stringify(metaObj);
    const notifValues = recipientIds.map((uid) => [uid, notifType, notifTitle, body, metaStr]);

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, meta) VALUES ?`,
      [notifValues]
    );

    // Socket payloads
    const payload = {
      id: messageId,
      subject,
      body,
      senderName,
      targetType,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    const notifPayload = {
      type: notifType,
      title: notifTitle,
      body,
      meta: metaObj,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Fast socket emit
    for (const uid of recipientIds) {
      try {
        getIO().to(`user:${uid}`).emit(SOCKET_EVENTS.NEW_MESSAGE, payload);
        getIO().to(`user:${uid}`).emit(SOCKET_EVENTS.NEW_NOTIFICATION, { ...notifPayload, userId: uid });
      } catch {
        // ignore if socket not ready
      }
    }
  }

  return messageId;
}
