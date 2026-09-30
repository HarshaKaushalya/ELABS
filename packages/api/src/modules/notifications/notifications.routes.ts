import { Router } from "express";
import { pool } from "../../db/mysql";
import { requireAuth, AuthedRequest } from "../auth/auth.middleware";

const router = Router();

/** GET /notifications — unread first, last 50 */
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const [rows] = await pool.query(
    `SELECT id, type, title, body, is_read AS isRead, read_at AS readAt,
            meta, created_at AS createdAt
     FROM notifications
     WHERE user_id = :uid
     ORDER BY is_read ASC, created_at DESC
     LIMIT 50`,
    { uid }
  );
  const unreadCount = (rows as any[]).filter((r) => !r.isRead).length;
  res.json({ notifications: rows, unreadCount });
});

/** PATCH /notifications/:id/read */
router.patch("/:id/read", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  await pool.query(
    `UPDATE notifications SET is_read = 1, read_at = NOW()
     WHERE id = :id AND user_id = :uid`,
    { id: req.params.id, uid }
  );
  res.json({ ok: true });
});

/** PATCH /notifications/read-all */
router.patch("/read-all", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  await pool.query(
    `UPDATE notifications SET is_read = 1, read_at = NOW()
     WHERE user_id = :uid AND is_read = 0`,
    { uid }
  );
  res.json({ ok: true });
});

import { getIO } from "../../realtime/socket";
import { SOCKET_EVENTS } from "../../realtime/events";

/** POST /notifications/webhook — Internal route for Vision Service to trigger real-time alerts */
router.post("/webhook", async (req, res) => {
  const { type, message, metadata } = req.body;
  
  // Broadcast to all admins and technicians
  const io = getIO();
  io.to("role:admin").to("role:technician").emit("SYSTEM_ALERT", {
    type,
    message,
    metadata,
    timestamp: new Date().toISOString()
  });
  
  res.json({ ok: true, broadcasted: true });
});

export default router;
