import mysql from "mysql2/promise";
import { env } from "../config/env";

const isTiDB = (env.MYSQL_HOST && env.MYSQL_HOST.includes("tidbcloud")) || env.MYSQL_PORT === 4000;
const useSsl = Boolean(env.MYSQL_SSL) || isTiDB;

export const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: "Z",
});