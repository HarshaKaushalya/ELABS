import { Router } from "express";
import { pool } from "../../db/mysql";
import { requireAuth, AuthedRequest } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";

const router = Router();

/** GET /timetable — student sees their own group, admin sees all */
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;

  // Check if student — fetch their group
  const [profileRows] = await pool.query(
    `SELECT group_code, reg_number AS regNumber, semester, department
     FROM student_profiles WHERE user_id = :uid`,
    { uid }
  );
  const profile = (profileRows as any[])[0];

  let slots;
  if (profile) {
    // Student: own group only
    const [rows] = await pool.query(
      `SELECT ts.id, ts.session_date AS date, ts.time_slot AS time,
              ts.module_code AS moduleCode, ts.lab_label AS lab,
              ts.group_code AS groupCode, ts.academic_year AS academicYear,
              m.name AS moduleName
       FROM timetable_slots ts
       LEFT JOIN modules m ON m.code = ts.module_code
       WHERE ts.group_code = :group
       ORDER BY ts.session_date, ts.time_slot`,
      { group: profile.group_code }
    );
    slots = rows;
  } else {
    // Admin/lecturer: all groups
    const [rows] = await pool.query(
      `SELECT ts.id, ts.session_date AS date, ts.time_slot AS time,
              ts.module_code AS moduleCode, ts.lab_label AS lab,
              ts.group_code AS groupCode, ts.academic_year AS academicYear,
              m.name AS moduleName
       FROM timetable_slots ts
       LEFT JOIN modules m ON m.code = ts.module_code
       ORDER BY ts.session_date, ts.group_code, ts.time_slot`
    );
    slots = rows;
  }

  res.json({ profile: profile ?? null, slots });
});

/** GET /timetable/groups — all group codes with student counts */
router.get(
  "/groups",
  requireAuth,
  requirePermission("admin:manage"),
  async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT sp.group_code AS groupCode, COUNT(*) AS studentCount
       FROM student_profiles sp
       GROUP BY sp.group_code
       ORDER BY sp.group_code`
    );
    res.json({ groups: rows });
  }
);

/** GET /timetable/students — all students with profile */
router.get(
  "/students",
  requireAuth,
  requirePermission("admin:manage"),
  async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name AS fullName, u.email, u.is_active AS isActive,
              sp.reg_number AS regNumber, sp.group_code AS groupCode,
              sp.semester, sp.must_change_password AS mustChangePassword
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       ORDER BY sp.group_code, u.full_name`
    );
    res.json({ students: rows });
  }
);

export default router;
