import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/mysql";
import { requireAuth, AuthedRequest } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";
import { sendMessage } from "./messages.service";

const router = Router();

/** POST /messages/send — admin sends broadcast or targeted message */
router.post(
  "/send",
  requireAuth,
  requirePermission("admin:manage"),
  async (req: AuthedRequest, res) => {
    const body = z.object({
      subject:     z.string().min(1).max(255),
      body:        z.string().min(1),
      targetType:  z.enum(["ALL", "GROUP", "USER"]),
      targetGroup: z.string().optional(),
      targetUser:  z.coerce.number().optional(),
    }).parse(req.body);

    const messageId = await sendMessage(
      req.user!.id,
      body.subject,
      body.body,
      body.targetType,
      body.targetGroup,
      body.targetUser
    );

    res.json({ ok: true, messageId });
  }
);

/** GET /messages/inbox — authenticated user's messages */
router.get("/inbox", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const [rows] = await pool.query(
    `SELECT
       bm.id, bm.subject, bm.body, bm.target_type AS targetType,
       bm.created_at AS createdAt,
       u.full_name AS senderName,
       mr.is_read AS isRead, mr.read_at AS readAt
     FROM broadcast_messages bm
     JOIN message_recipients mr ON mr.message_id = bm.id AND mr.user_id = :uid
     JOIN users u ON u.id = bm.sender_id
     ORDER BY bm.created_at DESC
     LIMIT 50`,
    { uid }
  );
  const unreadCount = (rows as any[]).filter((r) => !r.isRead).length;
  res.json({ messages: rows, unreadCount });
});

/** GET /messages/sent — admin only, see sent broadcasts */
router.get(
  "/sent",
  requireAuth,
  requirePermission("admin:manage"),
  async (req: AuthedRequest, res) => {
    const uid = req.user!.id;
    const [rows] = await pool.query(
      `SELECT
         bm.id, bm.subject, bm.body, bm.target_type AS targetType,
         bm.target_group AS targetGroup, bm.target_user AS targetUser,
         bm.created_at AS createdAt,
         COUNT(mr.user_id) AS recipientCount,
         SUM(mr.is_read) AS readCount
       FROM broadcast_messages bm
       LEFT JOIN message_recipients mr ON mr.message_id = bm.id
       WHERE bm.sender_id = :uid
       GROUP BY bm.id
       ORDER BY bm.created_at DESC
       LIMIT 50`,
      { uid }
    );
    res.json({ messages: rows });
  }
);

/** PATCH /messages/:id/read — mark a message as read */
router.patch("/:id/read", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  await pool.query(
    `UPDATE message_recipients SET is_read = 1, read_at = NOW()
     WHERE message_id = :mid AND user_id = :uid`,
    { mid: req.params.id, uid }
  );
  res.json({ ok: true });
});

/** GET /messages/groups — list available lab groups for targeting */
router.get(
  "/groups",
  requireAuth,
  requirePermission("admin:manage"),
  async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT DISTINCT group_code FROM student_profiles ORDER BY group_code`
    );
    res.json({ groups: (rows as any[]).map((r) => r.group_code) });
  }
);

/** GET /messages/students — list students for individual targeting */
router.get(
  "/students",
  requireAuth,
  requirePermission("admin:manage"),
  async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name AS fullName, u.email, sp.reg_number AS regNumber, sp.group_code AS groupCode
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       ORDER BY sp.group_code, u.full_name
       LIMIT 200`
    );
    res.json({ students: rows });
  }
);

export default router;
