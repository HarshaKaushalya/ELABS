import { pool } from "./src/db/mysql";

async function main() {
  const [rows] = await pool.query("SELECT id, options FROM quiz_questions WHERE quiz_id = 1") as any;
  console.log("Raw Options for Quiz 1 questions:", rows);
  process.exit(0);
}

main().catch(console.error);
