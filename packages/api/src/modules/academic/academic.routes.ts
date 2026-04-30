import { Router } from "express";
import { AuthedRequest, requireAuth } from "../auth/auth.middleware";
import { pool } from "../../db/mysql";

const router = Router();

// Get all semesters
router.get("/semesters", requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, level FROM semesters ORDER BY level ASC`
    );
    res.json({ semesters: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get modules for a semester
router.get("/semesters/:id/modules", requireAuth, async (req, res) => {
  const semesterId = Number(req.params.id);
  if (!Number.isFinite(semesterId) || semesterId <= 0) return res.status(400).json({ error: "Invalid semester id" });

  try {
    const [rows] = await pool.query(
      `SELECT id, code, name FROM modules WHERE semester_id = :semesterId ORDER BY code ASC`,
      { semesterId }
    );
    res.json({ modules: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Enroll current student in a module
router.post("/modules/:id/enroll", requireAuth, async (req: AuthedRequest, res) => {
  const moduleId = Number(req.params.id);
  const studentId = req.user!.id; 

  if (!Number.isFinite(moduleId) || moduleId <= 0) return res.status(400).json({ error: "Invalid module id" });

  try {
    await pool.query(
      `INSERT IGNORE INTO module_enrollments (module_id, student_id) VALUES (:moduleId, :studentId)`,
      { moduleId, studentId }
    );
    res.json({ success: true, message: "Enrolled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get modules the current student is enrolled in
router.get("/my-modules", requireAuth, async (req: AuthedRequest, res) => {
  const studentId = req.user!.id;

  try {
    const [rows] = await pool.query(
      `
      SELECT m.id, m.code, m.name, s.name as semesterName
      FROM module_enrollments me
      JOIN modules m ON me.module_id = m.id
      JOIN semesters s ON m.semester_id = s.id
      WHERE me.student_id = :studentId
      ORDER BY s.level DESC, m.code ASC
      `,
      { studentId }
    );
    res.json({ modules: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
