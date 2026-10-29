"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import {
  FolderTree,
  BookOpen,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Users,
  Sparkles,
  Save,
  Search,
  Filter,
  Plus,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

type Semester = { id: number; name: string; level: number; moduleCount: number };
type Module = { id: number; code: string; name: string };
type StudentGroupItem = {
  userId: number;
  fullName: string;
  email: string;
  regNumber: string;
  groupCode: string;
  department: string;
  semester: number;
};

// ── Reusable form field styles ────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: "var(--bg-app)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: "9px 13px",
  color: "var(--text-main)",
  width: "100%",
  fontSize: "0.88rem",
};
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const labelText: React.CSSProperties = { color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: 0.3 };

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#18d18f15", border: "1px solid #18d18f40", borderRadius: 8, padding: "10px 14px", color: "#18d18f", marginBottom: 16, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8 }}>
      <CheckCircle2 size={16} />
      <span>{msg}</span>
    </div>
  );
}
function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#ff4d5715", border: "1px solid #ff4d5740", borderRadius: 8, padding: "10px 14px", color: "#ff4d57", marginBottom: 16, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8 }}>
      <XCircle size={16} />
      <span>{msg}</span>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24 }}>
      <h3 style={{ margin: "0 0 20px", color: "var(--text-main)", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", color: "#3d83f6" }}>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

export default function AdminLabsPage() {
  const [activeTab, setActiveTab] = useState<"STUDENT_GROUPS" | "SEMESTER_MODULES">("STUDENT_GROUPS");

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedSemForModules, setSelectedSemForModules] = useState<number>(0);

  // Student groups state
  const [selectedSemForStudents, setSelectedSemForStudents] = useState<number>(6);
  const [students, setStudents] = useState<StudentGroupItem[]>([]);
  const [distinctGroups, setDistinctGroups] = useState<string[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [autoGroupSize, setAutoGroupSize] = useState("7");
  const [autoGroupPrefix, setAutoGroupPrefix] = useState("EE");
  const [modifiedGroups, setModifiedGroups] = useState<Record<number, string>>({});
  const [savingGroups, setSavingGroups] = useState(false);
  const [newCustomGroup, setNewCustomGroup] = useState("");

  // Form states
  const [newSemName, setNewSemName] = useState("");
  const [newSemLevel, setNewSemLevel] = useState("");
  const [newModCode, setNewModCode] = useState("");
  const [newModName, setNewModName] = useState("");
  const [newModSemId, setNewModSemId] = useState<number>(0);
  const [newSessionModId, setNewSessionModId] = useState<number>(0);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDesc, setNewSessionDesc] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionDuration, setNewSessionDuration] = useState("3");
  const [newSessionDocUrl, setNewSessionDocUrl] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const flash = (s: string, e: string) => {
    setSuccess(s);
    setError(e);
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4500);
  };

  const fetchSemesters = useCallback(() => {
    apiFetch("/academic/semesters")
      .then((r) => r.json())
      .then((d) => {
        const raw = (d.semesters ?? []) as Semester[];
        const seen = new Set<string>();
        const deduped: Semester[] = [];
        for (const s of raw) {
          const key = `${(s.name || "").trim().toLowerCase()}_${s.level}`;
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(s);
          }
        }
        setSemesters(deduped);
        if (!newModSemId && deduped.length) setNewModSemId(deduped[0].id);
        if (deduped.some((s: Semester) => s.id === 6)) {
          setSelectedSemForStudents(6);
        } else if (deduped.length) {
          setSelectedSemForStudents(deduped[0].id);
        }
      });
  }, [newModSemId]);

  const fetchModulesForSem = useCallback((semId: number) => {
    if (!semId) return;
    apiFetch(`/academic/semesters/${semId}/modules`)
      .then((r) => r.json())
      .then((d) => {
        setModules(d.modules ?? []);
        if (!newSessionModId && d.modules?.length) setNewSessionModId(d.modules[0].id);
      });
  }, [newSessionModId]);

  const fetchStudents = useCallback((semId: number) => {
    if (!semId) return;
    setStudentsLoading(true);
    apiFetch(`/academic/semesters/${semId}/students`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students ?? []);
        setDistinctGroups(d.groups ?? []);
        setModifiedGroups({});
      })
      .catch((err) => {
        console.error("Failed to fetch students:", err);
      })
      .finally(() => setStudentsLoading(false));
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    if (selectedSemForModules) fetchModulesForSem(selectedSemForModules);
  }, [selectedSemForModules, fetchModulesForSem]);

  useEffect(() => {
    if (selectedSemForStudents) fetchStudents(selectedSemForStudents);
  }, [selectedSemForStudents, fetchStudents]);

  // ── Auto group students ───────────────────────────────────────────────────
  const handleAutoGroup = async () => {
    const size = parseInt(autoGroupSize, 10) || 7;
    const prefix = autoGroupPrefix.trim() || "EE";
    if (!confirm(`Are you sure you want to auto-distribute all students in this semester into groups of ${size} with prefix "${prefix}"?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/academic/semesters/${selectedSemForStudents}/students/auto-group`, {
        method: "POST",
        body: JSON.stringify({ groupSize: size, prefix }),
      });
      const d = await res.json();
      if (!res.ok) {
        flash("", d.error || "Failed to auto-group students");
      } else {
        flash(d.message || "Students successfully grouped!", "");
        fetchStudents(selectedSemForStudents);
      }
    } catch {
      flash("", "Network error during auto grouping");
    } finally {
      setLoading(false);
    }
  };

  // ── Change single student's group locally ─────────────────────────────────
  const handleStudentGroupChange = (userId: number, newGroup: string) => {
    setModifiedGroups((prev) => ({
      ...prev,
      [userId]: newGroup.trim().toUpperCase(),
    }));
  };

  // ── Save all modified group allocations ───────────────────────────────────
  const handleSaveAllGroups = async () => {
    const entries = Object.entries(modifiedGroups);
    if (entries.length === 0) {
      flash("No changes to save.", "");
      return;
    }

    setSavingGroups(true);
    try {
      const assignments = entries.map(([userIdStr, groupCode]) => ({
        userId: Number(userIdStr),
        groupCode,
      }));

      const res = await apiFetch(`/academic/semesters/${selectedSemForStudents}/students/groups`, {
        method: "PUT",
        body: JSON.stringify({ assignments }),
      });
      const d = await res.json();
      if (!res.ok) {
        flash("", d.error || "Failed to update groups");
      } else {
        flash(`Successfully updated group assignments for ${d.updatedCount || assignments.length} students!`, "");
        fetchStudents(selectedSemForStudents);
      }
    } catch {
      flash("", "Network error saving group assignments");
    } finally {
      setSavingGroups(false);
    }
  };

  // ── Create semester group ─────────────────────────────────────────────────
  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/academic/semesters", {
        method: "POST",
        body: JSON.stringify({ name: newSemName, level: Number(newSemLevel) }),
      });
      if (!res.ok) {
        const d = await res.json();
        return flash("", d.error || "Failed");
      }
      setNewSemName("");
      setNewSemLevel("");
      fetchSemesters();
      flash("Semester group created successfully!", "");
    } catch {
      flash("", "Network error");
    } finally {
      setLoading(false);
    }
  };

  // ── Create module ─────────────────────────────────────────────────────────
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`/academic/semesters/${newModSemId}/modules`, {
        method: "POST",
        body: JSON.stringify({ code: newModCode, name: newModName }),
      });
      if (!res.ok) {
        const d = await res.json();
        return flash("", d.error || "Failed");
      }
      setNewModCode("");
      setNewModName("");
      if (selectedSemForModules === newModSemId) fetchModulesForSem(newModSemId);
      flash("Module added successfully!", "");
    } catch {
      flash("", "Network error");
    } finally {
      setLoading(false);
    }
  };

  // ── Create lab session ────────────────────────────────────────────────────
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: newSessionTitle,
        description: newSessionDesc || undefined,
        scheduledDate: newSessionDate || undefined,
        durationHours: Number(newSessionDuration),
        documentUrl: newSessionDocUrl || undefined,
      };
      const res = await apiFetch(`/academic/modules/${newSessionModId}/lab-sessions`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        return flash("", d.error || "Failed");
      }
      setNewSessionTitle("");
      setNewSessionDesc("");
      setNewSessionDate("");
      setNewSessionDocUrl("");
      flash("Lab session created successfully!", "");
    } catch {
      flash("", "Network error");
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered students list ────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const activeGroup = modifiedGroups[s.userId] ?? s.groupCode ?? "";
      if (filterGroup !== "ALL" && activeGroup !== filterGroup) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.regNumber && s.regNumber.toLowerCase().includes(q)) ||
        activeGroup.toLowerCase().includes(q)
      );
    });
  }, [students, modifiedGroups, filterGroup, searchQuery]);

  // Group counts for badges
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of students) {
      const g = modifiedGroups[s.userId] ?? s.groupCode ?? "UNASSIGNED";
      counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }, [students, modifiedGroups]);

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const hasUnsavedChanges = Object.keys(modifiedGroups).length > 0;

  return (
    <AppShell
      title="Admin & Technician — Semester & Group Management"
      subtitle="Manage student group allocations (7 students / group), modules, and academic practicals"
    >
      {success && <SuccessBanner msg={success} />}
      {error && <ErrorBanner msg={error} />}

      {/* ── Top Level Navigation Tabs ───────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab("STUDENT_GROUPS")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: activeTab === "STUDENT_GROUPS" ? "1px solid #3d83f6" : "1px solid var(--border-color)",
            background: activeTab === "STUDENT_GROUPS" ? "#3d83f615" : "var(--bg-card)",
            color: activeTab === "STUDENT_GROUPS" ? "#3d83f6" : "var(--text-muted)",
            fontWeight: 700,
            fontSize: "0.92rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: activeTab === "STUDENT_GROUPS" ? "0 2px 8px rgba(61, 131, 246, 0.2)" : "none",
          }}
        >
          <Users size={18} />
          <span>Student Groups & Allocations</span>
          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 12, background: activeTab === "STUDENT_GROUPS" ? "#3d83f6" : "var(--border-color)", color: activeTab === "STUDENT_GROUPS" ? "#fff" : "var(--text-muted)" }}>
            {students.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SEMESTER_MODULES")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: activeTab === "SEMESTER_MODULES" ? "1px solid #3d83f6" : "1px solid var(--border-color)",
            background: activeTab === "SEMESTER_MODULES" ? "#3d83f615" : "var(--bg-card)",
            color: activeTab === "SEMESTER_MODULES" ? "#3d83f6" : "var(--text-muted)",
            fontWeight: 700,
            fontSize: "0.92rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: activeTab === "SEMESTER_MODULES" ? "0 2px 8px rgba(61, 131, 246, 0.2)" : "none",
          }}
        >
          <FolderTree size={18} />
          <span>Semester Groups & Modules</span>
        </button>
      </div>

      {/* ── TAB 1: STUDENT GROUPS & ALLOCATIONS ────────────────────── */}
      {activeTab === "STUDENT_GROUPS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Controls & Quick Stats Bar */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
              padding: "20px 24px",
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                  SELECT SEMESTER COHORT
                </label>
                <select
                  value={selectedSemForStudents}
                  onChange={(e) => setSelectedSemForStudents(Number(e.target.value))}
                  style={{ ...selectStyle, minWidth: 220, padding: "8px 12px", fontWeight: 600 }}
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Level {s.level})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "8px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>ENROLLED STUDENTS</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>{students.length}</div>
                </div>
                <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "8px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>ACTIVE GROUPS</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#3d83f6" }}>{Object.keys(groupCounts).length}</div>
                </div>
                <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "8px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>STUDENTS / GROUP</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10b981" }}>7 Target</div>
                </div>
              </div>
            </div>

            {/* Auto Grouping Box */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "linear-gradient(135deg, rgba(61, 131, 246, 0.08), rgba(16, 185, 129, 0.08))",
                border: "1px dashed #3d83f6",
                borderRadius: 12,
                padding: "8px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-muted)" }}>Size:</span>
                <input
                  type="number"
                  value={autoGroupSize}
                  onChange={(e) => setAutoGroupSize(e.target.value)}
                  style={{ width: 50, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.82rem", textAlign: "center" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-muted)" }}>Prefix:</span>
                <input
                  type="text"
                  value={autoGroupPrefix}
                  onChange={(e) => setAutoGroupPrefix(e.target.value)}
                  style={{ width: 50, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.82rem", textAlign: "center" }}
                />
              </div>
              <button
                type="button"
                onClick={handleAutoGroup}
                disabled={loading || students.length === 0}
                style={{
                  padding: "8px 16px",
                  background: "linear-gradient(135deg, #3d83f6, #10b981)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 6px rgba(61, 131, 246, 0.3)",
                }}
              >
                <Sparkles size={14} />
                <span>Auto-Distribute (7 / Group)</span>
              </button>
            </div>
          </div>

          {/* Group Filters & Search */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* Search bar */}
              <div style={{ position: "relative", flex: "1 1 320px", maxWidth: 440 }}>
                <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student by name, registration no, email, or group…"
                  style={{ ...inputStyle, paddingLeft: 36 }}
                />
              </div>

              {/* Save changes button */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {hasUnsavedChanges && (
                  <span style={{ fontSize: "0.8rem", color: "#f59e0b", fontWeight: 600 }}>
                    {Object.keys(modifiedGroups).length} modified
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAllGroups}
                  disabled={!hasUnsavedChanges || savingGroups}
                  style={{
                    padding: "9px 20px",
                    background: hasUnsavedChanges ? "linear-gradient(135deg, #10b981, #059669)" : "var(--bg-app)",
                    border: hasUnsavedChanges ? "none" : "1px solid var(--border-color)",
                    borderRadius: 8,
                    color: hasUnsavedChanges ? "#fff" : "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: hasUnsavedChanges && !savingGroups ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: hasUnsavedChanges ? "0 2px 8px rgba(16, 185, 129, 0.3)" : "none",
                  }}
                >
                  <Save size={15} />
                  <span>{savingGroups ? "Saving Changes…" : "Save Group Allocations"}</span>
                </button>
              </div>
            </div>

            {/* Quick group filter pills */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginRight: 4 }}>
                FILTER GROUP:
              </span>
              <button
                type="button"
                onClick={() => setFilterGroup("ALL")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: filterGroup === "ALL" ? "1px solid #3d83f6" : "1px solid var(--border-color)",
                  background: filterGroup === "ALL" ? "#3d83f615" : "var(--bg-app)",
                  color: filterGroup === "ALL" ? "#3d83f6" : "var(--text-muted)",
                  fontWeight: filterGroup === "ALL" ? 700 : 500,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                All Groups ({students.length})
              </button>
              {Object.entries(groupCounts)
                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                .map(([grp, count]) => {
                  const active = filterGroup === grp;
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setFilterGroup(grp)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        border: active ? "1px solid #10b981" : "1px solid var(--border-color)",
                        background: active ? "#10b98115" : "var(--bg-app)",
                        color: active ? "#10b981" : "var(--text-muted)",
                        fontWeight: active ? 700 : 500,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>{grp}</span>
                      <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: 10, background: active ? "#10b981" : "var(--border-color)", color: active ? "#fff" : "var(--text-muted)" }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Student Table */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {studentsLoading ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
                Loading students for Semester {selectedSemForStudents}…
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                No students match your filter.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700, width: 40 }}>#</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700 }}>REG NUMBER</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700 }}>STUDENT NAME</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700 }}>EMAIL</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700 }}>DEPARTMENT</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700, width: 180 }}>ASSIGNED GROUP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st, idx) => {
                    const currentGroup = modifiedGroups[st.userId] ?? st.groupCode ?? "UNASSIGNED";
                    const isModified = st.userId in modifiedGroups;

                    return (
                      <tr
                        key={st.userId}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          background: isModified ? "rgba(245, 158, 11, 0.04)" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={{ padding: "12px 18px", color: "var(--text-muted)", fontSize: "0.78rem" }}>{idx + 1}</td>
                        <td style={{ padding: "12px 18px", fontFamily: "monospace", fontWeight: 600, color: "#3d83f6" }}>
                          {st.regNumber || "—"}
                        </td>
                        <td style={{ padding: "12px 18px", fontWeight: 600, color: "var(--text-main)" }}>
                          {st.fullName}
                        </td>
                        <td style={{ padding: "12px 18px", color: "var(--text-muted)" }}>{st.email}</td>
                        <td style={{ padding: "12px 18px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {st.department || "Electrical and Info Eng"}
                        </td>
                        <td style={{ padding: "10px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <select
                              value={currentGroup}
                              onChange={(e) => handleStudentGroupChange(st.userId, e.target.value)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 6,
                                border: isModified ? "1px solid #f59e0b" : "1px solid var(--border-color)",
                                background: isModified ? "#f59e0b15" : "var(--bg-app)",
                                color: isModified ? "#f59e0b" : "var(--text-main)",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                minWidth: 90,
                              }}
                            >
                              {Array.from(new Set([...distinctGroups, "EE1", "EE2", "EE3", "EE4", "EE5", "EE6", "EE7", "EE8", "EE9", "EE10", "EE11", "EE12", currentGroup]))
                                .filter(Boolean)
                                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                                .map((g) => (
                                  <option key={g} value={g}>
                                    {g}
                                  </option>
                                ))}
                            </select>
                            {isModified && (
                              <span style={{ fontSize: "0.68rem", color: "#f59e0b", fontWeight: 700 }}>
                                Modified
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SEMESTER GROUPS & MODULES ──────────────────────── */}
      {activeTab === "SEMESTER_MODULES" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Create Semester Group */}
          <Card title="Create Semester Group" icon={<FolderTree size={20} />}>
            <form onSubmit={handleCreateSemester} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={labelStyle}>
                <span style={labelText}>Group Name</span>
                <input style={inputStyle} value={newSemName} onChange={(e) => setNewSemName(e.target.value)} placeholder="e.g. 6th Semester" required />
              </label>
              <label style={labelStyle}>
                <span style={labelText}>Level (sort order)</span>
                <input style={inputStyle} type="number" value={newSemLevel} onChange={(e) => setNewSemLevel(e.target.value)} placeholder="e.g. 6" required />
              </label>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, #7d5cff, #3d83f6)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 700,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {loading ? "Creating…" : "+ Create Group"}
              </button>
            </form>

            <div style={{ marginTop: 20 }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: 10, fontWeight: 600 }}>EXISTING GROUPS</div>
              <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {semesters.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-app)", borderRadius: 8, padding: "7px 12px" }}>
                    <span style={{ color: "var(--text-main)", fontSize: "0.88rem" }}>{s.name}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{s.moduleCount} modules</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Add Module to Semester */}
          <Card title="Add Module to Semester" icon={<BookOpen size={20} />}>
            <form onSubmit={handleCreateModule} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={labelStyle}>
                <span style={labelText}>Semester Group</span>
                <select style={selectStyle} value={newModSemId} onChange={(e) => setNewModSemId(Number(e.target.value))} required>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                <span style={labelText}>Module Code</span>
                <input style={inputStyle} value={newModCode} onChange={(e) => setNewModCode(e.target.value.toUpperCase())} placeholder="e.g. EE607" required />
              </label>
              <label style={labelStyle}>
                <span style={labelText}>Module Name</span>
                <input style={inputStyle} value={newModName} onChange={(e) => setNewModName(e.target.value)} placeholder="e.g. Computer Networks" required />
              </label>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, #1dd5e6, #18d18f)",
                  border: "none",
                  borderRadius: 10,
                  color: "var(--bg-app)",
                  fontWeight: 700,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {loading ? "Adding…" : "+ Add Module"}
              </button>
            </form>

            <div style={{ marginTop: 20 }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: 8, fontWeight: 600 }}>BROWSE MODULES</div>
              <select style={{ ...selectStyle, marginBottom: 10 }} value={selectedSemForModules} onChange={(e) => setSelectedSemForModules(Number(e.target.value))}>
                <option value={0}>— Select a semester —</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                {modules.map((m) => (
                  <div key={m.id} style={{ background: "var(--bg-app)", borderRadius: 8, padding: "7px 12px", display: "flex", gap: 10 }}>
                    <span style={{ color: "#1dd5e6", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600 }}>{m.code}</span>
                    <span style={{ color: "var(--text-main)", fontSize: "0.85rem" }}>{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Add Lab Session */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Card title="Add Lab Session to Module" icon={<FlaskConical size={20} />}>
              <form onSubmit={handleCreateSession}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                    <span style={labelText}>Select Module</span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <select
                        style={{ ...selectStyle, flex: 1 }}
                        value={newModSemId}
                        onChange={(e) => {
                          setNewModSemId(Number(e.target.value));
                          fetchModulesForSem(Number(e.target.value));
                        }}
                      >
                        {semesters.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <select style={{ ...selectStyle, flex: 2 }} value={newSessionModId} onChange={(e) => setNewSessionModId(Number(e.target.value))} required>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code} — {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                    <span style={labelText}>Session Title</span>
                    <input style={inputStyle} value={newSessionTitle} onChange={(e) => setNewSessionTitle(e.target.value)} placeholder="e.g. Lab 4: Three-Phase Power Measurement" required />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelText}>Scheduled Date</span>
                    <input style={inputStyle} type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelText}>Duration (hours)</span>
                    <input style={inputStyle} type="number" step="0.5" value={newSessionDuration} onChange={(e) => setNewSessionDuration(e.target.value)} />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelText}>Document URL (optional)</span>
                    <input style={inputStyle} type="url" value={newSessionDocUrl} onChange={(e) => setNewSessionDocUrl(e.target.value)} placeholder="https://…" />
                  </label>

                  <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                    <span style={labelText}>Description</span>
                    <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 90 }} value={newSessionDesc} onChange={(e) => setNewSessionDesc(e.target.value)} placeholder="Describe what students will do in this lab session…" />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #f3ae2a, #ff7043)",
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    fontWeight: 700,
                    padding: "11px 24px",
                    cursor: "pointer",
                    fontSize: "0.92rem",
                  }}
                >
                  {loading ? "Creating…" : "+ Create Lab Session"}
                </button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
