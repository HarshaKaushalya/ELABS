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

export default router;

