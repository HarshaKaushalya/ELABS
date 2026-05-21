import { Router } from "express";
import { z } from "zod";
import { AuthedRequest, requireAuth } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";
import { pool } from "../../db/mysql";

const router = Router();

// ============================================================
// SEMESTER GROUPS
// ============================================================

// GET /academic/semesters — list all semester groups with module count
router.get("/semesters", requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id, s.name, s.level,
             COUNT(DISTINCT m.id) AS moduleCount
      FROM semesters s
      LEFT JOIN modules m ON m.semester_id = s.id
      GROUP BY s.id
      ORDER BY s.level ASC
    `);
    res.json({ semesters: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /academic/semesters — admin creates a semester group
router.post("/semesters", requireAuth, requirePermission("admin:manage"), async (req, res) => {
  try {
    const body = z.object({
      name: z.string().min(2).max(50),
      level: z.number().int().min(1).max(99),
    }).parse(req.body);

    const [result] = await pool.query(
      `INSERT INTO semesters (name, level) VALUES (:name, :level)`,
      body
    );
    res.json({ id: (result as any).insertId, ...body });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// GET /academic/semesters/:id — semester detail with modules + lab session counts
router.get("/semesters/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  try {
    const [semRows] = await pool.query(
      `SELECT id, name, level FROM semesters WHERE id = :id`,
      { id }
    );
    const sem = (semRows as any[])[0];
    if (!sem) return res.status(404).json({ error: "Semester group not found" });

    const [modules] = await pool.query(`
      SELECT m.id, m.code, m.name,
             COUNT(DISTINCT ls.id)                                         AS totalSessions,
             SUM(CASE WHEN ls.status = 'UPCOMING'  THEN 1 ELSE 0 END)     AS upcomingSessions,
             SUM(CASE WHEN ls.status = 'COMPLETED' THEN 1 ELSE 0 END)     AS completedSessions
      FROM modules m
      LEFT JOIN lab_sessions ls ON ls.module_id = m.id
      WHERE m.semester_id = :id
      GROUP BY m.id
      ORDER BY m.code ASC
    `, { id });

    res.json({ semester: sem, modules });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// MODULES
// ============================================================

// GET /academic/semesters/:id/modules — modules for a semester
router.get("/semesters/:id/modules", requireAuth, async (req, res) => {
  const semesterId = Number(req.params.id);
  if (!Number.isFinite(semesterId) || semesterId <= 0)
    return res.status(400).json({ error: "Invalid semester id" });

  try {
    const [rows] = await pool.query(
      `SELECT id, code, name FROM modules WHERE semester_id = :semesterId ORDER BY code ASC`,
      { semesterId }
    );
    res.json({ modules: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /academic/semesters/:id/modules — admin adds a module to a semester group
router.post("/semesters/:id/modules", requireAuth, requirePermission("admin:manage"), async (req, res) => {
  const semesterId = Number(req.params.id);
  try {
    const body = z.object({
      code: z.string().min(2).max(20),
      name: z.string().min(2).max(120),
    }).parse(req.body);

    const [result] = await pool.query(
      `INSERT INTO modules (code, name, semester_id) VALUES (:code, :name, :semesterId)`,
      { ...body, semesterId }
    );
    res.json({ id: (result as any).insertId, ...body, semesterId });
  } catch (err) {
    res.status(400).json({ error: "Invalid request or duplicate module code" });
  }
});

// GET /academic/modules/:id — module detail with lab sessions
router.get("/modules/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  try {
    const [modRows] = await pool.query(`
      SELECT m.id, m.code, m.name, s.id AS semesterId, s.name AS semesterName
      FROM modules m
      JOIN semesters s ON s.id = m.semester_id
      WHERE m.id = :id
    `, { id });
    const mod = (modRows as any[])[0];
    if (!mod) return res.status(404).json({ error: "Module not found" });

    // Fetch sessions with completion status for the current user
    const userId = req.user!.id;
    const [sessions] = await pool.query(`
      SELECT
        ls.id, ls.title, ls.description, ls.scheduled_date AS scheduledDate,
        ls.duration_hours AS durationHours, ls.status, ls.document_url AS documentUrl,
        ls.created_at AS createdAt,
        COALESCE(lsc.attended, FALSE)          AS attended,
        COALESCE(lsc.report_submitted, FALSE)  AS reportSubmitted,
        lsc.completed_at                       AS completedAt
      FROM lab_sessions ls
      LEFT JOIN lab_session_completions lsc
             ON lsc.session_id = ls.id AND lsc.student_id = :userId
      WHERE ls.module_id = :id
      ORDER BY ls.scheduled_date ASC, ls.id ASC
    `, { id, userId });

    res.json({ module: mod, sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// LAB SESSIONS
// ============================================================

// POST /academic/modules/:id/lab-sessions — admin creates a lab session
router.post("/modules/:id/lab-sessions", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const moduleId = Number(req.params.id);
  try {
    const body = z.object({
      title:         z.string().min(2).max(200),
      description:   z.string().max(2000).optional(),
      scheduledDate: z.string().optional(),
      durationHours: z.number().min(0.5).max(12).optional(),
      status:        z.enum(["UPCOMING", "ONGOING", "COMPLETED"]).optional(),
      documentUrl:   z.string().url().optional(),
    }).parse(req.body);

    const [result] = await pool.query(`
      INSERT INTO lab_sessions (module_id, title, description, scheduled_date, duration_hours, status, document_url, created_by)
      VALUES (:moduleId, :title, :description, :scheduledDate, :durationHours, :status, :documentUrl, :createdBy)
    `, {
      moduleId,
      title:         body.title,
      description:   body.description ?? null,
      scheduledDate: body.scheduledDate ?? null,
      durationHours: body.durationHours ?? 3.0,
      status:        body.status ?? "UPCOMING",
      documentUrl:   body.documentUrl ?? null,
      createdBy:     req.user!.id,
    });

    res.json({ id: (result as any).insertId, moduleId, ...body });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// GET /academic/lab-sessions/:id — single session detail
router.get("/lab-sessions/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const userId = req.user!.id;

  try {
    const [rows] = await pool.query(`
      SELECT
        ls.id, ls.title, ls.description,
        ls.scheduled_date AS scheduledDate, ls.duration_hours AS durationHours,
        ls.status, ls.document_url AS documentUrl, ls.created_at AS createdAt,
        m.id AS moduleId, m.code AS moduleCode, m.name AS moduleName,
        s.id AS semesterId, s.name AS semesterName,
        COALESCE(lsc.attended, FALSE)         AS attended,
        COALESCE(lsc.report_submitted, FALSE) AS reportSubmitted,
        lsc.completed_at                      AS completedAt
      FROM lab_sessions ls
      JOIN modules m ON m.id = ls.module_id
      JOIN semesters s ON s.id = m.semester_id
      LEFT JOIN lab_session_completions lsc ON lsc.session_id = ls.id AND lsc.student_id = :userId
      WHERE ls.id = :id
    `, { id, userId });

    const session = (rows as any[])[0];
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /academic/lab-sessions/:id/complete — mark attendance/report for a student
router.patch("/lab-sessions/:id/complete", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const sessionId = Number(req.params.id);
  try {
    const body = z.object({
      studentId:       z.number(),
      attended:        z.boolean().optional(),
      reportSubmitted: z.boolean().optional(),
    }).parse(req.body);

    await pool.query(`
      INSERT INTO lab_session_completions (session_id, student_id, attended, report_submitted, completed_at)
      VALUES (:sessionId, :studentId, :attended, :reportSubmitted, NOW())
      ON DUPLICATE KEY UPDATE
        attended         = COALESCE(VALUES(attended), attended),
        report_submitted = COALESCE(VALUES(report_submitted), report_submitted),
        completed_at     = IF(VALUES(attended) = TRUE AND VALUES(report_submitted) = TRUE, NOW(), completed_at)
    `, {
      sessionId,
      studentId:       body.studentId,
      attended:        body.attended ?? false,
      reportSubmitted: body.reportSubmitted ?? false,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// ============================================================
// STUDENT SEMESTER GROUP MEMBERSHIP
// ============================================================

// GET /academic/my-semester — get current user's semester group
router.get("/my-semester", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  try {
    const [rows] = await pool.query(`
      SELECT s.id, s.name, s.level
      FROM user_semester_groups usg
      JOIN semesters s ON s.id = usg.semester_id
      WHERE usg.user_id = :userId
      LIMIT 1
    `, { userId });
    res.json({ semester: (rows as any[])[0] ?? null });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /academic/my-semester — student joins a semester group
router.post("/my-semester", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  try {
    const { semesterId } = z.object({ semesterId: z.number() }).parse(req.body);
    await pool.query(
      `INSERT IGNORE INTO user_semester_groups (user_id, semester_id) VALUES (:userId, :semesterId)`,
      { userId, semesterId }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

// GET /academic/my-modules — enrolled modules for current user
router.get("/my-modules", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.code, m.name, s.name AS semesterName, s.id AS semesterId
      FROM module_enrollments me
      JOIN modules m ON me.module_id = m.id
      JOIN semesters s ON m.semester_id = s.id
      WHERE me.student_id = :userId
      ORDER BY s.level DESC, m.code ASC
    `, { userId });
    res.json({ modules: rows });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /academic/modules/:id/enroll — enroll in a module
router.post("/modules/:id/enroll", requireAuth, async (req: AuthedRequest, res) => {
  const moduleId = Number(req.params.id);
  const studentId = req.user!.id;
  if (!Number.isFinite(moduleId) || moduleId <= 0) return res.status(400).json({ error: "Invalid module id" });
  try {
    await pool.query(
      `INSERT IGNORE INTO module_enrollments (module_id, student_id) VALUES (:moduleId, :studentId)`,
      { moduleId, studentId }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
