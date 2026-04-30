import { Router } from "express";
import { z } from "zod";
import { login } from "./auth.service";
import { env } from "../../config/env";
import bcrypt from "bcrypt";
import { pool } from "../../db/mysql";
import { requireAuth, AuthedRequest } from "./auth.middleware";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";

const router = Router();

router.post("/login", async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(req.body);

  try {
    const { accessToken, refreshToken, user } = await login(body.email, body.password);

    // HttpOnly refresh cookie
    res.cookie("elabs_refresh", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true in prod behind https
      domain: env.COOKIE_DOMAIN,
      path: "/",
      maxAge: 7 * 24 * 3600 * 1000,
    });

    return res.json({ accessToken, user });
  } catch (e: any) {
    if (e?.message === "INVALID_CREDENTIALS") return res.status(401).json({ error: "Invalid credentials" });
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.elabs_refresh;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const payload = verifyRefreshToken(token);

    // Fetch recent active refresh tokens for this user
    const [rows] = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE user_id = :uid AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC LIMIT 20`,
      { uid: Number(payload.sub) }
    );

    const candidates = rows as any[];

    // Find matching DB row (bcrypt compare)
    let matchedRow: any | null = null;
    for (const row of candidates) {
      const ok = await bcrypt.compare(token, row.token_hash);
      if (ok) {
        matchedRow = row;
        break;
      }
    }

    if (!matchedRow) return res.status(401).json({ error: "Invalid refresh token" });

    // ROTATION:
    // 1) revoke old token row
    await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = :id`, { id: matchedRow.id });

    // 2) mint new refresh token + store hashed
    const newRefresh = signRefreshToken({ sub: payload.sub, email: payload.email });
    const newRefreshHash = await bcrypt.hash(newRefresh, 10);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES (:uid, :hash, :exp)`,
      { uid: Number(payload.sub), hash: newRefreshHash, exp: newExpiresAt }
    );

    // 3) set new cookie
    res.cookie("elabs_refresh", newRefresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true in prod behind https
      domain: env.COOKIE_DOMAIN,
      path: "/",
      maxAge: 7 * 24 * 3600 * 1000,
    });

    // 4) new access token
    const accessToken = signAccessToken({ sub: payload.sub, email: payload.email });
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.elabs_refresh;

  // best-effort revoke: if cookie exists, try to match and revoke
  if (token) {
    try {
      const payload = verifyRefreshToken(token);

      const [rows] = await pool.query(
        `SELECT * FROM refresh_tokens
         WHERE user_id = :uid AND revoked_at IS NULL AND expires_at > NOW()
         ORDER BY id DESC LIMIT 30`,
        { uid: Number(payload.sub) }
      );

      for (const row of rows as any[]) {
        if (await bcrypt.compare(token, row.token_hash)) {
          await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = :id`, { id: row.id });
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  res.clearCookie("elabs_refresh", { path: "/" });
  return res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const [rows] = await pool.query(
    `
    SELECT u.id, u.email, u.full_name,
           JSON_ARRAYAGG(r.name) AS roles
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE u.id = :uid
    GROUP BY u.id
    `,
    { uid: req.user!.id }
  );

  const me = (rows as any[])[0];
  if (!me) return res.status(404).json({ error: "User not found" });

  const parseRoles = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);

    if (typeof raw === "string") {
      const text = raw.trim();
      if (!text) return [];

      // Some DB drivers return JSON text, others may return plain role string.
      if (text.startsWith("[")) {
        try {
          const parsed = JSON.parse(text);
          return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          return [text];
        }
      }

      return [text];
    }

    return [String(raw)];
  };

  return res.json({
    id: me.id,
    email: me.email,
    fullName: me.full_name,
    roles: parseRoles(me.roles),
  });
});

export default router;
