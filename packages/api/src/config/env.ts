import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),

  MYSQL_HOST: z.string(),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string(),
  MYSQL_PASSWORD: z.string(),
  MYSQL_DATABASE: z.string(),

  JWT_ACCESS_SECRET: z.string().min(20),
  JWT_REFRESH_SECRET: z.string().min(20),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_DOMAIN: z.string().default("localhost"),
});

const raw = { ...process.env } as Record<string, string | undefined>;

// Backward-compatible support for old JWT_SECRET env key.
if (!raw.JWT_ACCESS_SECRET && raw.JWT_SECRET) raw.JWT_ACCESS_SECRET = raw.JWT_SECRET;
if (!raw.JWT_REFRESH_SECRET && raw.JWT_SECRET) raw.JWT_REFRESH_SECRET = `${raw.JWT_SECRET}_refresh`;

// Development fallback for local startup when env file is incomplete.
if (!raw.JWT_ACCESS_SECRET) raw.JWT_ACCESS_SECRET = "change_me_access_secret_please";
if (!raw.JWT_REFRESH_SECRET) raw.JWT_REFRESH_SECRET = "change_me_refresh_secret_please";

export const env = schema.parse(raw);
