import { pool } from "./src/db/mysql";

async function main() {
  const [rows] = await pool.query(`SHOW TABLES`);
  console.log("Tables:", rows);
  process.exit(0);
}

main().catch(console.error);
