import { pool } from "../db/mysql";
import { createNotification, notifyUsersByRole } from "../modules/notifications/notifications.service";

export async function runNotificationsJob(): Promise<void> {
  try {
    // 1. Remind borrowers with equipment due within 24 hours
    const [dueSoonRows] = await pool.query(
      `
      SELECT t.id, t.borrower_user_id, t.due_at, l.name as lab_name,
             u.full_name as borrower_name
      FROM borrow_transactions t
      JOIN labs l ON l.id = t.lab_id
      JOIN users u ON u.id = t.borrower_user_id
      WHERE t.status = 'BORROWED'
        AND t.due_at IS NOT NULL
        AND t.due_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
      `
    );

    for (const tx of dueSoonRows as any[]) {
      // Deduplicate: check if a reminder for this tx was created in the last 20 hours
      const [existing] = await pool.query(
        `SELECT id FROM notifications 
         WHERE user_id = :uid 
           AND type = 'LAB_REMINDER' 
           AND JSON_EXTRACT(meta, '$.transactionId') = :txId
           AND created_at > DATE_SUB(NOW(), INTERVAL 20 HOUR)
         LIMIT 1`,
        { uid: tx.borrower_user_id, txId: String(tx.id) }
      );

      if ((existing as any[]).length === 0) {
        const dueFormatted = new Date(tx.due_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        await createNotification(
          tx.borrower_user_id,
          "LAB_REMINDER",
          "Equipment Return Due Soon",
          `Your borrowed laboratory items for transaction #${tx.id} (${tx.lab_name}) are due for return by ${dueFormatted}. Please return on time.`,
          { transactionId: tx.id, url: "/inventory" }
        );
      }
    }

    // 2. Alert borrowers with overdue equipment (due_at < NOW)
    const [overdueRows] = await pool.query(
      `
      SELECT t.id, t.borrower_user_id, t.due_at, l.name as lab_name,
             u.full_name as borrower_name,
             COALESCE(sp.reg_number, u.index_no) as index_no
      FROM borrow_transactions t
      JOIN labs l ON l.id = t.lab_id
      JOIN users u ON u.id = t.borrower_user_id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE t.status = 'BORROWED'
        AND t.due_at IS NOT NULL
        AND t.due_at < NOW()
      `
    );

    for (const tx of overdueRows as any[]) {
      // Deduplicate: check if an overdue alert for this tx was created in the last 24 hours
      const [existing] = await pool.query(
        `SELECT id FROM notifications 
         WHERE user_id = :uid 
           AND type = 'BORROW_OVERDUE' 
           AND JSON_EXTRACT(meta, '$.transactionId') = :txId
           AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
         LIMIT 1`,
        { uid: tx.borrower_user_id, txId: String(tx.id) }
      );

      if ((existing as any[]).length === 0) {
        const dueFormatted = new Date(tx.due_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        // Notify student
        await createNotification(
          tx.borrower_user_id,
          "BORROW_OVERDUE",
          "Overdue Equipment Return Alert",
          `Equipment for transaction #${tx.id} (${tx.lab_name}) was due on ${dueFormatted} and is now overdue. Please return the items to the lab immediately.`,
          { transactionId: tx.id, url: "/inventory" }
        );

        // Notify staff (technicians and admins)
        await notifyUsersByRole(
          ["TECHNICIAN", "SYSTEM_ADMIN"],
          "BORROW_OVERDUE",
          "Inventory Alert: Overdue Equipment",
          `Student ${tx.borrower_name} (${tx.index_no || "Student"}) has an overdue loan #${tx.id} in ${tx.lab_name} (was due ${dueFormatted}).`,
          { transactionId: tx.id, url: "/inventory" }
        );
      }
    }

    // 3. Remind students of scheduled lab practicals happening in the next 48 hours
    const [upcomingLabSlots] = await pool.query(
      `
      SELECT ts.id, ts.session_date, ts.day_of_week, ts.time_slot, ts.module_code, ts.group_code,
             COALESCE(ts.lab_name, ts.lab_label) AS lab_name,
             COALESCE(ts.practical_name, 'Lab Practical') AS practical_name,
             ts.instructor_name, m.name AS module_name, m.id AS module_id
      FROM timetable_slots ts
      LEFT JOIN modules m ON m.code = ts.module_code
      WHERE ts.status = 'UPCOMING'
        AND ts.session_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)
      `
    );

    for (const slot of upcomingLabSlots as any[]) {
      const [students] = await pool.query(
        `SELECT u.id, u.full_name
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
         WHERE :group = 'ALL'
            OR sp.group_code = :group
            OR sp.group_code = CONCAT('EE', LPAD(REPLACE(:group, 'EE', ''), 2, '0'))
            OR :group = CONCAT('EE', LPAD(REPLACE(sp.group_code, 'EE', ''), 2, '0'))`,
        { group: slot.group_code }
      );

      for (const st of students as any[]) {
        const [existing] = await pool.query(
          `SELECT id FROM notifications
           WHERE user_id = :uid
             AND type = 'LAB_REMINDER'
             AND JSON_EXTRACT(meta, '$.slotId') = :slotId
           LIMIT 1`,
          { uid: st.id, slotId: slot.id }
        );

        if ((existing as any[]).length === 0) {
          const dateStr = new Date(slot.session_date).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short"
          });

          const groupLabel = slot.group_code === "ALL" ? "" : ` (Group ${slot.group_code})`;

          await createNotification(
            st.id,
            "LAB_REMINDER",
            `Upcoming Practical${groupLabel}: ${slot.module_code}`,
            `You have ${slot.practical_name} scheduled for ${slot.group_code === "ALL" ? "your cohort" : `Group ${slot.group_code}`} on ${dateStr} (${slot.time_slot}) in ${slot.lab_name}. Please review the lab manual and safety guidelines before attending.`,
            {
              slotId: slot.id,
              groupCode: slot.group_code,
              moduleId: slot.module_id,
              url: slot.module_id ? `/labs/module/${slot.module_id}?tab=schedule` : "/dashboard"
            }
          );
        }
      }
    }
  } catch (err) {
    console.error("[jobs] notifications error:", err);
  }
}
