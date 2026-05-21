"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Session = {
  id: number; title: string; description: string;
  scheduledDate: string; durationHours: number;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  attended: boolean; reportSubmitted: boolean;
  completedAt: string | null; documentUrl: string | null;
};
type Module = { id: number; code: string; name: string; semesterId: number; semesterName: string };

function sessionBadge(s: Session) {
  const isDone = s.attended && s.reportSubmitted;
  if (isDone) return { label: "Done", color: "#18d18f", bg: "#18d18f15" };
  if (s.status === "ONGOING") return { label: "Ongoing", color: "#3d83f6", bg: "#3d83f615" };
  return { label: "Pending", color: "#f3ae2a", bg: "#f3ae2a15" };
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [mod, setMod] = useState<Module | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "done">("pending");

  useEffect(() => {
    apiFetch(`/academic/modules/${moduleId}`)
      .then((r) => r.json())
      .then((d) => { setMod(d.module); setSessions(d.sessions ?? []); })
      .finally(() => setLoading(false));
  }, [moduleId]);

  const pending = sessions.filter((s) => !(s.attended && s.reportSubmitted));
  const done = sessions.filter((s) => s.attended && s.reportSubmitted);
  const displayed = activeTab === "pending" ? pending : done;

  const tab = (id: "pending" | "done", label: string, color: string) => (
    <button onClick={() => setActiveTab(id)} style={{
      padding: "8px 22px", borderRadius: 8, fontWeight: 600, fontSize: "0.88rem",
      cursor: "pointer", border: "none", transition: "all 0.2s",
      background: activeTab === id ? `${color}20` : "transparent",
      color: activeTab === id ? color : "#7ea5d6",
      borderBottom: activeTab === id ? `2px solid ${color}` : "2px solid transparent",
    }}>{label}</button>
  );

  return (
    <AppShell title={mod ? `${mod.code}: ${mod.name}` : "Loading…"} subtitle="Lab sessions for this module">
      {mod && (
        <div style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "#7ea5d6", flexWrap: "wrap" }}>
          <Link href="/labs" style={{ color: "#3d83f6", textDecoration: "none" }}>Lab Groups</Link>
          <span>›</span>
          <Link href={`/labs/${mod.semesterId}`} style={{ color: "#3d83f6", textDecoration: "none" }}>{mod.semesterName}</Link>
          <span>›</span>
          <span style={{ color: "#e8f0fe" }}>{mod.code}</span>
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Sessions", val: sessions.length, color: "#7ea5d6" },
            { label: "Pending", val: pending.length, color: "#f3ae2a" },
            { label: "Completed", val: done.length, color: "#18d18f" },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, background: "#0d1b2e", border: `1px solid ${s.color}25`, borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "#7ea5d6", fontSize: "0.78rem", marginBottom: 4 }}>{s.label}</div>
              <div style={{ color: s.color, fontWeight: 700, fontSize: "1.6rem" }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1a2d4a" }}>
        {tab("pending", `◷ Pending (${pending.length})`, "#f3ae2a")}
        {tab("done", `✓ Done (${done.length})`, "#18d18f")}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#7ea5d6" }}>Loading sessions…</div>
      ) : displayed.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#7ea5d6", background: "#0d1b2e", borderRadius: 12, border: "1px dashed #1a2d4a" }}>
          {activeTab === "pending" ? "No pending lab sessions 🎉" : "No completed sessions yet"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayed.map((session, idx) => {
            const badge = sessionBadge(session);
            return (
              <Link key={session.id} href={`/labs/session/${session.id}`} style={{ textDecoration: "none" }}>
                <article
                  style={{ background: "#0d1b2e", border: "1px solid #1a2d4a", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.15s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2a4a7a"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1a2d4a"; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${badge.color}20`, border: `1px solid ${badge.color}50`, display: "flex", alignItems: "center", justifyContent: "center", color: badge.color, fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ color: "#e8f0fe", fontWeight: 600, fontSize: "0.95rem" }}>{session.title}</span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: "0.8rem", color: "#7ea5d6", flexWrap: "wrap" }}>
                      <span>📅 {fmt(session.scheduledDate)}</span>
                      <span>⏱ {session.durationHours}h</span>
                      {session.attended && <span style={{ color: "#18d18f" }}>✓ Attended</span>}
                      {session.reportSubmitted && <span style={{ color: "#18d18f" }}>✓ Report</span>}
                    </div>
                  </div>
                  <span style={{ color: "#7ea5d6", fontSize: "1.2rem" }}>›</span>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
