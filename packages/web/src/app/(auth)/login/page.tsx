"use client";

import { useState, useEffect } from "react";
import { apiFetch, setAccessToken } from "@/lib/api";
import { setUser, setToken } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  School,
  Building2,
  Cpu,
  Zap,
  Activity,
  Radio,
  Network,
  Hammer,
  Check,
  LockKeyhole
} from "lucide-react";

interface LabFacility {
  id: string;
  code: string;
  name: string;
  shortName: string;
  category: string;
  location: string;
  workstations: string;
  color: string;
  iconName: "zap" | "activity" | "cpu" | "radio" | "network" | "hammer";
  summary: string;
  keyEquipment: string[];
  safetyLevel: string;
}

const LAB_FACILITIES: LabFacility[] = [
  {
    id: "power-systems",
    code: "LAB-01",
    name: "Power Systems and High Voltage Laboratory",
    shortName: "Power Systems & HV",
    category: "High Voltage & Energy Systems",
    location: "Block A • Ground Floor HV Bay",
    workstations: "16 Students / Bay",
    color: "#b45309",
    iconName: "zap",
    summary: "Dedicated to high-voltage engineering, insulation breakdown analysis, impulse surge testing, and electrical power system experiments.",
    keyEquipment: [
      "100 kV Impulse Voltage Generator (Marx Stage)",
      "High-Voltage AC/DC Breakdown Test Set",
      "Digital Corona & Partial Discharge Diagnostic Unit",
      "Surge Voltage Measurement & Sphere-Gap Voltmeter"
    ],
    safetyLevel: "High Voltage Safety Clearance Required"
  },
  {
    id: "electric-machines",
    code: "LAB-02",
    name: "Electric Machines and Power Electronics Laboratory",
    shortName: "Machines & Drives",
    category: "Drives, Machines & Inverters",
    location: "Machines Wing • Ground Floor",
    workstations: "12 Dynamometer Test Benches",
    color: "#0369a1",
    iconName: "activity",
    summary: "Comprehensive study of AC/DC electrical machines, torque-speed characterization, regenerative drives, and power-electronic converters.",
    keyEquipment: [
      "Coupled DC & 3-Phase Induction Dynamometer Rigs",
      "Variable Frequency AC Motor Inverter Drives (VFD)",
      "IGBT/MOSFET Chopper & Switched-Mode Test Benches",
      "Digital Power Quality & Torque-Speed Analyzers"
    ],
    safetyLevel: "Rotational Safety PPE Required"
  },
  {
    id: "electronics",
    code: "LAB-03",
    name: "Electronics and Measurement Laboratory",
    shortName: "Electronics & Measurement",
    category: "Analog, Digital & Instrumentation",
    location: "Main Academic Building • Level 2",
    workstations: "24 Dual-Workstation Benches",
    color: "#047857",
    iconName: "cpu",
    summary: "Supports analog and digital circuit prototyping, precision electrical measurements, signal integrity analysis, and FPGA system design.",
    keyEquipment: [
      "Tektronix & Keysight Digital Storage Oscilloscopes",
      "Mixed-Signal Logic Analyzers & Arbitrary Waveform Generators",
      "Precision Bench Multimeters (6½ Digit) & DC Supplies",
      "Intel Altera Cyclone IV & DE10 FPGA Development Kits"
    ],
    safetyLevel: "ESD-Protected Area Clearance"
  },
  {
    id: "comm",
    code: "LAB-04",
    name: "Communication and Systems Engineering Laboratory",
    shortName: "Communication Systems",
    category: "Telecommunications & Signal Systems",
    location: "Systems Wing • Room 204",
    workstations: "20 Workstations",
    color: "#6d28d9",
    iconName: "radio",
    summary: "Practical learning environment for communication engineering, RF propagation, digital modulation, and Software Defined Radio (SDR).",
    keyEquipment: [
      "USRP Software Defined Radio (SDR) Platforms",
      "High-Frequency RF Spectrum Analyzers & Signal Generators",
      "Digital Modulation & Demodulation Carrier Test Sets",
      "Microwave Transmission Line & Antenna Test Benches"
    ],
    safetyLevel: "Standard Academic Clearance"
  },
  {
    id: "info",
    code: "LAB-05",
    name: "Information Engineering Laboratory",
    shortName: "Information Engineering",
    category: "Cisco Networking Academy",
    location: "Computing Wing • Lab Hall 3",
    workstations: "30 Cisco Workstations",
    color: "#1d4ed8",
    iconName: "network",
    summary: "Official Cisco Networking Academy facility equipped with enterprise-grade routers and managed switches for routing and network engineering practicals.",
    keyEquipment: [
      "Cisco Catalyst 3850 & 2960-X Managed Switch Stacks",
      "Cisco 2901 Integrated Services Enterprise Routers (ISR)",
      "Dual-Rack Structured Cabling & Patch Panels",
      "Network Protocol Analyzers & Packet Telemetry Benches"
    ],
    safetyLevel: "Cisco Academy Lab Access"
  },
  {
    id: "project-lab",
    code: "LAB-06",
    name: "24 × 7 Undergraduate Development Project Laboratory",
    shortName: "24×7 Project Workspace",
    category: "Prototyping & Capstone Projects",
    location: "Innovation Hub • Level 1",
    workstations: "16 Dedicated Hardware Benches",
    color: "#be123c",
    iconName: "hammer",
    summary: "Round-the-clock dedicated workspace for undergraduate project development, final-year capstone designs, PCB fabrication, and testing.",
    keyEquipment: [
      "16 Dedicated Workstations with Dual Displays & Isolated Power",
      "Temperature-Controlled SMD Soldering & Rework Stations",
      "Precision PCB Cutting, Drilling & CNC Machines",
      "Electronic Component Storage & Hardware Testing Racks"
    ],
    safetyLevel: "24/7 RFID Badge Clearance"
  }
];

export default function LoginPage() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const [email, setEmail] = useState("admin@elabs.local");
  const [password, setPassword] = useState("Admin123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active laboratory tab for showcase
  const [activeLabIndex, setActiveLabIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Rotate through laboratories automatically every 7 seconds
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setActiveLabIndex((prev) => (prev + 1) % LAB_FACILITIES.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

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

  const currentLab = LAB_FACILITIES[activeLabIndex];

  const renderLabIcon = (iconName: LabFacility["iconName"]) => {
    switch (iconName) {
      case "zap": return <Zap size={18} />;
      case "activity": return <Activity size={18} />;
      case "cpu": return <Cpu size={18} />;
      case "radio": return <Radio size={18} />;
      case "network": return <Network size={18} />;
      case "hammer": return <Hammer size={18} />;
    }
  };

  return (
    <div className="login-white-root">
      {/* Top Department Navigation Bar */}
      <header className="login-white-topbar">
        <div className="login-white-topbar-inner">
          <div className="login-topbar-brand">
            <div className="login-topbar-crest">
              <Image
                src="/logo.png"
                alt="University of Ruhuna"
                width={36}
                height={36}
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
            <div>
              <div className="login-topbar-inst">Faculty of Engineering • University of Ruhuna</div>
              <div className="login-topbar-dept">DEPARTMENT OF ELECTRICAL & INFORMATION ENGINEERING</div>
            </div>
          </div>

          <div className="login-topbar-badge">
            <span className="login-status-live-dot" />
            <span>6 Academic Facilities Operational</span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Content */}
      <main className="login-white-main">
        <div className="login-white-grid">
          
          {/* Left Column: Department Hero & Interactive Laboratory Showcase */}
          <section className="login-white-hero">
            <div className="login-hero-badges-row">
              <span className="inst-badge">
                <School size={14} />
                <span>Academic Portal</span>
              </span>
              <span className="dept-badge">
                EIE Department
              </span>
            </div>

            <h1 className="login-white-title">
              ELABS
              <span className="login-white-subtitle">Smart Laboratory & Resource Management System</span>
            </h1>

            <p className="login-white-lead">
              Centralized institutional platform supporting undergraduate practical courses, calibrated instrument checkout, research facilities, and continuous assessment across the department&apos;s laboratories.
            </p>

            {/* Interactive Department Laboratory Directory Card */}
            <div 
              className="login-lab-showcase-card"
              onMouseEnter={() => setIsAutoRotating(false)}
              onMouseLeave={() => setIsAutoRotating(true)}
            >
              <div className="login-lab-showcase-head">
                <div className="showcase-title-row">
                  <div className="showcase-title">
                    <Building2 size={16} />
                    <span>Department Laboratory Facilities</span>
                  </div>
                  <span className="showcase-count-pill">
                    {currentLab.code} of {LAB_FACILITIES.length}
                  </span>
                </div>

                {/* Laboratory Selector Tabs */}
                <div className="login-lab-tabs-list">
                  {LAB_FACILITIES.map((lab, idx) => (
                    <button
                      key={lab.id}
                      type="button"
                      className={`login-lab-tab-btn ${idx === activeLabIndex ? "active" : ""}`}
                      onClick={() => setActiveLabIndex(idx)}
                      title={lab.name}
                    >
                      <span className="tab-btn-number">{lab.code.replace("LAB-", "")}</span>
                      <span className="tab-btn-name">{lab.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Laboratory Detail Display */}
              <div className="login-lab-detail-body">
                <div className="lab-detail-header">
                  <div className="lab-icon-box" style={{ color: currentLab.color, borderColor: `${currentLab.color}40`, backgroundColor: `${currentLab.color}12` }}>
                    {renderLabIcon(currentLab.iconName)}
                  </div>
                  <div className="lab-title-group">
                    <div className="lab-category-tag" style={{ color: currentLab.color }}>
                      {currentLab.category}
                    </div>
                    <h3 className="lab-main-name">{currentLab.name}</h3>
                  </div>
                </div>

                <p className="lab-summary-text">{currentLab.summary}</p>

                {/* Key Calibrated Equipment Grid */}
                <div className="lab-equipment-section">
                  <div className="lab-equipment-header">
                    <span>Key Calibrated Equipment & Workstations:</span>
                  </div>
                  <div className="lab-equipment-grid">
                    {currentLab.keyEquipment.map((eq, i) => (
                      <div key={i} className="lab-equipment-item">
                        <Check size={14} className="lab-eq-check" style={{ color: currentLab.color }} />
                        <span>{eq}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Laboratory Meta Details */}
                <div className="lab-meta-footer">
                  <div className="lab-meta-col">
                    <span className="meta-label">Facility Location:</span>
                    <span className="meta-val">{currentLab.location}</span>
                  </div>
                  <div className="lab-meta-col">
                    <span className="meta-label">Station Capacity:</span>
                    <span className="meta-val">{currentLab.workstations}</span>
                  </div>
                  <div className="lab-meta-col">
                    <span className="meta-label">Safety Compliance:</span>
                    <span className="meta-val-badge">{currentLab.safetyLevel}</span>
                  </div>
                </div>
              </div>

              {/* Status Ticker */}
              <div className="login-lab-showcase-foot">
                <span className="foot-status-dot" />
                <span className="foot-status-text">
                  Laboratory inventory & timetable synchronized with Department of Electrical & Information Engineering
                </span>
              </div>
            </div>

            {/* Department Metric Badges */}
            <div className="login-stat-badges-row">
              <div className="stat-pill">
                <Building2 size={16} className="stat-pill-icon" />
                <div>
                  <strong>6 Facilities</strong>
                  <span>Official EIE Labs</span>
                </div>
              </div>
              <div className="stat-pill">
                <Cpu size={16} className="stat-pill-icon" />
                <div>
                  <strong>70+ Instruments</strong>
                  <span>Calibrated & Catalogued</span>
                </div>
              </div>
              <div className="stat-pill">
                <ShieldCheck size={16} className="stat-pill-icon" />
                <div>
                  <strong>RFID & Barcode</strong>
                  <span>Authorized Student Access</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Clean White Institutional Sign-In Card */}
          <section className="login-white-card-col">
            <div className="login-white-card">
              
              {/* Crest & Header */}
              <div className="login-card-head">
                <div className="login-card-emblem-wrap">
                  <Image
                    src="/logo.png"
                    alt="University of Ruhuna Crest"
                    width={52}
                    height={52}
                    style={{ objectFit: "contain" }}
                    priority
                  />
                </div>
                <h2 className="login-card-title">Institutional Sign In</h2>
                <p className="login-card-subtitle">Department of Electrical & Information Engineering</p>
              </div>

              {/* Quick Preset Selector for Testing */}
              <div className="login-preset-block">
                <div className="preset-header-label">Quick Sign-In Preset:</div>
                <div className="preset-buttons-row">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`login-preset-btn ${email === preset.email ? "active" : ""}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={onSubmit} className="login-form-clean">
                <div className="form-field-group">
                  <label htmlFor="email">
                    <Mail size={15} />
                    <span>Institutional Email</span>
                  </label>
                  <div className="form-input-container">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@elabs.local or eg22xxxx@engug.ruh.ac.lk"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <div className="form-field-header">
                    <label htmlFor="password">
                      <Lock size={15} />
                      <span>Password</span>
                    </label>
                    <Link href="/forgot-password" className="forgot-password-link">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="form-input-container">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="form-pwd-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Session checkbox */}
                <div className="form-options-row">
                  <label className="remember-me-label">
                    <input type="checkbox" defaultChecked />
                    <span>Keep session active on this workstation</span>
                  </label>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="login-error-banner" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <button type="submit" disabled={loading} className="login-submit-primary">
                  {loading ? (
                    <>
                      <span className="login-button-spinner" />
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

              {/* Security & Copyright Guarantee */}
              <div className="login-card-foot">
                <div className="foot-security-note">
                  <LockKeyhole size={13} />
                  <span>Faculty of Engineering Institutional SSO • TLS 1.3</span>
                </div>
                <div className="foot-copy-note">
                  <span>© 2026 Faculty of Engineering</span>
                  <span>•</span>
                  <span>University of Ruhuna</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
