import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";
import { pool } from "../../db/mysql";
import { createNotification, notifyUsersByRole } from "../notifications/notifications.service";
import { findDatasheet } from "../ai/datasheets.data";

const router = Router();

// Upload directories for equipment pictures & datasheets
const equipUploadDir = path.join(process.cwd(), "uploads", "equipment");
const datasheetUploadDir = path.join(process.cwd(), "uploads", "datasheets");
try {
  if (!fs.existsSync(equipUploadDir)) fs.mkdirSync(equipUploadDir, { recursive: true });
  if (!fs.existsSync(datasheetUploadDir)) fs.mkdirSync(datasheetUploadDir, { recursive: true });
} catch (e) {
  console.warn("Could not create media upload directories:", e);
}

const mediaStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "image") {
      cb(null, equipUploadDir);
    } else {
      cb(null, datasheetUploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Helper to get user roles
async function getUserRoles(userId: number, connOrPool: any): Promise<string[]> {
  const [rows] = await connOrPool.query(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = :uid`,
    { uid: userId }
  );
  return (rows as any[]).map((x: any) => x.name);
}

// MySQL DATETIME formatter helper ('YYYY-MM-DD HH:MM:SS')
const toMysqlDt = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace("T", " ").substring(0, 19);
  } catch {
    return null;
  }
};

// ── 1. Items List (Open to all authenticated users) ──────────────────────────
router.get("/items", requireAuth, async (req, res) => {
  const labId = req.query.labId ? Number(req.query.labId) : null;

  const [rows] = await pool.query(
    `
    SELECT i.id, i.lab_id as labId, i.elabs_tag as elabsTag, i.name, i.category, i.model, i.serial_no as serialNo,
           i.status, i.condition_note as conditionNote, i.image_url as imageUrl, i.datasheet_url as datasheetUrl,
           i.updated_at as updatedAt, l.name as labName
    FROM inventory_items i
    JOIN labs l ON l.id = i.lab_id
    WHERE (:labId IS NULL OR i.lab_id = :labId)
    ORDER BY i.updated_at DESC
    `,
    { labId }
  );

  const items = (rows as any[]).map((row) => {
    const ds = findDatasheet(row.model || row.name);
    return {
      ...row,
      datasheetUrl: row.datasheetUrl || ds?.datasheetUrl || ds?.manualUrl || null,
    };
  });

  res.json({ items });
});

// ── 2. Available Items for a Lab ─────────────────────────────────────────────
router.get("/available-items/:labId", requireAuth, async (req, res) => {
  const labId = Number(req.params.labId);
  if (!Number.isFinite(labId) || labId <= 0) return res.status(400).json({ error: "Invalid lab id" });
  const [rows] = await pool.query(
    `SELECT id, elabs_tag as elabsTag, name, category, model
     FROM inventory_items
     WHERE lab_id = :labId AND status = 'AVAILABLE'
     ORDER BY category ASC, name ASC`,
    { labId }
  );
  res.json({ items: rows });
});

// ── 3. Student Profile Lookup (by Reg Number, Email, or Index) ───────────────
router.get("/student-lookup", requireAuth, async (req, res) => {
  const query = String(req.query.indexNo ?? "").trim();
  if (!query) return res.status(400).json({ error: "Search term required" });

  const [rows] = await pool.query(
    `
    SELECT u.id, u.full_name as fullName,
           COALESCE(sp.reg_number, u.index_no) as indexNo,
           u.email, sp.group_code as groupCode
    FROM users u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.index_no = :query 
       OR sp.reg_number = :query 
       OR u.email = :query
       OR u.full_name LIKE CONCAT('%', :query, '%')
    LIMIT 1
    `,
    { query }
  );
  const student = (rows as any[])[0];
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ student });
});

// ── 4. Item Barcode Lookup ───────────────────────────────────────────────────
router.get("/items/barcode/:tag", requireAuth, async (req, res) => {
  const tag = req.params.tag;
  const [rows] = await pool.query(
    `
    SELECT i.id, i.lab_id as labId, i.elabs_tag as elabsTag, i.name, i.category, i.model, i.serial_no as serialNo,
           i.status, i.condition_note as conditionNote, i.image_url as imageUrl, i.datasheet_url as datasheetUrl,
           i.updated_at as updatedAt, l.name as labName
    FROM inventory_items i
    JOIN labs l ON l.id = i.lab_id
    WHERE i.elabs_tag = :tag
    `,
    { tag }
  );

  const item = (rows as any[])[0];
  if (!item) return res.status(404).json({ error: "Item not found" });

  const ds = findDatasheet(item.model || item.name);
  item.datasheetUrl = item.datasheetUrl || ds?.datasheetUrl || ds?.manualUrl || null;

  res.json({ item });
});

// ── 5. Student Submits a Borrow Request (2-Step Workflow) ────────────────────
router.post("/request-borrow", requireAuth, async (req: any, res) => {
  try {
    const raw = { ...req.body } as Record<string, unknown>;
    if (!raw.dueAt || raw.dueAt === "") raw.dueAt = null;
    if (!raw.purpose || raw.purpose === "") raw.purpose = null;

    const body = z.object({
      labId: z.number(),
      usageType: z.enum(["IN_LAB", "OUTSIDE_LAB"]).default("IN_LAB"),
      purpose: z.string().max(255).nullable().optional(),
      dueAt: z.string().nullable().optional(),
      elabsTags: z.array(z.string().min(3)).min(1),
    }).parse(raw);

    const studentUserId = req.user.id;

    // Outside-lab requires justification & due date
    if (body.usageType === "OUTSIDE_LAB" && (!body.purpose || !body.dueAt)) {
      return res.status(400).json({
        error: "Taking equipment outside the lab requires a stated purpose and return due date.",
      });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const placeholders = body.elabsTags.map(() => "?").join(", ");
      const [items] = await conn.query(
        `SELECT id, status, lab_id, elabs_tag, name FROM inventory_items WHERE elabs_tag IN (${placeholders}) FOR UPDATE`,
        body.elabsTags
      );

      const list = items as any[];
      if (list.length !== body.elabsTags.length) {
        const foundTags = list.map((i: any) => i.elabs_tag);
        const missing = body.elabsTags.filter((t) => !foundTags.includes(t));
        await conn.rollback(); conn.release();
        return res.status(400).json({ error: `Items not found: ${missing.join(", ")}` });
      }

      for (const it of list) {
        if (it.status !== "AVAILABLE") {
          await conn.rollback(); conn.release();
          return res.status(400).json({ error: `Item ${it.elabs_tag} (${it.name}) is currently ${it.status}.` });
        }
      }

      // Look up student profile for group code
      const [profileRows] = await conn.query(
        `SELECT group_code FROM student_profiles WHERE user_id = :uid LIMIT 1`,
        { uid: studentUserId }
      );
      const studentProfile = (profileRows as any[])[0];
      const groupCode = studentProfile?.group_code ?? null;

      // Default due dates
      let finalDueAt = toMysqlDt(body.dueAt);
      if (!finalDueAt) {
        if (body.usageType === "OUTSIDE_LAB") {
          finalDueAt = toMysqlDt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
        } else {
          const endOfDay = new Date();
          endOfDay.setHours(18, 0, 0, 0);
          if (endOfDay.getTime() <= Date.now()) {
            endOfDay.setDate(endOfDay.getDate() + 1);
          }
          finalDueAt = toMysqlDt(endOfDay.toISOString());
        }
      }

      // Create borrow request transaction (issued_by_user_id IS NULL until technician approves)
      const [txRes] = await conn.query(
        `
        INSERT INTO borrow_transactions
        (lab_id, borrower_type, borrower_user_id, borrower_group_code, issued_by_user_id, purpose, usage_type, due_at, status)
        VALUES (:labId, 'STUDENT', :studentUserId, :groupCode, NULL, :purpose, :usageType, :dueAt, 'REQUESTED')
        `,
        {
          labId: body.labId,
          studentUserId,
          groupCode,
          purpose: body.purpose ?? null,
          usageType: body.usageType,
          dueAt: finalDueAt,
        }
      );
      const transactionId = (txRes as any).insertId;

      for (const it of list) {
        await conn.query(
          `INSERT INTO borrow_transaction_items (transaction_id, item_id, condition_out) VALUES (:tx, :item, 'Good')`,
          { tx: transactionId, item: it.id }
        );
      }

      await conn.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
         VALUES (:actor, 'BORROW_REQUEST', 'borrow_transaction', :tx, JSON_OBJECT('count', :count, 'usageType', :ut))`,
        { actor: studentUserId, tx: String(transactionId), count: list.length, ut: body.usageType }
      );

      await conn.commit();

      // Notify all Admins and Lab Technicians about the pending request
      try {
        const [studentRows] = await pool.query(
          `SELECT u.full_name, COALESCE(sp.reg_number, u.index_no) as index_no 
           FROM users u LEFT JOIN student_profiles sp ON sp.user_id = u.id WHERE u.id = :uid`,
          { uid: studentUserId }
        );
        const student = (studentRows as any[])[0];
        const [labRows] = await pool.query(`SELECT name FROM labs WHERE id = :id`, { id: body.labId });
        const labName = (labRows as any[])[0]?.name || "Laboratory";
        const itemNames = list.map((i: any) => `${i.elabs_tag} (${i.name})`).join(", ");
        const usageLabel = body.usageType === "OUTSIDE_LAB" ? "Take Outside Lab" : "In-Lab Session";

        const notifBody = `${student?.full_name || "A student"} (${student?.index_no || "Student"}) requested ${list.length} item(s) [${itemNames}] in ${labName}. Loan Type: ${usageLabel}.`;

        await notifyUsersByRole(
          ["SYSTEM_ADMIN", "TECHNICIAN"],
          "BORROW_REQUESTED",
          "New Equipment Borrow Request",
          notifBody,
          { transactionId, labId: body.labId, usageType: body.usageType, url: "/inventory" }
        );
      } catch (notifErr) {
        console.error("Failed to dispatch borrow request notification:", notifErr);
      }

      res.json({
        ok: true,
        transactionId,
        message: body.usageType === "OUTSIDE_LAB"
          ? "Outside-lab borrow request submitted. Please visit the lab technician to obtain authorization and collect the equipment."
          : "Borrow request submitted. Please collect the equipment from the lab technician.",
        requestedItems: list.map((it: any) => ({ elabsTag: it.elabs_tag, name: it.name, id: it.id })),
      });
    } catch (e: any) {
      await conn.rollback();
      console.error("Borrow request error:", e);
      res.status(500).json({ error: "Failed to submit borrow request", detail: e?.message });
    } finally {
      conn.release();
    }
  } catch (e: any) {
    return res.status(400).json({ error: "Invalid request body", detail: e?.issues?.[0]?.message ?? e?.message });
  }
});

// ── 6. Staff Views Pending Borrow Requests ────────────────────────────────────
router.get("/requests", requireAuth, async (req: any, res) => {
  const labId = req.query.labId ? Number(req.query.labId) : null;
  const roles = await getUserRoles(req.user.id, pool);
  const isStaff = roles.some((r) => ["TECHNICIAN", "LECTURER", "SYSTEM_ADMIN"].includes(r));
  if (!isStaff) return res.status(403).json({ error: "Staff only." });

  const [rows] = await pool.query(
    `
    SELECT t.id, t.lab_id as labId, l.name as labName,
           t.borrower_user_id as borrowerUserId,
           u_borrower.full_name as borrowerName,
           COALESCE(sp.reg_number, u_borrower.index_no) as borrowerIndexNo,
           u_borrower.email as borrowerEmail,
           sp.group_code as borrowerGroup,
           t.purpose,
           t.usage_type as usageType,
           t.due_at as dueAt,
           t.status,
           t.created_at as createdAt,
           JSON_ARRAYAGG(
             JSON_OBJECT(
               'itemId', i.id,
               'elabsTag', i.elabs_tag,
               'name', i.name,
               'category', i.category,
               'model', i.model,
               'status', i.status
             )
           ) as items
    FROM borrow_transactions t
    JOIN labs l ON l.id = t.lab_id
    JOIN users u_borrower ON u_borrower.id = t.borrower_user_id
    LEFT JOIN student_profiles sp ON sp.user_id = t.borrower_user_id
    JOIN borrow_transaction_items bti ON bti.transaction_id = t.id
    JOIN inventory_items i ON i.id = bti.item_id
    WHERE t.status = 'REQUESTED'
      AND (:labId IS NULL OR t.lab_id = :labId)
    GROUP BY t.id, t.lab_id, l.name, t.borrower_user_id,
             u_borrower.full_name, sp.reg_number, u_borrower.index_no, u_borrower.email, sp.group_code,
             t.purpose, t.usage_type, t.due_at, t.status, t.created_at
    ORDER BY t.created_at DESC
    `,
    { labId }
  );

  const requests = (rows as any[]).map((r) => ({
    ...r,
    items: typeof r.items === "string" ? JSON.parse(r.items) : (r.items ?? []),
  }));

  res.json({ requests });
});

// ── 7. Technician Approves & Issues Equipment to Student ──────────────────────
router.patch("/requests/:id/approve", requireAuth, async (req: any, res) => {
  const reqId = Number(req.params.id);
  if (!Number.isFinite(reqId)) return res.status(400).json({ error: "Invalid request ID" });

  const roles = await getUserRoles(req.user.id, pool);
  const isStaff = roles.some((r) => ["TECHNICIAN", "LECTURER", "SYSTEM_ADMIN"].includes(r));
  if (!isStaff) return res.status(403).json({ error: "Only lab technicians and instructors can issue equipment." });

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const [txRows] = await conn.query(
      `SELECT id, lab_id, status, borrower_user_id FROM borrow_transactions WHERE id = :id FOR UPDATE`,
      { id: reqId }
    );
    const tx = (txRows as any[])[0];
    if (!tx) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ error: "Request not found" });
    }
    if (tx.status !== "REQUESTED") {
      await conn.rollback(); conn.release();
      return res.status(400).json({ error: `Cannot approve request with status: ${tx.status}` });
    }

    const [items] = await conn.query(
      `SELECT i.id, i.elabs_tag, i.name, i.status 
       FROM borrow_transaction_items bti
       JOIN inventory_items i ON i.id = bti.item_id
       WHERE bti.transaction_id = :id
       FOR UPDATE`,
      { id: reqId }
    );

    const list = items as any[];
    for (const it of list) {
      if (it.status !== "AVAILABLE") {
        await conn.rollback(); conn.release();
        return res.status(400).json({ error: `Item ${it.elabs_tag} is no longer available (currently ${it.status}).` });
      }
    }

    const technicianId = req.user.id;

    // Mark items as BORROWED
    for (const it of list) {
      await conn.query(`UPDATE inventory_items SET status = 'BORROWED' WHERE id = :id`, { id: it.id });
      await conn.query(
        `INSERT INTO barcode_events (event_type, lab_id, item_id, elabs_tag, actor_user_id, meta)
         VALUES ('BORROW_SCAN', :labId, :itemId, :tag, :actor, JSON_OBJECT('transactionId', :tx, 'action', 'APPROVE'))`,
        { labId: tx.lab_id, itemId: it.id, tag: it.elabs_tag, actor: technicianId, tx: tx.id }
      );
    }

    // Set transaction status to BORROWED and record technician as issued_by_user_id!
    await conn.query(
      `UPDATE borrow_transactions 
       SET status = 'BORROWED', issued_by_user_id = :issuedBy, updated_at = NOW()
       WHERE id = :id`,
      { issuedBy: technicianId, id: tx.id }
    );

    await conn.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
       VALUES (:actor, 'BORROW_APPROVE', 'borrow_transaction', :tx, JSON_OBJECT('itemCount', :count))`,
      { actor: technicianId, tx: String(tx.id), count: list.length }
    );

    await conn.commit();

    // Notify the student that their borrow request was approved and equipment is issued
    try {
      const [techRows] = await pool.query(`SELECT full_name FROM users WHERE id = :uid`, { uid: technicianId });
      const techName = (techRows as any[])[0]?.full_name || "Lab Staff";
      const [txDetails] = await pool.query(
        `SELECT t.due_at, t.borrower_user_id, l.name as lab_name 
         FROM borrow_transactions t JOIN labs l ON l.id = t.lab_id WHERE t.id = :id`,
        { id: tx.id }
      );
      const txInfo = (txDetails as any[])[0];
      const dueFormatted = txInfo?.due_at
        ? new Date(txInfo.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "End of lab session";
      const lab = txInfo?.lab_name || "Laboratory";
      const itemTags = list.map((i: any) => i.elabs_tag).join(", ");

      if (tx.borrower_user_id) {
        await createNotification(
          tx.borrower_user_id,
          "BORROW_APPROVED",
          "Borrow Request Approved & Handed Over",
          `Your equipment request #${tx.id} for [${itemTags}] in ${lab} has been authorized and issued by ${techName}. Return due: ${dueFormatted}.`,
          { transactionId: tx.id, labId: tx.lab_id, url: "/inventory" }
        );
      }
    } catch (notifErr) {
      console.error("Failed to dispatch approval notification:", notifErr);
    }

    res.json({ ok: true, transactionId: tx.id, message: "Equipment issued successfully." });
  } catch (err: any) {
    await conn.rollback();
    console.error("Approve error:", err);
    res.status(500).json({ error: "Failed to approve request", detail: err?.message });
  } finally {
    conn.release();
  }
});

// ── 8. Technician Rejects Borrow Request ──────────────────────────────────────
router.patch("/requests/:id/reject", requireAuth, async (req: any, res) => {
  const reqId = Number(req.params.id);
  if (!Number.isFinite(reqId)) return res.status(400).json({ error: "Invalid request ID" });

  const roles = await getUserRoles(req.user.id, pool);
  const isStaff = roles.some((r) => ["TECHNICIAN", "LECTURER", "SYSTEM_ADMIN"].includes(r));
  if (!isStaff) return res.status(403).json({ error: "Staff only." });

  const reason = String(req.body.rejectionReason ?? "").trim() || "Rejected by technician";

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    const [txRows] = await conn.query(
      `SELECT id, status, borrower_user_id, lab_id FROM borrow_transactions WHERE id = :id FOR UPDATE`,
      { id: reqId }
    );
    const tx = (txRows as any[])[0];
    if (!tx) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ error: "Request not found" });
    }
    if (tx.status !== "REQUESTED") {
      await conn.rollback(); conn.release();
      return res.status(400).json({ error: `Cannot reject request with status: ${tx.status}` });
    }

    const technicianId = req.user.id;

    await conn.query(
      `UPDATE borrow_transactions 
       SET status = 'REJECTED', rejection_reason = :reason, issued_by_user_id = :issuedBy
       WHERE id = :id`,
      { reason, issuedBy: technicianId, id: tx.id }
    );

    await conn.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
       VALUES (:actor, 'BORROW_REJECT', 'borrow_transaction', :tx, JSON_OBJECT('reason', :reason))`,
      { actor: technicianId, tx: String(tx.id), reason }
    );

    await conn.commit();

    // Notify the student that their borrow request was declined
    try {
      const [techRows] = await pool.query(`SELECT full_name FROM users WHERE id = :uid`, { uid: technicianId });
      const techName = (techRows as any[])[0]?.full_name || "Lab Staff";
      const [txDetails] = await pool.query(
        `SELECT l.name as lab_name FROM borrow_transactions t JOIN labs l ON l.id = t.lab_id WHERE t.id = :id`,
        { id: tx.id }
      );
      const lab = (txDetails as any[])[0]?.lab_name || "Laboratory";

      if (tx.borrower_user_id) {
        await createNotification(
          tx.borrower_user_id,
          "BORROW_REJECTED",
          "Borrow Request Declined",
          `Your equipment borrow request #${tx.id} for ${lab} was declined by ${techName}. Reason: "${reason}".`,
          { transactionId: tx.id, reason, url: "/inventory" }
        );
      }
    } catch (notifErr) {
      console.error("Failed to dispatch rejection notification:", notifErr);
    }

    res.json({ ok: true, message: "Request rejected." });
  } catch (err: any) {
    await conn.rollback();
    console.error("Reject error:", err);
    res.status(500).json({ error: "Failed to reject request", detail: err?.message });
  } finally {
    conn.release();
  }
});

// ── 9. Direct Walk-In Issue (Technician Counter Issue) ────────────────────────
router.post("/borrow", requireAuth, async (req: any, res) => {
  try {
    const raw = { ...req.body } as Record<string, unknown>;
    if (!raw.dueAt || raw.dueAt === "") raw.dueAt = null;
    if (!raw.purpose || raw.purpose === "") raw.purpose = null;
    if (!raw.conditionOut || raw.conditionOut === "") raw.conditionOut = "Good";

    const body = z.object({
      labId: z.number(),
      borrowerType: z.enum(["STUDENT", "GROUP"]).default("STUDENT"),
      borrowerUserId: z.number().nullable().optional(),
      borrowerGroupCode: z.string().nullable().optional(),
      purpose: z.string().max(255).nullable().optional(),
      usageType: z.enum(["IN_LAB", "OUTSIDE_LAB"]).default("IN_LAB"),
      dueAt: z.string().nullable().optional(),
      elabsTags: z.array(z.string().min(3)).min(1),
      conditionOut: z.string().max(255).nullable().optional(),
    }).parse(raw);

    const operatorUserId = req.user.id;
    const roles = await getUserRoles(operatorUserId, pool);
    const isStaff = roles.some((r) => ["TECHNICIAN", "LECTURER", "SYSTEM_ADMIN"].includes(r));

    if (!isStaff) {
      return res.status(403).json({
        error: "Students must submit borrow requests via the Request Borrow feature. Direct issuing is restricted to lab staff.",
      });
    }

    if (!body.borrowerUserId && !body.borrowerGroupCode) {
      return res.status(400).json({ error: "A student or group must be specified as the borrower." });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const placeholders = body.elabsTags.map(() => "?").join(", ");
      const [items] = await conn.query(
        `SELECT id, status, lab_id, elabs_tag, name FROM inventory_items WHERE elabs_tag IN (${placeholders}) FOR UPDATE`,
        body.elabsTags
      );

      const list = items as any[];
      if (list.length !== body.elabsTags.length) {
        const foundTags = list.map((i: any) => i.elabs_tag);
        const missing = body.elabsTags.filter((t) => !foundTags.includes(t));
        await conn.rollback(); conn.release();
        return res.status(400).json({ error: `Items not found: ${missing.join(", ")}` });
      }

      for (const it of list) {
        if (it.status !== "AVAILABLE") {
          await conn.rollback(); conn.release();
          return res.status(400).json({ error: `Item not available: ${it.elabs_tag}` });
        }
      }

      let finalDueAt = toMysqlDt(body.dueAt);
      if (!finalDueAt) {
        finalDueAt = body.usageType === "OUTSIDE_LAB"
          ? toMysqlDt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
          : toMysqlDt(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
      }

      // Record technician as issued_by_user_id!
      const [txRes] = await conn.query(
        `
        INSERT INTO borrow_transactions
        (lab_id, borrower_type, borrower_user_id, borrower_group_code, issued_by_user_id, purpose, usage_type, due_at, status)
        VALUES (:labId, :borrowerType, :borrowerUserId, :borrowerGroupCode, :issuedBy, :purpose, :usageType, :dueAt, 'BORROWED')
        `,
        {
          labId: body.labId,
          borrowerType: body.borrowerType,
          borrowerUserId: body.borrowerUserId ?? null,
          borrowerGroupCode: body.borrowerGroupCode ?? null,
          issuedBy: operatorUserId,
          purpose: body.purpose ?? null,
          usageType: body.usageType,
          dueAt: finalDueAt,
        }
      );
      const transactionId = (txRes as any).insertId;

      for (const it of list) {
        await conn.query(
          `INSERT INTO borrow_transaction_items (transaction_id, item_id, condition_out) VALUES (:tx, :item, :condOut)`,
          { tx: transactionId, item: it.id, condOut: body.conditionOut ?? "Good" }
        );

        await conn.query(`UPDATE inventory_items SET status='BORROWED' WHERE id=:id`, { id: it.id });

        await conn.query(
          `INSERT INTO barcode_events (event_type, lab_id, item_id, elabs_tag, actor_user_id, meta)
           VALUES ('BORROW_SCAN', :labId, :itemId, :tag, :actor, JSON_OBJECT('transactionId', :tx))`,
          { labId: body.labId, itemId: it.id, tag: it.elabs_tag, actor: operatorUserId, tx: transactionId }
        );
      }

      await conn.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
         VALUES (:actor, 'BORROW_CREATE', 'borrow_transaction', :tx, JSON_OBJECT('count', :count, 'issuedByStaff', :actor))`,
        { actor: operatorUserId, tx: String(transactionId), count: list.length }
      );

      await conn.commit();

      if (body.borrowerUserId) {
        try {
          const [staffRows] = await pool.query(`SELECT full_name FROM users WHERE id = :uid`, { uid: operatorUserId });
          const staffName = (staffRows as any[])[0]?.full_name || "Lab Technician";
          const [labRows] = await pool.query(`SELECT name FROM labs WHERE id = :id`, { id: body.labId });
          const labName = (labRows as any[])[0]?.name || "Laboratory";
          const tags = list.map((i: any) => i.elabs_tag).join(", ");

          await createNotification(
            body.borrowerUserId,
            "BORROW_APPROVED",
            "Laboratory Equipment Issued",
            `${list.length} item(s) [${tags}] have been issued to you by ${staffName} at ${labName}. Due: ${finalDueAt || "scheduled session"}.`,
            { transactionId, labId: body.labId, url: "/inventory" }
          );
        } catch (notifErr) {
          console.error("Failed to dispatch walk-in notification:", notifErr);
        }
      }

      res.json({
        transactionId,
        borrowedItems: list.map((it: any) => ({
          elabsTag: it.elabs_tag,
          name: it.name,
          id: it.id,
        })),
      });
    } catch (_e: any) {
      await conn.rollback();
      console.error("Borrow transaction error:", _e?.message ?? _e);
      res.status(500).json({ error: "Borrow failed", detail: _e?.message });
    } finally {
      conn.release();
    }
  } catch (_e: any) {
    return res.status(400).json({ error: "Invalid request body", detail: _e?.issues?.[0]?.message ?? _e?.message });
  }
});

// ── 10. Student Views Personal Borrow History ────────────────────────────────
router.get("/my-borrows", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `
    SELECT t.id, t.lab_id as labId, ANY_VALUE(l.name) as labName,
           t.purpose, t.usage_type as usageType, t.rejection_reason as rejectionReason,
           t.due_at as dueAt, t.returned_at as returnedAt,
           t.status, t.created_at as createdAt,
           ANY_VALUE(u_issuer.full_name) as issuedByName,
           JSON_ARRAYAGG(
             JSON_OBJECT(
               'itemId',    i.id,
               'elabsTag',  i.elabs_tag,
               'name',      i.name,
               'category',  i.category,
               'model',     i.model,
               'condOut',   bti.condition_out,
               'condIn',    bti.condition_in
             )
           ) as items
    FROM borrow_transactions t
    JOIN labs l ON l.id = t.lab_id
    LEFT JOIN users u_issuer ON u_issuer.id = t.issued_by_user_id
    JOIN borrow_transaction_items bti ON bti.transaction_id = t.id
    JOIN inventory_items i ON i.id = bti.item_id
    WHERE (
      t.borrower_user_id = :userId
      OR (t.borrower_group_code IS NOT NULL AND t.borrower_group_code IN (
        SELECT group_code FROM student_profiles WHERE user_id = :userId
      ))
    )
    GROUP BY t.id, t.lab_id, t.purpose, t.usage_type, t.rejection_reason, t.due_at, t.returned_at, t.status, t.created_at
    ORDER BY t.created_at DESC
    LIMIT 100
    `,
    { userId }
  );
  const borrowsList = (rows as any[]).map((r) => ({
    ...r,
    items: typeof r.items === "string" ? JSON.parse(r.items) : (r.items ?? []),
  }));
  res.json({ borrows: borrowsList });
});

// ── 11. All Borrow Transactions (Staff Overview) ──────────────────────────────
router.get("/transactions", requireAuth, async (req: any, res) => {
  const labId = req.query.labId ? Number(req.query.labId) : null;
  const status = req.query.status ? String(req.query.status) : null;

  const [rows] = await pool.query(
    `
    SELECT t.id, t.lab_id as labId, l.name as labName, t.borrower_type as borrowerType,
           t.borrower_user_id as borrowerUserId, t.borrower_group_code as borrowerGroupCode,
           u_borrower.full_name as borrowerName,
           COALESCE(sp.reg_number, u_borrower.index_no) as borrowerIndexNo,
           u_borrower.email as borrowerEmail,
           sp.group_code as borrowerGroup,
           u_issuer.full_name as issuedBy,
           t.purpose,
           t.usage_type as usageType,
           t.rejection_reason as rejectionReason,
           t.due_at as dueAt,
           t.returned_at as returnedAt,
           t.status,
           t.created_at as createdAt,
           JSON_ARRAYAGG(
             JSON_OBJECT(
               'itemId', i.id,
               'elabsTag', i.elabs_tag,
               'name', i.name,
               'category', i.category,
               'model', i.model,
               'conditionIn', bti.condition_in
             )
           ) as items
    FROM borrow_transactions t
    JOIN labs l ON l.id = t.lab_id
    LEFT JOIN users u_borrower ON u_borrower.id = t.borrower_user_id
    LEFT JOIN student_profiles sp ON sp.user_id = t.borrower_user_id
    LEFT JOIN users u_issuer ON u_issuer.id = t.issued_by_user_id
    LEFT JOIN borrow_transaction_items bti ON bti.transaction_id = t.id
    LEFT JOIN inventory_items i ON i.id = bti.item_id
    WHERE (:labId IS NULL OR t.lab_id = :labId)
      AND (:status IS NULL OR t.status = :status)
    GROUP BY t.id, t.lab_id, l.name, t.borrower_type, t.borrower_user_id, t.borrower_group_code,
             u_borrower.full_name, sp.reg_number, u_borrower.index_no, u_borrower.email, sp.group_code,
             u_issuer.full_name, t.purpose, t.usage_type, t.rejection_reason, t.due_at, t.returned_at, t.status, t.created_at
    ORDER BY t.created_at DESC
    LIMIT 200
    `,
    { labId, status }
  );

  const transactions = (rows as any[]).map((r) => ({
    ...r,
    items: typeof r.items === "string" ? JSON.parse(r.items) : (r.items ?? []),
  }));

  res.json({ transactions });
});

// ── 12. Return Equipment ──────────────────────────────────────────────────────
router.post("/return", requireAuth, requirePermission("inventory:borrow"), async (req: any, res) => {
  try {
    const body = z.object({
      transactionId: z.number(),
      conditionIn: z.string().max(255).nullable().optional(),
      hasDamage: z.boolean().optional(),
      damageNotes: z.string().max(255).nullable().optional(),
    }).parse(req.body);

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [txRows] = await conn.query(
        `SELECT id, lab_id, status FROM borrow_transactions WHERE id=:id FOR UPDATE`,
        { id: body.transactionId }
      );
      const tx = (txRows as any[])[0];
      if (!tx) return res.status(404).json({ error: "Transaction not found" });
      if (tx.status !== "BORROWED") return res.status(400).json({ error: "Transaction not active" });

      const [items] = await conn.query(
        `
        SELECT b.item_id as itemId, i.elabs_tag as elabsTag
        FROM borrow_transaction_items b
        JOIN inventory_items i ON i.id = b.item_id
        WHERE b.transaction_id = :tx
        FOR UPDATE
        `,
        { tx: body.transactionId }
      );

      const returnedBy = req.user.id;
      const conditionRecorded = body.hasDamage
        ? (body.damageNotes?.trim() ? `Damaged: ${body.damageNotes.trim()}` : "Damaged / Defect Observed")
        : (body.conditionIn?.trim() || "Good");

      const itemStatus = body.hasDamage ? "MAINTENANCE" : "AVAILABLE";
      const itemConditionNote = body.hasDamage && body.damageNotes?.trim()
        ? `Damage on return: ${body.damageNotes.trim()}`
        : null;

      for (const it of items as any[]) {
        await conn.query(
          `UPDATE borrow_transaction_items SET condition_in=:condIn WHERE transaction_id=:tx AND item_id=:itemId`,
          { condIn: conditionRecorded, tx: body.transactionId, itemId: it.itemId }
        );
        await conn.query(
          `UPDATE inventory_items 
           SET status=:status, 
               condition_note = COALESCE(:condNote, condition_note) 
           WHERE id=:id`,
          { status: itemStatus, condNote: itemConditionNote, id: it.itemId }
        );

        await conn.query(
          `INSERT INTO barcode_events (event_type, lab_id, item_id, elabs_tag, actor_user_id, meta)
           VALUES ('RETURN_SCAN', :labId, :itemId, :tag, :actor, JSON_OBJECT('transactionId', :tx, 'hasDamage', :hasDamage, 'damageNotes', :damageNotes))`,
          {
            labId: tx.lab_id,
            itemId: it.itemId,
            tag: it.elabsTag,
            actor: returnedBy,
            tx: body.transactionId,
            hasDamage: !!body.hasDamage,
            damageNotes: body.damageNotes ?? null,
          }
        );
      }

      await conn.query(
        `UPDATE borrow_transactions SET status='RETURNED', returned_at=NOW() WHERE id=:id`,
        { id: body.transactionId }
      );

      await conn.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id)
         VALUES (:actor,'BORROW_RETURN','borrow_transaction',:tx)`,
        { actor: returnedBy, tx: String(body.transactionId) }
      );

      await conn.commit();

      // Notify the student that their equipment return was inspected and accepted
      try {
        const [txInfo] = await pool.query(
          `SELECT t.borrower_user_id, l.name as lab_name, u.full_name as inspector_name
           FROM borrow_transactions t
           JOIN labs l ON l.id = t.lab_id
           LEFT JOIN users u ON u.id = :inspectorId
           WHERE t.id = :id`,
          { id: body.transactionId, inspectorId: returnedBy }
        );
        const info = (txInfo as any[])[0];
        if (info?.borrower_user_id) {
          const notifTitle = body.hasDamage ? "Equipment Return: Damage Noted" : "Equipment Return Confirmed";
          const notifMsg = body.hasDamage
            ? `Your returned equipment for loan #${body.transactionId} (${info.lab_name}) was inspected with defect/damage noted: "${body.damageNotes?.trim() || 'Damage reported'}".`
            : `Your returned equipment for transaction #${body.transactionId} (${info.lab_name}) has been verified and returned to inventory in good condition by ${info.inspector_name || "Lab Staff"}.`;
          await createNotification(
            info.borrower_user_id,
            "BORROW_RETURNED",
            notifTitle,
            notifMsg,
            { transactionId: body.transactionId, url: "/inventory", hasDamage: !!body.hasDamage }
          );
        }
      } catch (notifErr) {
        console.error("Failed to dispatch return notification:", notifErr);
      }

      res.json({ ok: true });
    } catch (_e) {
      await conn.rollback();
      res.status(500).json({ error: "Return failed" });
    } finally {
      conn.release();
    }
  } catch (_e) {
    return res.status(400).json({ error: "Invalid request body" });
  }
});

// ── 13. Barcode Events ────────────────────────────────────────────────────────
router.get("/barcode-events", requireAuth, requirePermission("inventory:borrow"), async (req, res) => {
  const labId = req.query.labId ? Number(req.query.labId) : null;

  const [rows] = await pool.query(
    `
    SELECT e.id, e.event_type as eventType, e.lab_id as labId, l.name as labName,
           e.elabs_tag as elabsTag, e.created_at as createdAt,
           u.full_name as actorName
    FROM barcode_events e
    JOIN labs l ON l.id = e.lab_id
    LEFT JOIN users u ON u.id = e.actor_user_id
    WHERE (:labId IS NULL OR e.lab_id = :labId)
    ORDER BY e.created_at DESC
    LIMIT 200
    `,
    { labId }
  );

  res.json({ events: rows });
});

// ── 14. Update Equipment Media (Admin & Technician Only) ──────────────────────
router.post(
  "/items/:id/media",
  requireAuth,
  mediaUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "datasheet", maxCount: 1 },
  ]),
  async (req: any, res) => {
    try {
      const itemId = Number(req.params.id);
      if (!Number.isFinite(itemId)) return res.status(400).json({ error: "Invalid item id" });

      const roles = await getUserRoles(req.user.id, pool);
      const isStaff = roles.some((r) =>
        ["SYSTEM_ADMIN", "LECTURER", "TECHNICIAN", "MODULE_COORDINATOR"].includes(r)
      );
      if (!isStaff) {
        return res.status(403).json({ error: "Only lab technicians and administrators can update equipment media" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const datasheetUrlInput = req.body?.datasheetUrl;

      let imagePath: string | null = null;
      let datasheetPath: string | null = null;

      if (files?.["image"]?.[0]) {
        imagePath = `/uploads/equipment/${files["image"][0].filename}`;
      }
      if (files?.["datasheet"]?.[0]) {
        datasheetPath = `/uploads/datasheets/${files["datasheet"][0].filename}`;
      } else if (datasheetUrlInput && typeof datasheetUrlInput === "string" && datasheetUrlInput.trim().length > 0) {
        datasheetPath = datasheetUrlInput.trim();
      }

      const updates: string[] = [];
      const params: any = { id: itemId };

      if (imagePath) {
        updates.push("image_url = :imagePath");
        params.imagePath = imagePath;
      }
      if (datasheetPath) {
        updates.push("datasheet_url = :datasheetPath");
        params.datasheetPath = datasheetPath;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No image, datasheet file, or URL provided" });
      }

      await pool.query(
        `UPDATE inventory_items SET ${updates.join(", ")} WHERE id = :id`,
        params
      );

      const [rows] = await pool.query(
        `SELECT i.id, i.lab_id as labId, i.elabs_tag as elabsTag, i.name, i.category, i.model, i.serial_no as serialNo,
                i.status, i.condition_note as conditionNote, i.image_url as imageUrl, i.datasheet_url as datasheetUrl,
                i.updated_at as updatedAt, l.name as labName
         FROM inventory_items i
         JOIN labs l ON l.id = i.lab_id
         WHERE i.id = :id`,
        { id: itemId }
      );

      const item = (rows as any[])[0];
      if (item) {
        const ds = findDatasheet(item.model || item.name);
        item.datasheetUrl = item.datasheetUrl || ds?.datasheetUrl || ds?.manualUrl || null;
      }

      return res.json({ message: "Equipment media updated successfully", item });
    } catch (err: any) {
      console.error("Error updating equipment media:", err);
      return res.status(500).json({ error: "Failed to update equipment media" });
    }
  }
);

export default router;
