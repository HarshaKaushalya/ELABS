"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { 
  CheckCircle2, XCircle, Wrench, FlaskConical, Calendar, ClipboardList, 
  Edit, Save, AlertTriangle, Clock, Check, Trash2, X,
  FileText, BookOpen, Upload, Download, Award, BarChart2, Plus, Eye, ChevronRight
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Practical = {
  id: number; labNumber: string; labTitle: string | null;
  equipStatus: "Working" | "Not Working" | "Under Maintenance";
  numSessions: number; notes: string | null; sortOrder: number;
};
type ScheduleSlot = {
  id: number; sessionDate: string; timeSlot: string;
  labLabel: string; groupCode: string; academicYear: string;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
};
type Session = {
  id: number; title: string; description: string;
  scheduledDate: string; durationHours: number;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  attended: boolean; reportSubmitted: boolean;
  completedAt: string | null; documentUrl: string | null;
};
type Module = {
  id: number; code: string; name: string;
  coordinatorName: string | null; numStudents: number;
  semesterId: number; semesterName: string; semesterCoordinator: string | null;
};
type Assignment = {
  id: number; title: string; type: "REPORT" | "PRE_LAB" | "OTHER";
  description: string | null; openedAt: string | null; dueAt: string | null;
  maxScore: number; submissionId: number | null; submittedAt: string | null;
  score: number | null; fileName: string | null; fileUrl: string | null;
  gradedAt: string | null; feedback: string | null;
};
type Quiz = {
  id: number; title: string; description: string | null;
  timeLimitMins: number; openedAt: string | null; closedAt: string | null;
  maxAttempts: number; questionCount: number; totalPoints: number;
  attemptId: number | null; attemptSubmittedAt: string | null;
  attemptScore: number | null; attemptMaxScore: number | null; attemptNumber: number | null;
};



// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch { return null; }
}

const EQUIP_CONFIG = {
  "Working":             { color: "#18d18f", bg: "#18d18f15", icon: CheckCircle2 },
  "Not Working":         { color: "#ff4d57", bg: "#ff4d5715", icon: XCircle },
  "Under Maintenance":   { color: "#f3ae2a", bg: "#f3ae2a15", icon: Wrench },
};

// ─── Edit Practicals Modal ────────────────────────────────────────────────────
function EditPracticalsModal({ mod, practicals, token, onClose, onSaved }: {
  mod: Module; practicals: Practical[]; token: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [rows, setRows] = useState(
    practicals.map(p => ({ labNumber: p.labNumber, labTitle: p.labTitle ?? "", equipStatus: p.equipStatus, numSessions: p.numSessions, notes: p.notes ?? "" }))
  );
  const [coordinatorName, setCoordinatorName] = useState(mod.coordinatorName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError("");
    try {
      // Update coordinator
      await apiFetch(`/academic/modules/${mod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinatorName }),
      });
      // Update practicals
      await apiFetch(`/academic/modules/${mod.id}/practicals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practicals: rows.map((r, i) => ({
            labNumber: r.labNumber, labTitle: r.labTitle || undefined,
            equipStatus: r.equipStatus, numSessions: r.numSessions,
            notes: r.notes || undefined, sortOrder: i + 1,
          }))
        }),
      });
      onSaved(); onClose();
    } catch { setError("Failed to save changes"); }
    finally { setSaving(false); }
  };

  const updateRow = (i: number, field: string, val: string | number) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const addRow = () => setRows(prev => [...prev, { labNumber: `Lab ${prev.length + 1}`, labTitle: "", equipStatus: "Working", numSessions: 0, notes: "" }]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, width: "min(780px,96vw)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, color: "var(--text-main)", fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
            <Edit size={16} />
            <span>Edit Module: {mod.code}</span>
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Coordinator */}
          <div>
            <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 1 }}>MODULE COORDINATOR</label>
            <input value={coordinatorName} onChange={e => setCoordinatorName(e.target.value)}
              placeholder="e.g. Dr. Kaveen Liyanage"
              style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "9px 14px", fontSize: "0.9rem", boxSizing: "border-box" }} />
          </div>

          {/* Practicals table */}
          <div>
            <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 10, letterSpacing: 1 }}>LIST OF PRACTICALS</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 80px auto", gap: 8, alignItems: "center" }}>
                  <input value={row.labNumber} onChange={e => updateRow(i, "labNumber", e.target.value)}
                    style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "7px 10px", fontSize: "0.82rem" }} />
                  <input value={row.labTitle} onChange={e => updateRow(i, "labTitle", e.target.value)}
                    placeholder="Lab title (optional)"
                    style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "7px 10px", fontSize: "0.82rem" }} />
                  <select value={row.equipStatus} onChange={e => updateRow(i, "equipStatus", e.target.value)}
                    style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "7px 8px", fontSize: "0.8rem" }}>
                    <option value="Working">Working</option>
                    <option value="Not Working">Not Working</option>
                    <option value="Under Maintenance">Maintenance</option>
                  </select>
                  <input type="number" value={row.numSessions} min={0} onChange={e => updateRow(i, "numSessions", Number(e.target.value))}
                    placeholder="Sessions"
                    style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "7px 10px", fontSize: "0.82rem", textAlign: "center" }} />
                  <button onClick={() => removeRow(i)}
                    style={{ background: "#ff4d5720", border: "1px solid #ff4d5740", borderRadius: 6, color: "#ff4d57", padding: "7px 10px", cursor: "pointer", fontSize: "0.8rem" }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={addRow}
              style={{ marginTop: 10, padding: "8px 18px", background: "transparent", border: "1px dashed var(--border-color)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer", fontSize: "0.82rem" }}>
              + Add Lab
            </button>
          </div>

          {error && <div style={{ color: "#ff4d57", fontSize: "0.85rem", background: "#ff4d5715", padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> {error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "9px 22px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
            <button onClick={save} disabled={saving}
              style={{ padding: "9px 24px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              <Save size={14} />
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [mod, setMod] = useState<Module | null>(null);
  const [practicals, setPracticals] = useState<Practical[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"practicals" | "schedule" | "sessions" | "assignments" | "quizzes">("practicals");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    try {
      const u = JSON.parse(readStorage("elabs_user") ?? "{}");
      setIsAdmin(u?.roles?.includes("SYSTEM_ADMIN") ?? false);
    } catch { /* ignore */ }
  }, []);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch(`/academic/modules/${moduleId}`).then(r => r.json()),
      apiFetch(`/academic/modules/${moduleId}/assignments`).then(r => r.ok ? r.json() : { assignments: [] }),
      apiFetch(`/academic/modules/${moduleId}/quizzes`).then(r => r.ok ? r.json() : { quizzes: [] }),
    ])
      .then(([d, ad, qd]) => {
        setMod(d.module);
        setPracticals(d.practicals ?? []);
        setSchedule(d.schedule ?? []);
        setSessions(d.sessions ?? []);
        setAssignments(ad.assignments ?? []);
        setQuizzes(qd.quizzes ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [moduleId]);

  const toggleScheduleStatus = async (slotId: number, current: string) => {
    if (!isAdmin) return;
    const next = current === "UPCOMING" ? "COMPLETED" : "UPCOMING";
    try {
      await apiFetch(`/academic/timetable/${slotId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setSchedule(prev => prev.map(s => s.id === slotId ? { ...s, status: next as "UPCOMING"|"COMPLETED" } : s));
    } catch { alert("Failed to update status"); }
  };

  const exportModuleGrades = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
    const token = readStorage("elabs_access_token") || "";
    window.open(`${apiBase}/academic/modules/${moduleId}/export-grades?token=${encodeURIComponent(token)}`, "_blank");
  };


  // Group schedule by date
  const scheduleByDate = schedule.reduce<Record<string, ScheduleSlot[]>>((acc, s) => {
    const key = s.sessionDate;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const pending = sessions.filter(s => !(s.attended && s.reportSubmitted));
  const done = sessions.filter(s => s.attended && s.reportSubmitted);

  const tabStyle = (t: typeof tab, color: string) => ({
    padding: "9px 22px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" as const,
    background: tab === t ? `${color}20` : "transparent",
    border: `1px solid ${tab === t ? color : "var(--border-color)"}`,
    color: tab === t ? color : "var(--text-muted)", transition: "all 0.2s"
  });

  if (loading) return <AppShell title="Loading…" subtitle=""><div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading module…</div></AppShell>;
  if (!mod) return <AppShell title="Not found" subtitle=""><div style={{ padding: 60, textAlign: "center", color: "#ff4d57" }}>Module not found</div></AppShell>;

  return (
    <AppShell title={`${mod.code}: ${mod.name}`} subtitle={`${mod.semesterName} · Department of EIE`}>
      {editOpen && isAdmin && (
        <EditPracticalsModal mod={mod} practicals={practicals} token={readStorage("elabs_access_token") ?? ""}
          onClose={() => setEditOpen(false)} onSaved={load} />
      )}

      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
        <Link href="/labs" style={{ color: "#3d83f6", textDecoration: "none" }}>Lab Groups</Link>
        <span>›</span>
        <Link href={`/labs/${mod.semesterId}`} style={{ color: "#3d83f6", textDecoration: "none" }}>{mod.semesterName}</Link>
        <span>›</span>
        <span style={{ color: "var(--text-main)" }}>{mod.code}</span>
      </div>

      {/* Module header card */}
      <div style={{ background: "linear-gradient(135deg,var(--bg-card),var(--bg-app))", border: "1px solid var(--border-color)", borderRadius: 14, padding: "22px 26px", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: 1, color: "#3d83f6", background: "#3d83f615", padding: "3px 12px", borderRadius: 20 }}>
                {mod.code}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>· {mod.semesterName}</span>
            </div>
            <h1 style={{ margin: "0 0 12px", color: "var(--text-main)", fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.4 }}>{mod.name}</h1>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {mod.coordinatorName && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: "0.8rem" }}>
                    {mod.coordinatorName.split(" ").pop()?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.88rem" }}>{mod.coordinatorName}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Module Coordinator</div>
                  </div>
                </div>
              )}
              {mod.semesterCoordinator && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1dd5e620", border: "1px solid #1dd5e640", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#1dd5e6", fontSize: "0.8rem" }}>
                    {mod.semesterCoordinator.split(" ").pop()?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.88rem" }}>{mod.semesterCoordinator}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Semester Coordinator</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
            {/* Stats */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ textAlign: "center", background: "var(--bg-app)", borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ color: "#3d83f6", fontWeight: 700, fontSize: "1.4rem" }}>{practicals.length}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>LABS</div>
              </div>
              <div style={{ textAlign: "center", background: "var(--bg-app)", borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ color: "#18d18f", fontWeight: 700, fontSize: "1.4rem" }}>{mod.numStudents}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>STUDENTS</div>
              </div>
              <div style={{ textAlign: "center", background: "var(--bg-app)", borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ color: "#f3ae2a", fontWeight: 700, fontSize: "1.4rem" }}>{schedule.length}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>SESSIONS</div>
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={exportModuleGrades}
                  style={{ padding: "9px 18px", background: "#10b981", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Download size={14} />
                  <span>Export Grades</span>
                </button>
                <button onClick={() => setEditOpen(true)}
                  style={{ padding: "9px 18px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <button style={tabStyle("practicals", "#3d83f6")} onClick={() => setTab("practicals")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FlaskConical size={14} />
            <span>List of Practicals</span>
          </span>
        </button>
        <button style={tabStyle("schedule", "#1dd5e6")} onClick={() => setTab("schedule")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} />
            <span>Lab Schedule</span>
            {schedule.length > 0 && <span style={{ background: "#1dd5e630", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem" }}>{schedule.length}</span>}
          </span>
        </button>
        <button style={tabStyle("sessions", "#18d18f")} onClick={() => setTab("sessions")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ClipboardList size={14} />
            <span>Sessions</span>
            {sessions.length > 0 && <span style={{ background: "#18d18f30", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem" }}>{sessions.length}</span>}
          </span>
        </button>
        <button style={tabStyle("assignments", "#f59e0b")} onClick={() => setTab("assignments")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FileText size={14} />
            <span>Assignments</span>
            {assignments.length > 0 && <span style={{ background: "#f59e0b30", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem" }}>{assignments.length}</span>}
          </span>
        </button>
        <button style={tabStyle("quizzes", "#8b5cf6")} onClick={() => setTab("quizzes")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={14} />
            <span>Quizzes</span>
            {quizzes.length > 0 && <span style={{ background: "#8b5cf630", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem" }}>{quizzes.length}</span>}
          </span>
        </button>
      </div>

      {/* ─── PRACTICALS TAB ─── */}
      {tab === "practicals" && (
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.9rem" }}>List of Practicals — {mod.code}</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>University of Ruhuna · Faculty of Engineering · EIE Dept.</span>
          </div>
          {practicals.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)" }}>
              <FlaskConical size={36} style={{ marginBottom: 10 }} />
              <div>No practicals listed yet{isAdmin && " — click Edit to add"}</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-app)" }}>
                  {["Lab", "Lab Title", "Equipment Status", "Sessions", "Notes"].map(h => (
                    <th key={h} style={{ padding: "11px 18px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.75rem", letterSpacing: 1, textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {practicals.map((p, i) => {
                  const cfg = EQUIP_CONFIG[p.equipStatus] ?? EQUIP_CONFIG["Working"];
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--bg-card)", background: i % 2 === 0 ? "transparent" : "var(--bg-app)" }}>
                      <td style={{ padding: "13px 18px", color: "#3d83f6", fontWeight: 700 }}>{p.labNumber}</td>
                      <td style={{ padding: "13px 18px", color: p.labTitle ? "var(--text-main)" : "#2d4a6a", fontStyle: p.labTitle ? "normal" : "italic" }}>
                        {p.labTitle ?? "Title not specified"}
                      </td>
                      <td style={{ padding: "13px 18px" }}>
                        <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "3px 12px", fontSize: "0.78rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <cfg.icon size={12} />
                          <span>{p.equipStatus}</span>
                        </span>
                      </td>
                      <td style={{ padding: "13px 18px", color: p.numSessions > 0 ? "var(--text-main)" : "var(--text-muted)", textAlign: "center", fontWeight: 600 }}>
                        {p.numSessions > 0 ? p.numSessions : "—"}
                      </td>
                      <td style={{ padding: "13px 18px", color: "var(--text-muted)", fontSize: "0.8rem" }}>{p.notes ?? "—"}</td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{ background: "var(--bg-app)", borderTop: "2px solid var(--border-color)" }}>
                  <td colSpan={3} style={{ padding: "11px 18px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.8rem" }}>TOTAL</td>
                  <td style={{ padding: "11px 18px", color: "#3d83f6", fontWeight: 700, textAlign: "center" }}>
                    {practicals.reduce((s, p) => s + p.numSessions, 0) || "—"}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── SCHEDULE TAB ─── */}
      {tab === "schedule" && (
        <div>
          {schedule.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)" }}>
              <Calendar size={36} style={{ marginBottom: 10 }} />
              <div>No timetable data for this module yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                <span>Academic Year {schedule[0]?.academicYear} · {Object.keys(scheduleByDate).length} session dates</span>
                {isAdmin && <span style={{ color: "#f3ae2a" }}>Click on status to mark as completed</span>}
              </div>
              {Object.entries(scheduleByDate).map(([date, slots]) => (
                <div key={date} className="panel" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", background: "var(--bg-app)", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={14} />
                      <span>{fmtDate(date)}</span>
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{slots[0].timeSlot}</span>
                  </div>
                  <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
                    {slots.map(slot => (
                      <div key={slot.id} style={{ padding: "12px 16px", borderRight: "1px solid var(--bg-card)", minWidth: 140, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#3d83f6", fontWeight: 700, fontSize: "0.82rem" }}>{slot.labLabel}</span>
                          <button
                            onClick={() => toggleScheduleStatus(slot.id, slot.status)}
                            disabled={!isAdmin}
                            style={{ 
                              background: slot.status === "COMPLETED" ? "#18d18f20" : "#f3ae2a20", 
                              color: slot.status === "COMPLETED" ? "#18d18f" : "#f3ae2a", 
                              border: `1px solid ${slot.status === "COMPLETED" ? "#18d18f40" : "#f3ae2a40"}`, 
                              borderRadius: 4, padding: "2px 6px", fontSize: "0.65rem", fontWeight: 700, 
                              cursor: isAdmin ? "pointer" : "default" 
                            }}>
                            {slot.status === "COMPLETED" ? "DONE" : "UPCOMING"}
                          </button>
                        </div>
                        <div>
                          <div style={{ color: "#1dd5e6", fontWeight: 600, fontSize: "0.88rem" }}>{slot.groupCode}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 2 }}>Group</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── SESSIONS TAB ─── */}
      {tab === "sessions" && (
        <div>
          {sessions.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)" }}>
              <ClipboardList size={36} style={{ marginBottom: 10 }} />
              <div>No sessions recorded yet</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                {[
                  { label: "Total", val: sessions.length, color: "var(--text-muted)" },
                  { label: "Pending", val: pending.length, color: "#f3ae2a" },
                  { label: "Completed", val: done.length, color: "#18d18f" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 100, background: "var(--bg-card)", border: `1px solid ${s.color}25`, borderRadius: 10, padding: "14px 18px" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ color: s.color, fontWeight: 700, fontSize: "1.5rem" }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sessions.map((session, idx) => {
                  const isDone = session.attended && session.reportSubmitted;
                  const badge = isDone ? { label: "Done", color: "#18d18f", bg: "#18d18f15" }
                    : session.status === "ONGOING" ? { label: "Ongoing", color: "#3d83f6", bg: "#3d83f615" }
                    : { label: "Pending", color: "#f3ae2a", bg: "#f3ae2a15" };
                  return (
                    <Link key={session.id} href={`/labs/session/${session.id}`} style={{ textDecoration: "none" }}>
                      <article style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "15px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "border-color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#2a4a7a"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${badge.color}20`, border: `1px solid ${badge.color}50`, display: "flex", alignItems: "center", justifyContent: "center", color: badge.color, fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ color: "var(--text-main)", fontWeight: 600 }}>{session.title}</span>
                            <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          </div>
                          <div style={{ display: "flex", gap: 14, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {fmt(session.scheduledDate)}</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {session.durationHours}h</span>
                            {session.attended && <span style={{ color: "#18d18f", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> Attended</span>}
                            {session.reportSubmitted && <span style={{ color: "#18d18f", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> Report</span>}
                          </div>
                        </div>
                        <span style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>›</span>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── ASSIGNMENTS TAB ─── */}
      {tab === "assignments" && (
        <div>
          {/* Header with Create button for instructors */}
          {isAdmin && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <Link href={`/labs/module/${moduleId}/assignment/create`}>
                <button style={{ padding: "9px 20px", background: "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={14} />
                  <span>Create Assignment</span>
                </button>
              </Link>
            </div>
          )}
          {assignments.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)" }}>
              <FileText size={36} style={{ marginBottom: 10 }} />
              <div>No assignments yet{isAdmin && " — click Create Assignment to add one"}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {assignments.map((asgn) => {
                const isSubmitted = !!asgn.submittedAt;
                const isGraded = asgn.score !== null;
                const isOverdue = asgn.dueAt && new Date(asgn.dueAt) < new Date() && !isSubmitted;
                const typeColor = asgn.type === "REPORT" ? "#f59e0b" : asgn.type === "PRE_LAB" ? "#10b981" : "#6366f1";
                const typeLabel = asgn.type === "REPORT" ? "Lab Report" : asgn.type === "PRE_LAB" ? "Pre-Lab" : "Assignment";

                return (
                  <Link key={asgn.id} href={`/labs/module/${moduleId}/assignment/${asgn.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      background: "var(--bg-card)", border: `1px solid ${isOverdue ? "#ef444440" : "var(--border-color)"}`,
                      borderLeft: `4px solid ${typeColor}`, borderRadius: "0 12px 12px 0",
                      padding: "16px 20px", cursor: "pointer", transition: "border-color 0.15s",
                      display: "flex", alignItems: "center", gap: 16,
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = typeColor + "80"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = isOverdue ? "#ef444440" : "var(--border-color)"}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: typeColor + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FileText size={18} color={typeColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>{asgn.title}</span>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: typeColor + "25", color: typeColor }}>{typeLabel}</span>
                          {isGraded && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#18d18f20", color: "#18d18f" }}>✓ Graded</span>}
                          {isSubmitted && !isGraded && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#3d83f620", color: "#3d83f6" }}>Submitted</span>}
                          {isOverdue && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#ef444420", color: "#ef4444" }}>⚠ Overdue</span>}
                        </div>
                        <div style={{ display: "flex", gap: 18, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                          {asgn.openedAt && <span>Opened: {fmt(asgn.openedAt)}</span>}
                          {asgn.dueAt && <span style={{ color: isOverdue ? "#ef4444" : "var(--text-muted)" }}>Due: {fmt(asgn.dueAt)}</span>}
                          <span>Max score: {asgn.maxScore}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {isGraded ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#18d18f" }}>{asgn.score}<span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/{asgn.maxScore}</span></div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Score</div>
                          </div>
                        ) : isSubmitted ? (
                          <div style={{ color: "#3d83f6", fontSize: "0.8rem", fontWeight: 600 }}>Awaiting grade</div>
                        ) : (
                          <div style={{ color: isOverdue ? "#ef4444" : "var(--text-muted)", fontSize: "0.8rem" }}>
                            {isOverdue ? "Not submitted" : "Not yet submitted"}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── QUIZZES TAB ─── */}
      {tab === "quizzes" && (
        <div>
          {isAdmin && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <Link href={`/labs/module/${moduleId}/quiz/create`}>
                <button style={{ padding: "9px 20px", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={14} />
                  <span>Create Quiz</span>
                </button>
              </Link>
            </div>
          )}
          {quizzes.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)" }}>
              <BookOpen size={36} style={{ marginBottom: 10 }} />
              <div>No quizzes yet{isAdmin && " — click Create Quiz to add one"}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {quizzes.map((quiz) => {
                const now = new Date();
                const isOpen = (!quiz.openedAt || new Date(quiz.openedAt) <= now) && (!quiz.closedAt || new Date(quiz.closedAt) >= now);
                const isClosed = quiz.closedAt && new Date(quiz.closedAt) < now;
                const isCompleted = !!quiz.attemptSubmittedAt;
                const pct = quiz.attemptScore !== null && quiz.attemptMaxScore ? Math.round((quiz.attemptScore / quiz.attemptMaxScore) * 100) : null;
                const pctColor = pct === null ? "var(--text-muted)" : pct >= 75 ? "#18d18f" : pct >= 50 ? "#f59e0b" : "#ef4444";

                return (
                  <div key={quiz.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderLeft: "4px solid #8b5cf6", borderRadius: "0 12px 12px 0", padding: "18px 20px", display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#8b5cf620", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <BookOpen size={20} color="#8b5cf6" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>{quiz.title}</span>
                        {isCompleted && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#18d18f20", color: "#18d18f" }}>✓ Completed</span>}
                        {!isCompleted && isOpen && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#8b5cf620", color: "#8b5cf6" }}>Open</span>}
                        {isClosed && !isCompleted && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#ef444420", color: "#ef4444" }}>Closed</span>}
                      </div>
                      <div style={{ display: "flex", gap: 18, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {quiz.timeLimitMins} min</span>
                        <span>{quiz.questionCount} questions · {quiz.totalPoints} pts</span>
                        {quiz.closedAt && <span>Closes: {fmt(quiz.closedAt)}</span>}
                        <span>Max attempts: {quiz.maxAttempts}</span>
                      </div>
                      {quiz.description && <div style={{ marginTop: 6, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{quiz.description.substring(0, 120)}{quiz.description.length > 120 ? "…" : ""}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                      {isCompleted && pct !== null && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 700, fontSize: "1.3rem", color: pctColor }}>{pct}%</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{quiz.attemptScore}/{quiz.attemptMaxScore} pts</div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        {isAdmin && (
                          <Link href={`/labs/module/${moduleId}/quiz/${quiz.id}/results`}>
                            <button style={{ padding: "6px 14px", background: "#8b5cf615", border: "1px solid #8b5cf640", borderRadius: 8, color: "#8b5cf6", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                              <BarChart2 size={12} /> Results
                            </button>
                          </Link>
                        )}
                        {(!isCompleted || (quiz.attemptNumber !== null && quiz.attemptNumber < quiz.maxAttempts)) && isOpen && !isAdmin && (
                          <Link href={`/labs/module/${moduleId}/quiz/${quiz.id}`}>
                            <button style={{ padding: "6px 16px", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", border: "none", borderRadius: 8, color: "#fff", fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}>
                              {isCompleted ? "Retake" : "Start Quiz"}
                            </button>
                          </Link>
                        )}
                        {isCompleted && (
                          <Link href={`/labs/module/${moduleId}/quiz/${quiz.id}`}>
                            <button style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Eye size={12} /> View Result
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
