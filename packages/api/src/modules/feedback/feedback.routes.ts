import { Router } from "express";
import { AuthedRequest, requireAuth } from "../auth/auth.middleware";
import { pool } from "../../db/mysql";
import { z } from "zod";

const router = Router();

// Ensure the student_feedback table exists
async function ensureFeedbackTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_no VARCHAR(32) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        user_name VARCHAR(120),
        user_email VARCHAR(120),
        user_reg_no VARCHAR(40),
        lab_id INT NULL,
        lab_name VARCHAR(150),
        category ENUM('EQUIPMENT_ISSUE', 'LAB_ENVIRONMENT', 'SAFETY_HAZARD', 'STAFF_SUPPORT', 'GENERAL_SUGGESTION') DEFAULT 'EQUIPMENT_ISSUE',
        priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status ENUM('SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED') DEFAULT 'SUBMITTED',
        staff_response TEXT NULL,
        responded_by VARCHAR(120) NULL,
        responded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Preload sample realistic tickets if table is empty
    const [rows] = await pool.query<any[]>("SELECT COUNT(*) AS cnt FROM student_feedback");
    if (rows[0]?.cnt === 0) {
      await pool.query(`
        INSERT INTO student_feedback (ticket_no, user_id, user_name, user_email, user_reg_no, lab_id, lab_name, category, priority, subject, description, status, staff_response, responded_by, responded_at)
        VALUES
          ('FB-2026-001', 1, 'Weerasinghe T.H.K', 'eg20225401@engug.ruh.ac.lk', 'EG/2022/5401', 3, 'Electronics and Measurement Laboratory', 'EQUIPMENT_ISSUE', 'HIGH', 'Rigol DS1054Z Channel 2 Probe Intermittent', 'Oscilloscope probe on Bench 4 Channel 2 drops signal whenever moved. Tested with 1kHz square wave calibration pin.', 'RESOLVED', 'Probe cable replaced with new 100MHz 10X probe from stores. Verified on calibration terminal.', 'Mr. K. Perera (TO)', NOW() - INTERVAL 2 DAY),
          ('FB-2026-002', 2, 'Dulanjana K.A.P', 'eg20225024@engug.ruh.ac.lk', 'EG/2022/5024', 1, 'Power Systems and High Voltage Laboratory', 'LAB_ENVIRONMENT', 'MEDIUM', 'AC unit 2 in HV impulse test room making grinding noise', 'The split AC unit near the 100kV transformer control cage is making heavy rattling noise during practical sessions.', 'UNDER_REVIEW', 'Maintenance request logged with Faculty Works and Maintenance Division. Technician inspection scheduled.', 'Ms. S. Madhubhashini (TO)', NOW() - INTERVAL 1 DAY),
          ('FB-2026-003', 3, 'Dassanayake D.M.P.S.P', 'eg20224983@engug.ruh.ac.lk', 'EG/2022/4983', 6, '24 × 7 Undergraduate Development Project Laboratory', 'GENERAL_SUGGESTION', 'LOW', 'Request for additional Arduino Mega 2560 boards for 6th sem design project', 'Four student project groups require Arduino Mega boards for hardware motor control and sensor acquisition.', 'RESOLVED', '5 additional Arduino Mega 2560 development kits and USB cables transferred from Department stores.', 'Dr. C.K. Walgampaya', NOW() - INTERVAL 5 HOUR);
      `);
    }
  } catch (err) {
    console.warn("Could not auto-create student_feedback table:", err);
  }
}

// Call on module load
ensureFeedbackTable().catch(console.error);

// ── 1. GET /feedback — List Tickets ──────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Check user roles
    const [roleRows] = await pool.query<any[]>(
      `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`,
      [userId]
    );
    const roles = roleRows.map(r => r.name);
    const isStaff = roles.some(r => ["SYSTEM_ADMIN", "LECTURER", "TECHNICIAN", "MODULE_COORDINATOR"].includes(r));

    let query = "SELECT * FROM student_feedback";
    const params: any[] = [];

    if (!isStaff) {
      // Students only see their own tickets
      query += " WHERE user_id = ?";
      params.push(userId);
    } else {
      // Staff can filter
      const { status, labId, category } = req.query;
      const conditions: string[] = [];

      if (status && typeof status === "string") {
        conditions.push("status = ?");
        params.push(status);
      }
      if (labId) {
        conditions.push("lab_id = ?");
        params.push(Number(labId));
      }
      if (category && typeof category === "string") {
        conditions.push("category = ?");
        params.push(category);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query<any[]>(query, params);
    return res.json(rows);
  } catch (err: any) {
    console.error("GET /feedback error:", err);
    return res.status(500).json({ error: "Failed to retrieve feedback tickets" });
  }
});

// ── 2. POST /feedback — Submit New Feedback ──────────────────────────────────
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const schema = z.object({
      labId: z.number().nullable().optional(),
      labName: z.string().nullable().optional(),
      category: z.enum(["EQUIPMENT_ISSUE", "LAB_ENVIRONMENT", "SAFETY_HAZARD", "STAFF_SUPPORT", "GENERAL_SUGGESTION"]),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
      subject: z.string().min(4, "Subject must be at least 4 characters"),
      description: z.string().min(10, "Please provide a detailed description"),
    });

    const parsed = schema.parse(req.body);

    // Fetch user details for ticket metadata
    const [uRows] = await pool.query<any[]>(
      "SELECT id, full_name, email, index_no FROM users WHERE id = ?",
      [userId]
    );
    const user = uRows[0] || { full_name: "Student", email: req.user?.email, index_no: "N/A" };

    // Generate readable sequential ticket number
    const [countRow] = await pool.query<any[]>("SELECT COUNT(*) AS cnt FROM student_feedback");
    const nextSeq = (countRow[0]?.cnt || 0) + 1;
    const ticketNo = `FB-2026-${String(nextSeq).padStart(3, "0")}`;

    await pool.query(
      `INSERT INTO student_feedback (ticket_no, user_id, user_name, user_email, user_reg_no, lab_id, lab_name, category, priority, subject, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [
        ticketNo,
        userId,
        user.full_name,
        user.email,
        user.index_no,
        parsed.labId || null,
        parsed.labName || "General Department",
        parsed.category,
        parsed.priority,
        parsed.subject.trim(),
        parsed.description.trim()
      ]
    );

    const [createdRows] = await pool.query<any[]>(
      "SELECT * FROM student_feedback WHERE ticket_no = ?",
      [ticketNo]
    );

    return res.status(201).json({
      message: "Feedback ticket submitted successfully",
      ticket: createdRows[0]
    });
  } catch (err: any) {
    console.error("POST /feedback error:", err);
    if (err.errors) {
      return res.status(400).json({ error: err.errors[0]?.message || "Validation failed" });
    }
    return res.status(500).json({ error: "Failed to submit feedback ticket" });
  }
});

// ── 3. PATCH /feedback/:id/status — Update Status & Staff Response ───────────
router.patch("/:id/status", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Only staff can update status
    const [roleRows] = await pool.query<any[]>(
      `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`,
      [userId]
    );
    const roles = roleRows.map(r => r.name);
    const isStaff = roles.some(r => ["SYSTEM_ADMIN", "LECTURER", "TECHNICIAN", "MODULE_COORDINATOR"].includes(r));
    if (!isStaff) return res.status(403).json({ error: "Only staff can update feedback tickets" });

    const schema = z.object({
      status: z.enum(["SUBMITTED", "UNDER_REVIEW", "RESOLVED", "CLOSED"]),
      staffResponse: z.string().optional(),
    });

    const { status, staffResponse } = schema.parse(req.body);
    const ticketId = Number(req.params.id);

    const [uRows] = await pool.query<any[]>("SELECT full_name FROM users WHERE id = ?", [userId]);
    const staffName = uRows[0]?.full_name || "Technical Officer";

    await pool.query(
      `UPDATE student_feedback 
       SET status = ?, staff_response = COALESCE(?, staff_response), responded_by = ?, responded_at = NOW()
       WHERE id = ?`,
      [status, staffResponse || null, staffName, ticketId]
    );

    const [updated] = await pool.query<any[]>("SELECT * FROM student_feedback WHERE id = ?", [ticketId]);
    return res.json({ message: "Ticket updated", ticket: updated[0] });
  } catch (err: any) {
    console.error("PATCH /feedback/:id/status error:", err);
    return res.status(500).json({ error: "Failed to update feedback ticket" });
  }
});

// ── 4. GET /feedback/stats — Overview Statistics ─────────────────────────────
router.get("/stats", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const [totalRows] = await pool.query<any[]>(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN status = 'UNDER_REVIEW' THEN 1 ELSE 0 END) AS under_review,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN priority = 'URGENT' THEN 1 ELSE 0 END) AS urgent
      FROM student_feedback
    `);

    return res.json(totalRows[0] || { total: 0, submitted: 0, under_review: 0, resolved: 0, urgent: 0 });
  } catch (err: any) {
    console.error("GET /feedback/stats error:", err);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
