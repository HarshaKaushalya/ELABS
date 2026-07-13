import { pool } from "./src/db/mysql";

async function main() {
  const [rows] = await pool.query(`SELECT email FROM users`);
  console.log("Found students:", rows);
  process.exit(0);
}

main().catch(console.error);
