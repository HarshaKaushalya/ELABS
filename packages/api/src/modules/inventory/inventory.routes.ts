import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";
import { pool } from "../../db/mysql";

const router = Router();

// Anyone logged in can view inventory list (students too)
router.get("/items", requireAuth, async (req, res) => {
  const labId = req.query.labId ? Number(req.query.labId) : null;

  const [rows] = await pool.query(
    `
    SELECT i.id, i.lab_id as labId, i.elabs_tag as elabsTag, i.name, i.category, i.model, i.serial_no as serialNo,
           i.status, i.condition_note as conditionNote, i.updated_at as updatedAt,
           l.name as labName
    FROM inventory_items i
    JOIN labs l ON l.id = i.lab_id
    WHERE (:labId IS NULL OR i.lab_id = :labId)
    ORDER BY i.updated_at DESC
    `,
    { labId }
  );

  res.json({ items: rows });
});

// Available items for a specific lab (for borrow item picker)
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

// Look up a student by index number e.g. EG/2022/5401
router.get("/student-lookup", requireAuth, async (req, res) => {
  const indexNo = String(req.query.indexNo ?? "").trim();
  if (!indexNo) return res.status(400).json({ error: "indexNo required" });
  const [rows] = await pool.query(
    `SELECT id, full_name as fullName, index_no as indexNo, email FROM users WHERE index_no = :indexNo LIMIT 1`,
    { indexNo }
  );
  const student = (rows as any[])[0];
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ student });
});

router.get("/items/barcode/:tag", requireAuth, async (req, res) => {

  const tag = req.params.tag;
  const [rows] = await pool.query(
    `
    SELECT i.id, i.lab_id as labId, i.elabs_tag as elabsTag, i.name, i.category, i.model, i.serial_no as serialNo,
           i.status, i.condition_note as conditionNote, i.updated_at as updatedAt,
           l.name as labName
    FROM inventory_items i
    JOIN labs l ON l.id = i.lab_id
    WHERE i.elabs_tag = :tag
    `,
    { tag }
  );

  const item = (rows as any[])[0];
  if (!item) return res.status(404).json({ error: "Item not found" });

  res.json({ item });
});

// Student views their own borrow history (no special permission needed beyond auth)
router.get("/my-borrows", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `
    SELECT t.id, t.lab_id as labId, l.name as labName,
           t.purpose, t.due_at as dueAt, t.returned_at as returnedAt,
           t.status, t.created_at as createdAt,
           u.full_name as issuedByName,
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
    JOIN users u ON u.id = t.issued_by_user_id
    JOIN borrow_transaction_items bti ON bti.transaction_id = t.id
    JOIN inventory_items i ON i.id = bti.item_id
    WHERE t.borrower_user_id = :userId
    GROUP BY t.id
    ORDER BY t.created_at DESC
    LIMIT 100
    `,
    { userId }
  );
  res.json({ borrows: rows });
});

router.get("/transactions", requireAuth, requirePermission("inventory:borrow"), async (req, res) => {
  const labId = req.query.labId ? Number(req.query.labId) : null;

  const [rows] = await pool.query(
    `
    SELECT t.id, t.lab_id as labId, l.name as labName, t.borrower_type as borrowerType,
           t.borrower_user_id as borrowerUserId, t.borrower_group_code as borrowerGroupCode,
           u.full_name as issuedBy, t.purpose, t.due_at as dueAt, t.returned_at as returnedAt, t.status, t.created_at as createdAt
    FROM borrow_transactions t
    JOIN labs l ON l.id = t.lab_id
    JOIN users u ON u.id = t.issued_by_user_id
    WHERE (:labId IS NULL OR t.lab_id = :labId)
    ORDER BY t.created_at DESC
    LIMIT 200
    `,
    { labId }
  );

  res.json({ transactions: rows });
});

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

router.post("/borrow", requireAuth, requirePermission("inventory:borrow"), async (req: any, res) => {
  try {
    // Spread into new object — req.body may be read-only; also coerce empty strings to null
    const raw = { ...req.body } as Record<string, unknown>;
    if (!raw.dueAt || raw.dueAt === "") raw.dueAt = null;
    if (!raw.purpose || raw.purpose === "") raw.purpose = null;
    if (!raw.conditionOut || raw.conditionOut === "") raw.conditionOut = null;

    const body = z.object({
      labId: z.number(),
      borrowerType: z.enum(["STUDENT", "GROUP"]),
      borrowerUserId: z.number().nullable().optional(),
      borrowerGroupCode: z.string().nullable().optional(),
      purpose: z.string().max(200).nullable().optional(),
      dueAt: z.string().datetime().nullable().optional(),
      elabsTags: z.array(z.string().min(3)).min(1),
      conditionOut: z.string().max(255).nullable().optional(),
    }).parse(raw);

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // fetch items by tags — use positional ? because named params don't expand arrays
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

      // validate availability (removed lab mismatch — items can be borrowed across labs)
      for (const it of list) {
        if (it.status !== "AVAILABLE") {
          await conn.rollback(); conn.release();
          return res.status(400).json({ error: `Item not available: ${it.elabs_tag}` });
        }
      }

      const issuedBy = req.user.id;

      // MySQL needs 'YYYY-MM-DD HH:MM:SS', not ISO 8601 'YYYY-MM-DDTHH:MM:SS.mmmZ'
      const toMysqlDt = (iso: string | null | undefined): string | null => {
        if (!iso) return null;
        try { return new Date(iso).toISOString().replace("T", " ").substring(0, 19); } catch { return null; }
      };

      // create transaction
      const [txRes] = await conn.query(
        `
        INSERT INTO borrow_transactions
        (lab_id, borrower_type, borrower_user_id, borrower_group_code, issued_by_user_id, purpose, due_at, status)
        VALUES (:labId, :borrowerType, :borrowerUserId, :borrowerGroupCode, :issuedBy, :purpose, :dueAt, 'BORROWED')
        `,
        {
          labId: body.labId,
          borrowerType: body.borrowerType,
          borrowerUserId: body.borrowerType === "STUDENT" ? (body.borrowerUserId ?? null) : null,
          borrowerGroupCode: body.borrowerType === "GROUP" ? (body.borrowerGroupCode ?? null) : null,
          issuedBy,
          purpose: body.purpose ?? null,
          dueAt: toMysqlDt(body.dueAt),
        }
      );
      const transactionId = (txRes as any).insertId;

      // add items and update status
      for (const it of list) {
        await conn.query(
          `INSERT INTO borrow_transaction_items (transaction_id, item_id, condition_out) VALUES (:tx, :item, :condOut)`,
          { tx: transactionId, item: it.id, condOut: body.conditionOut ?? null }
        );

        await conn.query(`UPDATE inventory_items SET status='BORROWED' WHERE id=:id`, { id: it.id });

        await conn.query(
          `INSERT INTO barcode_events (event_type, lab_id, item_id, elabs_tag, actor_user_id, meta)
           VALUES ('BORROW_SCAN', :labId, :itemId, :tag, :actor, JSON_OBJECT('transactionId', :tx))`,
          { labId: body.labId, itemId: it.id, tag: it.elabs_tag, actor: issuedBy, tx: transactionId }
        );
      }

      await conn.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
         VALUES (:actor,'BORROW_CREATE','borrow_transaction',:tx, JSON_OBJECT('count', :count))`,
        { actor: issuedBy, tx: String(transactionId), count: list.length }
      );

      await conn.commit();
      // Return transaction ID + item details for immediate UI confirmation
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
    console.error("Borrow validation error:", _e?.issues ?? _e?.message ?? _e);
    return res.status(400).json({ error: "Invalid request body", detail: _e?.issues?.[0]?.message ?? _e?.message });
  }
});

router.post("/return", requireAuth, requirePermission("inventory:borrow"), async (req: any, res) => {
  try {
    const body = z.object({
      transactionId: z.number(),
      conditionIn: z.string().max(255).nullable().optional(),
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

      const issuedBy = req.user.id;

      // update items to available + condition_in
      for (const it of items as any[]) {
        await conn.query(
          `UPDATE borrow_transaction_items SET condition_in=:condIn WHERE transaction_id=:tx AND item_id=:itemId`,
          { condIn: body.conditionIn ?? null, tx: body.transactionId, itemId: it.itemId }
        );
        await conn.query(`UPDATE inventory_items SET status='AVAILABLE' WHERE id=:id`, { id: it.itemId });

        await conn.query(
          `INSERT INTO barcode_events (event_type, lab_id, item_id, elabs_tag, actor_user_id, meta)
           VALUES ('RETURN_SCAN', :labId, :itemId, :tag, :actor, JSON_OBJECT('transactionId', :tx))`,
          { labId: tx.lab_id, itemId: it.itemId, tag: it.elabsTag, actor: issuedBy, tx: body.transactionId }
        );
      }

      await conn.query(
        `UPDATE borrow_transactions SET status='RETURNED', returned_at=NOW() WHERE id=:id`,
        { id: body.transactionId }
      );

      await conn.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id)
         VALUES (:actor,'BORROW_RETURN','borrow_transaction',:tx)`,
        { actor: issuedBy, tx: String(body.transactionId) }
      );

      await conn.commit();
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

export default router;
