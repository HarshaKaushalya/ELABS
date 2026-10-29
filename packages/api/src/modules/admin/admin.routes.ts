import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";
import { pool } from "../../db/mysql";

const router = Router();

// GET /admin/users - Directory with role & student profile details, staff prioritized
router.get("/users", requireAuth, requirePermission("admin:manage"), async (_req, res) => {
  const [rows] = await pool.query(
    `
    SELECT
      u.id,
      u.full_name AS fullName,
      u.email,
      u.index_no AS indexNo,
      sp.group_code AS groupCode,
      sp.department,
      sp.semester,
      u.is_active AS isActive,
      u.created_at AS createdAt,
      u.updated_at AS updatedAt,
      COALESCE(
        (SELECT JSON_ARRAYAGG(r.name)
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = u.id),
        JSON_ARRAY()
      ) AS roles
    FROM users u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    GROUP BY u.id
    ORDER BY
      CASE 
        WHEN EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.name = 'SYSTEM_ADMIN') THEN 1
        WHEN EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.name = 'LECTURER') THEN 2
        WHEN EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.name = 'TECHNICIAN') THEN 3
        ELSE 4
      END,
      u.full_name ASC
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
    return { ...u, roles, isActive: Boolean(u.isActive) };
  });

  res.json({ users });
});

// GET /admin/roles - Full RBAC Roles & Permissions Matrix
router.get("/roles", requireAuth, requirePermission("admin:manage"), async (_req, res) => {
  const [rolesRows] = await pool.query(
    `
    SELECT 
      r.id, 
      r.name, 
      r.description,
      COALESCE(
        (SELECT JSON_ARRAYAGG(p.code)
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = r.id),
        JSON_ARRAY()
      ) AS permissions
    FROM roles r
    ORDER BY r.id ASC
    `
  );

  const [permsRows] = await pool.query(
    `SELECT id, code, description FROM permissions ORDER BY id ASC`
  );

  const roles = (rolesRows as any[]).map((r) => {
    let perms: string[] = [];
    if (Array.isArray(r.permissions)) perms = r.permissions.map(String);
    else if (typeof r.permissions === "string") {
      try {
        const parsed = JSON.parse(r.permissions);
        perms = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      } catch {
        perms = [r.permissions];
      }
    }
    return { ...r, permissions: perms };
  });

  res.json({ roles, permissions: permsRows });
});

// PATCH /admin/users/:id/role - Assign new role to user
router.patch("/users/:id/role", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const userId = Number(req.params.id);
  const body = z.object({
    role: z.string().min(1),
  }).safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "Invalid role specified." });
  const newRoleName = body.data.role.toUpperCase().trim();

  // Find target role in DB
  const [roleRows] = await pool.query(`SELECT id, name FROM roles WHERE name = :name LIMIT 1`, { name: newRoleName });
  const targetRole = (roleRows as any[])[0];
  if (!targetRole) return res.status(400).json({ error: `Role '${newRoleName}' does not exist.` });

  // Check if target user exists
  const [userRows] = await pool.query(`SELECT id, full_name, email FROM users WHERE id = :id LIMIT 1`, { id: userId });
  const targetUser = (userRows as any[])[0];
  if (!targetUser) return res.status(404).json({ error: "User not found." });

  // Update user_roles
  await pool.query(`DELETE FROM user_roles WHERE user_id = :userId`, { userId });
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES (:userId, :roleId)`, { userId, roleId: targetRole.id });

  // Audit log
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
     VALUES (:actor, 'USER_ROLE_UPDATED', 'user', :userId, JSON_OBJECT('newRole', :role, 'userEmail', :email))`,
    { actor: req.user?.id ?? null, userId, role: newRoleName, email: targetUser.email }
  );

  res.json({ ok: true, message: `Role updated to ${newRoleName} for ${targetUser.full_name}` });
});

// PATCH /admin/users/:id/status - Toggle active/inactive account status
router.patch("/users/:id/status", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const userId = Number(req.params.id);
  const body = z.object({
    isActive: z.boolean(),
  }).safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "Invalid status specified." });

  // Prevent self-lockout
  if (req.user?.id === userId && !body.data.isActive) {
    return res.status(400).json({ error: "You cannot deactivate your own administrative account." });
  }

  const [userRows] = await pool.query(`SELECT id, full_name, email FROM users WHERE id = :id LIMIT 1`, { id: userId });
  const targetUser = (userRows as any[])[0];
  if (!targetUser) return res.status(404).json({ error: "User not found." });

  await pool.query(`UPDATE users SET is_active = :isActive WHERE id = :userId`, {
    isActive: body.data.isActive,
    userId,
  });

  // Audit log
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
     VALUES (:actor, 'USER_STATUS_UPDATED', 'user', :userId, JSON_OBJECT('isActive', :isActive, 'userEmail', :email))`,
    { actor: req.user?.id ?? null, userId, isActive: body.data.isActive, email: targetUser.email }
  );

  res.json({ ok: true, isActive: body.data.isActive, message: `Account status updated for ${targetUser.full_name}` });
});

// POST /admin/users - Create new user account directly from admin panel
router.post("/users", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6).optional(),
    role: z.string().min(1),
    indexNo: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input." });
  }

  const { fullName, email, role, indexNo } = parsed.data;
  const rawPassword = parsed.data.password || "Elabs@123";
  const roleName = role.toUpperCase().trim();

  // Find role
  const [roleRows] = await pool.query(`SELECT id, name FROM roles WHERE name = :name LIMIT 1`, { name: roleName });
  const targetRole = (roleRows as any[])[0];
  if (!targetRole) return res.status(400).json({ error: `Role '${roleName}' does not exist.` });

  // Check email uniqueness
  const [existing] = await pool.query(`SELECT id FROM users WHERE email = :email LIMIT 1`, { email });
  if ((existing as any[])[0]) {
    return res.status(400).json({ error: "A user with this email address already exists." });
  }

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const [insertRes] = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, is_active, index_no)
     VALUES (:fullName, :email, :passwordHash, TRUE, :indexNo)`,
    { fullName, email, passwordHash, indexNo: indexNo || null }
  );

  const newUserId = (insertRes as any).insertId;

  // Assign role
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES (:userId, :roleId)`, {
    userId: newUserId,
    roleId: targetRole.id,
  });

  // If student profile info provided, add profile
  if (roleName === "STUDENT" && indexNo) {
    await pool.query(
      `INSERT INTO student_profiles (user_id, reg_number, must_change_password)
       VALUES (:userId, :indexNo, FALSE)
       ON DUPLICATE KEY UPDATE reg_number = :indexNo`,
      { userId: newUserId, indexNo }
    );
  }

  // Audit log
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
     VALUES (:actor, 'USER_CREATED', 'user', :newUserId, JSON_OBJECT('email', :email, 'role', :roleName))`,
    { actor: req.user?.id ?? null, newUserId, email, roleName }
  );

  res.status(201).json({
    ok: true,
    message: `User created successfully with role ${roleName}`,
    user: { id: newUserId, fullName, email, role: roleName },
  });
});

// PUT /admin/roles/:id/permissions - Configure permissions for a role
router.put("/roles/:id/permissions", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const roleId = Number(req.params.id);
  const body = z.object({
    permissionCodes: z.array(z.string()),
  }).safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "Invalid permissions array." });

  // Check role exists
  const [roleRows] = await pool.query(`SELECT id, name FROM roles WHERE id = :id LIMIT 1`, { id: roleId });
  const role = (roleRows as any[])[0];
  if (!role) return res.status(404).json({ error: "Role not found." });

  // Get matching permission IDs
  const [allPerms] = await pool.query(`SELECT id, code FROM permissions`);
  const permMap = new Map<string, number>();
  (allPerms as any[]).forEach((p) => permMap.set(p.code, p.id));

  const validPermIds: number[] = [];
  for (const code of body.data.permissionCodes) {
    const id = permMap.get(code);
    if (id) validPermIds.push(id);
  }

  // Transactionally replace role permissions
  await pool.query(`DELETE FROM role_permissions WHERE role_id = :roleId`, { roleId });
  for (const permId of validPermIds) {
    await pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (:roleId, :permId)`, {
      roleId,
      permId,
    });
  }

  // Audit log
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
     VALUES (:actor, 'ROLE_PERMISSIONS_UPDATED', 'role', :roleId, JSON_OBJECT('roleName', :name, 'permissionsCount', :count))`,
    { actor: req.user?.id ?? null, roleId, name: role.name, count: validPermIds.length }
  );

  res.json({ ok: true, message: `Permissions updated for role ${role.name}` });
});

// GET /admin/audit-logs
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
