import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { pool } from "../../db/mysql";

const router = Router();

router.get("/summary", requireAuth, async (_req, res) => {
  const [labStatsRows] = await pool.query(
    `
    SELECT
      COUNT(*) AS totalLabs
    FROM labs
    `
  );
  const totalLabs = Number((labStatsRows as any[])[0]?.totalLabs ?? 0);

  const [itemStatsRows] = await pool.query(
    `
    SELECT
      COUNT(*) AS totalItems,
      SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS availableItems,
      SUM(CASE WHEN status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowedItems,
      SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenanceItems,
      SUM(CASE WHEN status = 'OUT_OF_SERVICE' THEN 1 ELSE 0 END) AS outOfServiceItems
    FROM inventory_items
    `
  );
  const itemStats = (itemStatsRows as any[])[0] ?? {};

  const [activeTxRows] = await pool.query(
    `
    SELECT COUNT(*) AS activeBorrows
    FROM borrow_transactions
    WHERE status = 'BORROWED'
    `
  );
  const activeBorrows = Number((activeTxRows as any[])[0]?.activeBorrows ?? 0);

  const [overdueRows] = await pool.query(
    `
    SELECT COUNT(*) AS overdueItems
    FROM borrow_transactions
    WHERE status = 'BORROWED' AND due_at IS NOT NULL AND due_at < NOW()
    `
  );
  const overdueItems = Number((overdueRows as any[])[0]?.overdueItems ?? 0);

  const [recentRows] = await pool.query(
    `
    SELECT
      i.name AS itemName,
      i.elabs_tag AS elabsTag,
      l.name AS labName,
      i.updated_at AS updatedAt,
      i.status
    FROM inventory_items i
    JOIN labs l ON l.id = i.lab_id
    ORDER BY i.updated_at DESC
    LIMIT 8
    `
  );

  res.json({
    stats: {
      totalLabs,
      totalItems: Number(itemStats.totalItems ?? 0),
      availableItems: Number(itemStats.availableItems ?? 0),
      borrowedItems: Number(itemStats.borrowedItems ?? 0),
      maintenanceItems: Number(itemStats.maintenanceItems ?? 0),
      outOfServiceItems: Number(itemStats.outOfServiceItems ?? 0),
      activeBorrows,
      overdueItems,
    },
    recent: recentRows,
  });
});


/** GET /dashboard/overdue — list all overdue borrow transactions with items */
router.get("/overdue", requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.id AS transactionId,
        t.due_at AS dueAt,
        t.created_at AS createdAt,
        t.purpose,
        t.borrower_type AS borrowerType,
        t.borrower_group_code AS borrowerGroupCode,
        u.full_name AS borrowerName,
        u.email AS borrowerEmail,
        l.name AS labName,
        TIMESTAMPDIFF(DAY, t.due_at, NOW()) AS daysOverdue,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'itemId',    i.id,
            'elabsTag',  i.elabs_tag,
            'name',      i.name,
            'category',  i.category,
            'model',     i.model
          )
        ) AS items
      FROM borrow_transactions t
      JOIN labs l ON l.id = t.lab_id
      LEFT JOIN users u ON u.id = t.borrower_user_id
      JOIN borrow_transaction_items bti ON bti.transaction_id = t.id
      JOIN inventory_items i ON i.id = bti.item_id
      WHERE t.status = 'BORROWED'
        AND t.due_at IS NOT NULL
        AND t.due_at < NOW()
      GROUP BY t.id
      ORDER BY t.due_at ASC
      LIMIT 50
    `);
    res.json({ overdue: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /dashboard/my-borrows — current user's active + overdue borrows */
router.get("/my-borrows", requireAuth, async (req: any, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(`
      SELECT
        t.id AS transactionId,
        t.due_at AS dueAt,
        t.created_at AS createdAt,
        t.status,
        l.name AS labName,
        t.purpose,
        TIMESTAMPDIFF(DAY, t.due_at, NOW()) AS daysOverdue,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'itemId',   i.id,
            'elabsTag', i.elabs_tag,
            'name',     i.name,
            'category', i.category
          )
        ) AS items
      FROM borrow_transactions t
      JOIN labs l ON l.id = t.lab_id
      JOIN borrow_transaction_items bti ON bti.transaction_id = t.id
      JOIN inventory_items i ON i.id = bti.item_id
      WHERE t.borrower_user_id = :userId
        AND t.status = 'BORROWED'
      GROUP BY t.id
      ORDER BY t.due_at ASC
    `, { userId });
    res.json({ borrows: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


