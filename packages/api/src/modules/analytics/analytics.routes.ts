import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { pool } from "../../db/mysql";

const router = Router();

/**
 * GET /analytics/overview
 * Comprehensive live analytics integrating inventory, attendance, borrowing, and lab occupancy.
 */
router.get("/overview", requireAuth, async (_req, res) => {
  try {
    // 1. Inventory stats & utilization
    const [invRows]: any = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowed,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance,
        SUM(CASE WHEN status = 'OUT_OF_SERVICE' THEN 1 ELSE 0 END) AS outOfService
      FROM inventory_items
    `);
    const inv = invRows[0] || {};
    const totalInv = Number(inv.total || 0);
    const borrowedInv = Number(inv.borrowed || 0);
    const availableInv = Number(inv.available || 0);
    const maintenanceInv = Number(inv.maintenance || 0);
    const outOfServiceInv = Number(inv.outOfService || 0);
    const invUtilizationRate = totalInv > 0 ? Math.round((borrowedInv / totalInv) * 100) : 0;

    // 2. Inventory by Category
    const [catRows]: any = await pool.query(`
      SELECT
        COALESCE(category, 'General') AS category,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowed
      FROM inventory_items
      GROUP BY category
      ORDER BY total DESC
    `);

    // 3. Inventory by Lab
    const [labInvRows]: any = await pool.query(`
      SELECT
        l.id AS labId,
        l.name AS labName,
        COUNT(i.id) AS total,
        SUM(CASE WHEN i.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN i.status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowed
      FROM labs l
      LEFT JOIN inventory_items i ON i.lab_id = l.id
      GROUP BY l.id, l.name
      ORDER BY total DESC
    `);

    // 4. Borrow Transactions & Overdue
    const [txStatsRows]: any = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'BORROWED' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) AS returned,
        SUM(CASE WHEN status = 'BORROWED' AND due_at IS NOT NULL AND due_at < NOW() THEN 1 ELSE 0 END) AS overdue
      FROM borrow_transactions
    `);
    const txStats = txStatsRows[0] || {};
    const totalTx = Number(txStats.total || 0);
    const activeTx = Number(txStats.active || 0);
    const returnedTx = Number(txStats.returned || 0);
    const overdueTx = Number(txStats.overdue || 0);
    const overdueRate = activeTx > 0 ? Number(((overdueTx / activeTx) * 100).toFixed(1)) : 0;

    // 5. Attendance & Lab Occupancy
    const [attStatsRows]: any = await pool.query(`
      SELECT
        COUNT(*) AS totalAllTime,
        SUM(CASE WHEN DATE(entry_time) = CURDATE() THEN 1 ELSE 0 END) AS todayCount,
        SUM(CASE WHEN exit_time IS NULL THEN 1 ELSE 0 END) AS activeNow,
        AVG(CASE WHEN exit_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, entry_time, exit_time) ELSE NULL END) AS avgDuration
      FROM attendance_records
    `);
    const attStats = attStatsRows[0] || {};
    const totalAttendance = Number(attStats.totalAllTime || 0);
    const todayAttendance = Number(attStats.todayCount || 0);
    const activeHeadcount = Number(attStats.activeNow || 0);
    const avgDurationMinutes = Math.round(Number(attStats.avgDuration || 0));

    // 6. Current Lab Presence by Lab (headcount now vs total today)
    const [labPresenceRows]: any = await pool.query(`
      SELECT
        l.id AS labId,
        l.name AS labName,
        l.location,
        SUM(CASE WHEN a.exit_time IS NULL AND a.id IS NOT NULL THEN 1 ELSE 0 END) AS currentHeadcount,
        SUM(CASE WHEN DATE(a.entry_time) = CURDATE() THEN 1 ELSE 0 END) AS todayVisits
      FROM labs l
      LEFT JOIN attendance_records a ON a.lab_id = l.id
      GROUP BY l.id, l.name, l.location
      ORDER BY currentHeadcount DESC, l.name ASC
    `);

    // 7. Last 7 Days Attendance Trend
    const [dailyAttRows]: any = await pool.query(`
      SELECT
        DATE(entry_time) AS entryDate,
        DATE_FORMAT(entry_time, '%a, %d %b') AS label,
        COUNT(*) AS checkIns,
        COUNT(DISTINCT student_id) AS uniqueStudents
      FROM attendance_records
      WHERE entry_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(entry_time), label
      ORDER BY entryDate ASC
    `);

    // 8. Recent Integrated Activity Feed
    const [recentAtt]: any = await pool.query(`
      SELECT
        'ATTENDANCE' AS type,
        a.id AS id,
        u.full_name AS actorName,
        l.name AS labName,
        CASE WHEN a.exit_time IS NULL THEN 'CHECK_IN' ELSE 'CHECK_OUT' END AS action,
        COALESCE(a.exit_time, a.entry_time) AS timestamp
      FROM attendance_records a
      JOIN users u ON u.id = a.student_id
      JOIN labs l ON l.id = a.lab_id
      ORDER BY timestamp DESC
      LIMIT 6
    `);

    const [recentBorrows]: any = await pool.query(`
      SELECT
        'BORROW' AS type,
        t.id AS id,
        COALESCE(u.full_name, t.borrower_group_code, 'Student') AS actorName,
        l.name AS labName,
        t.status AS action,
        t.created_at AS timestamp
      FROM borrow_transactions t
      LEFT JOIN users u ON u.id = t.borrower_user_id
      JOIN labs l ON l.id = t.lab_id
      ORDER BY t.created_at DESC
      LIMIT 6
    `);

    const combinedActivity = [...recentAtt, ...recentBorrows]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    // 9. Total registered students and users
    const [usersCountRows]: any = await pool.query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN r.name = 'STUDENT' THEN 1 ELSE 0 END) AS totalStudents,
        SUM(CASE WHEN r.name IN ('LECTURER', 'TECHNICIAN', 'SYSTEM_ADMIN') THEN 1 ELSE 0 END) AS totalStaff
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
    `);
    const usersCount = usersCountRows[0] || {};

    return res.json({
      summary: {
        totalEquipment: totalInv,
        availableEquipment: availableInv,
        borrowedEquipment: borrowedInv,
        maintenanceEquipment: maintenanceInv,
        outOfServiceEquipment: outOfServiceInv,
        equipmentUtilizationRate: invUtilizationRate,
        totalBorrows: totalTx,
        activeBorrows: activeTx,
        returnedBorrows: returnedTx,
        overdueBorrows: overdueTx,
        overdueRate,
        totalAttendance,
        todayAttendance,
        activeHeadcount,
        avgDurationMinutes,
        totalUsers: Number(usersCount.totalUsers || 0),
        totalStudents: Number(usersCount.totalStudents || 0),
        totalStaff: Number(usersCount.totalStaff || 0),
        totalLabs: labPresenceRows.length,
      },
      categories: catRows,
      byLab: labInvRows,
      labPresence: labPresenceRows,
      dailyAttendance: dailyAttRows,
      activityFeed: combinedActivity,
    });
  } catch (err: any) {
    console.error("Analytics overview API error:", err);
    return res.status(500).json({ error: "Failed to generate analytics overview" });
  }
});

export default router;
