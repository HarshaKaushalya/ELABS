import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("production"),
  PORT: z.coerce.number().default(4000),

  MYSQL_HOST: z.string().default("gateway01.ap-northeast-1.prod.aws.tidbcloud.com"),
  MYSQL_PORT: z.coerce.number().default(4000),
  MYSQL_USER: z.string().default("2ffmxJwqJzvLcyd.root"),
  MYSQL_PASSWORD: z.string().default("FRQ8ZiNDyQDSBLkR"),
  MYSQL_DATABASE: z.string().default("elabs"),
  MYSQL_SSL: z.coerce.boolean().default(true),

  JWT_ACCESS_SECRET: z.string().default("change_me_access_secret_please_12345"),
  JWT_REFRESH_SECRET: z.string().default("change_me_refresh_secret_please_12345"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("*"),
  COOKIE_DOMAIN: z.string().optional(),
});

const raw = { ...process.env } as Record<string, string | undefined>;

// Backward-compatible support for old JWT_SECRET env key.
if (!raw.JWT_ACCESS_SECRET && raw.JWT_SECRET) raw.JWT_ACCESS_SECRET = raw.JWT_SECRET;
if (!raw.JWT_REFRESH_SECRET && raw.JWT_SECRET) raw.JWT_REFRESH_SECRET = `${raw.JWT_SECRET}_refresh`;

// Fallback defaults to prevent any crash on serverless runtimes
if (!raw.MYSQL_HOST) raw.MYSQL_HOST = "gateway01.ap-northeast-1.prod.aws.tidbcloud.com";
if (!raw.MYSQL_PORT) raw.MYSQL_PORT = "4000";
if (!raw.MYSQL_USER) raw.MYSQL_USER = "2ffmxJwqJzvLcyd.root";
if (!raw.MYSQL_PASSWORD) raw.MYSQL_PASSWORD = "FRQ8ZiNDyQDSBLkR";
if (!raw.MYSQL_DATABASE) raw.MYSQL_DATABASE = "elabs";
if (raw.MYSQL_SSL === undefined) raw.MYSQL_SSL = "true";

if (!raw.JWT_ACCESS_SECRET) raw.JWT_ACCESS_SECRET = "change_me_access_secret_please_12345";
if (!raw.JWT_REFRESH_SECRET) raw.JWT_REFRESH_SECRET = "change_me_refresh_secret_please_12345";

const parsed = schema.safeParse(raw);

export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: "production",
      PORT: 4000,
      MYSQL_HOST: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
      MYSQL_PORT: 4000,
      MYSQL_USER: "2ffmxJwqJzvLcyd.root",
      MYSQL_PASSWORD: "FRQ8ZiNDyQDSBLkR",
      MYSQL_DATABASE: "elabs",
      MYSQL_SSL: true,
      JWT_ACCESS_SECRET: "change_me_access_secret_please_12345",
      JWT_REFRESH_SECRET: "change_me_refresh_secret_please_12345",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "7d",
      CORS_ORIGIN: "*",
      COOKIE_DOMAIN: undefined,
    };
