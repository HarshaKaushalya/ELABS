import { pool } from "./src/db/mysql";

async function main() {
  console.log("=== ALL STUDENTS ===");
  const [students] = await pool.query(`
    SELECT u.id, u.full_name, u.email, u.index_no, u.is_active, 
           u.must_change_password as user_must_change,
           sp.reg_number, sp.group_code, sp.semester, sp.must_change_password as sp_must_change
    FROM users u 
    LEFT JOIN student_profiles sp ON u.id = sp.user_id 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    WHERE r.name = 'STUDENT'
    ORDER BY u.email ASC
  `);
  console.log(JSON.stringify(students, null, 2));

  console.log("\n=== LABS ===");
  const [labs] = await pool.query(`SELECT id, name, location FROM labs`);
  console.log(JSON.stringify(labs, null, 2));

  console.log("\n=== TIMETABLE SLOTS COUNT ===");
  const [tt] = await pool.query(`SELECT COUNT(*) as total_slots FROM timetable_slots`);
  console.log(JSON.stringify(tt, null, 2));

  console.log("\n=== SAMPLE TIMETABLE SLOTS ===");
  const [ttSample] = await pool.query(`SELECT * FROM timetable_slots LIMIT 5`);
  console.log(JSON.stringify(ttSample, null, 2));

  console.log("\n=== BORROW TRANSACTIONS COUNT ===");
  const [bt] = await pool.query(`SELECT COUNT(*) as total, status FROM borrow_transactions GROUP BY status`);
  console.log(JSON.stringify(bt, null, 2));

  console.log("\n=== CHANGE_PASSWORD ROUTE IN AUTH ===");
  const [pw] = await pool.query(`
    SELECT u.email, u.must_change_password, sp.must_change_password as sp_flag
    FROM users u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'STUDENT'
    LIMIT 5
  `);
  console.log(JSON.stringify(pw, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
