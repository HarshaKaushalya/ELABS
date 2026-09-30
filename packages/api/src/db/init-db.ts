import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { env } from "../config/env";

async function runSqlFile(connection: mysql.Connection, filePath: string) {
  console.log(`Executing SQL file: ${path.basename(filePath)}...`);
  const content = fs.readFileSync(filePath, "utf-8");

  // Remove full-line comments and split statements safely
  const cleanContent = content
    .replace(/^--.*$/gm, "")
    .replace(/^\/\*[\s\S]*?\*\/;/gm, "");

  const statements = cleanContent
    .split(/;\s*[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("CREATE DATABASE") && !s.startsWith("USE "));

  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (err: any) {
      // Ignore duplicate key errors if already seeded
      if (err.code === "ER_DUP_ENTRY" || err.code === "ER_TABLE_EXISTS_ERROR") {
        continue;
      }
      console.warn(`[Warning in statement]: ${statement.slice(0, 60)}...`);
      console.warn(`[Message]: ${err.message}`);
    }
  }
}

async function main() {
  console.log(`Connecting to database at ${env.MYSQL_HOST}:${env.MYSQL_PORT} (DB: ${env.MYSQL_DATABASE})...`);

  const connection = await mysql.createConnection({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    ssl: env.MYSQL_SSL ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true,
  });

  try {
    const rootDir = path.resolve(__dirname, "../../../..");
    const schemaFile = path.join(rootDir, "scripts", "db", "01_schema.sql");
    const seedFile = path.join(rootDir, "scripts", "db", "02_seed.sql");

    if (fs.existsSync(schemaFile)) {
      await runSqlFile(connection, schemaFile);
    } else {
      console.error(`Schema file not found at: ${schemaFile}`);
    }

    if (fs.existsSync(seedFile)) {
      await runSqlFile(connection, seedFile);
    } else {
      console.error(`Seed file not found at: ${seedFile}`);
    }

    console.log("Database schema initialization and seed completed successfully!");
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});
