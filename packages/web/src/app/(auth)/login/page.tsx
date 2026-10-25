"use client";

import { useState } from "react";
import { apiFetch, setAccessToken } from "@/lib/api";
import { setUser, setToken } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { School, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const [email, setEmail] = useState("admin@elabs.local");
  const [password, setPassword] = useState("Admin123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick evaluation presets
  const presets = [
    { label: "Admin", email: "admin@elabs.local", pass: "Admin123!" },
    { label: "Lecturer", email: "lecturer@elabs.local", pass: "Lecturer123!" },
    { label: "Technician", email: "tech@elabs.local", pass: "Tech123!" },
    { label: "Student", email: "student@elabs.local", pass: "Student123!" },
  ];

  function handleSelectPreset(preset: typeof presets[0]) {
    setEmail(preset.email);
    setPassword(preset.pass);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Login failed. Please check your credentials.");
        return;
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      setToken(data.accessToken);
      document.cookie = `elabs_refresh=1; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;

      const meRes = await apiFetch("/auth/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setUser({
          id: me.id,
          email: me.email,
          fullName: me.fullName,
          roles: me.roles ?? [],
          mustChangePassword: me.mustChangePassword,
        });
        if (me.mustChangePassword) {
          await refreshMe();
          router.push("/change-password");
          return;
        }
      }

      await refreshMe();
      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      setError("Cannot connect to the server. Please make sure the API is running.");
    }
  }

  return (
    <div className="login-page">
      {/* Full-screen background photo */}
      <div className="login-bg">
        <img src="/university-bg.png" alt="University of Ruhuna" />
        <div className="login-bg-overlay" />
      </div>

      {/* Content wrapper */}
      <div className="login-content">
        {/* Left: Department information */}
        <div className="login-hero">
          <div className="login-hero-inner">
            <div className="login-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <School size={16} />
              <span>Faculty of Engineering • University of Ruhuna</span>
            </div>

            <h1 className="login-hero-title">
              ELABS
              <span>Laboratory Management System</span>
            </h1>

            <p className="login-hero-desc" style={{ color: "#a8cfff", fontSize: "1rem", lineHeight: 1.6, margin: "0 0 28px" }}>
              Department of Electrical & Information Engineering portal for practical timetables, equipment inventory, and workstation access.
            </p>

            <div className="login-hero-features">
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
                </div>
                <div>
                  <strong>Lab Practicals</strong>
                  <span>Workstations, timetables & schedules</span>
                </div>
              </div>

              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <div>
                  <strong>Equipment Inventory</strong>
                  <span>Instrument loans & calibration records</span>
                </div>
              </div>

              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div>
                  <strong>Student Access</strong>
                  <span>Barcode & RFID session verification</span>
                </div>
              </div>

              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                  <strong>Safety Clearances</strong>
                  <span>Safety compliance & laboratory protocols</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login card */}
        <div className="login-card-wrap">
          <div className="login-glass-card">
            {/* Logo */}
            <div className="login-card-logo">
              <div className="login-logo-circle">
                <img src="/logo.png" alt="Faculty of Engineering" width="48" height="48" style={{ borderRadius: 8, objectFit: "contain" }} />
              </div>
              <h2>Sign In</h2>
              <p>Department of Electrical & Information Engineering</p>
            </div>

            {/* Quick Demo Presets */}
            <div style={{ display: "flex", gap: 6, marginBottom: 18, background: "rgba(255,255,255,0.06)", padding: "4px 6px", borderRadius: 8 }}>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    flex: 1,
                    padding: "7px 4px",
                    background: email === preset.email ? "#3d83f6" : "transparent",
                    color: email === preset.email ? "#ffffff" : "#a8cfff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="login-form-modern">
              <div className="login-field">
                <label htmlFor="email">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Institutional Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@elabs.local"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="login-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="password">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    Password
                  </label>
                  <Link href="/forgot-password" className="login-forgot">Forgot password?</Link>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    style={{ width: "100%", paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      background: "none",
                      border: "none",
                      color: "#7ea5d6",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="login-options">
                <label className="login-remember">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me on this workstation</span>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="login-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="login-submit-btn">
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to ELABS
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="login-card-footer">
              <span>Faculty of Engineering • University of Ruhuna</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
