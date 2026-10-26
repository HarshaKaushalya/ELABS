import { Router } from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";
import multer from "multer";
import { AuthedRequest, requireAuth } from "../auth/auth.middleware";
import { requirePermission } from "../../rbac/requirePermission";
import { pool } from "../../db/mysql";
import { createNotification } from "../notifications/notifications.service";

const router = Router();

// Staff verification helper (Admin, Technician, Lecturer)
async function isStaff(userId: number): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = :userId`,
    { userId }
  );
  const roles = (rows as any[]).map(r => r.name);
  return roles.some(r => ["SYSTEM_ADMIN", "TECHNICIAN", "LECTURER"].includes(r));
}

// Multer storage for lab manuals, safety guidelines & documents
const practicalsUploadDir = path.join(process.cwd(), "uploads", "practicals");
try {
  if (!fs.existsSync(practicalsUploadDir)) {
    fs.mkdirSync(practicalsUploadDir, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create practicals upload directory:", e);
}

const practicalStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, practicalsUploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${unique}-${cleanName}`);
  },
});

const practicalUpload = multer({
  storage: practicalStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".png", ".jpg", ".jpeg", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not allowed`));
  },
});

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

    // Practicals list with completion requirements & document counts
    const [practicals] = await pool.query(`
      SELECT mp.id, mp.lab_number AS labNumber, mp.lab_title AS labTitle,
             mp.equip_status AS equipStatus, mp.num_sessions AS numSessions, mp.notes, mp.sort_order AS sortOrder,
             mp.completion_requirements AS completionRequirements,
             mp.safety_guidelines AS safetyGuidelines,
             COUNT(pd.id) AS documentCount
      FROM module_practicals mp
      LEFT JOIN practical_documents pd ON pd.practical_id = mp.id
      WHERE mp.module_code = :code
      GROUP BY mp.id
      ORDER BY mp.sort_order ASC, mp.lab_number ASC
    `, { code: mod.code });

    // Semester-wide timetable slots (master schedule for all modules in this semester)
    const [schedule] = await pool.query(`
      SELECT ts.id, ts.session_date AS sessionDate, ts.day_of_week AS dayOfWeek, ts.time_slot AS timeSlot,
             ts.module_code AS moduleCode, m.name AS moduleName, m.id AS moduleId,
             COALESCE(ts.lab_name, ts.lab_label) AS labLabel,
             COALESCE(ts.lab_name, ts.lab_label) AS labName,
             ts.practical_name AS practicalName,
             ts.group_code AS groupCode, ts.academic_year AS academicYear,
             ts.instructor_name AS instructorName, ts.notes, ts.status,
             COALESCE(ts.semester_id, m.semester_id) AS semesterId
      FROM timetable_slots ts
      LEFT JOIN modules m ON m.code = ts.module_code
      WHERE ts.semester_id = :semId OR ts.module_code = :code OR m.semester_id = :semId
      ORDER BY ts.session_date ASC, ts.time_slot ASC, ts.group_code ASC
    `, { code: mod.code, semId: mod.semesterId });

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

// PATCH /academic/timetable/:id/status — admin updates timetable slot status
router.patch("/timetable/:id/status", requireAuth, requirePermission("admin:manage"), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  try {
    const { status } = z.object({
      status: z.enum(["UPCOMING", "COMPLETED", "CANCELLED"])
    }).parse(req.body);

    const [result] = await pool.query(
      `UPDATE timetable_slots SET status = :status WHERE id = :id`,
      { id, status }
    );
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: "Slot not found" });
    
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: "Invalid request" }); }
});

// ============================================================
// SEMESTER MASTER TIMETABLE (SPREADSHEET / EXCEL FORMAT)
// ============================================================

// GET /academic/semesters/:semesterId/timetable — master timetable for entire semester
router.get("/semesters/:semesterId/timetable", requireAuth, async (req, res) => {
  const semesterId = Number(req.params.semesterId);
  if (!Number.isFinite(semesterId) || semesterId <= 0) return res.status(400).json({ error: "Invalid semester id" });

  try {
    const [slots] = await pool.query(`
      SELECT ts.id, ts.session_date AS sessionDate, ts.day_of_week AS dayOfWeek, ts.time_slot AS timeSlot,
             ts.module_code AS moduleCode, m.name AS moduleName, m.id AS moduleId,
             COALESCE(ts.lab_name, ts.lab_label) AS labName,
             ts.practical_name AS practicalName,
             ts.group_code AS groupCode, ts.academic_year AS academicYear,
             ts.instructor_name AS instructorName, ts.notes, ts.status,
             COALESCE(ts.semester_id, m.semester_id) AS semesterId
      FROM timetable_slots ts
      LEFT JOIN modules m ON m.code = ts.module_code
      WHERE ts.semester_id = :semesterId OR m.semester_id = :semesterId
      ORDER BY ts.session_date ASC, ts.time_slot ASC, ts.group_code ASC
    `, { semesterId });

    const [modules] = await pool.query(`
      SELECT id, code, name FROM modules WHERE semester_id = :semesterId ORDER BY code ASC
    `, { semesterId });

    const [groups] = await pool.query(`
      SELECT DISTINCT group_code AS groupCode FROM student_profiles WHERE semester = :semesterId OR :semesterId = 6
      ORDER BY group_code ASC
    `, { semesterId });

    res.json({ slots, modules, groups: (groups as any[]).map((g: any) => g.groupCode) });
  } catch (err) {
    console.error("Failed to fetch semester timetable:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /academic/semesters/:semesterId/timetable — staff edits & saves master timetable
router.put("/semesters/:semesterId/timetable", requireAuth, async (req: AuthedRequest, res) => {
  const semesterId = Number(req.params.semesterId);
  const staff = await isStaff(req.user!.id);
  if (!staff) return res.status(403).json({ error: "Staff only." });

  try {
    const body = z.object({
      slots: z.array(z.object({
        id: z.number().optional(),
        sessionDate: z.string(),
        dayOfWeek: z.string().optional().nullable(),
        timeSlot: z.string(),
        moduleCode: z.string(),
        labName: z.string(),
        practicalName: z.string().optional().nullable(),
        groupCode: z.string(),
        academicYear: z.string().optional().default("2026/2027"),
        status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).optional().default("UPCOMING"),
        instructorName: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })),
      notifyStudents: z.boolean().optional().default(true),
    }).parse(req.body);

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // Delete existing slots for this semester
      await conn.query(`
        DELETE FROM timetable_slots 
        WHERE semester_id = :semesterId 
           OR module_code IN (SELECT code FROM modules WHERE semester_id = :semesterId)
      `, { semesterId });

      // Insert new slots
      for (const s of body.slots) {
        let day = s.dayOfWeek;
        if (!day && s.sessionDate) {
          const d = new Date(s.sessionDate);
          day = d.toLocaleDateString("en-US", { weekday: "long" });
        }

        await conn.query(`
          INSERT INTO timetable_slots
          (session_date, day_of_week, time_slot, module_code, lab_label, lab_name, practical_name, group_code, academic_year, status, semester_id, instructor_name, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          s.sessionDate,
          day || "Monday",
          s.timeSlot,
          s.moduleCode,
          s.moduleCode,
          s.labName,
          s.practicalName || null,
          s.groupCode,
          s.academicYear || "2026/2027",
          s.status || "UPCOMING",
          semesterId,
          s.instructorName || null,
          s.notes || null,
        ]);
      }

      await conn.commit();
      conn.release();

      // Dispatch notifications to students strictly for their corresponding group
      if (body.notifyStudents && body.slots.length > 0) {
        try {
          const groupSlotsMap = new Map<string, any[]>();
          for (const slot of body.slots) {
            const g = slot.groupCode || "ALL";
            if (!groupSlotsMap.has(g)) groupSlotsMap.set(g, []);
            groupSlotsMap.get(g)!.push(slot);
          }

          for (const [groupCode, groupSlots] of groupSlotsMap.entries()) {
            const [students] = await pool.query(`
              SELECT DISTINCT u.id 
              FROM users u
              JOIN student_profiles sp ON sp.user_id = u.id
              WHERE sp.semester = :semesterId 
                AND (
                  :groupCode = 'ALL'
                  OR sp.group_code = :groupCode
                  OR sp.group_code = CONCAT('EE', LPAD(REPLACE(:groupCode, 'EE', ''), 2, '0'))
                  OR :groupCode = CONCAT('EE', LPAD(REPLACE(sp.group_code, 'EE', ''), 2, '0'))
                )
            `, { semesterId, groupCode });

            const firstSlot = groupSlots[0];
            const title = groupCode === "ALL" 
              ? "Master Timetable Updated" 
              : `Lab Schedule Updated (Group ${groupCode})`;
            const bodyText = groupCode === "ALL"
              ? `General timetable updated with ${groupSlots.length} sessions.`
              : `Your lab schedule has been updated with ${groupSlots.length} sessions for Group ${groupCode}. Upcoming: ${firstSlot.practicalName || firstSlot.moduleCode} on ${firstSlot.sessionDate} (${firstSlot.timeSlot}) in ${firstSlot.labName}.`;

            for (const st of students as any[]) {
              await createNotification(
                st.id,
                "LAB_REMINDER",
                title,
                bodyText,
                { semesterId, groupCode, url: `/dashboard` }
              );
            }
          }
        } catch (notifErr) {
          console.error("Failed to notify students of timetable update:", notifErr);
        }
      }

      res.json({ ok: true, count: body.slots.length });
    } catch (e) {
      await conn.rollback();
      conn.release();
      throw e;
    }
  } catch (err: any) {
    console.error("Save timetable error:", err);
    res.status(400).json({ error: "Failed to save timetable", detail: err?.message });
  }
});

// DELETE /academic/timetable/:id — delete slot
router.delete("/timetable/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const staff = await isStaff(req.user!.id);
  if (!staff) return res.status(403).json({ error: "Staff only." });

  try {
    await pool.query(`DELETE FROM timetable_slots WHERE id = :id`, { id });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete slot" });
  }
});

// ============================================================
// PRACTICAL DETAILS & DOCUMENT MANAGEMENT
// ============================================================

// GET /academic/practicals/:id — get practical details + documents
router.get("/practicals/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [pracRows] = await pool.query(`
      SELECT mp.id, mp.module_code AS moduleCode, mp.lab_number AS labNumber,
             mp.lab_title AS labTitle, mp.equip_status AS equipStatus,
             mp.num_sessions AS numSessions, mp.notes, mp.sort_order AS sortOrder,
             mp.completion_requirements AS completionRequirements,
             mp.safety_guidelines AS safetyGuidelines,
             m.name AS moduleName, m.id AS moduleId, m.semester_id AS semesterId
      FROM module_practicals mp
      LEFT JOIN modules m ON m.code = mp.module_code
      WHERE mp.id = :id
    `, { id });

    const practical = (pracRows as any[])[0];
    if (!practical) return res.status(404).json({ error: "Practical not found" });

    const [docs] = await pool.query(`
      SELECT pd.id, pd.doc_type AS docType, pd.title, pd.file_name AS fileName,
             pd.file_url AS fileUrl, pd.file_size AS fileSize, pd.created_at AS createdAt,
             u.full_name AS uploadedByName
      FROM practical_documents pd
      LEFT JOIN users u ON u.id = pd.uploaded_by_user_id
      WHERE pd.practical_id = :id
      ORDER BY pd.created_at DESC
    `, { id });

    res.json({ practical, documents: docs });
  } catch (err) {
    console.error("Get practical error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /academic/practicals/:id — staff updates requirements & safety guidelines
router.patch("/practicals/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const staff = await isStaff(req.user!.id);
  if (!staff) return res.status(403).json({ error: "Staff only." });

  try {
    const body = z.object({
      labTitle: z.string().max(255).optional(),
      equipStatus: z.enum(["Working", "Not Working", "Under Maintenance"]).optional(),
      numSessions: z.number().int().optional(),
      notes: z.string().nullable().optional(),
      completionRequirements: z.string().nullable().optional(),
      safetyGuidelines: z.string().nullable().optional(),
    }).parse(req.body);

    await pool.query(`
      UPDATE module_practicals SET
        lab_title = COALESCE(:labTitle, lab_title),
        equip_status = COALESCE(:equipStatus, equip_status),
        num_sessions = COALESCE(:numSessions, num_sessions),
        notes = CASE WHEN :notes IS NOT NULL THEN :notes ELSE notes END,
        completion_requirements = CASE WHEN :completionRequirements IS NOT NULL THEN :completionRequirements ELSE completion_requirements END,
        safety_guidelines = CASE WHEN :safetyGuidelines IS NOT NULL THEN :safetyGuidelines ELSE safety_guidelines END
      WHERE id = :id
    `, {
      id,
      labTitle: body.labTitle ?? null,
      equipStatus: body.equipStatus ?? null,
      numSessions: body.numSessions ?? null,
      notes: body.notes !== undefined ? body.notes : null,
      completionRequirements: body.completionRequirements !== undefined ? body.completionRequirements : null,
      safetyGuidelines: body.safetyGuidelines !== undefined ? body.safetyGuidelines : null,
    });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: "Invalid request", detail: err?.message });
  }
});

// POST /academic/practicals/:id/documents — staff uploads lab manual, safety doc or guideline
router.post("/practicals/:id/documents", requireAuth, (req: AuthedRequest, res: any, next: any) => {
  practicalUpload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req: AuthedRequest, res) => {
  const practicalId = Number(req.params.id);
  const staff = await isStaff(req.user!.id);
  if (!staff) return res.status(403).json({ error: "Staff only." });

  try {
    const title = req.body.title || (req.file ? req.file.originalname : "Document");
    const docType = req.body.docType || "MANUAL";
    let fileUrl = req.body.fileUrl;
    let fileName = req.body.fileName || title;
    let fileSize = req.file ? req.file.size : null;

    if (req.file) {
      fileName = req.file.originalname;
      fileUrl = `/uploads/practicals/${req.file.filename}`;
    }

    if (!fileUrl) {
      return res.status(400).json({ error: "Either a file or document URL must be provided." });
    }

    const [result] = await pool.query(`
      INSERT INTO practical_documents 
      (practical_id, doc_type, title, file_name, file_url, file_size, uploaded_by_user_id)
      VALUES (:practicalId, :docType, :title, :fileName, :fileUrl, :fileSize, :uploadedBy)
    `, {
      practicalId,
      docType,
      title,
      fileName,
      fileUrl,
      fileSize,
      uploadedBy: req.user!.id,
    });

    res.json({
      ok: true,
      document: {
        id: (result as any).insertId,
        practicalId,
        docType,
        title,
        fileName,
        fileUrl,
        fileSize,
        createdAt: new Date().toISOString(),
      }
    });
  } catch (err: any) {
    console.error("Document upload error:", err);
    res.status(500).json({ error: "Failed to upload document", detail: err?.message });
  }
});

// DELETE /academic/practicals/:practicalId/documents/:docId — staff deletes document
router.delete("/practicals/:practicalId/documents/:docId", requireAuth, async (req: AuthedRequest, res) => {
  const practicalId = Number(req.params.practicalId);
  const docId = Number(req.params.docId);
  const staff = await isStaff(req.user!.id);
  if (!staff) return res.status(403).json({ error: "Staff only." });

  try {
    const [rows] = await pool.query(
      `SELECT file_url FROM practical_documents WHERE id = :docId AND practical_id = :practicalId`,
      { docId, practicalId }
    );
    const doc = (rows as any[])[0];
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Remove file if local
    if (doc.file_url && doc.file_url.startsWith("/uploads/practicals/")) {
      const diskPath = path.join(process.cwd(), doc.file_url);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); } catch {}
      }
    }

    await pool.query(
      `DELETE FROM practical_documents WHERE id = :docId AND practical_id = :practicalId`,
      { docId, practicalId }
    );

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete document", detail: err?.message });
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

// GET /academic/semesters/:semesterId/practicals — complete catalog/matrix of practicals for all modules in a semester
router.get("/semesters/:semesterId/practicals", requireAuth, async (req, res) => {
  const semesterId = Number(req.params.semesterId);
  if (!Number.isFinite(semesterId) || semesterId <= 0) return res.status(400).json({ error: "Invalid semester id" });

  try {
    const [rows] = await pool.query(`
      SELECT mp.id, mp.module_code AS moduleCode, mp.lab_number AS labNumber, mp.lab_title AS labTitle,
             mp.equip_status AS equipStatus, mp.num_sessions AS numSessions, mp.notes,
             mp.completion_requirements AS completionRequirements,
             mp.safety_guidelines AS safetyGuidelines,
             m.id AS moduleId, m.name AS moduleName, m.coordinator_name AS coordinatorName,
             (SELECT COUNT(*) FROM practical_documents pd WHERE pd.practical_id = mp.id) AS documentCount,
             COALESCE(
               (SELECT COALESCE(ts.lab_name, ts.lab_label) FROM timetable_slots ts WHERE ts.module_code = mp.module_code AND ts.practical_name = mp.lab_title LIMIT 1),
               'Engineering Laboratory'
             ) AS labVenue
      FROM module_practicals mp
      JOIN modules m ON m.code = mp.module_code
      WHERE m.semester_id = :semesterId
      ORDER BY m.code ASC, mp.sort_order ASC, mp.lab_number ASC
    `, { semesterId });

    res.json({ practicals: rows });
  } catch (err) {
    console.error("Failed to fetch semester practicals matrix:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /academic/semesters/:semesterId/students — list students enrolled in a semester with their group
router.get("/semesters/:semesterId/students", requireAuth, async (req: AuthedRequest, res) => {
  const semesterId = Number(req.params.semesterId);
  if (!Number.isFinite(semesterId) || semesterId <= 0) return res.status(400).json({ error: "Invalid semester id" });

  try {
    const [students] = await pool.query(`
      SELECT sp.user_id AS userId, u.full_name AS fullName, u.email,
             sp.reg_number AS regNumber, sp.group_code AS groupCode,
             sp.department, sp.semester
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.semester = :semesterId
         OR u.id IN (SELECT user_id FROM user_semester_groups WHERE semester_id = :semesterId)
      ORDER BY sp.group_code ASC, sp.reg_number ASC, u.full_name ASC
    `, { semesterId });

    const [groups] = await pool.query(`
      SELECT DISTINCT group_code AS groupCode
      FROM student_profiles
      WHERE (semester = :semesterId OR :semesterId = 6) AND group_code IS NOT NULL
      ORDER BY group_code ASC
    `, { semesterId });

    res.json({
      students,
      groups: (groups as any[]).map((g: any) => g.groupCode),
      totalCount: (students as any[]).length
    });
  } catch (err) {
    console.error("Failed to fetch semester students:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /academic/semesters/:semesterId/students/groups — staff updates group assignments
router.put("/semesters/:semesterId/students/groups", requireAuth, async (req: AuthedRequest, res) => {
  const staff = await isStaff(req.user!.id);
  if (!staff) return res.status(403).json({ error: "Staff only." });

  try {
    const body = z.object({
      assignments: z.array(z.object({
        userId: z.number(),
        groupCode: z.string().min(1).max(20)
      }))
    }).parse(req.body);

    for (const item of body.assignments) {
      await pool.query(`
        UPDATE student_profiles
        SET group_code = :groupCode
        WHERE user_id = :userId
      `, item);
    }

    res.json({ ok: true, updatedCount: body.assignments.length });
  } catch (err: any) {
    res.status(400).json({ error: "Failed to update groups", detail: err?.message });
  }
});

// POST /academic/semesters/:semesterId/students/auto-group — staff auto-distributes students into groups of N (default 7)
router.post("/semesters/:semesterId/students/auto-group", requireAuth, async (req: AuthedRequest, res) => {
  const semesterId = Number(req.params.semesterId);
  const staff = await isStaff(req.user!.id);
  if (!staff) return res.status(403).json({ error: "Staff only." });

  try {
    const { groupSize = 7, prefix = "EE" } = z.object({
      groupSize: z.number().int().min(1).max(50).optional().default(7),
      prefix: z.string().min(1).max(10).optional().default("EE")
    }).parse(req.body);

    const [students] = await pool.query(`
      SELECT sp.user_id, sp.reg_number
      FROM student_profiles sp
      WHERE sp.semester = :semesterId
      ORDER BY sp.reg_number ASC, sp.user_id ASC
    `, { semesterId });

    const studentList = students as any[];
    if (studentList.length === 0) {
      return res.status(400).json({ error: "No students found in this semester to group." });
    }

    let groupNum = 1;
    let inCurrentGroup = 0;
    const assignments: { userId: number; groupCode: string }[] = [];

    for (let i = 0; i < studentList.length; i++) {
      const gCode = `${prefix}${groupNum}`;
      assignments.push({ userId: studentList[i].user_id, groupCode: gCode });
      inCurrentGroup++;
      if (inCurrentGroup >= groupSize && i < studentList.length - 1) {
        groupNum++;
        inCurrentGroup = 0;
      }
    }

    for (const a of assignments) {
      await pool.query(`
        UPDATE student_profiles SET group_code = :groupCode WHERE user_id = :userId
      `, a);
    }

    res.json({
      ok: true,
      totalStudents: studentList.length,
      groupCount: groupNum,
      groupSize,
      prefix,
      message: `Successfully divided ${studentList.length} students into ${groupNum} groups of up to ${groupSize} students.`
    });
  } catch (err: any) {
    res.status(400).json({ error: "Auto-group failed", detail: err?.message });
  }
});

// GET /academic/my-semester — get current user's semester group and assigned student group
router.get("/my-semester", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  try {
    const [profRows] = await pool.query(`
      SELECT sp.semester, sp.group_code AS groupCode, sp.department, s.name AS semesterName, s.id AS semesterId, s.level
      FROM student_profiles sp
      LEFT JOIN semesters s ON s.id = sp.semester
      WHERE sp.user_id = :userId
      LIMIT 1
    `, { userId });
    const prof = (profRows as any[])[0];
    if (prof && prof.semester) {
      return res.json({
        semester: { id: prof.semesterId || prof.semester, name: prof.semesterName || `Semester ${prof.semester}`, level: prof.level || prof.semester },
        groupCode: prof.groupCode,
        department: prof.department
      });
    }

    const [rows] = await pool.query(`
      SELECT s.id, s.name, s.level
      FROM user_semester_groups usg
      JOIN semesters s ON s.id = usg.semester_id
      WHERE usg.user_id = :userId
      LIMIT 1
    `, { userId });
    res.json({ semester: (rows as any[])[0] ?? null, groupCode: null });
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
