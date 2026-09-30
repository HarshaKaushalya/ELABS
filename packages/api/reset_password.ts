import bcrypt from "bcrypt";
import { pool } from "./src/db/mysql";

async function main() {
  const email = "eg5024@eng.ruh.ac.lk";
  const password = "Student123!";
  const hash = await bcrypt.hash(password, 10);
  
  await pool.query(`UPDATE users SET password_hash = ? WHERE email = ?`, [hash, email]);
  console.log(`Password for ${email} reset to: ${password}`);
  process.exit(0);
}

main().catch(console.error);
