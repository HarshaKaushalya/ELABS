import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/mysql";
import { requireAuth, AuthedRequest } from "../auth/auth.middleware";
import { sendMessage } from "./messages.service";

const router = Router();

/** Helper: check if user has a permission */
async function hasPermission(userId: number, code: string): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT 1 FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     JOIN role_permissions rp ON rp.role_id = r.id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = :userId AND p.code = :code LIMIT 1`,
    { userId, code }
  );
  return (rows as any[]).length > 0;
}

/**
 * POST /messages/send
 * - Admin/Staff: can send to ALL, GROUP, or USER
 * - Students: can only send direct (USER) messages
 */
router.post("/send", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      subject:     z.string().min(1).max(255),
      body:        z.string().min(1),
      targetType:  z.enum(["ALL", "GROUP", "USER"]),
      targetGroup: z.string().optional(),
      targetUser:  z.coerce.number().optional(),
    }).parse(req.body);

    const isAdmin = await hasPermission(req.user!.id, "admin:manage");

    // Students can only send direct messages
    if (!isAdmin && body.targetType !== "USER") {
      return res.status(403).json({ error: "Students can only send direct messages" });
    }
    if (!isAdmin && body.targetType === "USER" && !body.targetUser) {
      return res.status(400).json({ error: "Recipient is required" });
    }

    const messageId = await sendMessage(
      req.user!.id,
      body.subject,
      body.body,
      body.targetType,
      body.targetGroup,
      body.targetUser
    );

    return res.json({ ok: true, messageId });
  } catch (err) {
    next(err);
  }
});

/** GET /messages/inbox — authenticated user's received messages */
router.get("/inbox", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const uid = req.user!.id;
    const [rows] = await pool.query(
      `SELECT
         bm.id, bm.subject, bm.body, bm.target_type AS targetType,
         bm.target_group AS targetGroup,
         bm.created_at AS createdAt,
         u.full_name AS senderName, u.id AS senderId,
         mr.is_read AS isRead, mr.read_at AS readAt
       FROM broadcast_messages bm
       JOIN message_recipients mr ON mr.message_id = bm.id AND mr.user_id = :uid
       JOIN users u ON u.id = bm.sender_id
       ORDER BY bm.created_at DESC
       LIMIT 100`,
      { uid }
    );
    const msgs = rows as any[];
    const unreadCount = msgs.filter(r => !r.isRead).length;
    res.json({ messages: msgs, unreadCount });
  } catch (err) { next(err); }
});

/** GET /messages/sent — anyone can see their sent messages */
router.get("/sent", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const uid = req.user!.id;
    const [rows] = await pool.query(
      `SELECT
         bm.id, bm.subject, bm.body, bm.target_type AS targetType,
         bm.target_group AS targetGroup, bm.target_user AS targetUser,
         bm.created_at AS createdAt,
         COUNT(mr.user_id) AS recipientCount,
         COALESCE(SUM(mr.is_read), 0) AS readCount
       FROM broadcast_messages bm
       LEFT JOIN message_recipients mr ON mr.message_id = bm.id
       WHERE bm.sender_id = :uid
       GROUP BY bm.id
       ORDER BY bm.created_at DESC
       LIMIT 100`,
      { uid }
    );
    res.json({ messages: rows });
  } catch (err) { next(err); }
});

/** PATCH /messages/:id/read — mark a message as read */
router.patch("/:id/read", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const uid = req.user!.id;
    await pool.query(
      `UPDATE message_recipients SET is_read = 1, read_at = NOW()
       WHERE message_id = :mid AND user_id = :uid`,
      { mid: req.params.id, uid }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/** PATCH /messages/mark-all-read — mark all inbox messages as read */
router.patch("/mark-all-read", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const uid = req.user!.id;
    await pool.query(
      `UPDATE message_recipients SET is_read = 1, read_at = NOW()
       WHERE user_id = :uid AND is_read = 0`,
      { uid }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/** GET /messages/contacts — people the current user can message */
router.get("/contacts", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const uid = req.user!.id;
    const [rows] = await pool.query(
      `SELECT DISTINCT u.id, u.full_name AS fullName, u.email,
              r.name AS role,
              sp.reg_number AS regNumber,
              sp.group_code AS groupCode
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.is_active = 1
         AND u.id != :uid
         AND r.name IN ('SYSTEM_ADMIN','MODULE_COORDINATOR','LECTURER','STUDENT')
       ORDER BY
         CASE r.name
           WHEN 'SYSTEM_ADMIN'        THEN 1
           WHEN 'MODULE_COORDINATOR'  THEN 2
           WHEN 'LECTURER'            THEN 3
           ELSE 4
         END, u.full_name
       LIMIT 300`,
      { uid }
    );
    res.json({ contacts: rows });
  } catch (err) { next(err); }
});

/** GET /messages/groups — lab groups (admin only) */
router.get("/groups", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const isAdmin = await hasPermission(req.user!.id, "admin:manage");
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
    const [rows] = await pool.query(
      `SELECT DISTINCT group_code FROM student_profiles ORDER BY group_code`
    );
    res.json({ groups: (rows as any[]).map(r => r.group_code) });
  } catch (err) { next(err); }
});

/** GET /messages/students — student list (admin only) */
router.get("/students", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const isAdmin = await hasPermission(req.user!.id, "admin:manage");
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name AS fullName, u.email,
              sp.reg_number AS regNumber, sp.group_code AS groupCode
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       ORDER BY sp.group_code, u.full_name
       LIMIT 300`
    );
    res.json({ students: rows });
  } catch (err) { next(err); }
});

export default router;
