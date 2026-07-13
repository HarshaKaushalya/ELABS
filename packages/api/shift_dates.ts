import { pool } from "./src/db/mysql";

async function main() {
  // Let's inspect unique years in lab_sessions
  const [sessionRows] = await pool.query(
    "SELECT id, scheduled_date FROM lab_sessions"
  );
  console.log("Lab Sessions count:", sessionRows.length);
  if (sessionRows.length > 0) {
    console.log("Unique years in lab_sessions:", [...new Set(sessionRows.map((r: any) => r.scheduled_date ? new Date(r.scheduled_date).getFullYear() : null))]);
  }

  // Shift timetable_slots back by 1 year
  const [res1] = await pool.query(
    "UPDATE timetable_slots SET session_date = DATE_SUB(session_date, INTERVAL 1 YEAR)"
  );
  console.log("Shifted timetable_slots:", res1);

  // Shift lab_sessions back by 1 year (if any)
  const [res2] = await pool.query(
    "UPDATE lab_sessions SET scheduled_date = DATE_SUB(scheduled_date, INTERVAL 1 YEAR) WHERE scheduled_date IS NOT NULL"
  );
  console.log("Shifted lab_sessions:", res2);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
