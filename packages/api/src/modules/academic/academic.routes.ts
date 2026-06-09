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

// GET /academic/semesters/:id — semester detail with modules + practicals count
router.get("/semesters/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  try {
    const [semRows] = await pool.query(
      `SELECT id, name, level, coordinator_name AS coordinatorName FROM semesters WHERE id = :id`,
      { id }
    );
    const sem = (semRows as any[])[0];
    if (!sem) return res.status(404).json({ error: "Semester group not found" });

    const [modules] = await pool.query(`
      SELECT m.id, m.code, m.name,
             m.coordinator_name  AS coordinatorName,
             m.num_students      AS numStudents,
             COUNT(DISTINCT mp.id)                                          AS labCount,
             SUM(CASE WHEN mp.equip_status='Not Working' THEN 1 ELSE 0 END) AS brokenLabs,
             COUNT(DISTINCT ls.id)                                          AS totalSessions,
             SUM(CASE WHEN ls.status='UPCOMING'  THEN 1 ELSE 0 END)        AS upcomingSessions,
             SUM(CASE WHEN ls.status='COMPLETED' THEN 1 ELSE 0 END)        AS completedSessions
      FROM modules m
      LEFT JOIN module_practicals mp ON mp.module_code = m.code
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

// GET /academic/modules/:id — module detail with practicals, timetable + lab sessions
router.get("/modules/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  try {
    const [modRows] = await pool.query(`
      SELECT m.id, m.code, m.name,
             m.coordinator_name AS coordinatorName,
             m.num_students     AS numStudents,
             s.id AS semesterId, s.name AS semesterName,
             s.coordinator_name AS semesterCoordinator
      FROM modules m
      JOIN semesters s ON s.id = m.semester_id
      WHERE m.id = :id
    `, { id });
    const mod = (modRows as any[])[0];
    if (!mod) return res.status(404).json({ error: "Module not found" });

    // Practicals list
    const [practicals] = await pool.query(`
      SELECT id, lab_number AS labNumber, lab_title AS labTitle,
             equip_status AS equipStatus, num_sessions AS numSessions, notes, sort_order AS sortOrder
      FROM module_practicals
      WHERE module_code = :code
      ORDER BY sort_order ASC, lab_number ASC
    `, { code: mod.code });

    // Timetable slots for this module
    const [schedule] = await pool.query(`
      SELECT id, session_date AS sessionDate, time_slot AS timeSlot,
             lab_label AS labLabel, group_code AS groupCode, academic_year AS academicYear
      FROM timetable_slots
      WHERE module_code = :code
      ORDER BY session_date ASC, time_slot ASC, group_code ASC
    `, { code: mod.code });

    // Lab sessions with completion status
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

    res.json({ module: mod, practicals, schedule, sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /academic/modules/:id — admin updates coordinator / num_students
router.patch("/modules/:id", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  try {
    const body = z.object({
      coordinatorName: z.string().max(150).optional(),
      numStudents:     z.number().int().optional(),
      name:            z.string().max(120).optional(),
    }).parse(req.body);

    await pool.query(
      `UPDATE modules SET
         coordinator_name = COALESCE(:coordinatorName, coordinator_name),
         num_students     = COALESCE(:numStudents, num_students),
         name             = COALESCE(:name, name)
       WHERE id = :id`,
      { id, coordinatorName: body.coordinatorName ?? null, numStudents: body.numStudents ?? null, name: body.name ?? null }
    );
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: "Invalid request" }); }
});

// PUT /academic/modules/:id/practicals — admin replaces practicals list
router.put("/modules/:id/practicals", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  try {
    const [modRows] = await pool.query(`SELECT code FROM modules WHERE id = :id`, { id });
    const mod = (modRows as any[])[0];
    if (!mod) return res.status(404).json({ error: "Module not found" });

    const { practicals } = z.object({
      practicals: z.array(z.object({
        labNumber:   z.string().max(20),
        labTitle:    z.string().max(255).optional(),
        equipStatus: z.enum(["Working", "Not Working", "Under Maintenance"]).optional(),
        numSessions: z.number().int().optional(),
        notes:       z.string().optional(),
        sortOrder:   z.number().int().optional(),
      }))
    }).parse(req.body);

    // Delete existing and re-insert
    await pool.query(`DELETE FROM module_practicals WHERE module_code = :code`, { code: mod.code });
    if (practicals.length > 0) {
      const rows = practicals.map((p, i) => [mod.code, p.labNumber, p.labTitle ?? null, p.equipStatus ?? 'Working', p.numSessions ?? 0, p.notes ?? null, p.sortOrder ?? i + 1]);
      await pool.query(
        `INSERT INTO module_practicals (module_code, lab_number, lab_title, equip_status, num_sessions, notes, sort_order) VALUES ?`,
        [rows]
      );
    }
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: "Invalid request" }); }
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
