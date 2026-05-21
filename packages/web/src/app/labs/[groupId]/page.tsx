"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Module = {
  id: number; code: string; name: string;
  totalSessions: number; upcomingSessions: number; completedSessions: number;
};
type Semester = { id: number; name: string; level: number };

export default function SemesterGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/academic/semesters/${groupId}`)
      .then((r) => r.json())
      .then((d) => { setSemester(d.semester); setModules(d.modules ?? []); })
      .finally(() => setLoading(false));
  }, [groupId]);

  const moduleColors = ["#1dd5e6","#3d83f6","#7d5cff","#f3ae2a","#18d18f","#ff4d57","#e040fb","#ff7043"];

  return (
    <AppShell title={semester?.name ?? "Loading…"} subtitle="Select a module to view lab sessions">
      <div style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "#7ea5d6" }}>
        <Link href="/labs" style={{ color: "#3d83f6", textDecoration: "none" }}>Lab Groups</Link>
        <span>›</span>
        <span style={{ color: "#e8f0fe" }}>{semester?.name ?? "…"}</span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#7ea5d6" }}>Loading modules…</div>
      ) : modules.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", background: "#0d1b2e", borderRadius: 14, border: "1px dashed #1a2d4a", color: "#7ea5d6" }}>
          No modules in this group yet.
        </div>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {modules.map((mod, idx) => {
            const color = moduleColors[idx % moduleColors.length];
            const pending = Number(mod.upcomingSessions ?? 0);
            const done = Number(mod.completedSessions ?? 0);
            const total = Number(mod.totalSessions ?? 0);
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <Link key={mod.id} href={`/labs/module/${mod.id}`} style={{ textDecoration: "none" }}>
                <article
                  style={{ background: "#0d1b2e", border: `1px solid ${color}25`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "all 0.2s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color}60`; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color}25`; (e.currentTarget as HTMLElement).style.transform = "none"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: 1, color: color, background: `${color}15`, padding: "3px 10px", borderRadius: 20 }}>
                      {mod.code}
                    </span>
                    {pending > 0 && (
                      <span style={{ fontSize: "0.72rem", color: "#f3ae2a", background: "#f3ae2a15", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
                        {pending} pending
                      </span>
                    )}
                  </div>
                  <h4 style={{ margin: "0 0 14px", color: "#e8f0fe", fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.4 }}>{mod.name}</h4>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ color: "#7ea5d6", fontSize: "0.78rem" }}>Progress</span>
                      <span style={{ color: color, fontSize: "0.78rem", fontWeight: 600 }}>{progress}%</span>
                    </div>
                    <div style={{ background: "#0a1628", borderRadius: 4, height: 5, overflow: "hidden" }}>
                      <div style={{ width: `${progress}%`, background: color, height: "100%", borderRadius: 4 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: "0.82rem" }}>
                    <span style={{ color: "#18d18f" }}>✓ {done} done</span>
                    <span style={{ color: "#f3ae2a" }}>◷ {pending} upcoming</span>
                    <span style={{ color: "#7ea5d6" }}>{total} total</span>
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
