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
  } catch (err) {
    console.error("[jobs] notifications error:", err);
  }
}
