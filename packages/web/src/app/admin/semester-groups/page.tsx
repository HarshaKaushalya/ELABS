"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";


type Semester = { id: number; name: string; level: number; moduleCount: number };
type Module = { id: number; code: string; name: string };

// ── Reusable form field styles ────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: "#0a1628", border: "1px solid #1a2d4a", borderRadius: 8,
  padding: "9px 13px", color: "#e8f0fe", width: "100%", fontSize: "0.88rem",
};
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const labelText: React.CSSProperties = { color: "#7ea5d6", fontSize: "0.78rem", fontWeight: 600, letterSpacing: 0.3 };

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#18d18f15", border: "1px solid #18d18f40", borderRadius: 8, padding: "10px 14px", color: "#18d18f", marginBottom: 16, fontSize: "0.88rem" }}>
      ✓ {msg}
    </div>
  );
}
function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#ff4d5715", border: "1px solid #ff4d5740", borderRadius: 8, padding: "10px 14px", color: "#ff4d57", marginBottom: 16, fontSize: "0.88rem" }}>
      ✕ {msg}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0d1b2e", border: "1px solid #1a2d4a", borderRadius: 16, padding: 24 }}>
      <h3 style={{ margin: "0 0 20px", color: "#e8f0fe", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.2rem" }}>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

export default function AdminLabsPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedSemForModules, setSelectedSemForModules] = useState<number>(0);

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

  const flash = (s: string, e: string) => { setSuccess(s); setError(e); setTimeout(() => { setSuccess(""); setError(""); }, 4000); };

  const fetchSemesters = useCallback(() => {
    apiFetch("/academic/semesters")
      .then((r) => r.json()).then((d) => {
        setSemesters(d.semesters ?? []);
        if (!newModSemId && d.semesters?.length) setNewModSemId(d.semesters[0].id);
      });
  }, [newModSemId]);

  const fetchModulesForSem = useCallback((semId: number) => {
    if (!semId) return;
    apiFetch(`/academic/semesters/${semId}/modules`)
      .then((r) => r.json()).then((d) => {
        setModules(d.modules ?? []);
        if (!newSessionModId && d.modules?.length) setNewSessionModId(d.modules[0].id);
      });
  }, [newSessionModId]);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);
  useEffect(() => {
    if (selectedSemForModules) fetchModulesForSem(selectedSemForModules);
  }, [selectedSemForModules, fetchModulesForSem]);

  // ── Create semester group ─────────────────────────────────────────────────
  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await apiFetch("/academic/semesters", {
        method: "POST",
        body: JSON.stringify({ name: newSemName, level: Number(newSemLevel) }),
      });
      if (!res.ok) { const d = await res.json(); return flash("", d.error || "Failed"); }
      setNewSemName(""); setNewSemLevel("");
      fetchSemesters();
      flash("Semester group created successfully!", "");
    } catch { flash("", "Network error"); } finally { setLoading(false); }
  };

  // ── Create module ─────────────────────────────────────────────────────────
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await apiFetch(`/academic/semesters/${newModSemId}/modules`, {
        method: "POST",
        body: JSON.stringify({ code: newModCode, name: newModName }),
      });
      if (!res.ok) { const d = await res.json(); return flash("", d.error || "Failed"); }
      setNewModCode(""); setNewModName("");
      if (selectedSemForModules === newModSemId) fetchModulesForSem(newModSemId);
      flash("Module added successfully!", "");
    } catch { flash("", "Network error"); } finally { setLoading(false); }
  };

  // ── Create lab session ────────────────────────────────────────────────────
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
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
      if (!res.ok) { const d = await res.json(); return flash("", d.error || "Failed"); }
      setNewSessionTitle(""); setNewSessionDesc(""); setNewSessionDate(""); setNewSessionDocUrl("");
      flash("Lab session created successfully!", "");
    } catch { flash("", "Network error"); } finally { setLoading(false); }
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  return (
    <AppShell title="Admin — Lab Management" subtitle="Create and manage semester groups, modules, and lab sessions">
      {success && <SuccessBanner msg={success} />}
      {error && <ErrorBanner msg={error} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* ── Create Semester Group ─────────────────────────────────────── */}
        <Card title="Create Semester Group" icon="🗂">
          <form onSubmit={handleCreateSemester} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={labelStyle}>
              <span style={labelText}>Group Name</span>
              <input style={inputStyle} value={newSemName} onChange={(e) => setNewSemName(e.target.value)}
                placeholder="e.g. 6th Semester" required />
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Level (sort order)</span>
              <input style={inputStyle} type="number" value={newSemLevel} onChange={(e) => setNewSemLevel(e.target.value)}
                placeholder="e.g. 6" required />
            </label>
            <button type="submit" disabled={loading} style={{
              background: "linear-gradient(135deg, #7d5cff, #3d83f6)", border: "none", borderRadius: 10,
              color: "#fff", fontWeight: 700, padding: "10px 20px", cursor: "pointer", fontSize: "0.9rem",
            }}>
              {loading ? "Creating…" : "+ Create Group"}
            </button>
          </form>

          {/* Existing groups list */}
          <div style={{ marginTop: 20 }}>
            <div style={{ color: "#7ea5d6", fontSize: "0.78rem", marginBottom: 10, fontWeight: 600 }}>EXISTING GROUPS</div>
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {semesters.map((s) => (
                <div key={s.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#0a1628", borderRadius: 8, padding: "7px 12px",
                }}>
                  <span style={{ color: "#e8f0fe", fontSize: "0.88rem" }}>{s.name}</span>
                  <span style={{ color: "#7ea5d6", fontSize: "0.78rem" }}>{s.moduleCount} modules</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Add Module to Semester ────────────────────────────────────── */}
        <Card title="Add Module to Semester" icon="📚">
          <form onSubmit={handleCreateModule} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={labelStyle}>
              <span style={labelText}>Semester Group</span>
              <select style={selectStyle} value={newModSemId} onChange={(e) => setNewModSemId(Number(e.target.value))} required>
                {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Module Code</span>
              <input style={inputStyle} value={newModCode} onChange={(e) => setNewModCode(e.target.value.toUpperCase())}
                placeholder="e.g. EE607" required />
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Module Name</span>
              <input style={inputStyle} value={newModName} onChange={(e) => setNewModName(e.target.value)}
                placeholder="e.g. Computer Networks" required />
            </label>
            <button type="submit" disabled={loading} style={{
              background: "linear-gradient(135deg, #1dd5e6, #18d18f)", border: "none", borderRadius: 10,
              color: "#0a1628", fontWeight: 700, padding: "10px 20px", cursor: "pointer", fontSize: "0.9rem",
            }}>
              {loading ? "Adding…" : "+ Add Module"}
            </button>
          </form>

          {/* Browse modules */}
          <div style={{ marginTop: 20 }}>
            <div style={{ color: "#7ea5d6", fontSize: "0.78rem", marginBottom: 8, fontWeight: 600 }}>BROWSE MODULES</div>
            <select style={{ ...selectStyle, marginBottom: 10 }}
              value={selectedSemForModules}
              onChange={(e) => setSelectedSemForModules(Number(e.target.value))}>
              <option value={0}>— Select a semester —</option>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
              {modules.map((m) => (
                <div key={m.id} style={{ background: "#0a1628", borderRadius: 8, padding: "7px 12px", display: "flex", gap: 10 }}>
                  <span style={{ color: "#1dd5e6", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600 }}>{m.code}</span>
                  <span style={{ color: "#e8f0fe", fontSize: "0.85rem" }}>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Create Lab Session (full width) ──────────────────────────── */}
        <div style={{ gridColumn: "1 / -1" }}>
          <Card title="Add Lab Session to Module" icon="🔬">
            <form onSubmit={handleCreateSession}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                  <span style={labelText}>Select Module</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    <select style={{ ...selectStyle, flex: 1 }}
                      value={newModSemId}
                      onChange={(e) => { setNewModSemId(Number(e.target.value)); fetchModulesForSem(Number(e.target.value)); }}>
                      {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select style={{ ...selectStyle, flex: 2 }} value={newSessionModId}
                      onChange={(e) => setNewSessionModId(Number(e.target.value))} required>
                      {modules.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                    </select>
                  </div>
                </label>

                <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                  <span style={labelText}>Session Title</span>
                  <input style={inputStyle} value={newSessionTitle} onChange={(e) => setNewSessionTitle(e.target.value)}
                    placeholder="e.g. Lab 4: Three-Phase Power Measurement" required />
                </label>

                <label style={labelStyle}>
                  <span style={labelText}>Scheduled Date</span>
                  <input style={inputStyle} type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} />
                </label>

                <label style={labelStyle}>
                  <span style={labelText}>Duration (hours)</span>
                  <input style={inputStyle} type="number" step="0.5" value={newSessionDuration}
                    onChange={(e) => setNewSessionDuration(e.target.value)} />
                </label>

                <label style={labelStyle}>
                  <span style={labelText}>Document URL (optional)</span>
                  <input style={inputStyle} type="url" value={newSessionDocUrl}
                    onChange={(e) => setNewSessionDocUrl(e.target.value)} placeholder="https://…" />
                </label>

                <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                  <span style={labelText}>Description</span>
                  <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                    value={newSessionDesc} onChange={(e) => setNewSessionDesc(e.target.value)}
                    placeholder="Describe what students will do in this lab session…" />
                </label>
              </div>

              <button type="submit" disabled={loading} style={{
                background: "linear-gradient(135deg, #f3ae2a, #ff7043)", border: "none", borderRadius: 10,
                color: "#fff", fontWeight: 700, padding: "11px 24px", cursor: "pointer", fontSize: "0.92rem",
              }}>
                {loading ? "Creating…" : "+ Create Lab Session"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
