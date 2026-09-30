"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { FileText, CheckCircle2, Clock, Check } from "lucide-react";

type Session = {
  id: number; title: string; description: string;
  scheduledDate: string; durationHours: number; status: string;
  documentUrl: string | null;
  moduleId: number; moduleCode: string; moduleName: string;
  semesterId: number; semesterName: string;
  attended: boolean; reportSubmitted: boolean; completedAt: string | null;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/academic/lab-sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => setSession(d.session ?? null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return (
    <AppShell title="Loading…" subtitle="">
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading session…</div>
    </AppShell>
  );

  if (!session) return (
    <AppShell title="Not Found" subtitle="">
      <div style={{ padding: 60, textAlign: "center", color: "#ff4d57" }}>Session not found.</div>
    </AppShell>
  );

  const isDone = session.attended && session.reportSubmitted;

  return (
    <AppShell title={session.title} subtitle={`${session.moduleCode} — ${session.moduleName}`}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
        <Link href="/labs" style={{ color: "#3d83f6", textDecoration: "none" }}>Lab Groups</Link>
        <span>›</span>
        <Link href={`/labs/${session.semesterId}`} style={{ color: "#3d83f6", textDecoration: "none" }}>{session.semesterName}</Link>
        <span>›</span>
        <Link href={`/labs/module/${session.moduleId}`} style={{ color: "#3d83f6", textDecoration: "none" }}>{session.moduleCode}</Link>
        <span>›</span>
        <span style={{ color: "var(--text-main)" }}>Lab Session</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Description */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24 }}>
            <h3 style={{ margin: "0 0 12px", color: "var(--text-main)", fontWeight: 600 }}>Lab Description</h3>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7, margin: 0, fontSize: "0.92rem" }}>
              {session.description || "No description provided."}
            </p>
          </div>

          {/* Documents */}
          {session.documentUrl && (
            <div style={{ background: "var(--bg-card)", border: "1px solid #3d83f630", borderRadius: 14, padding: 20 }}>
              <h3 style={{ margin: "0 0 12px", color: "var(--text-main)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={18} />
                <span>Documents</span>
              </h3>
              <a
                href={session.documentUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  color: "#3d83f6", textDecoration: "none", background: "#3d83f615",
                  padding: "8px 16px", borderRadius: 8, fontSize: "0.88rem",
                }}
              >
                Open Lab Document →
              </a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Status card */}
          <div style={{
            background: "var(--bg-card)", border: `1px solid ${isDone ? "#18d18f30" : "#f3ae2a30"}`,
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8 }}>Status</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700,
              fontSize: "1rem", color: isDone ? "#18d18f" : "#f3ae2a",
              background: isDone ? "#18d18f15" : "#f3ae2a15",
              padding: "6px 14px", borderRadius: 20,
            }}>
              {isDone ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={16} /> Completed</span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Clock size={16} /> Pending</span>
              )}
            </div>
          </div>

          {/* Details */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 20 }}>
            <h4 style={{ margin: "0 0 14px", color: "var(--text-main)", fontWeight: 600 }}>Details</h4>
            {[
              { label: "Scheduled Date", val: formatDate(session.scheduledDate) },
              { label: "Duration", val: `${session.durationHours} hours` },
              { label: "Module", val: `${session.moduleCode} — ${session.moduleName}` },
              { label: "Semester", val: session.semesterName },
            ].map((row) => (
              <div key={row.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2 }}>{row.label}</div>
                <div style={{ color: "var(--text-main)", fontSize: "0.88rem" }}>{row.val}</div>
              </div>
            ))}
          </div>

          {/* Completion checklist */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 20 }}>
            <h4 style={{ margin: "0 0 14px", color: "var(--text-main)", fontWeight: 600 }}>Completion</h4>
            {[
              { label: "Attendance", done: session.attended },
              { label: "Report Submitted", done: session.reportSubmitted },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: item.done ? "#18d18f20" : "var(--border-color)",
                  border: `1.5px solid ${item.done ? "#18d18f" : "#2a4a7a"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", color: "#18d18f",
                }}>
                  {item.done ? <Check size={12} /> : ""}
                </div>
                <span style={{ color: item.done ? "#18d18f" : "var(--text-muted)", fontSize: "0.88rem" }}>{item.label}</span>
              </div>
            ))}
            {session.completedAt && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 8 }}>
                Completed: {formatDate(session.completedAt)}
              </div>
            )}
          </div>

          <Link href={`/labs/module/${session.moduleId}`} style={{
            display: "block", textAlign: "center", padding: "10px 20px",
            background: "var(--border-color)", borderRadius: 10, color: "var(--text-muted)",
            textDecoration: "none", fontSize: "0.88rem",
          }}>
            ← Back to Module
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
