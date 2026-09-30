"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { Cpu, Zap, Radio, CircuitBoard, Microchip, Activity, Wifi, Rocket, FlaskConical, ChevronRight } from "lucide-react";

type Semester = {
  id: number;
  name: string;
  level: number;
  moduleCount: number;
};

const groupColors: Record<number, string> = {
  1: "#1dd5e6", 2: "#3d83f6", 3: "#7d5cff", 4: "#f3ae2a",
  5: "#ff7043", 6: "#18d18f", 7: "#e040fb", 8: "#ff4d57", 9: "#a798ff",
};

function getIcon(level: number, color: string) {
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
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/academic/semesters")
      .then((r) => r.json())
      .then((d) => setSemesters(d.semesters ?? []))
      .catch(() => setError("Failed to load semester groups"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Laboratories" subtitle="Department of Electrical and Information Engineering">
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          Loading semester groups…
        </div>
      )}
      {error && (
        <div style={{ padding: 40, textAlign: "center", color: "#ff4d57" }}>{error}</div>
      )}

      {!loading && !error && (
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 24,
          padding: "16px 0 32px",
        }}>
          {semesters.map((sem) => {
            const color = groupColors[sem.level] ?? "var(--text-muted)";
            const isRnD = sem.level === 9;
            const yearStr = isRnD ? "Research" : `Year ${Math.ceil(sem.level / 2)}`;
            
            return (
              <Link key={sem.id} href={`/labs/${sem.id}`} style={{ textDecoration: "none" }}>
                <article
                  style={{
                    background: "var(--bg-card)",
                    border: `1px solid var(--border-color)`,
                    borderRadius: 12,
                    padding: "24px",
                    cursor: "pointer",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "160px"
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${color}60`;
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-app)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${color}15`;
                    const iconWrap = e.currentTarget.querySelector('.icon-wrapper') as HTMLElement;
                    if (iconWrap) {
                      iconWrap.style.transform = "scale(1.1) rotate(2deg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `var(--border-color)`;
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    const iconWrap = e.currentTarget.querySelector('.icon-wrapper') as HTMLElement;
                    if (iconWrap) {
                      iconWrap.style.transform = "none";
                    }
                  }}
                >
                  {/* Subtle top border accent */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.8 }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div className="icon-wrapper" style={{
                        width: 48, height: 48, borderRadius: 10,
                        background: `${color}15`, border: `1px solid ${color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                      }}>
                        {getIcon(sem.level, color)}
                      </div>
                      <div>
                        <h3 style={{ margin: "0 0 4px", color: "var(--text-main)", fontWeight: 600, fontSize: "1.1rem", letterSpacing: "0.2px" }}>
                          {sem.name}
                        </h3>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                          {yearStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                        Assigned Modules
                      </div>
                      <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "1.2rem", display: "flex", alignItems: "baseline", gap: 6 }}>
                        {sem.moduleCount} <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>total</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: color, fontSize: "0.85rem", fontWeight: 600 }}>
                      View <ChevronRight size={16} strokeWidth={2} />
                    </div>
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
