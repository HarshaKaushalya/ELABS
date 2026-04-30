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
    const body = z.object({
      labId: z.number(),
      borrowerType: z.enum(["STUDENT", "GROUP"]),
      borrowerUserId: z.number().nullable().optional(),
      borrowerGroupCode: z.string().nullable().optional(),
      purpose: z.string().max(200).nullable().optional(),
      dueAt: z.string().datetime().nullable().optional(),
      elabsTags: z.array(z.string().min(3)).min(1),
      conditionOut: z.string().max(255).nullable().optional(),
    }).parse(req.body);

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // fetch items by tags
      const [items] = await conn.query(
        `SELECT id, status, lab_id, elabs_tag FROM inventory_items WHERE elabs_tag IN (:tags) FOR UPDATE`,
        { tags: body.elabsTags }
      );

      const list = items as any[];
      if (list.length !== body.elabsTags.length) {
        return res.status(400).json({ error: "One or more items not found" });
      }

      // validate lab + availability
      for (const it of list) {
        if (it.lab_id !== body.labId) return res.status(400).json({ error: "Item lab mismatch" });
        if (it.status !== "AVAILABLE") return res.status(400).json({ error: `Item not available: ${it.elabs_tag}` });
      }

      const issuedBy = req.user.id;

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
          dueAt: body.dueAt ?? null,
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
      res.json({ transactionId });
    } catch (_e) {
      await conn.rollback();
      res.status(500).json({ error: "Borrow failed" });
    } finally {
      conn.release();
    }
  } catch (_e) {
    return res.status(400).json({ error: "Invalid request body" });
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
