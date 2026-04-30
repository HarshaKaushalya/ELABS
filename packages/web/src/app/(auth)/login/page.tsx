"use client";

import { useState } from "react";
import { apiFetch, setAccessToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { UniversityBrand } from "@/components/layout/UniversityBrand";
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

    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Login failed");
      return;
    }

    const data = await res.json();
    setAccessToken(data.accessToken);
    router.push("/dashboard");
  }

  return (
    <div className="login-container">
      <div className="login-background"></div>
      
      <div className="login-wrapper">
        <div className="login-card">
          {/* Header Section */}
          <div className="login-header">
            <div className="login-logo">
              <UniversityBrand />
            </div>
            <h1 className="login-title">ELABS Platform</h1>
            <p className="login-subtitle">Smart Laboratory & Inventory Management</p>
          </div>

          {/* Form Section */}
          <form onSubmit={onSubmit} className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <span className="label-icon">📧</span>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@elabs.local"
                className="form-input"
                required
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <span className="label-icon">🔐</span>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-banner">
                <span className="error-icon">⚠️</span>
                <p className="error-text">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`login-button ${loading ? "loading" : ""}`}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="button-arrow">→</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="login-footer">
            <p className="footer-text">Need help?</p>
            <div className="footer-links">
              <Link href="/forgot-password" className="footer-link">
                Forgot password?
              </Link>
              <span className="link-separator">•</span>
              <Link href="/reset-password" className="footer-link">
                Reset password
              </Link>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="login-info">
          <div className="info-item">
            <span className="info-icon">🧪</span>
            <h3>Lab Management</h3>
            <p>Efficiently manage laboratory resources and equipment</p>
          </div>
          <div className="info-item">
            <span className="info-icon">📦</span>
            <h3>Inventory Control</h3>
            <p>Track and organize inventory with real-time updates</p>
          </div>
          <div className="info-item">
            <span className="info-icon">📊</span>
            <h3>Analytics</h3>
            <p>Get insights into resource utilization and trends</p>
          </div>
        </div>
      </div>
    </div>
  );
}
