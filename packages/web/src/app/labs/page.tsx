"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  Zap,
  Activity,
  Cpu,
  Radio,
  Network,
  Wrench,
  Building2,
  GraduationCap,
  ChevronRight,
  Package,
  CheckCircle2,
  MapPin,
  CircuitBoard,
  Microchip,
  Wifi,
  Rocket,
  FlaskConical,
} from "lucide-react";

type Lab = {
  id: number;
  name: string;
  location: string | null;
  floor: string | null;
  description: string | null;
  facilities: string | null;
  totalItems: number;
  availableItems: number;
  borrowedItems: number;
  maintenanceItems: number;
};

type Semester = {
  id: number;
  name: string;
  level: number;
  moduleCount: number;
};

const LAB_ICONS: Record<number, { icon: React.ComponentType<any>; color: string }> = {
  1: { icon: Zap, color: "#d97706" },          // Power Systems & High Voltage
  2: { icon: Activity, color: "#dc2626" },     // Electric Machines & Power Electronics
  3: { icon: Cpu, color: "#2563eb" },          // Electronics & Measurement
  4: { icon: Radio, color: "#7c3aed" },        // Communication & Systems Engineering
  5: { icon: Network, color: "#0891b2" },      // Information Engineering (Cisco)
  6: { icon: Wrench, color: "#059669" },       // 24x7 Development Project Lab
};

const LAB_IMAGES: Record<number, string> = {
  1: "/labs/lab1-power-systems.jpg",
  2: "/labs/lab2-electric-machines.jpg",
  3: "/labs/lab3-electronics-measurement.jpg",
  4: "/labs/lab4-communication-systems.jpg",
  5: "/labs/lab5-information-engineering.jpg",
  6: "/labs/lab6-project-development.jpg",
};

const GROUP_COLORS: Record<number, string> = {
  1: "#2563eb", 2: "#0891b2", 3: "#7c3aed", 4: "#d97706",
  5: "#ea580c", 6: "#059669", 7: "#c026d3", 8: "#dc2626", 9: "#475569",
};

function getSemesterIcon(level: number, color: string) {
  const props = { size: 24, color, strokeWidth: 1.5 };
  switch (level) {
    case 1: return <Cpu {...props} />;
    case 2: return <Zap {...props} />;
    case 3: return <Radio {...props} />;
    case 4: return <CircuitBoard {...props} />;
    case 5: return <Activity {...props} />;
    case 6: return <Microchip {...props} />;
    case 7: return <Wifi {...props} />;
    case 8: return <Rocket {...props} />;
    case 9: return <FlaskConical {...props} />;
    default: return <Microchip {...props} />;
  }
}

export default function LabsPage() {
  const [activeTab, setActiveTab] = useState<"facilities" | "curriculum">("facilities");
  const [labs, setLabs] = useState<Lab[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/labs").then((r) => r.json()),
      apiFetch("/academic/semesters").then((r) => r.json()),
    ])
      .then(([labsRes, semRes]) => {
        setLabs(labsRes.labs ?? []);
        setSemesters(semRes.semesters ?? []);
      })
      .catch((err) => {
        console.error("Labs page load error:", err);
        setError("Failed to load department laboratories");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell
      title="Laboratories"
      subtitle="Department of Electrical and Information Engineering"
    >
      {/* Top Tab Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid var(--border-color)" }}>
        <button
          onClick={() => setActiveTab("facilities")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "facilities" ? "2px solid #2563eb" : "2px solid transparent",
            color: activeTab === "facilities" ? "#2563eb" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Building2 size={16} />
          <span>Department Facilities (6 Laboratories)</span>
        </button>

        <button
          onClick={() => setActiveTab("curriculum")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "curriculum" ? "2px solid #2563eb" : "2px solid transparent",
            color: activeTab === "curriculum" ? "#2563eb" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <GraduationCap size={16} />
          <span>Curriculum & Semester Groups</span>
        </button>
      </div>

      {loading && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          Loading department facilities…
        </div>
      )}

      {error && (
        <div style={{ padding: 24, textAlign: "center", color: "#dc2626", background: "rgba(220,38,38,0.1)", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {!loading && !error && activeTab === "facilities" && (
        <section>
          {/* Department Labs Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 20,
              paddingBottom: 32,
            }}
          >
            {labs.map((lab, index) => {
              const meta = LAB_ICONS[lab.id] ?? { icon: Building2, color: "#2563eb" };
              const Icon = meta.icon;
              const locationStr = [lab.location, lab.floor].filter(Boolean).join(" · ");
              const labImage = LAB_IMAGES[lab.id];

              return (
                <article
                  key={lab.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Photo Header */}
                  {labImage ? (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: 190,
                        overflow: "hidden",
                        backgroundColor: "#0f172a",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={labImage}
                        alt={lab.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      {/* Contrast gradient overlay */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.1) 45%, rgba(15,23,42,0.7) 100%)",
                        }}
                      />

                      {/* Accent Top Border */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: meta.color,
                        }}
                      />

                      {/* Badges Overlay */}
                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          right: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          zIndex: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "#ffffff",
                            background: meta.color,
                            padding: "3px 9px",
                            borderRadius: 6,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                          }}
                        >
                          LAB {String(index + 1).padStart(2, "0")}
                        </span>

                        {locationStr && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: "#f8fafc",
                              background: "rgba(15, 23, 42, 0.78)",
                              backdropFilter: "blur(6px)",
                              WebkitBackdropFilter: "blur(6px)",
                              padding: "3px 9px",
                              borderRadius: 6,
                              border: "1px solid rgba(255, 255, 255, 0.18)",
                            }}
                          >
                            <MapPin size={12} />
                            <span>{locationStr}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: meta.color,
                      }}
                    />
                  )}

                  <div
                    style={{
                      padding: "20px 22px 22px",
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      {/* Header Row if no image */}
                      {!labImage && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: meta.color,
                              background: `${meta.color}15`,
                              padding: "3px 8px",
                              borderRadius: 4,
                              border: `1px solid ${meta.color}30`,
                            }}
                          >
                            LAB {String(index + 1).padStart(2, "0")}
                          </span>

                          {locationStr && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.78rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              <MapPin size={12} />
                              <span>{locationStr}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Title & Icon */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: `${meta.color}15`,
                            border: `1px solid ${meta.color}30`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: meta.color,
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.05rem",
                            fontWeight: 700,
                            color: "var(--text-main)",
                            lineHeight: 1.35,
                          }}
                        >
                          {lab.name}
                        </h3>
                      </div>

                      {/* Description */}
                      {lab.description && (
                        <p
                          style={{
                            margin: "0 0 14px",
                            fontSize: "0.86rem",
                            color: "var(--text-muted)",
                            lineHeight: 1.55,
                          }}
                        >
                          {lab.description}
                        </p>
                      )}

                      {/* Facilities / Examples Box */}
                      {lab.facilities && (
                        <div
                          style={{
                            background: "var(--bg-app)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 8,
                            padding: "10px 12px",
                            marginBottom: 16,
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              color: meta.color,
                              marginBottom: 4,
                            }}
                          >
                            Facilities & Experiments
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-main)", lineHeight: 1.45 }}>
                            {lab.facilities}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Equipment & Link */}
                    <div
                      style={{
                        borderTop: "1px solid var(--border-color)",
                        paddingTop: 14,
                        marginTop: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-main)", fontWeight: 600 }}>
                          <Package size={14} color="var(--text-muted)" />
                          <span>{lab.totalItems} equipment items</span>
                        </span>
                        <span style={{ color: "#059669", fontWeight: 500 }}>
                          · {lab.availableItems} available
                        </span>
                      </div>

                      <Link
                        href={`/inventory`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#2563eb",
                          textDecoration: "none",
                        }}
                      >
                        <span>Inventory</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!loading && !error && activeTab === "curriculum" && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
            paddingBottom: 32,
          }}
        >
          {semesters.map((sem) => {
            const color = GROUP_COLORS[sem.level] ?? "var(--text-muted)";
            const isRnD = sem.level === 9;
            const yearStr = isRnD ? "Research" : `Year ${Math.ceil(sem.level / 2)}`;

            return (
              <Link key={sem.id} href={`/labs/${sem.id}`} style={{ textDecoration: "none" }}>
                <article
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "150px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: `${color}15`,
                        border: `1px solid ${color}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {getSemesterIcon(sem.level, color)}
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 2px", color: "var(--text-main)", fontWeight: 600, fontSize: "1.05rem" }}>
                        {sem.name}
                      </h3>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>
                        {yearStr}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      <strong style={{ color: "var(--text-main)" }}>{sem.moduleCount}</strong> assigned modules
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 2, color: "#2563eb", fontSize: "0.82rem", fontWeight: 600 }}>
                      View Modules <ChevronRight size={14} />
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
