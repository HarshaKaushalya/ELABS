import assert from "node:assert/strict";

process.env.MYSQL_HOST = process.env.MYSQL_HOST ?? "localhost";
process.env.MYSQL_PORT = process.env.MYSQL_PORT ?? "3306";
process.env.MYSQL_USER = process.env.MYSQL_USER ?? "elabs";
process.env.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? "elabs_password";
process.env.MYSQL_DATABASE = process.env.MYSQL_DATABASE ?? "elabs";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "change_me_access_secret_123456";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "change_me_refresh_secret_123456";
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
process.env.COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "localhost";

void (async () => {
  const { signAccessToken, verifyAccessToken } = await import("../src/modules/auth/jwt");

  const token = signAccessToken({ sub: "1", email: "admin@elabs.local" });
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, "1");
  assert.equal(payload.email, "admin@elabs.local");
  console.log("auth.spec placeholder passed");
})();
