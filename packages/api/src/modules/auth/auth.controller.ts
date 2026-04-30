import type { Request, Response } from "express";
import { login } from "./auth.service";

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const result = await login(email, password);
  return res.json(result);
}

export function meHandler(_req: Request, res: Response) {
  return res.status(410).json({ error: "Use /auth/me route implementation in auth.routes.ts" });
}