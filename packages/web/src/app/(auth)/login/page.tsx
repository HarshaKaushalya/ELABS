"use client";

import { useState } from "react";
import { apiFetch, setAccessToken } from "@/lib/api";
import { setUser, setToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@elabs.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      const meRes = await apiFetch("/auth/me");
      if (meRes.ok) {
        const me = await meRes.json();
        setUser({ id: me.id, email: me.email, fullName: me.fullName, roles: me.roles ?? [], mustChangePassword: me.mustChangePassword });
        // First-time login: force password change
        if (me.mustChangePassword) {
          router.push("/change-password");
          return;
        }
      }

      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      setError("Cannot connect to the server. Please make sure the API is running.");
    }
  }

  return (
    <div className="login-page">
      {/* Full-screen background */}
      <div className="login-bg">
        <img src="/university-bg.png" alt="" />
        <div className="login-bg-overlay" />
      </div>

      {/* Content wrapper */}
      <div className="login-content">
        {/* Left: Info panel */}
        <div className="login-hero">
          <div className="login-hero-inner">
            <div className="login-hero-badge">🏛️ University of Ruhuna</div>
            <h1 className="login-hero-title">
              ELABS
              <span>Smart Laboratory Management</span>
            </h1>
            <p className="login-hero-desc">
            </p>
            <div className="login-hero-features">
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
                </div>
                <div>
                  <strong>Lab Management</strong>
                  <span>Manage resources & equipment efficiently</span>
                </div>
              </div>
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <div>
                  <strong>Smart Inventory</strong>
                  <span>Barcode scanning & real-time tracking</span>
                </div>
              </div>
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4c0 1.95-2 3-2 8h-4c0-5-2-6.05-2-8a4 4 0 014-4z"/><circle cx="12" cy="18" r="2"/><line x1="12" y1="20" x2="12" y2="22"/></svg>
                </div>
                <div>
                  <strong>AI Assistant</strong>
                  <span>RAG-powered lab manual Q&A</span>
                </div>
              </div>
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div>
                  <strong>Vision Analytics</strong>
                  <span>Real-time safety & attendance monitoring</span>
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
                <img src="/logo.png" alt="Faculty of Engineering" width="44" height="44" style={{ borderRadius: 8 }} />
              </div>
              <h2>Welcome Back</h2>
              <p>Sign in to your ELABS account</p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="login-form-modern">
              <div className="login-field">
                <label htmlFor="email">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Remember + Forgot */}
              <div className="login-options">
                <label className="login-remember">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <Link href="/forgot-password" className="login-forgot">Forgot password?</Link>
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
                    Sign In
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="login-card-footer">
              <span>© 2026 ELABS Platform</span>
              <span>•</span>
              <span>University of Ruhuna</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
