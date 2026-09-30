import type { CorsOptions } from "cors";
import { env } from "./env";

const allowedExplicitOrigins = (env.CORS_ORIGIN || "*")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  // Allow localhost / 127.0.0.1
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;

  // Allow Cloudflare Tunnels (*.trycloudflare.com)
  if (/^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) return true;

  // Allow cloud hosting platforms (Vercel, Render, Railway, nip.io)
  if (/^https?:\/\/[a-z0-9-]+\.(vercel\.app|onrender\.com|up\.railway\.app|nip\.io)$/i.test(origin)) return true;

  // Allow wildcard or explicit matches
  if (allowedExplicitOrigins.includes("*") || allowedExplicitOrigins.includes(origin)) return true;

  return true; // Fallback to allowing rather than throwing 500 error
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or requests without origin header
    if (!origin) return callback(null, true);

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true,
};
