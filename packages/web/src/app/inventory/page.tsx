"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { ItemDetailsModal } from "@/components/inventory/ItemDetailsModal";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useIsStudent, useIsStaff } from "@/hooks/useRole";
import {
  QrCode,
  CheckCircle2,
  Wrench,
  XCircle,
  AlertTriangle,
  Package,
  ClipboardList,
  User,
  Calendar,
  Check,
  ArrowLeftRight,
  Plus,
  Clock,
  ExternalLink,
  Building,
  Info,
  Search,
  CheckCheck,
  Ban,
  ShieldCheck,
  Sparkles,
  Inbox,
  Send,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

type InventoryItem = {
  id: number;
  labId: number;
  elabsTag: string;
  name: string;
  category: string;
  model: string;
  serialNo: string;
  status: "AVAILABLE" | "BORROWED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  conditionNote: string;
  labName: string;
  updatedAt: string;
};

type AvailableItem = {
  id: number;
  elabsTag: string;
  name: string;
  category: string;
  model: string;
};

type Lab = { id: number; name: string };

type BorrowItem = {
  itemId: number;
  elabsTag: string;
  name: string;
  category: string;
  model: string;
  condOut?: string;
  condIn?: string;
};

type BorrowRequest = {
  id: number;
  labId: number;
  labName: string;
  borrowerUserId: number;
  borrowerName: string;
  borrowerIndexNo: string;
  borrowerEmail: string;
  borrowerGroup: string | null;
  purpose: string | null;
  usageType: "IN_LAB" | "OUTSIDE_LAB";
  dueAt: string | null;
  status: string;
  createdAt: string;
  items: {
    itemId: number;
    elabsTag: string;
    name: string;
    category: string;
    model: string;
    status: string;
  }[];
};

type Transaction = {
  id: number;
  labId: number;
  labName: string;
  borrowerType: string;
  borrowerUserId: number | null;
  borrowerGroupCode: string | null;
  borrowerName?: string | null;
  borrowerIndexNo?: string | null;
  borrowerGroup?: string | null;
  borrowerEmail?: string | null;
  issuedBy: string | null;
  purpose: string | null;
  usageType?: "IN_LAB" | "OUTSIDE_LAB";
  rejectionReason?: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  status: string;
  createdAt: string;
  items?: {
    itemId: number;
    elabsTag: string;
    name: string;
    category: string;
    model: string;
    conditionIn?: string | null;
  }[];
};

type Borrow = {
  id: number;
  labName: string;
  purpose: string | null;
  usageType?: "IN_LAB" | "OUTSIDE_LAB";
  rejectionReason?: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  status: string;
  createdAt: string;
  issuedByName: string | null;
  items: BorrowItem[];
};

type BorrowSuccess = {
  transactionId: number;
  borrowedItems?: { elabsTag: string; name: string; id: number }[];
  requestedItems?: { elabsTag: string; name: string; id: number }[];
  isRequest?: boolean;
  message?: string;
};

type Student = {
  id: number;
  fullName: string;
  indexNo: string;
  email: string;
  groupCode?: string;
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
    AVAILABLE:     { label: "Available",        color: "#059669", bg: "rgba(5, 150, 105, 0.1)", icon: CheckCircle2 },
    BORROWED:      { label: "Active Loan",      color: "#2563eb", bg: "rgba(37, 99, 235, 0.1)", icon: ArrowLeftRight },
    REQUESTED:     { label: "Pending Approval", color: "#d97706", bg: "rgba(217, 119, 6, 0.12)", icon: Clock },
    REJECTED:      { label: "Rejected",         color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)", icon: XCircle },
    MAINTENANCE:   { label: "Maintenance",      color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", icon: Wrench },
    OUT_OF_SERVICE:{ label: "Out of Service",   color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)", icon: XCircle },
    RETURNED:      { label: "Returned",         color: "#059669", bg: "rgba(5, 150, 105, 0.1)", icon: CheckCircle2 },
    OVERDUE:       { label: "Overdue",          color: "#dc2626", bg: "rgba(220, 38, 38, 0.12)", icon: AlertTriangle },
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

function usageBadge(type: "IN_LAB" | "OUTSIDE_LAB" | string | undefined) {
  if (type === "OUTSIDE_LAB") {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        color: "#9333ea",
        fontWeight: 600,
        fontSize: "0.74rem",
        background: "rgba(147, 51, 234, 0.1)",
        padding: "3px 8px",
        borderRadius: 6,
        border: "1px solid rgba(147, 51, 234, 0.25)"
      }}>
        <ExternalLink size={11} />
        <span>Outside Lab</span>
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      color: "#0284c7",
      fontWeight: 600,
      fontSize: "0.74rem",
      background: "rgba(2, 132, 199, 0.1)",
      padding: "3px 8px",
      borderRadius: 6,
      border: "1px solid rgba(2, 132, 199, 0.2)"
    }}>
      <Building size={11} />
      <span>In-Lab</span>
    </span>
  );
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(dueAt: string | null, status: string) {
  if (status === "RETURNED" || status === "REJECTED" || !dueAt) return false;
  return new Date(dueAt) < new Date();
}

// ── Borrow Success Overlay ────────────────────────────────────────────────────
function BorrowSuccessCard({ result, onDone }: { result: BorrowSuccess; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  const items = result.borrowedItems || result.requestedItems || [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(6px)", opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 32, minWidth: 380, maxWidth: 500, transform: visible ? "scale(1)" : "scale(0.95)", transition: "transform 0.2s ease", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: result.isRequest ? "rgba(217,119,6,0.12)" : "rgba(5,150,105,0.12)", border: `1px solid ${result.isRequest ? "rgba(217,119,6,0.3)" : "rgba(5,150,105,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: result.isRequest ? "#d97706" : "#059669" }}>
            {result.isRequest ? <Clock size={28} /> : <CheckCircle2 size={28} />}
          </div>
          <h2 style={{ margin: 0, color: "var(--text-main)", fontWeight: 700, fontSize: "1.2rem" }}>
            {result.isRequest ? "Borrow Request Submitted!" : "Equipment Issued Successfully!"}
          </h2>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Reference <strong style={{ color: "#2563eb", fontFamily: "monospace" }}>#{result.transactionId}</strong>
          </p>
          {result.message && (
            <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: "var(--bg-app)", border: "1px solid var(--border-color)", fontSize: "0.82rem", color: "var(--text-main)" }}>
              {result.message}
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 8, textTransform: "uppercase" }}>Equipment Items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
              {items.map((item) => (
                <div key={item.elabsTag} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}>{item.elabsTag}</div>
                    <div style={{ color: "var(--text-main)", fontSize: "0.82rem", marginTop: 2 }}>{item.name}</div>
                  </div>
                  <span style={{ background: result.isRequest ? "rgba(217,119,6,0.12)" : "rgba(37,99,235,0.12)", border: `1px solid ${result.isRequest ? "rgba(217,119,6,0.25)" : "rgba(37,99,235,0.25)"}`, borderRadius: 6, color: result.isRequest ? "#d97706" : "#2563eb", fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px" }}>
                    {result.isRequest ? "REQUESTED" : "BORROWED"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={onDone} style={{ width: "100%", padding: "10px 0", background: "#2563eb", border: "none", borderRadius: 8, color: "#ffffff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          {result.isRequest ? "Track in My Borrows →" : "View in Active Borrows →"}
        </button>
      </div>
    </div>
  );
}

// ── Student Request Form (2-Step Workflow) ────────────────────────────────────
function StudentBorrowRequestForm({
  labs,
  onSuccess,
}: {
  labs: Lab[];
  onSuccess: (r: BorrowSuccess) => void;
}) {
  const [labId, setLabId] = useState<number>(labs[0]?.id ?? 0);
  const [usageType, setUsageType] = useState<"IN_LAB" | "OUTSIDE_LAB">("IN_LAB");
  const [purpose, setPurpose] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [itemSearch, setItemSearch] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!labId) return;
    setLoadingItems(true);
    setSelectedTags(new Set());
    apiFetch(`/inventory/available-items/${labId}`)
      .then((r) => r.json())
      .then((d) => setAvailableItems(d.items ?? []))
      .finally(() => setLoadingItems(false));
  }, [labId]);

  const toggleItem = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = itemSearch.toLowerCase().trim();
    if (!q) return availableItems;
    return availableItems.filter((it) =>
      [it.elabsTag, it.name, it.category, it.model].join(" ").toLowerCase().includes(q)
    );
  }, [availableItems, itemSearch]);

  const grouped = useMemo(() => {
    const g: Record<string, AvailableItem[]> = {};
    filteredItems.forEach((it) => {
      const cat = it.category || "General";
      if (!g[cat]) g[cat] = [];
      g[cat].push(it);
    });
    return g;
  }, [filteredItems]);

  const setQuickDue = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(17, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setDueAt(localIso);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedTags.size === 0) {
      return setError("Please select at least one laboratory equipment item.");
    }
    if (usageType === "OUTSIDE_LAB") {
      if (!purpose.trim()) {
        return setError("Outside-lab loan requires stating your project or coursework purpose.");
      }
      if (!dueAt) {
        return setError("Please specify the expected return due date and time for outside-lab loan.");
      }
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/inventory/request-borrow", {
        method: "POST",
        body: JSON.stringify({
          labId,
          usageType,
          purpose: purpose.trim() || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          elabsTags: Array.from(selectedTags),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return setError(data.detail || data.error || "Failed to submit borrow request.");
      }
      setSelectedTags(new Set());
      setPurpose("");
      setDueAt("");
      onSuccess({
        transactionId: data.transactionId,
        requestedItems: data.requestedItems,
        isRequest: true,
        message: data.message,
      });
    } catch {
      setError("Network communication error.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLabObj = labs.find((l) => l.id === labId);

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Lab Selector & Usage Type */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            1. Select Laboratory
          </label>
          <select
            value={labId}
            onChange={(e) => setLabId(Number(e.target.value))}
            style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 14px", color: "var(--text-main)", fontSize: "0.9rem" }}
          >
            {labs.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            2. Equipment Usage Location
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div
              onClick={() => setUsageType("IN_LAB")}
              style={{
                border: `1.5px solid ${usageType === "IN_LAB" ? "#0284c7" : "var(--border-color)"}`,
                background: usageType === "IN_LAB" ? "rgba(2, 132, 199, 0.08)" : "var(--bg-app)",
                borderRadius: 8,
                padding: "10px 12px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: usageType === "IN_LAB" ? "#0284c7" : "var(--text-main)", fontSize: "0.88rem" }}>
                <Building size={14} />
                <span>In-Lab Session</span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                For practicals & session work inside lab
              </div>
            </div>

            <div
              onClick={() => setUsageType("OUTSIDE_LAB")}
              style={{
                border: `1.5px solid ${usageType === "OUTSIDE_LAB" ? "#9333ea" : "var(--border-color)"}`,
                background: usageType === "OUTSIDE_LAB" ? "rgba(147, 51, 234, 0.08)" : "var(--bg-app)",
                borderRadius: 8,
                padding: "10px 12px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: usageType === "OUTSIDE_LAB" ? "#9333ea" : "var(--text-main)", fontSize: "0.88rem" }}>
                <ExternalLink size={14} />
                <span>Take Outside Lab</span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                Project / field loan with due date
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purpose & Due Date */}
      <div style={{ display: "grid", gridTemplateColumns: usageType === "OUTSIDE_LAB" ? "1.4fr 1fr" : "1fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            3. Purpose {usageType === "OUTSIDE_LAB" ? <span style={{ color: "#ef4444" }}>*</span> : "(Optional)"}
          </label>
          <input
            type="text"
            placeholder={usageType === "OUTSIDE_LAB" ? "e.g. Capstone project motor drive testing outside lab..." : "e.g. Lab Experiment 4 — Filter circuits"}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 14px", color: "var(--text-main)", fontSize: "0.88rem" }}
          />
        </div>

        {usageType === "OUTSIDE_LAB" && (
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Expected Return Due Date <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "9px 12px", color: "var(--text-main)", fontSize: "0.85rem" }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setQuickDue(3)} style={{ padding: "3px 8px", fontSize: "0.72rem", borderRadius: 4, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer" }}>+3 Days</button>
                <button type="button" onClick={() => setQuickDue(7)} style={{ padding: "3px 8px", fontSize: "0.72rem", borderRadius: 4, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer" }}>+1 Week</button>
                <button type="button" onClick={() => setQuickDue(14)} style={{ padding: "3px 8px", fontSize: "0.72rem", borderRadius: 4, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer" }}>+2 Weeks</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {usageType === "OUTSIDE_LAB" && (
        <div style={{ background: "rgba(147, 51, 234, 0.06)", border: "1px solid rgba(147, 51, 234, 0.2)", borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: "var(--text-main)", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Info size={16} color="#9333ea" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Laboratory Policy:</strong> Taking equipment outside requires formal authorization. After submitting this request, you must meet the Lab Technician or Instructor in person to inspect the instrument condition and complete hand-over authorization.
          </div>
        </div>
      )}

      {/* Item Picker */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              4. Select Items to Borrow ({selectedTags.size} selected)
            </label>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {selectedLabObj ? `${selectedLabObj.name} has ${availableItems.length} items available` : ""}
            </div>
          </div>
          <input
            type="text"
            placeholder="Search equipment in lab..."
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            style={{ width: 220, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 10px", fontSize: "0.82rem", color: "var(--text-main)" }}
          />
        </div>

        <div style={{ border: "1px solid var(--border-color)", borderRadius: 10, maxHeight: 300, overflowY: "auto", background: "var(--bg-app)" }}>
          {loadingItems ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading available items…</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {availableItems.length === 0 ? "No equipment is currently available in this lab." : "No matching items found."}
            </div>
          ) : (
            Object.entries(grouped).map(([category, catItems]) => (
              <div key={category}>
                <div style={{ padding: "6px 14px", background: "var(--border-color)30", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border-color)" }}>
                  {category} ({catItems.length})
                </div>
                {catItems.map((item) => {
                  const checked = selectedTags.has(item.elabsTag);
                  return (
                    <div
                      key={item.elabsTag}
                      onClick={() => toggleItem(item.elabsTag)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "9px 14px",
                        cursor: "pointer",
                        background: checked ? "rgba(37,99,235,0.06)" : "transparent",
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          flexShrink: 0,
                          background: checked ? "#2563eb" : "transparent",
                          border: `1.5px solid ${checked ? "#2563eb" : "var(--border-color)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                        }}
                      >
                        {checked && <Check size={13} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}>{item.elabsTag}</span>
                          <span style={{ color: "var(--text-main)", fontSize: "0.88rem" }}>{item.name}</span>
                        </div>
                        {item.model && <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 1 }}>{item.model}</div>}
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

      {/* Submit Button */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="submit"
          disabled={submitting || selectedTags.size === 0}
          style={{
            background: (submitting || selectedTags.size === 0) ? "var(--border-color)" : "#2563eb",
            border: "none",
            borderRadius: 8,
            color: (submitting || selectedTags.size === 0) ? "var(--text-muted)" : "#fff",
            fontWeight: 600,
            padding: "10px 24px",
            cursor: (submitting || selectedTags.size === 0) ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.15s",
          }}
        >
          {submitting ? (
            <><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid var(--text-muted)", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Submitting Request…</>
          ) : (
            <>
              <Send size={15} />
              <span>Submit Borrow Request ({selectedTags.size} item{selectedTags.size !== 1 ? "s" : ""})</span>
            </>
          )}
        </button>
        {selectedTags.size > 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
            Ready to request <strong style={{ color: "#2563eb" }}>{selectedTags.size}</strong> item(s) from {selectedLabObj?.name}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </form>
  );
}

// ── Staff Walk-In Counter Issuing Form ────────────────────────────────────────
function StaffWalkInIssueForm({
  labs,
  onSuccess,
}: {
  labs: Lab[];
  onSuccess: (r: BorrowSuccess) => void;
}) {
  const [labId, setLabId] = useState<number>(labs[0]?.id ?? 0);
  const [indexNo, setIndexNo] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [studentError, setStudentError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [usageType, setUsageType] = useState<"IN_LAB" | "OUTSIDE_LAB">("IN_LAB");
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

  useEffect(() => {
    if (!labId) return;
    setLoadingItems(true);
    setSelectedTags(new Set());
    apiFetch(`/inventory/available-items/${labId}`)
      .then((r) => r.json())
      .then((d) => setAvailableItems(d.items ?? []))
      .finally(() => setLoadingItems(false));
  }, [labId]);

  const handleIndexNoChange = (val: string) => {
    setIndexNo(val);
    setStudent(null);
    setStudentError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const clean = val.trim();
    if (!clean || clean.length < 4) return;
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
          setStudentError("Student record not found");
        }
      } catch {
        setStudentError("Lookup failed");
      } finally {
        setLookingUp(false);
      }
    }, 500);
  };

  const toggleItem = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = itemSearch.toLowerCase().trim();
    if (!q) return availableItems;
    return availableItems.filter((it) =>
      [it.elabsTag, it.name, it.category, it.model].join(" ").toLowerCase().includes(q)
    );
  }, [availableItems, itemSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!student) return setError("Please enter and verify the student's registration/index number.");
    if (selectedTags.size === 0) return setError("Select at least one equipment item.");

    setSubmitting(true);
    try {
      const res = await apiFetch("/inventory/borrow", {
        method: "POST",
        body: JSON.stringify({
          labId,
          borrowerType: "STUDENT",
          borrowerUserId: student.id,
          borrowerGroupCode: student.groupCode || null,
          purpose: purpose.trim() || null,
          usageType,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          elabsTags: Array.from(selectedTags),
          conditionOut,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.detail || data.error || "Failed to issue equipment.");
      setSelectedTags(new Set());
      setPurpose("");
      onSuccess({
        transactionId: data.transactionId,
        borrowedItems: data.borrowedItems,
        isRequest: false,
        message: `Equipment successfully issued to ${student.fullName} (${student.indexNo})`,
      });
    } catch {
      setError("Network error while issuing equipment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: "0.88rem" }}>
          {error}
        </div>
      )}

      {/* Row 1: Lab & Student Lookup */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Issuing Laboratory
          </label>
          <select
            value={labId}
            onChange={(e) => setLabId(Number(e.target.value))}
            style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 14px", color: "var(--text-main)", fontSize: "0.9rem" }}
          >
            {labs.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Student Reg / Index Number (e.g. EG/2022/5401) *
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Type Reg No, email or name..."
              value={indexNo}
              onChange={(e) => handleIndexNoChange(e.target.value)}
              style={{ width: "100%", background: "var(--bg-app)", border: `1.5px solid ${student ? "#059669" : studentError ? "#dc2626" : "var(--border-color)"}`, borderRadius: 8, padding: "10px 14px", color: "var(--text-main)", fontSize: "0.9rem" }}
            />
            {lookingUp && (
              <span style={{ position: "absolute", right: 12, top: 12, color: "var(--text-muted)", fontSize: "0.78rem" }}>Searching…</span>
            )}
          </div>
          {student && (
            <div style={{ marginTop: 6, padding: "8px 12px", background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.25)", borderRadius: 6, display: "flex", alignItems: "center", gap: 12, fontSize: "0.85rem" }}>
              <CheckCircle2 size={16} color="#059669" />
              <div>
                <strong style={{ color: "var(--text-main)" }}>{student.fullName}</strong>
                <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>({student.indexNo})</span>
                {student.groupCode && <span style={{ marginLeft: 8, background: "rgba(37,99,235,0.1)", color: "#2563eb", padding: "1px 6px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>{student.groupCode}</span>}
              </div>
            </div>
          )}
          {studentError && <div style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: 4 }}>{studentError}</div>}
        </div>
      </div>

      {/* Row 2: Usage Type, Purpose, Due Date */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Usage Authorization
          </label>
          <select
            value={usageType}
            onChange={(e) => setUsageType(e.target.value as any)}
            style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 12px", color: "var(--text-main)", fontSize: "0.88rem" }}
          >
            <option value="IN_LAB">In-Lab Session Only</option>
            <option value="OUTSIDE_LAB">Take Outside Lab (Authorized)</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Purpose / Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Practical exam, FYP testing"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 12px", color: "var(--text-main)", fontSize: "0.88rem" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Return Due Date
          </label>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "9px 12px", color: "var(--text-main)", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* Equipment Item Selection */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Select Equipment to Hand Over ({selectedTags.size} selected)
          </label>
          <input
            type="text"
            placeholder="Filter tag, name, model..."
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            style={{ width: 220, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 10px", fontSize: "0.82rem", color: "var(--text-main)" }}
          />
        </div>

        <div style={{ border: "1px solid var(--border-color)", borderRadius: 10, maxHeight: 250, overflowY: "auto", background: "var(--bg-app)" }}>
          {filteredItems.map((item) => {
            const checked = selectedTags.has(item.elabsTag);
            return (
              <div
                key={item.elabsTag}
                onClick={() => toggleItem(item.elabsTag)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 14px",
                  cursor: "pointer",
                  background: checked ? "rgba(37,99,235,0.06)" : "transparent",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 4, background: checked ? "#2563eb" : "transparent", border: `1.5px solid ${checked ? "#2563eb" : "var(--border-color)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                  {checked && <Check size={13} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600, fontSize: "0.85rem" }}>{item.elabsTag}</span>
                  <span style={{ color: "var(--text-main)", fontSize: "0.88rem", marginLeft: 8 }}>{item.name}</span>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{item.model}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="submit"
          disabled={submitting || selectedTags.size === 0 || !student}
          style={{
            background: (submitting || selectedTags.size === 0 || !student) ? "var(--border-color)" : "#059669",
            border: "none",
            borderRadius: 8,
            color: (submitting || selectedTags.size === 0 || !student) ? "var(--text-muted)" : "#fff",
            fontWeight: 600,
            padding: "10px 24px",
            cursor: (submitting || selectedTags.size === 0 || !student) ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {submitting ? "Processing…" : `Issue & Hand Over (${selectedTags.size} item${selectedTags.size !== 1 ? "s" : ""})`}
        </button>
      </div>
    </form>
  );
}

// ── Main Inventory Component ──────────────────────────────────────────────────
export default function InventoryPage() {
  const isStudent = useIsStudent();
  const isStaff = useIsStaff();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [myBorrows, setMyBorrows] = useState<Borrow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  // Tabs:
  // For Staff: "items" | "requests" | "transactions" | "borrow"
  // For Student: "items" | "borrow" | "myborrows"
  const [activeTab, setActiveTab] = useState<"items" | "requests" | "transactions" | "borrow" | "myborrows">("items");

  const [search, setSearch] = useState("");
  const [selectedLab, setSelectedLab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [isScanning, setIsScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<any | null>(null);
  const [borrowSuccess, setBorrowSuccess] = useState<BorrowSuccess | null>(null);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Approve & Handover modal state
  const [approvingRequest, setApprovingRequest] = useState<BorrowRequest | null>(null);
  const [approveError, setApproveError] = useState("");

  // Return & Damage Inspection modal state
  const [returningTx, setReturningTx] = useState<Transaction | null>(null);
  const [returnCondition, setReturnCondition] = useState<"GOOD" | "DAMAGED">("GOOD");
  const [damageNotes, setDamageNotes] = useState("");
  const [returnError, setReturnError] = useState("");

  const fetchItems = useCallback(() => {
    apiFetch("/inventory/items")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, []);

  const fetchLabs = useCallback(() => {
    apiFetch("/labs")
      .then((r) => r.json())
      .then((d) => setLabs(d.labs ?? []));
  }, []);

  const fetchTransactions = useCallback(() => {
    apiFetch("/inventory/transactions")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions ?? []))
      .catch(() => {});
  }, []);

  const fetchBorrowRequests = useCallback(() => {
    apiFetch("/inventory/requests")
      .then((r) => r.json())
      .then((d) => setBorrowRequests(d.requests ?? []))
      .catch(() => {});
  }, []);

  const fetchMyBorrows = useCallback(() => {
    apiFetch("/inventory/my-borrows")
      .then((r) => r.json())
      .then((d) => setMyBorrows(d.borrows ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchItems();
    fetchLabs();
    const user = getUser();
    if (user) setCurrentUserId(user.id);

    if (isStudent) {
      fetchMyBorrows();
      setActiveTab("items");
    } else {
      fetchTransactions();
      fetchBorrowRequests();
      setActiveTab("items");
    }
  }, [isStudent, fetchItems, fetchLabs, fetchTransactions, fetchBorrowRequests, fetchMyBorrows]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
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
    fetchItems();
    if (isStudent) {
      fetchMyBorrows();
    } else {
      fetchTransactions();
      fetchBorrowRequests();
    }
  };

  const handleScan = async (decodedText: string) => {
    setIsScanning(false);
    try {
      const res = await apiFetch(`/inventory/items/barcode/${encodeURIComponent(decodedText)}`);
      if (res.ok) {
        const d = await res.json();
        setScannedItem(d.item);
      } else {
        alert(`Equipment tag not found: ${decodedText}`);
      }
    } catch {
      alert("Barcode lookup failed.");
    }
  };

  // Staff opens modal to approve a pending borrow request
  const openApproveModal = (req: BorrowRequest) => {
    setApprovingRequest(req);
    setApproveError("");
  };

  const handleConfirmApprove = async () => {
    if (!approvingRequest) return;
    setActionLoading(true);
    setApproveError("");
    try {
      const res = await apiFetch(`/inventory/requests/${approvingRequest.id}/approve`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        setApprovingRequest(null);
        fetchBorrowRequests();
        fetchTransactions();
        fetchItems();
      } else {
        setApproveError(data.error || "Failed to approve request.");
      }
    } catch {
      setApproveError("Network communication error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Staff rejects a pending borrow request
  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/inventory/requests/${rejectingId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRejectingId(null);
        setRejectionReason("");
        fetchBorrowRequests();
        fetchTransactions();
      } else {
        alert(data.error || "Failed to reject request.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Staff opens modal to inspect and return equipment
  const openReturnModal = (tx: Transaction) => {
    setReturningTx(tx);
    setReturnCondition("GOOD");
    setDamageNotes("");
    setReturnError("");
  };

  const handleConfirmReturn = async () => {
    if (!returningTx) return;
    if (returnCondition === "DAMAGED" && !damageNotes.trim()) {
      setReturnError("Please describe the damage or defect before proceeding.");
      return;
    }
    setActionLoading(true);
    setReturnError("");
    try {
      const res = await apiFetch("/inventory/return", {
        method: "POST",
        body: JSON.stringify({
          transactionId: returningTx.id,
          hasDamage: returnCondition === "DAMAGED",
          damageNotes: returnCondition === "DAMAGED" ? damageNotes.trim() : null,
        }),
      });
      if (res.ok) {
        setReturningTx(null);
        fetchTransactions();
        fetchItems();
        if (isStudent) fetchMyBorrows();
      } else {
        const d = await res.json();
        setReturnError(d.error || "Failed to process return.");
      }
    } catch {
      setReturnError("Network communication error.");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequestsCount = borrowRequests.length;
  const activeBorrowsCount = transactions.filter((t) => t.status === "BORROWED").length;

  const tabBtn = (id: typeof activeTab, label: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: "9px 18px",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: "0.85rem",
        cursor: "pointer",
        border: "none",
        transition: "all 0.2s",
        background: activeTab === id ? "rgba(37, 99, 235, 0.12)" : "transparent",
        color: activeTab === id ? "#2563eb" : "var(--text-muted)",
        borderBottom: activeTab === id ? "2px solid #2563eb" : "2px solid transparent",
      }}
    >
      {label}
    </button>
  );

  return (
    <AppShell title="Inventory & Equipment Management" subtitle="Track, request, issue, and manage laboratory instruments">
      {borrowSuccess && (
        <BorrowSuccessCard
          result={borrowSuccess}
          onDone={() => {
            setBorrowSuccess(null);
            setActiveTab(isStudent ? "myborrows" : "transactions");
          }}
        />
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border-color)", flexWrap: "wrap" }}>
        {tabBtn("items", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Package size={14} />
            <span>All Equipment</span>
          </span>
        ))}

        {/* Staff Only: Borrow Requests Tab */}
        {!isStudent && tabBtn("requests", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Inbox size={14} />
            <span>Borrow Requests</span>
            {pendingRequestsCount > 0 && (
              <span style={{ background: "#ef4444", color: "#ffffff", borderRadius: 10, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 700 }}>
                {pendingRequestsCount}
              </span>
            )}
          </span>
        ))}

        {/* Staff Only: Active Borrows Tab */}
        {!isStudent && tabBtn("transactions", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ClipboardList size={14} />
            <span>Active Borrows</span>
            {activeBorrowsCount > 0 && (
              <span style={{ background: "#2563eb", color: "#ffffff", borderRadius: 10, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 700 }}>
                {activeBorrowsCount}
              </span>
            )}
          </span>
        ))}

        {/* Dynamic: Student "Request Borrow" vs Staff "Issue Walk-In" */}
        {tabBtn("borrow", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} />
            <span>{isStudent ? "Request Borrow" : "+ Issue Walk-In"}</span>
          </span>
        ))}

        {/* Student Only: My Borrows Tab (Completely hidden for staff) */}
        {isStudent && tabBtn("myborrows", (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <User size={14} />
            <span>My Borrows</span>
          </span>
        ))}
      </div>

      {/* ── 1. ALL EQUIPMENT TAB ── */}
      {activeTab === "items" && (
        <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Top Summary Stat Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Instruments</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-main)", marginTop: 4 }}>{items.length}</div>
            </div>
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Available in Labs</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#059669", marginTop: 4 }}>
                {items.filter((i) => i.status === "AVAILABLE").length}
              </div>
            </div>
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Currently Loaned</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                {items.filter((i) => i.status === "BORROWED").length}
              </div>
            </div>
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Under Maintenance</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#6b7280", marginTop: 4 }}>
                {items.filter((i) => i.status === "MAINTENANCE" || i.status === "OUT_OF_SERVICE").length}
              </div>
            </div>
          </div>

          {/* Filter Bar & Redesigned Barcode Button */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flex: 1 }}>
              <div className="topbar-search" style={{ minWidth: 220, maxWidth: 300, margin: 0 }}>
                <Search size={14} color="#6e96c8" />
                <input
                  type="text"
                  placeholder="Search tag, name, model..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="topbar-search-input"
                />
              </div>

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

            {/* High-Tech Barcode Scanner Button */}
            <div>
              <button
                onClick={() => setIsScanning(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 15px",
                  borderRadius: 9,
                  background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(14,165,233,0.18))",
                  border: "1.5px solid rgba(56,189,248,0.45)",
                  color: "#0284c7",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(56,189,248,0.12)",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 5, background: "rgba(56,189,248,0.2)", color: "#0284c7" }}>
                  <QrCode size={14} />
                </span>
                <span>Scan Barcode</span>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#0284c7", color: "#ffffff", letterSpacing: "0.04em" }}>
                  1D/QR
                </span>
              </button>
            </div>
          </div>

          {/* Items Table */}
          {filteredItems.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-app)", borderRadius: 12, border: "1px dashed var(--border-color)" }}>
              No equipment found matching criteria.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Equipment Name</th>
                    <th>Model / Specs</th>
                    <th>Category</th>
                    <th>Laboratory</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => setScannedItem(item)}>
                      <td style={{ color: "#2563eb", fontWeight: 600, fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {item.elabsTag}
                      </td>
                      <td style={{ color: "var(--text-main)", fontWeight: 500, fontSize: "0.88rem" }}>
                        {item.name}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {item.model || "—"}
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
                          style={{
                            padding: "5px 12px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            borderRadius: 6,
                            border: "1px solid rgba(56, 189, 248, 0.4)",
                            background: "rgba(56, 189, 248, 0.08)",
                            color: "#38bdf8",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Info size={13} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── 2. STAFF ONLY: PENDING BORROW REQUESTS TAB ── */}
      {!isStudent && activeTab === "requests" && (
        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, color: "var(--text-main)" }}>Pending Borrow Requests</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Students who submitted requests must present themselves at the counter for item inspection and hand-over.
              </p>
            </div>
            <button className="secondary-btn" onClick={fetchBorrowRequests} disabled={actionLoading}>
              ↻ Refresh Requests
            </button>
          </div>

          {borrowRequests.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-app)", borderRadius: 12, border: "1px dashed var(--border-color)" }}>
              No pending borrow requests at this time.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {borrowRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "#2563eb", fontWeight: 700, fontFamily: "monospace" }}>#{req.id}</span>
                        <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-main)" }}>{req.borrowerName}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", background: "rgba(37,99,235,0.08)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                          {req.borrowerIndexNo}
                        </span>
                        {req.borrowerGroup && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Group: {req.borrowerGroup}</span>
                        )}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 4 }}>
                        Lab: <strong style={{ color: "var(--text-main)" }}>{req.labName}</strong> &bull; Submitted: {fmt(req.createdAt)}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {usageBadge(req.usageType)}
                      {statusBadge(req.status)}
                    </div>
                  </div>

                  {/* Purpose & Due date */}
                  <div style={{ display: "flex", gap: 24, fontSize: "0.85rem", color: "var(--text-main)", flexWrap: "wrap", background: "var(--bg-card)", padding: "10px 14px", borderRadius: 8 }}>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", display: "block" }}>Purpose:</span>
                      <strong>{req.purpose || "General practical session"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", display: "block" }}>Requested Return Due Date:</span>
                      <strong>{fmt(req.dueAt)}</strong>
                    </div>
                  </div>

                  {/* Items list */}
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                      Requested Equipment ({req.items.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {req.items.map((it) => (
                        <span
                          key={it.elabsTag}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            fontSize: "0.82rem",
                          }}
                        >
                          <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600 }}>{it.elabsTag}</span>
                          <span style={{ color: "var(--text-main)" }}>{it.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                    <button
                      onClick={() => { setRejectingId(req.id); setRejectionReason(""); }}
                      disabled={actionLoading}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 6,
                        border: "1px solid rgba(220,38,38,0.3)",
                        background: "rgba(220,38,38,0.08)",
                        color: "#ef4444",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => openApproveModal(req)}
                      disabled={actionLoading}
                      style={{
                        padding: "7px 18px",
                        borderRadius: 6,
                        border: "none",
                        background: "#059669",
                        color: "#ffffff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <CheckCheck size={14} />
                      <span>Approve & Issue Equipment</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 3. STAFF ONLY: ACTIVE BORROWS TRANSACTIONS TAB ── */}
      {!isStudent && activeTab === "transactions" && (
        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, color: "var(--text-main)" }}>All Borrow Transactions</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Active loans, returned items, and student accountability logs
              </p>
            </div>
            <button className="secondary-btn" onClick={() => { fetchTransactions(); fetchItems(); }}>
              ↻ Refresh
            </button>
          </div>

          {transactions.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-app)", borderRadius: 12, border: "1px dashed var(--border-color)" }}>
              No borrow transactions recorded.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ref #</th>
                    <th>Lab</th>
                    <th>Borrower (Student)</th>
                    <th>Items</th>
                    <th>Usage</th>
                    <th>Purpose</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Issued By (Staff)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const overdue = isOverdue(tx.dueAt, tx.status);
                    const isNew = borrowSuccess?.transactionId === tx.id;
                    const parsedItems = tx.items ?? [];
                    return (
                      <tr key={tx.id} style={{ background: isNew ? "rgba(5,150,105,0.06)" : undefined }}>
                        <td style={{ color: "#2563eb", fontWeight: 600, fontFamily: "monospace" }}>
                          #{tx.id}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>{tx.labName}</td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.88rem" }}>
                              {tx.borrowerName || (tx.borrowerUserId ? `User #${tx.borrowerUserId}` : tx.borrowerGroupCode ?? "—")}
                            </div>
                            {tx.borrowerIndexNo && (
                              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                                {tx.borrowerIndexNo} {tx.borrowerGroup ? `• ${tx.borrowerGroup}` : ""}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 220 }}>
                            {parsedItems.slice(0, 2).map((it) => (
                              <div key={it.elabsTag} style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                <span style={{ fontSize: "0.78rem", color: "#2563eb", fontFamily: "monospace" }}>
                                  {it.elabsTag} ({it.name})
                                </span>
                                {it.conditionIn && it.conditionIn.toLowerCase().includes("damage") && (
                                  <span style={{ fontSize: "0.68rem", color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>
                                    ⚠️ {it.conditionIn}
                                  </span>
                                )}
                              </div>
                            ))}
                            {parsedItems.length > 2 && (
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                +{parsedItems.length - 2} more items
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{usageBadge(tx.usageType)}</td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{tx.purpose || "—"}</td>
                        <td style={{ color: overdue ? "#dc2626" : "var(--text-main)", fontSize: "0.82rem", fontWeight: overdue ? 600 : 400 }}>
                          {fmt(tx.dueAt)}
                          {overdue && <AlertTriangle size={13} style={{ display: "inline-block", marginLeft: 4, color: "#dc2626", verticalAlign: "middle" }} />}
                        </td>
                        <td>{statusBadge(overdue ? "OVERDUE" : tx.status)}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 500 }}>
                          {tx.issuedBy || "—"}
                        </td>
                        <td>
                          {tx.status === "BORROWED" && (
                            <button
                              onClick={() => openReturnModal(tx)}
                              style={{
                                background: "rgba(5,150,105,0.1)",
                                border: "1px solid rgba(5,150,105,0.3)",
                                borderRadius: 6,
                                color: "#059669",
                                padding: "4px 12px",
                                cursor: "pointer",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                              }}
                            >
                              ↩ Return
                            </button>
                          )}
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

      {/* ── 4. BORROW TAB: Student Request vs Staff Walk-In ── */}
      {activeTab === "borrow" && (
        <section className="panel">
          {isStudent ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 4px", color: "var(--text-main)" }}>Request Equipment Borrow</h3>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Select the lab, specify whether items remain in the lab or are taken outside, and submit your request for technician review.
                </p>
              </div>
              {labs.length > 0 && <StudentBorrowRequestForm labs={labs} onSuccess={handleBorrowSuccess} />}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 4px", color: "var(--text-main)" }}>Walk-In Equipment Issuing</h3>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Issue laboratory items directly to a student at the counter. Enter student registration number to verify their profile.
                </p>
              </div>
              {labs.length > 0 && <StaffWalkInIssueForm labs={labs} onSuccess={handleBorrowSuccess} />}
            </>
          )}
        </section>
      )}

      {/* ── 5. STUDENT ONLY: MY BORROWS TAB (Completely hidden for staff) ── */}
      {isStudent && activeTab === "myborrows" && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, color: "var(--text-main)" }}>My Borrow Requests & History</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Track pending requests, active loans, and return status
              </p>
            </div>
            <button className="secondary-btn" onClick={fetchMyBorrows}>↻ Refresh</button>
          </div>

          {myBorrows.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)", color: "var(--text-muted)" }}>
              You have no active borrow requests or history.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {myBorrows.map((borrow) => {
                const overdue = isOverdue(borrow.dueAt, borrow.status);
                const parsedItems: BorrowItem[] = typeof borrow.items === "string" ? JSON.parse(borrow.items) : (borrow.items ?? []);
                return (
                  <div key={borrow.id} style={{ background: "var(--bg-card)", border: `1px solid ${overdue ? "rgba(220,38,38,0.3)" : "var(--border-color)"}`, borderRadius: 12, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <span style={{ color: "#2563eb", fontWeight: 700, fontFamily: "monospace" }}>#{borrow.id}</span>
                        <span style={{ color: "var(--text-main)", fontWeight: 600, marginLeft: 10 }}>{borrow.labName}</span>
                        {borrow.purpose && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: 10 }}>&bull; {borrow.purpose}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {usageBadge(borrow.usageType)}
                        {statusBadge(overdue ? "OVERDUE" : borrow.status)}
                      </div>
                    </div>

                    {borrow.rejectionReason && (
                      <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#ef4444", fontSize: "0.82rem", marginBottom: 12 }}>
                        <strong>Rejection Reason:</strong> {borrow.rejectionReason}
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      {parsedItems.map((item) => (
                        <span
                          key={item.elabsTag}
                          onClick={() => setScannedItem(item)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: "var(--bg-app)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            transition: "border-color 0.15s",
                          }}
                          title="Click to view equipment specifications and photo"
                        >
                          <Check size={12} color="#059669" />
                          <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600 }}>{item.elabsTag}</span>
                          <span style={{ color: "var(--text-main)" }}>{item.name}</span>
                        </span>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 20, fontSize: "0.82rem", color: "var(--text-muted)", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={12} /> Requested: {fmt(borrow.createdAt)}
                      </span>
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
                      <span>Issued By: <strong style={{ color: "var(--text-main)" }}>{borrow.issuedByName || "Pending Technician Authorization"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Staff Rejection Reason Modal */}
      {rejectingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 8px", color: "var(--text-main)" }}>Reject Borrow Request #{rejectingId}</h3>
            <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Please state why this request cannot be fulfilled so the student is notified.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Instrument reserved for afternoon laboratory exam / Outside loan not permitted"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 12px", color: "var(--text-main)", fontSize: "0.88rem", resize: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setRejectingId(null)}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#dc2626", color: "#ffffff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
              >
                {actionLoading ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Handover & Approve Modal */}
      {approvingRequest && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(5px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24, maxWidth: 520, width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.35)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                <CheckCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.1rem" }}>Hand Over & Issue Equipment</h3>
                <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Borrow Request <strong style={{ color: "#2563eb", fontFamily: "monospace" }}>#{approvingRequest.id}</strong> &bull; {approvingRequest.labName}
                </p>
              </div>
            </div>

            {approveError && (
              <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <AlertCircle size={16} />
                <span>{approveError}</span>
              </div>
            )}

            {/* Borrower Details Card */}
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.92rem" }}>{approvingRequest.borrowerName}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginLeft: 8, background: "rgba(37,99,235,0.08)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                    {approvingRequest.borrowerIndexNo}
                  </span>
                </div>
                {usageBadge(approvingRequest.usageType)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                {approvingRequest.purpose && <div><strong>Purpose:</strong> {approvingRequest.purpose}</div>}
                {approvingRequest.dueAt && <div><strong>Return Due:</strong> {fmt(approvingRequest.dueAt)}</div>}
              </div>
            </div>

            {/* Equipment Items */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                Items to Hand Over ({approvingRequest.items.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                {approvingRequest.items.map((it) => (
                  <div key={it.elabsTag} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "8px 12px", fontSize: "0.84rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600 }}>{it.elabsTag}</span>
                      <span style={{ color: "var(--text-main)" }}>{it.name}</span>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>{it.model || it.category}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: "0.8rem", color: "var(--text-main)", marginBottom: 18, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Info size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Please verify the student&apos;s physical presence at the counter and ensure the items listed above are handed over in good working order.</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setApprovingRequest(null)}
                disabled={actionLoading}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={actionLoading}
                style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#059669", color: "#ffffff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
              >
                <CheckCheck size={15} />
                <span>{actionLoading ? "Issuing…" : "Confirm Handover & Issue"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Return & Damage Inspection Modal */}
      {returningTx && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(5px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24, maxWidth: 520, width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.35)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: returnCondition === "DAMAGED" ? "rgba(220,38,38,0.12)" : "rgba(5,150,105,0.12)", border: `1px solid ${returnCondition === "DAMAGED" ? "rgba(220,38,38,0.3)" : "rgba(5,150,105,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: returnCondition === "DAMAGED" ? "#ef4444" : "#059669", transition: "all 0.2s" }}>
                {returnCondition === "DAMAGED" ? <ShieldAlert size={22} /> : <CheckCircle2 size={22} />}
              </div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.1rem" }}>Return & Equipment Inspection</h3>
                <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Transaction <strong style={{ color: "#2563eb", fontFamily: "monospace" }}>#{returningTx.id}</strong> &bull; {returningTx.labName}
                </p>
              </div>
            </div>

            {returnError && (
              <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <AlertCircle size={16} />
                <span>{returnError}</span>
              </div>
            )}

            {/* Borrower & Loan Info */}
            <div style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.88rem" }}>
                  {returningTx.borrowerName || (returningTx.borrowerUserId ? `User #${returningTx.borrowerUserId}` : returningTx.borrowerGroupCode ?? "—")}
                </div>
                {returningTx.borrowerIndexNo && (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    Reg: {returningTx.borrowerIndexNo} {returningTx.borrowerGroup ? `• ${returningTx.borrowerGroup}` : ""}
                  </div>
                )}
              </div>
              {usageBadge(returningTx.usageType)}
            </div>

            {/* Returning Items */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Returning Items ({(returningTx.items ?? []).length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                {(returningTx.items ?? []).map((it) => (
                  <div key={it.elabsTag} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 12px", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#2563eb", fontFamily: "monospace", fontWeight: 600 }}>{it.elabsTag}</span>
                      <span style={{ color: "var(--text-main)" }}>{it.name}</span>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{it.model || it.category}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Condition Selection */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Equipment Inspection Status *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div
                  onClick={() => setReturnCondition("GOOD")}
                  style={{
                    border: `1.5px solid ${returnCondition === "GOOD" ? "#059669" : "var(--border-color)"}`,
                    background: returnCondition === "GOOD" ? "rgba(5, 150, 105, 0.08)" : "var(--bg-app)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: returnCondition === "GOOD" ? "#059669" : "var(--text-main)", fontSize: "0.86rem" }}>
                    <CheckCircle2 size={16} />
                    <span>Good / Undamaged</span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Intact & working. Returns item to Available status.
                  </div>
                </div>

                <div
                  onClick={() => setReturnCondition("DAMAGED")}
                  style={{
                    border: `1.5px solid ${returnCondition === "DAMAGED" ? "#ef4444" : "var(--border-color)"}`,
                    background: returnCondition === "DAMAGED" ? "rgba(220, 38, 38, 0.08)" : "var(--bg-app)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: returnCondition === "DAMAGED" ? "#ef4444" : "var(--text-main)", fontSize: "0.86rem" }}>
                    <AlertTriangle size={16} />
                    <span>Damaged / Defect</span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Broken, burnt, or defective. Flags for Maintenance.
                  </div>
                </div>
              </div>
            </div>

            {/* If damaged, require damage notes */}
            {returnCondition === "DAMAGED" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#ef4444", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Describe Damage / Defect Details *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Broken display glass, channel 2 probe missing, component burned during test"
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 8, padding: "10px 12px", color: "var(--text-main)", fontSize: "0.88rem", resize: "none" }}
                />
                <div style={{ marginTop: 6, fontSize: "0.75rem", color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={13} />
                  <span>The returned item(s) will be automatically moved to <strong>MAINTENANCE</strong> status with these defect notes logged.</span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setReturningTx(null)}
                disabled={actionLoading}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={actionLoading}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: returnCondition === "DAMAGED" ? "#dc2626" : "#059669",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {returnCondition === "DAMAGED" ? (
                  <>
                    <ShieldAlert size={15} />
                    <span>{actionLoading ? "Processing…" : "Record Damage & Mark Returned"}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>{actionLoading ? "Processing…" : "Confirm Return (Good Condition)"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isScanning && <BarcodeScanner onScan={handleScan} onClose={() => setIsScanning(false)} />}

      {/* Item Details Modal */}
      {scannedItem && (
        <ItemDetailsModal
          item={scannedItem}
          onClose={() => setScannedItem(null)}
          onItemUpdated={(updated) => {
            setScannedItem(updated);
            setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)));
          }}
        />
      )}
    </AppShell>
  );
}
