import { Router } from "express";
import { AuthedRequest, requireAuth } from "../auth/auth.middleware";
import { pool } from "../../db/mysql";
import { z } from "zod";

const router = Router();

// Used by the Vision service (or frontend) to log detected students
router.post("/log", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const body = z.object({
      labId: z.number(),
      studentIds: z.array(z.string())
    }).parse(req.body);

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      for (const studentRegNo of body.studentIds) {
        // Resolve student ID from regNo
        const [userRows] = await conn.query(
          `SELECT id FROM users WHERE reg_no = :regNo LIMIT 1`,
          { regNo: studentRegNo }
        );
        const user = (userRows as any[])[0];
        
        if (user) {
          await conn.query(
            `INSERT INTO attendance_records (lab_id, student_id, type, method)
             VALUES (:labId, :studentId, 'PRESENT', 'FACIAL_RECOGNITION')
             ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
             { labId: body.labId, studentId: user.id }
          );
        }
      }

      await conn.commit();
      res.json({ success: true, count: body.studentIds.length });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("Attendance log error:", e);
    res.status(500).json({ error: "Failed to log attendance" });
  }
});

// Used by students to check their own attendance
router.get("/my-records", requireAuth, async (req: AuthedRequest, res) => {
  const studentId = req.user!.id;
  try {
    const [rows] = await pool.query(
      `
      SELECT a.id, a.type, a.method, a.created_at as timeLogged, l.name as labName
      FROM attendance_records a
      JOIN labs l ON a.lab_id = l.id
      WHERE a.student_id = :studentId
      ORDER BY a.created_at DESC
      `,
      { studentId }
    );
    res.json({ attendance: rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

export default router;
