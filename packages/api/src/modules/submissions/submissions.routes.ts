import { Router } from "express";
import { AuthedRequest, requireAuth } from "../auth/auth.middleware";
import { pool } from "../../db/mysql";

const router = Router();

// Submit a lab activity (prelab, report, quiz)
router.post("/:labId/submit", requireAuth, async (req: AuthedRequest, res) => {
  const labId = Number(req.params.labId);
  const studentId = req.user!.id;
  const { type, fileUrl } = req.body;

  if (!Number.isFinite(labId) || labId <= 0) return res.status(400).json({ error: "Invalid lab id" });
  if (!["PRELAB", "REPORT", "QUIZ"].includes(type)) return res.status(400).json({ error: "Invalid submission type" });

  try {
    const [result] = await pool.query(
      `INSERT INTO submissions (type, lab_id, student_id, file_url) VALUES (:type, :labId, :studentId, :fileUrl)`,
      { type, labId, studentId, fileUrl: fileUrl || null }
    );
    res.json({ success: true, submissionId: (result as any).insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get submissions for a student
router.get("/my-submissions", requireAuth, async (req: AuthedRequest, res) => {
  const studentId = req.user!.id;

  try {
    const [rows] = await pool.query(
      `
      SELECT s.id, s.type, s.file_url as fileUrl, s.marks, s.submitted_at as submittedAt, l.name as labName
      FROM submissions s
      JOIN labs l ON s.lab_id = l.id
      WHERE s.student_id = :studentId
      ORDER BY s.submitted_at DESC
      `,
      { studentId }
    );
    res.json({ submissions: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
