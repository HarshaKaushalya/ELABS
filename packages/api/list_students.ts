import { pool } from "./src/db/mysql";

async function main() {
  const [students] = await pool.query(`
    SELECT u.full_name, u.email, u.index_no, sp.group_code, sp.semester
    FROM users u 
    LEFT JOIN student_profiles sp ON u.id = sp.user_id 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    WHERE r.name = 'STUDENT' AND u.email LIKE '%@eng.ruh.ac.lk'
    ORDER BY sp.group_code ASC, u.index_no ASC
  `);
  console.log(JSON.stringify(students, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
