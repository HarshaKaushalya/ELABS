import { pool } from "./src/db/mysql";

async function main() {
  // 1. Update all timetable slots to be in the future (shift dates forward by ~14 months)
  console.log("Shifting timetable dates to future...");
  await pool.query(`ALTER TABLE timetable_slots ADD COLUMN status ENUM('UPCOMING', 'COMPLETED', 'CANCELLED') DEFAULT 'UPCOMING'`).catch(() => {});
  const [slots] = await pool.query(`SELECT id, session_date FROM timetable_slots`);
  let updated = 0;
  for (const slot of slots as any[]) {
    const oldDate = new Date(slot.session_date);
    // Shift forward by 14 months to bring into 2026 July onwards
    const newDate = new Date(oldDate);
    newDate.setMonth(newDate.getMonth() + 14);
    await pool.query(`UPDATE timetable_slots SET session_date = ?, status = 'UPCOMING' WHERE id = ?`, [newDate, slot.id]);
    updated++;
  }
  console.log(`Updated ${updated} timetable slots to future dates`);

  // 2. Clear must_change_password for all students so they can log in without being blocked
  console.log("\nClearing must_change_password flags...");
  const [r1] = await pool.query(`UPDATE users SET must_change_password = 0 WHERE must_change_password = 1`) as any;
  const [r2] = await pool.query(`UPDATE student_profiles SET must_change_password = 0 WHERE must_change_password = 1`) as any;
  console.log(`Cleared on users: ${r1.affectedRows}, student_profiles: ${r2.affectedRows}`);

  // 3. Show updated timetable sample
  const [sample] = await pool.query(`SELECT group_code, session_date, module_code, status FROM timetable_slots ORDER BY session_date ASC LIMIT 5`);
  console.log("\nSample future timetable slots:", JSON.stringify(sample, null, 2));

  // 4. Show distinct group codes in timetable vs in students
  const [ttGroups] = await pool.query(`SELECT DISTINCT group_code FROM timetable_slots ORDER BY group_code`);
  const [stuGroups] = await pool.query(`SELECT DISTINCT group_code FROM student_profiles WHERE group_code IS NOT NULL ORDER BY group_code`);
  console.log("\nTimetable group codes:", (ttGroups as any[]).map((r: any) => r.group_code));
  console.log("Student group codes:", (stuGroups as any[]).map((r: any) => r.group_code));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
