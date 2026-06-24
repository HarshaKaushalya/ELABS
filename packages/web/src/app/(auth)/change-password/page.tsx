"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, CheckCircle2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("elabs_access_token") ?? sessionStorage.getItem("elabs_access_token");
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPw,   setNewPw]   = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }

    const token = getToken();
    if (!token) { setError("Session expired. Please log in again."); return; }

    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      if (r.ok) {
        setDone(true);
        // Update stored user
        const updateUser = (key: string) => {
          const raw = (window as any)[key.includes("local") ? "localStorage" : "sessionStorage"].getItem("elabs_user");
          if (raw) {
            try {
              const u = JSON.parse(raw);
              u.mustChangePassword = false;
              (window as any)[key.includes("local") ? "localStorage" : "sessionStorage"].setItem("elabs_user", JSON.stringify(u));
            } catch {}
          }
        };
        updateUser("localStorage"); updateUser("sessionStorage");
        setTimeout(() => router.push("/dashboard"), 1800);
      } else {
        const data = await r.json();
        setError(data.error ?? "Failed to update password.");
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#060d1a 0%,#0b1929 50%,#0d2035 100%)",
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 20,
        padding: "40px 48px", width: "100%", maxWidth: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "#3d83f6" }}>
            <KeyRound size={48} />
          </div>
          <h1 style={{ color: "var(--text-main)", margin: "0 0 8px", fontSize: "1.4rem", fontWeight: 700 }}>
            Set Your Password
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>
            Welcome to ELABS! You're logging in for the first time.<br />
            Please set a secure password to continue.
          </p>
        </div>

        {done ? (
          <div style={{ textAlign: "center", color: "#18d18f", padding: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "#18d18f" }}>
              <CheckCircle2 size={36} />
            </div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>Password updated!</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>Redirecting to dashboard…</div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                NEW PASSWORD
              </label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--bg-app)", border: "1px solid var(--border-color)",
                  borderRadius: 10, color: "var(--text-main)", padding: "12px 16px", fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat your password"
                required
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--bg-app)", border: `1px solid ${confirmPw && confirmPw !== newPw ? "#ff4d57" : "var(--border-color)"}`,
                  borderRadius: 10, color: "var(--text-main)", padding: "12px 16px", fontSize: "0.95rem",
                }}
              />
              {confirmPw && confirmPw !== newPw && (
                <div style={{ color: "#ff4d57", fontSize: "0.75rem", marginTop: 4 }}>Passwords do not match</div>
              )}
            </div>

            {error && (
              <div style={{ background: "#ff4d5715", border: "1px solid #ff4d5740", borderRadius: 8,
                padding: "10px 14px", color: "#ff4d57", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                background: "linear-gradient(135deg,#3d83f6,#1dd5e6)",
                border: "none", borderRadius: 10, color: "#fff",
                fontWeight: 700, fontSize: "0.95rem", padding: "14px",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                marginTop: 8,
              }}>
              {loading ? "Updating…" : "Set Password & Continue →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
