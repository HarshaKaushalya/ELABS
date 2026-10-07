import { Router } from "express";
import { AuthedRequest, requireAuth } from "../auth/auth.middleware";
import { pool } from "../../db/mysql";
import { z } from "zod";

const router = Router();

function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

// ─── 1. Scan Barcode / Student ID (Entry & Exit) ──────────────────────────────
router.post("/scan", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const schema = z.object({
      labId: z.coerce.number().positive("Valid Laboratory ID is required"),
      barcode: z.string().min(1, "Barcode / Student ID cannot be empty"),
      mode: z.enum(["AUTO", "ENTRY", "EXIT"]).default("AUTO"),
      method: z.string().default("BARCODE"),
    });

    const { labId, barcode, mode, method } = schema.parse(req.body);
    const rawCode = barcode.trim();

    // Generate potential registration number and email permutations
    const variations = [
      rawCode,
      rawCode.toUpperCase(),
      rawCode.toLowerCase(),
    ];

    const matchEg = rawCode.match(/EG\/?(\d{2,4})\/?(\d{4})/i);
    if (matchEg) {
      const yr = matchEg[1].length === 2 ? `20${matchEg[1]}` : matchEg[1];
      const num = matchEg[2];
      variations.push(`EG/${yr}/${num}`);
      variations.push(`eg${yr.slice(-2)}${num}@engug.ruh.ac.lk`);
      variations.push(`EG${yr}${num}`);
      variations.push(`EG${yr.slice(-2)}${num}`);
    }

    const digitsOnly = rawCode.replace(/\D/g, "");
    const numericId = Number(digitsOnly);

    if (digitsOnly) {
      variations.push(digitsOnly);
    }

    // If barcode is a 12-digit Sri Lankan NIC (e.g. 200225401582) or 10-digit old NIC (e.g. 2002540158V)
    // also extract potential embedded 4-digit student numbers
    const embeddedCandidates: string[] = [];
    if (digitsOnly.length >= 8) {
      for (let i = 0; i <= digitsOnly.length - 4; i++) {
        const sub = digitsOnly.substring(i, i + 4);
        const subNum = Number(sub);
        if (subNum >= 4000 && subNum <= 6000) {
          embeddedCandidates.push(sub);
          embeddedCandidates.push(`EG/2022/${sub}`);
          embeddedCandidates.push(`EG/2021/${sub}`);
          embeddedCandidates.push(`EG/2023/${sub}`);
        }
      }
    }

    // 1. Resolve Student from users + student_profiles
    const [userRows] = await pool.query(
      `
      SELECT u.id, u.full_name AS fullName, u.email,
             COALESCE(u.index_no, sp.reg_number) AS regNo,
             COALESCE(u.nic, sp.nic) AS nic,
             sp.group_code AS groupCode, sp.department, sp.semester
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.index_no IN (:variations)
         OR u.email IN (:variations)
         OR sp.reg_number IN (:variations)
         OR u.nic IN (:variations)
         OR u.barcode IN (:variations)
         OR sp.nic IN (:variations)
         OR (:numId > 0 AND u.id = :numId)
         OR (LENGTH(:digits) >= 4 AND (
              u.index_no LIKE :likeDigits
              OR sp.reg_number LIKE :likeDigits
              OR u.email LIKE :likeDigits
              OR u.nic LIKE :likeDigits
              OR u.barcode LIKE :likeDigits
            ))
         OR u.index_no IN (:embedded)
         OR sp.reg_number IN (:embedded)
      LIMIT 1
      `,
      {
        variations,
        numId: numericId && numericId < 100000 ? numericId : 0,
        digits: digitsOnly,
        likeDigits: `%${digitsOnly}%`,
        embedded: embeddedCandidates.length > 0 ? embeddedCandidates : ["__none__"],
      }
    ) as any[];

    const student = userRows[0];
    if (!student) {
      return res.status(404).json({
        error: `No student record found matching ID/Barcode "${barcode}". Please verify credentials.`,
      });
    }

    // 2. Fetch lab details
    const [labRows] = await pool.query(`SELECT id, name FROM labs WHERE id = :labId LIMIT 1`, { labId }) as any[];
    const lab = labRows[0];
    if (!lab) {
      return res.status(404).json({ error: "Selected Laboratory does not exist." });
    }

    // 3. Check if student has an active session in this lab (exit_time IS NULL)
    const [activeRows] = await pool.query(
      `
      SELECT id, entry_time AS entryTime
      FROM attendance_records
      WHERE lab_id = :labId AND student_id = :studentId AND exit_time IS NULL
      ORDER BY id DESC LIMIT 1
      `,
      { labId, studentId: student.id }
    ) as any[];

    const activeSession = activeRows[0];

    // Determine Action:
    // If mode is ENTRY: must enter (or notify if already inside)
    // If mode is EXIT: must exit (or notify if not inside)
    // If mode is AUTO: if inside -> EXIT, if not inside -> ENTRY
    let resolvedAction: "ENTRY" | "EXIT" = "ENTRY";
    if (mode === "EXIT") {
      resolvedAction = "EXIT";
    } else if (mode === "ENTRY") {
      resolvedAction = "ENTRY";
    } else {
      // AUTO mode
      resolvedAction = activeSession ? "EXIT" : "ENTRY";
    }

    if (resolvedAction === "ENTRY") {
      if (activeSession) {
        return res.status(400).json({
          error: `${student.fullName} (${student.regNo || student.email}) is already checked into ${lab.name}.`,
          activeRecordId: activeSession.id,
          entryTime: activeSession.entryTime,
          student,
        });
      }

      // Check if student is active in any other lab and auto-exit or warn
      const [otherLabRows] = await pool.query(
        `
        SELECT a.id, a.lab_id AS labId, l.name AS labName, a.entry_time AS entryTime
        FROM attendance_records a
        JOIN labs l ON l.id = a.lab_id
        WHERE a.student_id = :studentId AND a.exit_time IS NULL AND a.lab_id != :labId
        ORDER BY a.id DESC LIMIT 1
        `,
        { studentId: student.id, labId }
      ) as any[];

      // If active in another lab, auto-exit them from the previous lab
      if (otherLabRows.length > 0) {
        const prev = otherLabRows[0];
        await pool.query(
          `UPDATE attendance_records SET exit_time = NOW() WHERE id = :prevId`,
          { prevId: prev.id }
        );
      }

      // Record ENTRY
      const [insertResult] = await pool.query(
        `
        INSERT INTO attendance_records (lab_id, student_id, entry_time, method)
        VALUES (:labId, :studentId, NOW(), :method)
        `,
        { labId, studentId: student.id, method }
      ) as any[];

      return res.json({
        success: true,
        action: "ENTRY",
        recordId: insertResult.insertId,
        labName: lab.name,
        labId: lab.id,
        entryTime: new Date().toISOString(),
        student: {
          id: student.id,
          fullName: student.fullName,
          regNo: student.regNo,
          email: student.email,
          groupCode: student.groupCode || "General",
          department: student.department || "Engineering",
          semester: student.semester || 5,
        },
        message: `Welcome, ${student.fullName}! Marked entry to ${lab.name}.`,
      });
    }

    if (resolvedAction === "EXIT") {
      if (!activeSession) {
        return res.status(400).json({
          error: `${student.fullName} (${student.regNo || student.email}) is not currently checked into ${lab.name}.`,
          student,
        });
      }

      // Record EXIT
      await pool.query(
        `UPDATE attendance_records SET exit_time = NOW() WHERE id = :recordId`,
        { recordId: activeSession.id }
      );

      const entryDate = new Date(activeSession.entryTime);
      const exitDate = new Date();
      const diffMinutes = Math.max(0, Math.round((exitDate.getTime() - entryDate.getTime()) / (60 * 1000)));

      return res.json({
        success: true,
        action: "EXIT",
        recordId: activeSession.id,
        labName: lab.name,
        labId: lab.id,
        entryTime: activeSession.entryTime,
        exitTime: exitDate.toISOString(),
        durationMinutes: diffMinutes,
        durationFormatted: formatDuration(diffMinutes),
        student: {
          id: student.id,
          fullName: student.fullName,
          regNo: student.regNo,
          email: student.email,
          groupCode: student.groupCode || "General",
          department: student.department || "Engineering",
          semester: student.semester || 5,
        },
        message: `Goodbye, ${student.fullName}! Exited ${lab.name} (Duration: ${formatDuration(diffMinutes)}).`,
      });
    }
  } catch (err: any) {
    console.error("Attendance scan error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error during barcode processing" });
  }
});

// ─── 2. Manual Exit Single Record ─────────────────────────────────────────────
router.post("/manual-exit", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { recordId } = z.object({ recordId: z.coerce.number().positive() }).parse(req.body);

    const [rows] = await pool.query(
      `
      SELECT a.id, a.entry_time AS entryTime, u.full_name AS fullName, l.name AS labName
      FROM attendance_records a
      JOIN users u ON u.id = a.student_id
      JOIN labs l ON l.id = a.lab_id
      WHERE a.id = :recordId AND a.exit_time IS NULL
      LIMIT 1
      `,
      { recordId }
    ) as any[];

    if (rows.length === 0) {
      return res.status(404).json({ error: "Active attendance record not found or already exited." });
    }

    await pool.query(`UPDATE attendance_records SET exit_time = NOW() WHERE id = :recordId`, { recordId });

    return res.json({
      success: true,
      message: `Marked exit for ${rows[0].fullName} from ${rows[0].labName}.`,
    });
  } catch (err: any) {
    console.error("Manual exit error:", err);
    return res.status(500).json({ error: err?.message || "Failed to mark exit" });
  }
});

// ─── 3. Exit All Students in a Specific Laboratory ────────────────────────────
router.post("/exit-all", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { labId } = z.object({ labId: z.coerce.number().positive() }).parse(req.body);

    const [result] = await pool.query(
      `UPDATE attendance_records SET exit_time = NOW() WHERE lab_id = :labId AND exit_time IS NULL`,
      { labId }
    ) as any[];

    return res.json({
      success: true,
      exitedCount: result.affectedRows ?? 0,
      message: `Exited all ${result.affectedRows ?? 0} active students from laboratory.`,
    });
  } catch (err: any) {
    console.error("Exit all error:", err);
    return res.status(500).json({ error: err?.message || "Failed to exit all students" });
  }
});

// ─── 4. Currently Active Students in Lab ──────────────────────────────────────
router.get("/active", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const labId = Number(req.query.labId) || 0;

    const [rows] = await pool.query(
      `
      SELECT a.id AS recordId, a.lab_id AS labId, l.name AS labName,
             a.student_id AS studentId, a.entry_time AS entryTime,
             COALESCE(a.method, 'BARCODE') AS method,
             TIMESTAMPDIFF(MINUTE, a.entry_time, NOW()) AS durationMinutes,
             u.full_name AS fullName, u.email,
             COALESCE(u.index_no, sp.reg_number) AS regNo,
             sp.group_code AS groupCode, sp.department, sp.semester
      FROM attendance_records a
      JOIN labs l ON l.id = a.lab_id
      JOIN users u ON u.id = a.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE a.exit_time IS NULL
        AND (:labId = 0 OR a.lab_id = :labId)
      ORDER BY a.entry_time DESC
      `,
      { labId }
    ) as any[];

    const activeStudents = rows.map((r: any) => ({
      ...r,
      durationFormatted: formatDuration(r.durationMinutes ?? 0),
    }));

    return res.json({
      count: activeStudents.length,
      activeStudents,
    });
  } catch (err: any) {
    console.error("Fetch active attendance error:", err);
    return res.status(500).json({ error: "Failed to fetch active attendance" });
  }
});

// ─── 5. Historical Attendance Records & Logs ──────────────────────────────────
router.get("/history", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const labId = Number(req.query.labId) || 0;
    const date = req.query.date ? String(req.query.date) : null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 25));
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `
      SELECT a.id AS recordId, a.lab_id AS labId, l.name AS labName,
             a.student_id AS studentId, a.entry_time AS entryTime, a.exit_time AS exitTime,
             COALESCE(a.method, 'BARCODE') AS method,
             TIMESTAMPDIFF(MINUTE, a.entry_time, COALESCE(a.exit_time, NOW())) AS durationMinutes,
             CASE WHEN a.exit_time IS NULL THEN 'ACTIVE' ELSE 'COMPLETED' END AS status,
             u.full_name AS fullName, u.email,
             COALESCE(u.index_no, sp.reg_number) AS regNo,
             sp.group_code AS groupCode, sp.department, sp.semester
      FROM attendance_records a
      JOIN labs l ON l.id = a.lab_id
      JOIN users u ON u.id = a.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE (:labId = 0 OR a.lab_id = :labId)
        AND (:date IS NULL OR DATE(a.entry_time) = :date)
        AND (:search IS NULL OR (
          u.full_name LIKE :searchLike
          OR u.email LIKE :searchLike
          OR u.index_no LIKE :searchLike
          OR sp.reg_number LIKE :searchLike
          OR sp.group_code LIKE :searchLike
        ))
      ORDER BY a.entry_time DESC
      LIMIT :limit OFFSET :offset
      `,
      {
        labId,
        date,
        search,
        searchLike: `%${search}%`,
        limit,
        offset,
      }
    ) as any[];

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM attendance_records a
      JOIN users u ON u.id = a.student_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE (:labId = 0 OR a.lab_id = :labId)
        AND (:date IS NULL OR DATE(a.entry_time) = :date)
        AND (:search IS NULL OR (
          u.full_name LIKE :searchLike
          OR u.email LIKE :searchLike
          OR u.index_no LIKE :searchLike
          OR sp.reg_number LIKE :searchLike
          OR sp.group_code LIKE :searchLike
        ))
      `,
      {
        labId,
        date,
        search,
        searchLike: `%${search}%`,
      }
    ) as any[];

    const total = Number(countRows[0]?.total ?? 0);
    const records = rows.map((r: any) => ({
      ...r,
      durationFormatted: formatDuration(r.durationMinutes ?? 0),
    }));

    return res.json({
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err: any) {
    console.error("Attendance history error:", err);
    return res.status(500).json({ error: "Failed to fetch attendance history" });
  }
});

// ─── 6. Attendance Summary & Hourly Trends ────────────────────────────────────
router.get("/stats", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const labId = Number(req.query.labId) || 0;

    // Total entries today
    const [todayCountRows] = await pool.query(
      `
      SELECT COUNT(*) AS totalToday
      FROM attendance_records
      WHERE DATE(entry_time) = CURDATE()
        AND (:labId = 0 OR lab_id = :labId)
      `,
      { labId }
    ) as any[];

    // Currently active students
    const [activeCountRows] = await pool.query(
      `
      SELECT COUNT(*) AS activeNow
      FROM attendance_records
      WHERE exit_time IS NULL
        AND (:labId = 0 OR lab_id = :labId)
      `,
      { labId }
    ) as any[];

    // Completed today & avg duration
    const [completedRows] = await pool.query(
      `
      SELECT COUNT(*) AS completedToday,
             COALESCE(AVG(TIMESTAMPDIFF(MINUTE, entry_time, exit_time)), 0) AS avgMinutes
      FROM attendance_records
      WHERE DATE(entry_time) = CURDATE()
        AND exit_time IS NOT NULL
        AND (:labId = 0 OR lab_id = :labId)
      `,
      { labId }
    ) as any[];

    // Hourly distribution today (8 AM to 6 PM)
    const [hourlyRows] = await pool.query(
      `
      SELECT HOUR(entry_time) AS hr,
             COUNT(*) AS entries,
             SUM(CASE WHEN exit_time IS NOT NULL AND HOUR(exit_time) = HOUR(entry_time) THEN 1 ELSE 0 END) AS exits
      FROM attendance_records
      WHERE DATE(entry_time) = CURDATE()
        AND (:labId = 0 OR lab_id = :labId)
      GROUP BY HOUR(entry_time)
      ORDER BY hr ASC
      `,
      { labId }
    ) as any[];

    const hoursLabels = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];
    const hourlyMap = new Map();
    for (const h of hourlyRows) {
      hourlyMap.set(Number(h.hr), { entries: Number(h.entries), exits: Number(h.exits) });
    }

    const hourly = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((h, i) => {
      const data = hourlyMap.get(h) || { entries: 0, exits: 0 };
      return {
        label: hoursLabels[i],
        hour: h,
        entries: data.entries,
        exits: data.exits,
      };
    });

    return res.json({
      totalToday: Number(todayCountRows[0]?.totalToday ?? 0),
      activeNow: Number(activeCountRows[0]?.activeNow ?? 0),
      completedToday: Number(completedRows[0]?.completedToday ?? 0),
      avgMinutes: Math.round(Number(completedRows[0]?.avgMinutes ?? 0)),
      hourly,
    });
  } catch (err: any) {
    console.error("Attendance stats error:", err);
    return res.status(500).json({ error: "Failed to fetch attendance stats" });
  }
});

// ─── 7. Student Personal Attendance History ───────────────────────────────────
router.get("/my-records", requireAuth, async (req: AuthedRequest, res) => {
  const studentId = req.user!.id;
  try {
    const [rows] = await pool.query(
      `
      SELECT a.id, a.entry_time AS entryTime, a.exit_time AS exitTime,
             COALESCE(a.method, 'BARCODE') AS method,
             l.name AS labName,
             TIMESTAMPDIFF(MINUTE, a.entry_time, COALESCE(a.exit_time, NOW())) AS durationMinutes,
             CASE WHEN a.exit_time IS NULL THEN 'ACTIVE' ELSE 'COMPLETED' END AS status
      FROM attendance_records a
      JOIN labs l ON l.id = a.lab_id
      WHERE a.student_id = :studentId
      ORDER BY a.entry_time DESC
      LIMIT 50
      `,
      { studentId }
    ) as any[];

    const attendance = rows.map((r: any) => ({
      ...r,
      durationFormatted: formatDuration(r.durationMinutes ?? 0),
    }));

    res.json({ attendance });
  } catch (err: any) {
    console.error("My records error:", err);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

// ─── 8. Legacy / Vision Service Endpoints ─────────────────────────────────────
router.post("/log", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const body = z.object({
      labId: z.coerce.number(),
      studentIds: z.array(z.string()),
    }).parse(req.body);

    let logged = 0;
    for (const reg of body.studentIds) {
      const [userRows] = await pool.query(
        `SELECT id FROM users WHERE index_no = :reg OR email = :reg LIMIT 1`,
        { reg }
      ) as any[];
      if (userRows.length > 0) {
        await pool.query(
          `
          INSERT INTO attendance_records (lab_id, student_id, entry_time, method)
          VALUES (:labId, :studentId, NOW(), 'FACIAL_RECOGNITION')
          `,
          { labId: body.labId, studentId: userRows[0].id }
        );
        logged++;
      }
    }
    res.json({ success: true, count: logged });
  } catch (err: any) {
    console.error("Vision log error:", err);
    res.status(500).json({ error: "Failed to log vision attendance" });
  }
});

router.post("/sync-occupancy", async (req, res) => {
  try {
    const { labId, count } = z.object({
      labId: z.coerce.number(),
      count: z.coerce.number(),
    }).parse(req.body);

    const [activeRecords] = await pool.query(
      `SELECT id, student_id FROM attendance_records WHERE lab_id = :labId AND exit_time IS NULL`,
      { labId }
    ) as any[];

    const currentCount = activeRecords.length;

    if (count > currentCount) {
      const diff = count - currentCount;
      const [availableStudents] = await pool.query(
        `SELECT id FROM users 
         WHERE id NOT IN (
           SELECT student_id FROM attendance_records WHERE lab_id = :labId AND exit_time IS NULL
         ) AND id >= 4 AND id <= 40 LIMIT :limit`,
        { labId, limit: diff }
      ) as any[];

      for (const student of availableStudents) {
        await pool.query(
          `INSERT INTO attendance_records (lab_id, student_id, entry_time, method)
           VALUES (:labId, :studentId, NOW(), 'FACIAL_RECOGNITION')`,
          { labId, studentId: student.id }
        );
      }
    } else if (count < currentCount) {
      const diff = currentCount - count;
      const recordsToExit = activeRecords.slice(0, diff);

      for (const record of recordsToExit) {
        await pool.query(
          `UPDATE attendance_records SET exit_time = NOW() WHERE id = :id`,
          { id: record.id }
        );
      }
    }

    res.json({ success: true, newCount: count });
  } catch (err: any) {
    console.error("Sync occupancy error:", err);
    res.status(500).json({ error: "Failed to sync occupancy" });
  }
});

export default router;
