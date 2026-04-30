import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "./jwt";

export type AuthedRequest = Request & { user?: { id: number; email: string } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  const token = auth.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}