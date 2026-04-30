import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { pool } from "../../db/mysql";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const [rows] = await pool.query(
    `
    SELECT
      l.id,
      l.name,
      l.location,
      l.floor,
      COUNT(i.id) AS totalItems,
      SUM(CASE WHEN i.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS availableItems,
      SUM(CASE WHEN i.status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowedItems,
      SUM(CASE WHEN i.status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenanceItems,
      SUM(CASE WHEN i.status = 'OUT_OF_SERVICE' THEN 1 ELSE 0 END) AS outOfServiceItems
    FROM labs l
    LEFT JOIN inventory_items i ON i.lab_id = l.id
    GROUP BY l.id
    ORDER BY l.name
    `
  );

  res.json({ labs: rows });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid lab id" });

  const [labRows] = await pool.query(
    `
    SELECT
      l.id,
      l.name,
      l.location,
      l.floor,
      COUNT(i.id) AS totalItems,
      SUM(CASE WHEN i.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS availableItems,
      SUM(CASE WHEN i.status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowedItems,
      SUM(CASE WHEN i.status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenanceItems,
      SUM(CASE WHEN i.status = 'OUT_OF_SERVICE' THEN 1 ELSE 0 END) AS outOfServiceItems
    FROM labs l
    LEFT JOIN inventory_items i ON i.lab_id = l.id
    WHERE l.id = :id
    GROUP BY l.id
    `,
    { id }
  );
  const lab = (labRows as any[])[0];
  if (!lab) return res.status(404).json({ error: "Lab not found" });

  const [items] = await pool.query(
    `
    SELECT id, elabs_tag AS elabsTag, name, category, model, serial_no AS serialNo, status, updated_at AS updatedAt
    FROM inventory_items
    WHERE lab_id = :id
    ORDER BY updated_at DESC
    `,
    { id }
  );

  res.json({ lab, items });
});

export default router;

