import type { CorsOptions } from "cors";
import { env } from "./env";

const allowedExplicitOrigins = env.CORS_ORIGIN
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

function isLocalDevOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin/non-browser requests (curl, server-side fetch).
    if (!origin) return callback(null, true);

    if (allowedExplicitOrigins.includes(origin) || isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
};
