import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "./jwt";

export type AuthedRequest = Request & { user?: { id: number; email: string } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    token = auth.slice("Bearer ".length);
  } else if (req.query && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    const urlParts = req.url.split("?");
    if (urlParts.length > 1) {
      const params = new URLSearchParams(urlParts[1]);
      token = params.get("token") || undefined;
    }
  }

  if (!token) {
    const origParts = req.originalUrl?.split("?");
    if (origParts && origParts.length > 1) {
      const params = new URLSearchParams(origParts[1]);
      token = params.get("token") || undefined;
    }
  }

  console.log("requireAuth debug: req.url =", req.url, "req.originalUrl =", req.originalUrl, "req.query =", req.query, "token =", token ? (token.substring(0, 15) + "...") : "undefined");

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}