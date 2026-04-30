import bcrypt from "bcrypt";
import { pool } from "../../db/mysql";
import { signAccessToken, signRefreshToken } from "./jwt";

export async function login(email: string, password: string) {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = :email AND is_active = TRUE LIMIT 1`, { email });
  const user = (rows as any[])[0];
  if (!user) throw new Error("INVALID_CREDENTIALS");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  const payload = { sub: String(user.id), email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // store refresh token hashed
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  // 7 days is handled by jwt exp; for DB expiry also we compute now+7d roughly:
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:userId, :tokenHash, :expiresAt)`,
    { userId: user.id, tokenHash, expiresAt }
  );

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta) VALUES (:uid,'AUTH_LOGIN','user',:uid, JSON_OBJECT('email',:email))`,
    { uid: user.id, email: user.email }
  );

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, fullName: user.full_name } };
}