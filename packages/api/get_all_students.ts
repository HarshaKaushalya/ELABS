import { pool } from "./src/db/mysql";

async function main() {
  const [rows] = await pool.query(`
    SELECT u.id, u.full_name, u.email, sp.index_no, sp.group_code 
    FROM users u 
    LEFT JOIN student_profiles sp ON u.id = sp.user_id 
    JOIN user_roles ur ON u.id = ur.user_id 
    JOIN roles r ON ur.role_id = r.id 
    WHERE r.name = 'STUDENT'
    ORDER BY sp.index_no ASC
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch(console.error);
