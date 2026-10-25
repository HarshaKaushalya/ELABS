"use client";

import { useState } from "react";
import { apiFetch, setAccessToken } from "@/lib/api";
import { setUser, setToken } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  School,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Activity,
  Cpu,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";
import { LabOscilloscope } from "@/components/laboratory/LabOscilloscope";
import { LabCircuitBackground } from "@/components/laboratory/LabCircuitBackground";

export default function LoginPage() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const [email, setEmail] = useState("admin@elabs.local");
  const [password, setPassword] = useState("Admin123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick preset accounts for evaluation & testing
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
      setError("Cannot connect to the server. Please verify network or API connectivity.");
    }
  }

  return (
    <div className="login-page">
      {/* Full-screen background image with deep laboratory gradient overlay */}
      <div className="login-bg">
        <img src="/university-bg.png" alt="University of Ruhuna" />
        <div className="login-bg-overlay" />
        {/* Animated ambient engineering circuit bus lines and pulses */}
        <LabCircuitBackground />
      </div>

      {/* Main Content Grid */}
      <div className="login-content">
        {/* Left Column: Department Hero & Interactive Oscilloscope */}
        <div className="login-hero">
          <div className="login-hero-inner">
            {/* Institutional Department Badges */}
            <div className="login-institution-badges">
              <div className="login-hero-badge">
                <School size={14} />
                <span>Faculty of Engineering • University of Ruhuna</span>
              </div>
              <div className="login-dept-tag">
                <span>DEPT. OF ELECTRICAL & INFORMATION ENGINEERING</span>
              </div>
            </div>

            <h1 className="login-hero-title">
              ELABS
              <span>Smart Laboratory Management Platform</span>
            </h1>

            <p className="login-hero-desc">
              Integrated operational system for experimental laboratories, high-voltage impulse testing,
              calibrated instrumentation, Cisco network infrastructure, and real-time student access.
            </p>

            {/* Interactive Laboratory Oscilloscope Visualizer */}
            <LabOscilloscope />

            {/* Official Department Operational Capabilities (replacing AI Assistant) */}
            <div className="login-hero-features">
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <Zap size={20} />
                </div>
                <div>
                  <strong>Power Systems & HV</strong>
                  <span>Impulse voltages, surge analysis & insulation testing</span>
                </div>
              </div>

              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <Activity size={20} />
                </div>
                <div>
                  <strong>Electronics & Measurement</strong>
                  <span>Oscilloscopes, logic analyzers & FPGA workstations</span>
                </div>
              </div>

              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <Cpu size={20} />
                </div>
                <div>
                  <strong>Information Engineering</strong>
                  <span>Cisco switching, VLAN topologies & routing labs</span>
                </div>
              </div>

              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong>Access & Circulation</strong>
                  <span>Barcode student ID verification & safety monitoring</span>
                </div>
              </div>
            </div>

            {/* Department Laboratories Status Ticker */}
            <div className="login-labs-status-bar">
              <div className="status-dot-live" />
              <span className="status-text-bold">6 Active Department Facilities:</span>
              <span className="status-labs-list">
                Power Systems & HV • Electric Machines • Electronics & Measurement • Communication Systems • Information Eng. • 24×7 Project Lab
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: High-Precision Enterprise Login Card */}
        <div className="login-card-wrap">
          <div className="login-glass-card">
            {/* Corner Crosshairs for Engineering Aesthetic */}
            <div className="card-corner top-left">+</div>
            <div className="card-corner top-right">+</div>
            <div className="card-corner bottom-left">+</div>
            <div className="card-corner bottom-right">+</div>

            {/* University Crest & Title */}
            <div className="login-card-logo">
              <div className="login-logo-circle">
                <Image
                  src="/logo.png"
                  alt="Faculty of Engineering"
                  width={48}
                  height={48}
                  style={{ borderRadius: 8, objectFit: "contain" }}
                  priority
                />
              </div>
              <h2>Institutional Sign In</h2>
              <p>Department of Electrical & Information Engineering</p>
            </div>

            {/* Quick Preset Selector for Easy Testing */}
            <div className="login-preset-wrap">
              <span className="preset-label">Quick Sign-In Presets:</span>
              <div className="preset-buttons">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={`preset-btn ${email === preset.email ? "active" : ""}`}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Authentication Form */}
            <form onSubmit={onSubmit} className="login-form-modern">
              <div className="login-field">
                <label htmlFor="email">
                  <Mail size={15} />
                  <span>Institutional Email</span>
                </label>
                <div className="login-input-wrap">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@elabs.local"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-field-header">
                  <label htmlFor="password">
                    <Lock size={15} />
                    <span>Password</span>
                  </label>
                  <Link href="/forgot-password" className="login-forgot">
                    Forgot password?
                  </Link>
                </div>
                <div className="login-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="login-options">
                <label className="login-remember">
                  <input type="checkbox" defaultChecked />
                  <span>Keep session active on this workstation</span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="login-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" disabled={loading} className="login-submit-btn">
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Platform</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Footer Institutional Badges */}
            <div className="login-card-footer">
              <div className="security-guarantee">
                <LockKeyhole size={13} />
                <span>TLS 1.3 256-Bit Encrypted Session</span>
              </div>
              <div className="login-copyright">
                <span>© 2026 Faculty of Engineering</span>
                <span>•</span>
                <span>University of Ruhuna</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
