"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { ItemDetailsModal } from "@/components/inventory/ItemDetailsModal";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useIsStudent } from "@/hooks/useRole";
import { QrCode, CheckCircle2, Wrench, XCircle, AlertTriangle, Package, ClipboardList, User, Calendar, Check, ArrowLeftRight, Plus } from "lucide-react";

type InventoryItem = {
  id: number; labId: number; elabsTag: string; name: string;
  category: string; model: string; serialNo: string;
  status: "AVAILABLE" | "BORROWED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  conditionNote: string; labName: string; updatedAt: string;
};
type AvailableItem = { id: number; elabsTag: string; name: string; category: string; model: string };
type Lab = { id: number; name: string };
type BorrowItem = { itemId: number; elabsTag: string; name: string; category: string; model: string; condOut: string; condIn: string };
type Borrow = { id: number; labName: string; purpose: string; dueAt: string | null; returnedAt: string | null; status: string; createdAt: string; issuedByName: string; items: BorrowItem[] };
type Transaction = { id: number; labId: number; labName: string; borrowerType: string; borrowerUserId: number | null; borrowerGroupCode: string | null; issuedBy: string; purpose: string; dueAt: string | null; returnedAt: string | null; status: string; createdAt: string };
type BorrowSuccess = { transactionId: number; borrowedItems: { elabsTag: string; name: string; id: number }[] };
type Student = { id: number; fullName: string; indexNo: string; email: string };

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
    AVAILABLE:     { label: "Available",      color: "#059669", bg: "rgba(5, 150, 105, 0.1)", icon: CheckCircle2 },
    BORROWED:      { label: "Borrowed",       color: "#d97706", bg: "rgba(217, 119, 6, 0.1)", icon: ArrowLeftRight },
    MAINTENANCE:   { label: "Maintenance",    color: "#2563eb", bg: "rgba(37, 99, 235, 0.1)", icon: Wrench },
    OUT_OF_SERVICE:{ label: "Out of Service", color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)", icon: XCircle },
    RETURNED:      { label: "Returned",       color: "#059669", bg: "rgba(5, 150, 105, 0.1)", icon: CheckCircle2 },
    OVERDUE:       { label: "Overdue",        color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)", icon: AlertTriangle },
  };
  const s = map[status];
  if (!s) {
    return <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "0.8rem", background: "rgba(148, 163, 184, 0.1)", padding: "3px 8px", borderRadius: 6 }}>{status}</span>;
  }
  const Icon = s.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: s.color, fontWeight: 600, fontSize: "0.78rem", background: s.bg, padding: "3px 8px", borderRadius: 6, border: `1px solid ${s.color}25` }}>
      <Icon size={12} />
      <span>{s.label}</span>
    </span>
  );
}
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function isOverdue(dueAt: string | null, status: string) {
  if (status === "RETURNED" || !dueAt) return false;
  return new Date(dueAt) < new Date();
}

// ── Borrow Success Overlay ────────────────────────────────────────────────────
function BorrowSuccessCard({ result, onDone }: { result: BorrowSuccess; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(6px)", opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 32, minWidth: 380, maxWidth: 500, transform: visible ? "scale(1)" : "scale(0.95)", transition: "transform 0.2s ease", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: "#059669" }}>
            <CheckCircle2 size={28} />
          </div>
          <h2 style={{ margin: 0, color: "var(--text-main)", fontWeight: 700, fontSize: "1.2rem" }}>Borrow Request Issued</h2>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>Transaction Reference <strong style={{ color: "#2563eb", fontFamily: "monospace" }}>#{result.transactionId}</strong></p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 8, textTransform: "uppercase" }}>Allocated Items</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.borrowedItems.map((item) => (
              <div key={item.elabsTag} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}>{item.elabsTag}</div>
                  <div style={{ color: "var(--text-main)", fontSize: "0.82rem", marginTop: 2 }}>{item.name}</div>
                </div>
                <span style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 6, color: "#d97706", fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px" }}>BORROWED</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onDone} style={{ width: "100%", padding: "10px 0", background: "#2563eb", border: "none", borderRadius: 8, color: "#ffffff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          View in Active Borrows →
        </button>
      </div>
    </div>
  );
}

// ── Borrow Form with Item Picker ──────────────────────────────────────────────
function BorrowForm({ labs, onSuccess }: { labs: Lab[]; onSuccess: (r: BorrowSuccess) => void }) {
  const [labId, setLabId] = useState<number>(labs[0]?.id ?? 0);
  const [indexNo, setIndexNo] = useState(""); // EG/2022/5401
  const [student, setStudent] = useState<Student | null>(null);
  const [studentError, setStudentError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [purpose, setPurpose] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [conditionOut, setConditionOut] = useState("Good");

  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [itemSearch, setItemSearch] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch available items when lab changes
  useEffect(() => {
    if (!labId) return;
    setLoadingItems(true);
    setSelectedTags(new Set());
    apiFetch(`/inventory/available-items/${labId}`)
      .then((r) => r.json())
      .then((d) => setAvailableItems(d.items ?? []))
      .finally(() => setLoadingItems(false));
  }, [labId]);

  // Debounced student lookup
  const handleIndexNoChange = (val: string) => {
    setIndexNo(val);
    setStudent(null);
    setStudentError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const clean = val.trim();
    if (!clean || clean.length < 6) return;
    debounceRef.current = setTimeout(async () => {
      setLookingUp(true);
      try {
        const res = await apiFetch(`/inventory/student-lookup?indexNo=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const d = await res.json();
          setStudent(d.student);
          setStudentError("");
        } else {
          setStudent(null);
          setStudentError("Student not found");
        }
      } finally {
        setLookingUp(false);
      }
    }, 600);
  };

  const toggleItem = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const selectAll = () => setSelectedTags(new Set(filteredItems.map((i) => i.elabsTag)));
  const clearAll  = () => setSelectedTags(new Set());

  const filteredItems = useMemo(() => {
    const q = itemSearch.toLowerCase().trim();
    if (!q) return availableItems;
    return availableItems.filter((it) =>
      [it.elabsTag, it.name, it.category, it.model].join(" ").toLowerCase().includes(q)
    );
  }, [availableItems, itemSearch]);

  // Group by category
  const grouped = useMemo(() => {
    const g: Record<string, AvailableItem[]> = {};
    filteredItems.forEach((it) => {
      if (!g[it.category]) g[it.category] = [];
      g[it.category].push(it);
    });
    return g;
  }, [filteredItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (selectedTags.size === 0) return setError("Select at least one item to borrow.");
    if (!student) return setError("Enter a valid student index number.");
    setSubmitting(true);
    try {
      // Safely build dueAt — never send empty string
      let dueAtValue: string | null = null;
      if (dueAt && dueAt.trim()) {
        try { dueAtValue = new Date(dueAt).toISOString(); } catch { /* ignore bad date */ }
      }
      const res = await apiFetch("/inventory/borrow", {
        method: "POST",
        body: JSON.stringify({
          labId,
          borrowerType: "STUDENT",
          borrowerUserId: student.id,
          purpose: purpose.trim() || null,
          dueAt: dueAtValue,
          elabsTags: Array.from(selectedTags),
          conditionOut: conditionOut || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.detail || data.error || "Borrow failed");
      setSelectedTags(new Set()); setPurpose(""); setDueAt(""); setIndexNo(""); setStudent(null);
      onSuccess(data as BorrowSuccess);
    } catch {
      setError("Network error — check that the API server is running.");
    } finally {
      setSubmitting(false);

    }
  };

  const inp: React.CSSProperties = {
    background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8,
    padding: "9px 13px", color: "var(--text-main)", fontSize: "0.88rem",
    width: "100%", boxSizing: "border-box",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {error && (
        <div style={{ color: "#ff4d57", background: "#ff4d5715", border: "1px solid #ff4d5730", padding: "10px 14px", borderRadius: 8, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Row 1: Lab + Student */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Lab</label>
          <select value={labId} onChange={(e) => setLabId(Number(e.target.value))} style={inp}>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
            Student Index No.
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text" value={indexNo}
              onChange={(e) => handleIndexNoChange(e.target.value)}
              placeholder="e.g. EG/2022/5401"
              style={{ ...inp, paddingRight: 120 }}
            />
            {lookingUp && (
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                Searching…
              </span>
            )}
          </div>
          {/* Student found card */}
          {student && (
            <div style={{ marginTop: 8, background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.3)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                {student.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ color: "#059669", fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={14} />
                  <span>{student.fullName}</span>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{student.indexNo} · {student.email}</div>
              </div>
            </div>
          )}
          {studentError && (
            <div style={{ marginTop: 6, color: "#ff4d57", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 4 }}>
              <XCircle size={14} />
              <span>{studentError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Purpose + Due date + Condition */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Purpose</label>
          <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. EE601 Lab 3" style={inp} />
        </div>
        <div>
          <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Due Date</label>
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Condition Out</label>
          <select value={conditionOut} onChange={(e) => setConditionOut(e.target.value)} style={inp}>
            {["Excellent", "Good", "Fair", "Damaged"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Item Picker ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
            Select Items to Borrow
            <span style={{ marginLeft: 8, color: "#2563eb", background: "rgba(37,99,235,0.1)", borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600 }}>
              {availableItems.length} available
            </span>
            {selectedTags.size > 0 && (
              <span style={{ marginLeft: 6, color: "#d97706", background: "rgba(217,119,6,0.1)", borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600 }}>
                {selectedTags.size} selected
              </span>
            )}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={selectAll} style={{ background: "var(--border-color)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "4px 12px", cursor: "pointer", fontSize: "0.78rem" }}>Select All</button>
            <button type="button" onClick={clearAll} style={{ background: "var(--border-color)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "4px 12px", cursor: "pointer", fontSize: "0.78rem" }}>Clear</button>
          </div>
        </div>

        {/* Search inside items */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <input
            type="text" value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search items by name, tag or category…"
            style={{ ...inp, paddingLeft: 34 }}
          />
          <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e96c8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>

        {/* Items list grouped by category */}
        <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: 10, background: "var(--bg-app)" }}>
          {loadingItems ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading available items…</div>
          ) : availableItems.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No available items in this lab.</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No items match your search.</div>
          ) : (
            Object.entries(grouped).map(([category, catItems]) => (
              <div key={category}>
                {/* Category header */}
                <div style={{ padding: "8px 14px 4px", background: "var(--bg-card)", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: 0.8, position: "sticky", top: 0 }}>
                  {category.toUpperCase()} ({catItems.length})
                </div>
                {catItems.map((item) => {
                  const checked = selectedTags.has(item.elabsTag);
                  return (
                    <div
                      key={item.elabsTag}
                      onClick={() => toggleItem(item.elabsTag)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 14px", cursor: "pointer",
                        background: checked ? "rgba(37,99,235,0.06)" : "transparent",
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "var(--border-color)30"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = checked ? "rgba(37,99,235,0.06)" : "transparent"; }}
                    >
                      {/* Custom checkbox */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        background: checked ? "#2563eb" : "transparent",
                        border: `1.5px solid ${checked ? "#2563eb" : "var(--border-color)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s", color: "#ffffff", fontWeight: 700, fontSize: "0.8rem",
                      }}>
                        {checked && <Check size={13} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}>{item.elabsTag}</span>
                          <span style={{ color: checked ? "var(--text-main)" : "var(--text-main)", fontSize: "0.88rem" }}>{item.name}</span>
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 1 }}>{item.model}</div>
                      </div>

                      <span style={{ color: "#059669", fontSize: "0.72rem", background: "rgba(5,150,105,0.1)", borderRadius: 6, padding: "2px 8px", flexShrink: 0, fontWeight: 500 }}>Available</span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button type="submit" disabled={submitting || selectedTags.size === 0 || !student} style={{
          background: (submitting || selectedTags.size === 0 || !student) ? "var(--border-color)" : "#2563eb",
          border: "none", borderRadius: 8,
          color: (submitting || selectedTags.size === 0 || !student) ? "var(--text-muted)" : "#fff",
          fontWeight: 600, padding: "10px 24px", cursor: (submitting || selectedTags.size === 0 || !student) ? "not-allowed" : "pointer",
          fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
        }}>
          {submitting ? (
            <><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid var(--text-muted)", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Processing…</>
          ) : `Issue Borrow (${selectedTags.size} item${selectedTags.size !== 1 ? "s" : ""})`}
        </button>
        {selectedTags.size > 0 && student && (
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
            Borrowing <strong style={{ color: "#2563eb" }}>{selectedTags.size}</strong> item(s) for{" "}
            <strong style={{ color: "#059669" }}>{student.fullName}</strong>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </form>
  );
}

// ── Student Self-Borrow Form ──────────────────────────────────────────────────
function StudentBorrowForm({ labs, userId, onSuccess }: { labs: Lab[]; userId: number; onSuccess: (r: BorrowSuccess) => void }) {
  const [labId, setLabId] = useState<number>(labs[0]?.id ?? 0);
  const [purpose, setPurpose] = useState("");
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!labId) return;
    setLoadingItems(true);
    setSelectedTags(new Set());
    apiFetch(`/inventory/available-items/${labId}`)
      .then(r => r.json()).then(d => setAvailableItems(d.items ?? [])).finally(() => setLoadingItems(false));
  }, [labId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (selectedTags.size === 0) return setError("Select at least one item.");
    setSubmitting(true);
    try {
      const res = await apiFetch("/inventory/borrow", {
        method: "POST",
        body: JSON.stringify({ labId, borrowerType: "STUDENT", borrowerUserId: userId, purpose: purpose.trim() || null, dueAt: null, elabsTags: Array.from(selectedTags), conditionOut: "Good" }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.detail || data.error || "Borrow failed");
      setSelectedTags(new Set()); setPurpose("");
      onSuccess(data as BorrowSuccess);
    } catch { setError("Network error."); } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: "#ff4d5720", border: "1px solid #ff4d5740", borderRadius: 8, padding: "10px 14px", color: "#ff4d57", marginBottom: 16, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 6, fontWeight: 600 }}>LAB</label>
        <select value={labId} onChange={e => setLabId(Number(e.target.value))} style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 12px", fontSize: "0.9rem" }}>
          {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 6, fontWeight: 600 }}>PURPOSE (OPTIONAL)</label>
        <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. EE601 Lab 3" style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 12px", fontSize: "0.9rem", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 8, fontWeight: 600 }}>
          SELECT ITEMS <span style={{ color: "#2563eb" }}>({availableItems.length} available)</span>
          {selectedTags.size > 0 && <span style={{ color: "#059669", marginLeft: 8 }}>· {selectedTags.size} selected</span>}
        </label>
        {loadingItems ? <div style={{ color: "var(--text-muted)", padding: 20, textAlign: "center" }}>Loading items…</div> : availableItems.length === 0 ? <div style={{ color: "var(--text-muted)", padding: 20, textAlign: "center", background: "var(--bg-app)", borderRadius: 8, border: "1px dashed var(--border-color)" }}>No available items in this lab.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {availableItems.map(item => {
              const checked = selectedTags.has(item.elabsTag);
              return (
                <div key={item.elabsTag} onClick={() => setSelectedTags(prev => { const n = new Set(prev); checked ? n.delete(item.elabsTag) : n.add(item.elabsTag); return n; })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: checked ? "rgba(37,99,235,0.06)" : "var(--bg-app)", border: `1px solid ${checked ? "#2563eb" : "var(--border-color)"}`, borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: checked ? "#2563eb" : "transparent", border: `1.5px solid ${checked ? "#2563eb" : "var(--border-color)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white" }}>
                    {checked && <Check size={13} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}>{item.elabsTag}</span>
                    <span style={{ color: checked ? "var(--text-main)" : "var(--text-muted)", marginLeft: 10, fontSize: "0.85rem" }}>{item.name}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: "0.78rem" }}>{item.model}</span>
                  </div>
                  <span style={{ background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)", borderRadius: 6, color: "#059669", fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px" }}>Available</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button type="submit" disabled={submitting || selectedTags.size === 0} style={{ width: "100%", padding: "11px 0", background: selectedTags.size === 0 ? "var(--border-color)" : "#2563eb", border: "none", borderRadius: 8, color: selectedTags.size === 0 ? "var(--text-muted)" : "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: selectedTags.size === 0 ? "not-allowed" : "pointer" }}>
        {submitting ? "Processing…" : `Borrow (${selectedTags.size} item${selectedTags.size !== 1 ? "s" : ""})`}
      </button>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const isStudent = useIsStudent();
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"items" | "borrow" | "transactions" | "myborrows">("items");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [myBorrows, setMyBorrows] = useState<Borrow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedLab, setSelectedLab] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState<BorrowSuccess | null>(null);

  const fetchItems       = useCallback(() => { setLoading(true); apiFetch("/inventory/items").then(r => r.json()).then(d => setItems(d.items ?? [])).finally(() => setLoading(false)); }, []);
  const fetchLabs        = useCallback(() => { apiFetch("/labs").then(r => r.json()).then(d => setLabs(d.labs ?? [])); }, []);
  const fetchTransactions = useCallback(() => { apiFetch("/inventory/transactions").then(r => r.json()).then(d => setTransactions(d.transactions ?? [])).catch(() => {}); }, []);
  const fetchMyBorrows   = useCallback(() => { apiFetch("/inventory/my-borrows").then(r => r.json()).then(d => setMyBorrows(d.borrows ?? [])).catch(() => {}); }, []);

  useEffect(() => {
    fetchItems(); fetchLabs(); fetchMyBorrows();
    if (!isStudent) fetchTransactions();
    const user = getUser();
    if (user) setCurrentUserId(user.id);
    // Default tab: students start on borrow, staff on items
    setActiveTab(isStudent ? "borrow" : "items");
  }, [isStudent, fetchItems, fetchLabs, fetchTransactions, fetchMyBorrows]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => { if (it.category) set.add(it.category); });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((it) => {
      if (selectedLab !== "all" && it.labName !== selectedLab && String(it.labId) !== selectedLab) return false;
      if (selectedCategory !== "all" && it.category !== selectedCategory) return false;
      if (selectedStatus !== "all" && it.status !== selectedStatus) return false;
      if (!q) return true;
      return [it.elabsTag, it.name, it.category, it.labName, it.model, it.serialNo, it.status].join(" ").toLowerCase().includes(q);
    });
  }, [items, search, selectedLab, selectedCategory, selectedStatus]);

  const handleBorrowSuccess = (result: BorrowSuccess) => {
    setBorrowSuccess(result);
    setItems((prev) => prev.map((item) => result.borrowedItems.some((b) => b.elabsTag === item.elabsTag) ? { ...item, status: "BORROWED" } : item));
    fetchTransactions(); fetchMyBorrows();
  };

  const handleScan = async (decodedText: string) => {
    setIsScanning(false);
    const res = await apiFetch(`/inventory/items/barcode/${decodedText}`);
    if (res.ok) { const d = await res.json(); setScannedItem(d.item); } else alert("Item not found.");
  };

  const handleReturn = async (txId: number) => {
    if (!confirm("Mark this transaction as returned?")) return;
    const res = await apiFetch("/inventory/return", { method: "POST", body: JSON.stringify({ transactionId: txId }) });
    if (res.ok) { fetchTransactions(); fetchItems(); fetchMyBorrows(); }
    else { const d = await res.json(); alert(d.error || "Return failed"); }
  };

  const borrowedTags = new Set(borrowSuccess?.borrowedItems.map((b) => b.elabsTag) ?? []);
  const activeBorrows = transactions.filter(t => t.status === "BORROWED").length;

  const tabBtn = (id: typeof activeTab, label: React.ReactNode) => (
    <button onClick={() => setActiveTab(id)} style={{ padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", border: "none", transition: "all 0.2s", background: activeTab === id ? "#3d83f620" : "transparent", color: activeTab === id ? "#3d83f6" : "var(--text-muted)", borderBottom: activeTab === id ? "2px solid #3d83f6" : "2px solid transparent" }}>{label}</button>
  );

  return (
    <AppShell title="Inventory Management" subtitle="Track, borrow, and manage all lab equipment">
      {borrowSuccess && <BorrowSuccessCard result={borrowSuccess} onDone={() => { setBorrowSuccess(null); setActiveTab("myborrows"); }} />}

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
        {!isStudent && tabBtn("items", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Package size={14} />
            <span>All Equipment</span>
          </span>
        ))}
        {tabBtn("borrow", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} />
            <span>{isStudent ? "Borrow Equipment" : "Issue Borrow"}</span>
          </span>
        ))}
        {!isStudent && tabBtn("transactions", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ClipboardList size={14} />
            <span>Active Borrows{activeBorrows > 0 ? ` (${activeBorrows})` : ""}</span>
          </span>
        ))}
        {tabBtn("myborrows", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <User size={14} />
            <span>My Borrows</span>
          </span>
        ))}
      </div>

      {/* ── ITEMS TAB ── */}
      {activeTab === "items" && (
        <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Top Summary Stat Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Inventory</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-main)", marginTop: 4 }}>{items.length}</div>
            </div>
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Available in Labs</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#059669", marginTop: 4 }}>
                {items.filter(i => i.status === "AVAILABLE").length}
              </div>
            </div>
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Currently Borrowed</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>
                {items.filter(i => i.status === "BORROWED").length}
              </div>
            </div>
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Under Service</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                {items.filter(i => i.status === "MAINTENANCE" || i.status === "OUT_OF_SERVICE").length}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flex: 1 }}>
              <div className="topbar-search" style={{ minWidth: 240, maxWidth: 300, margin: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e96c8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search tag, name, model, serial..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="topbar-search-input"
                />
              </div>

              {/* Lab Filter */}
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", minWidth: 150 }}
              >
                <option value="all">All Laboratories</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", minWidth: 140 }}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", minWidth: 130 }}
              >
                <option value="all">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="BORROWED">Borrowed</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </select>

              {(search || selectedLab !== "all" || selectedCategory !== "all" || selectedStatus !== "all") && (
                <button
                  onClick={() => { setSearch(""); setSelectedLab("all"); setSelectedCategory("all"); setSelectedStatus("all"); }}
                  style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)", borderRadius: 8, padding: "8px 12px", fontSize: "0.82rem", cursor: "pointer" }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="primary-btn" onClick={() => setIsScanning(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "0.85rem" }}>
                <QrCode size={14} /> Scan Barcode
              </button>
              <button className="secondary-btn" onClick={fetchItems} style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Results Count Line */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <span>Showing <strong style={{ color: "var(--text-main)" }}>{filteredItems.length}</strong> of {items.length} equipment items</span>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading inventory…</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-app)", borderRadius: 8, border: "1px dashed var(--border-color)" }}>
              No equipment found matching the selected filters.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ELABS Tag</th>
                    <th>Equipment Name</th>
                    <th>Category</th>
                    <th>Laboratory</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const justBorrowed = borrowedTags.has(item.elabsTag);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setScannedItem(item)}
                        style={{ cursor: "pointer", background: justBorrowed ? "rgba(5, 150, 105, 0.04)" : undefined, transition: "background 0.2s" }}
                      >
                        <td>
                          <span style={{ fontFamily: "monospace", color: "#2563eb", fontWeight: 600, background: "rgba(37, 99, 235, 0.08)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(37, 99, 235, 0.2)" }}>
                            {item.elabsTag}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "var(--text-main)", display: "block" }}>{item.name}</strong>
                          {item.model && <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{item.model}</span>}
                        </td>
                        <td>
                          <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: 4, background: "rgba(100, 116, 139, 0.12)", color: "var(--text-main)", fontWeight: 500 }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-main)", fontSize: "0.85rem" }}>{item.labName}</td>
                        <td>{statusBadge(item.status)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setScannedItem(item); }}
                            style={{ padding: "4px 10px", fontSize: "0.78rem", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-main)", cursor: "pointer" }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── BORROW TAB ── */}
      {activeTab === "borrow" && (
        <section className="panel">
          {isStudent ? (
            <>
              <h3 style={{ margin: "0 0 6px", color: "var(--text-main)" }}>Borrow Lab Equipment</h3>
              <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: "0.85rem" }}>Select a lab, pick the items you need, and submit your borrow request.</p>
              {labs.length > 0 && <StudentBorrowForm labs={labs} userId={currentUserId} onSuccess={handleBorrowSuccess} />}
            </>
          ) : (
            <>
              <h3 style={{ margin: "0 0 6px", color: "var(--text-main)" }}>Issue Equipment Borrow</h3>
              <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: "0.85rem" }}>Select a lab to see available equipment. Enter the student index number — it will auto-look up their profile.</p>
              {labs.length > 0 && <BorrowForm labs={labs} onSuccess={handleBorrowSuccess} />}
            </>
          )}
        </section>
      )}

      {/* ── ACTIVE BORROWS TAB ── */}
      {activeTab === "transactions" && (
        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "var(--text-main)" }}>All Borrow Transactions</h3>
            <button className="secondary-btn" onClick={() => { fetchTransactions(); fetchItems(); }}>↻ Refresh</button>
          </div>
          {transactions.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-app)", borderRadius: 12, border: "1px dashed var(--border-color)" }}>No transactions yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Lab</th><th>Borrower</th><th>Purpose</th><th>Due Date</th><th>Status</th><th>Issued By</th><th>Action</th></tr></thead>
                <tbody>
                  {transactions.map((tx) => {
                    const overdue = isOverdue(tx.dueAt, tx.status);
                    const isNew = borrowSuccess?.transactionId === tx.id;
                    return (
                      <tr key={tx.id} style={{ background: isNew ? "rgba(5,150,105,0.06)" : undefined }}>
                        <td style={{ color: "#2563eb", fontWeight: 600, fontFamily: "monospace" }}>
                          #{tx.id}{isNew && <span style={{ marginLeft: 6, background: "#059669", color: "#ffffff", borderRadius: 4, padding: "1px 6px", fontSize: "0.7rem", fontWeight: 600 }}>NEW</span>}
                        </td>
                        <td>{tx.labName}</td>
                        <td>{tx.borrowerUserId ? `User #${tx.borrowerUserId}` : tx.borrowerGroupCode ?? "—"}</td>
                        <td>{tx.purpose || "—"}</td>
                        <td style={{ color: overdue ? "#dc2626" : "var(--text-main)" }}>
                          {fmt(tx.dueAt)}
                          {overdue && <AlertTriangle size={14} style={{ display: "inline-block", marginLeft: 6, color: "#dc2626", verticalAlign: "text-bottom" }} />}
                        </td>
                        <td>{statusBadge(tx.status)}</td>
                        <td style={{ color: "var(--text-muted)" }}>{tx.issuedBy}</td>
                        <td>{tx.status === "BORROWED" && <button onClick={() => handleReturn(tx.id)} style={{ background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.3)", borderRadius: 6, color: "#059669", padding: "5px 14px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>↩ Return</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── MY BORROWS TAB ── */}
      {activeTab === "myborrows" && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: "var(--text-main)" }}>My Borrow History</h3>
            <button className="secondary-btn" onClick={fetchMyBorrows}>↻ Refresh</button>
          </div>
          {myBorrows.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)", color: "var(--text-muted)" }}>You have no borrow history yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {myBorrows.map((borrow) => {
                const overdue = isOverdue(borrow.dueAt, borrow.status);
                const parsedItems: BorrowItem[] = typeof borrow.items === "string" ? JSON.parse(borrow.items) : borrow.items;
                return (
                  <div key={borrow.id} style={{ background: "var(--bg-card)", border: `1px solid ${overdue ? "rgba(220,38,38,0.3)" : "var(--border-color)"}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <span style={{ color: "#2563eb", fontWeight: 700, fontFamily: "monospace" }}>#{borrow.id}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: 10 }}>{borrow.labName}</span>
                        {borrow.purpose && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: 10 }}>— {borrow.purpose}</span>}
                      </div>
                      {statusBadge(overdue ? "OVERDUE" : borrow.status)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      {parsedItems.map((item) => (
                        <span key={item.elabsTag} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 10px", fontSize: "0.8rem" }}>
                          <Check size={12} color="#059669" />
                          <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600 }}>{item.elabsTag}</span>
                          <span style={{ color: "var(--text-main)" }}>{item.name}</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 20, fontSize: "0.82rem", color: "var(--text-muted)", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {fmt(borrow.createdAt)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: overdue ? "#dc2626" : "var(--text-muted)" }}>
                        {overdue ? <AlertTriangle size={12} /> : <Calendar size={12} />}
                        <span>Due: {fmt(borrow.dueAt)}</span>
                      </span>
                      {borrow.returnedAt && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#059669" }}>
                          <CheckCircle2 size={12} />
                          <span>Returned: {fmt(borrow.returnedAt)}</span>
                        </span>
                      )}
                      <span>By: {borrow.issuedByName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {isScanning && <BarcodeScanner onScan={handleScan} onClose={() => setIsScanning(false)} />}
      {scannedItem && <ItemDetailsModal item={scannedItem} onClose={() => setScannedItem(null)} />}
    </AppShell>
  );
}
