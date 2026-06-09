"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Module = {
  id: number; code: string; name: string;
  coordinatorName: string | null;
  numStudents: number;
  labCount: number; brokenLabs: number;
  totalSessions: number; upcomingSessions: number; completedSessions: number;
};
type Semester = { id: number; name: string; level: number; coordinatorName: string | null };

const MODULE_COLORS: Record<string, string> = {
  EE6207: "#3d83f6",
  EE6301: "#1dd5e6",
  EE6302: "#18d18f",
  EE6309: "#f3ae2a",
  EE6210: "#a78bfa",
};

function getColor(code: string, idx: number) {
  const palette = ["#1dd5e6","#3d83f6","#18d18f","#f3ae2a","#a78bfa","#ff7043","#e040fb","#ff4d57"];
  return MODULE_COLORS[code] ?? palette[idx % palette.length];
}

export default function SemesterGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/academic/semesters/${groupId}`)
      .then(r => r.json())
      .then(d => { setSemester(d.semester); setModules(d.modules ?? []); })
      .finally(() => setLoading(false));
  }, [groupId]);

  return (
    <AppShell
      title={semester?.name ?? "Loading…"}
      subtitle="Department of Electrical and Information Engineering · Academic Year 2025/2026"
    >
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "#7ea5d6" }}>
        <Link href="/labs" style={{ color: "#3d83f6", textDecoration: "none" }}>Lab Groups</Link>
        <span>›</span>
        <span style={{ color: "#e8f0fe" }}>{semester?.name ?? "…"}</span>
      </div>

      {/* Semester Info Card */}
      {semester && (
        <div style={{ background: "linear-gradient(135deg,#0d1b2e,#0a1628)", border: "1px solid #1a2d4a", borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: "#4a6580", fontSize: "0.75rem", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>SEMESTER</div>
            <div style={{ color: "#e8f0fe", fontWeight: 700, fontSize: "1.1rem" }}>{semester.name}</div>
            <div style={{ color: "#7ea5d6", fontSize: "0.82rem", marginTop: 4 }}>Electrical · 24th Batch · Academic Year 2025/2026</div>
          </div>
          {semester.coordinatorName && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: "#4a6580", fontSize: "0.75rem", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>SEMESTER COORDINATOR</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: "0.85rem" }}>
                  {semester.coordinatorName.split(" ").pop()?.charAt(0) ?? "?"}
                </div>
                <div>
                  <div style={{ color: "#e8f0fe", fontWeight: 600, fontSize: "0.9rem" }}>{semester.coordinatorName}</div>
                  <div style={{ color: "#4a6580", fontSize: "0.75rem" }}>Semester Coordinator</div>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#3d83f6", fontWeight: 700, fontSize: "1.8rem" }}>{modules.length}</div>
              <div style={{ color: "#4a6580", fontSize: "0.72rem", fontWeight: 600 }}>MODULES</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#18d18f", fontWeight: 700, fontSize: "1.8rem" }}>
                {modules.reduce((s, m) => s + Number(m.labCount ?? 0), 0)}
              </div>
              <div style={{ color: "#4a6580", fontSize: "0.72rem", fontWeight: 600 }}>LABS</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#f3ae2a", fontWeight: 700, fontSize: "1.8rem" }}>
                {modules.reduce((s, m) => s + Number(m.numStudents ?? 0), 0) / Math.max(modules.length, 1)}
              </div>
              <div style={{ color: "#4a6580", fontSize: "0.72rem", fontWeight: 600 }}>STUDENTS</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#7ea5d6" }}>Loading modules…</div>
      ) : modules.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", background: "#0d1b2e", borderRadius: 14, border: "1px dashed #1a2d4a", color: "#7ea5d6" }}>
          No modules in this group yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {modules.map((mod, idx) => {
            const color = getColor(mod.code, idx);
            const done = Number(mod.completedSessions ?? 0);
            const total = Number(mod.totalSessions ?? 0);
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            const broken = Number(mod.brokenLabs ?? 0);
            const labCount = Number(mod.labCount ?? 0);

            return (
              <Link key={mod.id} href={`/labs/module/${mod.id}`} style={{ textDecoration: "none" }}>
                <article
                  style={{ background: "#0d1b2e", border: `1px solid ${color}25`, borderRadius: 14, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s ease", display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}60`; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${color}15`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}25`; (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  <div>
                    {/* Top row: code badge + broken lab warning */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: 1, color, background: `${color}15`, padding: "3px 12px", borderRadius: 20 }}>
                        {mod.code}
                      </span>
                      {broken > 0 && (
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#ff4d57", background: "#ff4d5715", padding: "3px 10px", borderRadius: 20 }}>
                          ⚠️ {broken} lab{broken > 1 ? "s" : ""} not working
                        </span>
                      )}
                    </div>

                    {/* Module name */}
                    <h3 style={{ margin: "0 0 10px", color: "#e8f0fe", fontWeight: 700, fontSize: "1rem", lineHeight: 1.4 }}>{mod.name}</h3>

                    {/* Coordinator */}
                    {mod.coordinatorName && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color }}>
                          {mod.coordinatorName.split(" ").pop()?.charAt(0)}
                        </div>
                        <span style={{ color: "#7ea5d6", fontSize: "0.82rem" }}>{mod.coordinatorName}</span>
                        <span style={{ color: "#2d4a6a", fontSize: "0.72rem" }}>· Module Coordinator</span>
                      </div>
                    )}

                    {/* Lab practicals summary */}
                    <div style={{ display: "flex", gap: 16, fontSize: "0.8rem", flexWrap: "wrap" }}>
                      <span style={{ color: color }}>🧪 {labCount} lab{labCount !== 1 ? "s" : ""}</span>
                      <span style={{ color: "#7ea5d6" }}>👥 {mod.numStudents ?? 75} students</span>
                      {total > 0 && <span style={{ color: "#18d18f" }}>✓ {done}/{total} sessions done</span>}
                    </div>

                    {/* Progress bar (if sessions exist) */}
                    {total > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ background: "#0a1628", borderRadius: 4, height: 4, overflow: "hidden" }}>
                          <div style={{ width: `${progress}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.3s ease" }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ color, fontSize: "1.6rem" }}>›</span>
                    <span style={{ color: "#4a6580", fontSize: "0.7rem" }}>View Labs</span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
