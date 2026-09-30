import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";
import { pool } from "../../db/mysql";

const router = Router();

router.get("/users", requireAuth, requirePermission("admin:manage"), async (_req, res) => {
  const [rows] = await pool.query(
    `
    SELECT
      u.id,
      u.full_name AS fullName,
      u.email,
      u.is_active AS isActive,
      u.created_at AS createdAt,
      u.updated_at AS updatedAt,
      JSON_ARRAYAGG(r.name) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    GROUP BY u.id
    ORDER BY u.full_name
    `
  );

  const users = (rows as any[]).map((u) => {
    let roles: string[] = [];
    if (Array.isArray(u.roles)) roles = u.roles.map(String);
    else if (typeof u.roles === "string") {
      try {
        const parsed = JSON.parse(u.roles);
        roles = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      } catch {
        roles = [u.roles];
      }
    }
    return { ...u, roles };
  });

  res.json({ users });
});

router.get("/audit-logs", requireAuth, requirePermission("admin:manage"), async (_req, res) => {
  const [rows] = await pool.query(
    `
    SELECT
      a.id,
      a.action,
      a.entity,
      a.entity_id AS entityId,
      a.meta,
      a.created_at AS createdAt,
      u.full_name AS actorName,
      u.email AS actorEmail
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_user_id
    ORDER BY a.created_at DESC
    LIMIT 200
    `
  );

  res.json({ logs: rows });
});

export default router;

