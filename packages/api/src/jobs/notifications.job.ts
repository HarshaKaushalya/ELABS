import { pool } from "../db/mysql";

export async function runNotificationsJob(): Promise<void> {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS dueSoon
    FROM borrow_transactions
    WHERE status = 'BORROWED'
      AND due_at IS NOT NULL
      AND due_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
    `
  );

  const dueSoon = Number((rows as any[])[0]?.dueSoon ?? 0);
  if (dueSoon > 0) {
    console.log(`[jobs] notifications ${dueSoon} transaction(s) due within 24h`);
  }
}
