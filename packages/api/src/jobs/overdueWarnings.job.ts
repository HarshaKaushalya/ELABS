import { pool } from "../db/mysql";

export async function runOverdueWarningsJob(): Promise<void> {
  const [result] = await pool.query(
    `
    UPDATE borrow_transactions
    SET status = 'OVERDUE'
    WHERE status = 'BORROWED'
      AND due_at IS NOT NULL
      AND due_at < NOW()
    `
  );

  const updated = Number((result as any).affectedRows ?? 0);
  if (updated > 0) {
    console.log(`[jobs] overdue warnings updated ${updated} transaction(s)`);
  }
}
