import bcrypt from "bcrypt";
import { pool } from "./mysql";

async function ensureUser(email: string, password: string, fullName: string, roleName: string, indexNo?: string) {
  const [existing] = await pool.query(`SELECT id FROM users WHERE email = :email LIMIT 1`, { email });
  if ((existing as any[]).length > 0) return;

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (index_no, full_name, email, password_hash, country, city, timezone)
     VALUES (:indexNo, :fullName, :email, :passwordHash, 'Sri Lanka', 'Galle', 'Asia/Colombo')`,
    { indexNo: indexNo ?? null, fullName, email, passwordHash }
  );

  const userId = (result as any).insertId;

  const [roles] = await pool.query(`SELECT id FROM roles WHERE name = :roleName LIMIT 1`, { roleName });
  const roleId = (roles as any[])[0]?.id;
  if (!roleId) throw new Error(`Role not found: ${roleName}`);

  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES (:userId, :roleId)`, { userId, roleId });
}

async function main() {
  await ensureUser("admin@elabs.local", "Admin123!", "System Admin", "SYSTEM_ADMIN");
  await ensureUser("lecturer@elabs.local", "Lecturer123!", "Demo Lecturer", "LECTURER");
  await ensureUser("tech@elabs.local", "Tech123!", "Demo Technician", "TECHNICIAN");
  await ensureUser("student@elabs.local", "Student123!", "Demo Student", "STUDENT", "EG/2022/5401");

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});