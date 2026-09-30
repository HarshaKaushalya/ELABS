import { NextFunction, Response } from "express";
import { AuthedRequest } from "../modules/auth/auth.middleware";
import { pool } from "../db/mysql";

export function requirePermission(permissionCode: string) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

    const [rows] = await pool.query(
      `
      SELECT p.code
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = :userId
      `,
      { userId: req.user.id }
    );

    const perms = new Set((rows as any[]).map((x) => x.code));
    if (!perms.has(permissionCode)) return res.status(403).json({ error: "Forbidden" });

    next();
  };
}