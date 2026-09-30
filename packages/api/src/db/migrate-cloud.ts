import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const DB_HOST = process.env.MYSQL_HOST || "gateway01.ap-northeast-1.prod.aws.tidbcloud.com";
const DB_PORT = Number(process.env.MYSQL_PORT) || 4000;
const DB_USER = process.env.MYSQL_USER || "2ffmxJwqJzvLcyd.root";
const DB_PASS = process.env.MYSQL_PASSWORD || "FRQ8ZiNDyQDSBLkR";
const DB_NAME = process.env.MYSQL_DATABASE || "elabs";

async function executeSqlFile(connection: mysql.Connection, filePath: string) {
  console.log(`Running SQL from: ${path.basename(filePath)}...`);
  const rawSql = fs.readFileSync(filePath, "utf-8");

  // Remove single line comments
  const cleanSql = rawSql
    .replace(/^--.*$/gm, "")
    .replace(/^\/\*[\s\S]*?\*\/;/gm, "");

  const statements = cleanSql
    .split(/;\s*[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("CREATE DATABASE") && !s.startsWith("USE "));

  let successCount = 0;
  for (const stmt of statements) {
    try {
      await connection.query(stmt);
      successCount++;
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY" || err.code === "ER_TABLE_EXISTS_ERROR") {
        continue;
      }
      console.warn(`[SQL Notice]: ${err.message?.slice(0, 100)}`);
    }
  }
  console.log(`Completed ${path.basename(filePath)} (${successCount} statements executed).`);
}

async function ensureUser(connection: mysql.Connection, email: string, pass: string, name: string, roleName: string, indexNo?: string) {
  const [existing]: any = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing && existing.length > 0) return;

  const passwordHash = await bcrypt.hash(pass, 10);
  const [res]: any = await connection.query(
    "INSERT INTO users (index_no, full_name, email, password_hash, country, city, timezone) VALUES (?, ?, ?, ?, 'Sri Lanka', 'Galle', 'Asia/Colombo')",
    [indexNo || null, name, email, passwordHash]
  );

  const userId = res.insertId;
  const [roles]: any = await connection.query("SELECT id FROM roles WHERE name = ? LIMIT 1", [roleName]);
  if (roles && roles[0]) {
    await connection.query("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roles[0].id]);
  }
}

async function main() {
  console.log(`Connecting to Cloud Database at ${DB_HOST}:${DB_PORT}...`);

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });

  try {
    console.log("Creating database if not exists: " + DB_NAME);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    const rootDir = path.resolve(__dirname, "../../../..");
    const schemaFile = path.join(rootDir, "scripts", "db", "01_schema.sql");
    const seedFile = path.join(rootDir, "scripts", "db", "02_seed.sql");

    await executeSqlFile(connection, schemaFile);
    await executeSqlFile(connection, seedFile);

    console.log("Seeding default university and demo user accounts...");
    // University official accounts
    await ensureUser(connection, "admin@elabs.eng.ruh.ac.lk", "Admin@123", "Faculty Administrator", "SYSTEM_ADMIN");
    await ensureUser(connection, "lecturer@elabs.eng.ruh.ac.lk", "Lecturer@123", "Dr. EIE Lecturer", "LECTURER");
    await ensureUser(connection, "student@elabs.eng.ruh.ac.lk", "Student@123", "Kamal Perera", "STUDENT", "EG/2022/5401");
    await ensureUser(connection, "tech@elabs.eng.ruh.ac.lk", "Tech@123", "Lab Technician", "TECHNICIAN");

    // Local fallback accounts
    await ensureUser(connection, "admin@elabs.local", "Admin123!", "System Admin", "SYSTEM_ADMIN");
    await ensureUser(connection, "lecturer@elabs.local", "Lecturer123!", "Demo Lecturer", "LECTURER");
    await ensureUser(connection, "student@elabs.local", "Student123!", "Demo Student", "STUDENT", "EG/2022/5402");
    await ensureUser(connection, "tech@elabs.local", "Tech123!", "Demo Technician", "TECHNICIAN");

    // Verification queries
    const [userCount]: any = await connection.query("SELECT COUNT(*) as count FROM users");
    const [labCount]: any = await connection.query("SELECT COUNT(*) as count FROM labs");
    const [itemCount]: any = await connection.query("SELECT COUNT(*) as count FROM inventory_items");

    console.log("====================================================");
    console.log("🎉 CLOUD DATABASE INITIALIZED SUCCESSFULLY!");
    console.log(`- Users in DB: ${userCount[0].count}`);
    console.log(`- Labs configured: ${labCount[0].count}`);
    console.log(`- Inventory Items: ${itemCount[0].count}`);
    console.log("====================================================");
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
