"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  MessageSquarePlus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Filter,
  Search,
  Sparkles,
  Building,
  Wrench,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
  FileText,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  MessageCircle,
} from "lucide-react";

type FeedbackTicket = {
  id: number;
  ticket_no: string;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  user_reg_no: string | null;
  lab_id: number | null;
  lab_name: string | null;
  category: "EQUIPMENT_ISSUE" | "LAB_ENVIRONMENT" | "SAFETY_HAZARD" | "STAFF_SUPPORT" | "GENERAL_SUGGESTION";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  subject: string;
  description: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";
  staff_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
};

type FeedbackStats = {
  total: number;
  submitted: number;
  under_review: number;
  resolved: number;
  urgent: number;
};

const LAB_OPTIONS = [
  { id: 1, name: "Power Systems and High Voltage Laboratory" },
  { id: 2, name: "Electric Machines and Power Electronics Laboratory" },
  { id: 3, name: "Electronics and Measurement Laboratory" },
  { id: 4, name: "Communication and Systems Engineering Laboratory" },
  { id: 5, name: "Information Engineering and Cisco Network Center" },
  { id: 6, name: "24 × 7 Undergraduate Development Project Laboratory" },
];

const CATEGORIES = [
  { key: "EQUIPMENT_ISSUE", label: "Equipment Malfunction", icon: Wrench, color: "#f59e0b" },
  { key: "LAB_ENVIRONMENT", label: "Lab Environment (AC / Lighting / Power)", icon: Building, color: "#3b82f6" },
  { key: "SAFETY_HAZARD", label: "Safety / Hazard Concern", icon: ShieldAlert, color: "#ef4444" },
  { key: "STAFF_SUPPORT", label: "Technical Officer Assistance", icon: HelpCircle, color: "#8b5cf6" },
  { key: "GENERAL_SUGGESTION", label: "General Improvement Suggestion", icon: Lightbulb, color: "#10b981" },
] as const;

export default function FeedbackPage() {
  const { me } = useAuth();
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Form State
  const [formLabId, setFormLabId] = useState<number | "">(3);
  const [formCategory, setFormCategory] = useState<FeedbackTicket["category"]>("EQUIPMENT_ISSUE");
  const [formPriority, setFormPriority] = useState<FeedbackTicket["priority"]>("MEDIUM");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Resolution State (Staff)
  const [resStatus, setResStatus] = useState<FeedbackTicket["status"]>("RESOLVED");
  const [resNote, setResNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isStaff = useMemo(() => {
    return me?.roles?.some((r) =>
      ["SYSTEM_ADMIN", "LECTURER", "TECHNICIAN", "MODULE_COORDINATOR"].includes(r)
    ) ?? false;
  }, [me]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/feedback");
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
      const statsRes = await apiFetch("/feedback/stats");
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }
    } catch (err) {
      console.error("Failed to load feedback tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (formSubject.trim().length < 4) {
      setFormError("Please provide a concise subject (minimum 4 characters).");
      return;
    }
    if (formDescription.trim().length < 10) {
      setFormError("Please provide a detailed description (minimum 10 characters).");
      return;
    }

    try {
      setSubmitting(true);
      const selectedLab = LAB_OPTIONS.find((l) => l.id === Number(formLabId));
      const payload = {
        labId: formLabId ? Number(formLabId) : null,
        labName: selectedLab?.name || "General Department Facility",
        category: formCategory,
        priority: formPriority,
        subject: formSubject.trim(),
        description: formDescription.trim(),
      };

      const res = await apiFetch("/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit feedback.");
      }

      setFormSuccess("Your ticket has been submitted. The technical team will inspect it shortly.");
      setFormSubject("");
      setFormDescription("");
      setTimeout(() => {
        setShowSubmitModal(false);
        setFormSuccess(null);
      }, 1500);

      await fetchTickets();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number) => {
    try {
      setUpdatingStatus(true);
      const res = await apiFetch(`/feedback/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: resStatus,
          staffResponse: resNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Failed to update ticket.");
        return;
      }

      await fetchTickets();
      setSelectedTicket(null);
      setResNote("");
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        search === "" ||
        t.ticket_no.toLowerCase().includes(search.toLowerCase()) ||
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        (t.lab_name && t.lab_name.toLowerCase().includes(search.toLowerCase())) ||
        (t.user_name && t.user_name.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchCat = categoryFilter === "ALL" || t.category === categoryFilter;

      return matchSearch && matchStatus && matchCat;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  const getPriorityBadge = (p: FeedbackTicket["priority"]) => {
    switch (p) {
      case "URGENT":
        return <span style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: "0.74rem", fontWeight: 700 }}>🚨 URGENT</span>;
      case "HIGH":
        return <span style={{ background: "rgba(249, 115, 22, 0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: "0.74rem", fontWeight: 600 }}>HIGH</span>;
      case "MEDIUM":
        return <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: "0.74rem", fontWeight: 500 }}>MEDIUM</span>;
      case "LOW":
        return <span style={{ background: "rgba(107, 114, 128, 0.15)", color: "#9ca3af", border: "1px solid rgba(107,114,128,0.3)", padding: "2px 8px", borderRadius: 4, fontSize: "0.74rem" }}>LOW</span>;
    }
  };

  const getStatusBadge = (s: FeedbackTicket["status"]) => {
    switch (s) {
      case "SUBMITTED":
        return <span style={{ background: "rgba(234, 179, 8, 0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)", padding: "3px 9px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Clock size={12} /> Logged</span>;
      case "UNDER_REVIEW":
        return <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#38bdf8", border: "1px solid rgba(59,130,246,0.3)", padding: "3px 9px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Wrench size={12} /> Under Review</span>;
      case "RESOLVED":
        return <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)", padding: "3px 9px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={12} /> Resolved</span>;
      case "CLOSED":
        return <span style={{ background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.3)", padding: "3px 9px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 500 }}>Closed</span>;
    }
  };

  return (
    <AppShell title="Student Helpdesk & Feedback Portal">
      {/* ── TOP HEADER / STATS ── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
            <MessageCircle style={{ color: "#38bdf8" }} /> Student Complaints & Lab Helpdesk
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "4px 0 0" }}>
            Submit equipment issues, facility concerns, and academic laboratory feedback directly to DEIE Technical Officers.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          style={{
            background: "linear-gradient(135deg, #0284c7, #2563eb)",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
            transition: "all 0.15s ease",
          }}
        >
          <MessageSquarePlus size={18} />
          <span>Report Issue / Submit Feedback</span>
        </button>
      </div>

      {/* ── METRIC CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Total Inquiries</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-main)", marginTop: 4 }}>{stats?.total ?? tickets.length}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>Logged across all 6 DEIE labs</div>
        </div>

        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "#eab308", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Pending Review</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#eab308", marginTop: 4 }}>
            {stats ? Number(stats.submitted) + Number(stats.under_review) : 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>Awaiting or in active resolution</div>
        </div>

        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Successfully Resolved</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#34d399", marginTop: 4 }}>{stats?.resolved ?? 0}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>Repaired or addressed by staff</div>
        </div>

        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: "0.78rem", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Urgent Hazards</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#ef4444", marginTop: 4 }}>{stats?.urgent ?? 0}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>Immediate priority items</div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="panel" style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <div style={{ flex: "1 1 240px", position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by ticket #, equipment, student or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: 8,
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Logged</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="EQUIPMENT_ISSUE">Equipment Malfunction</option>
              <option value="LAB_ENVIRONMENT">Lab Environment</option>
              <option value="SAFETY_HAZARD">Safety / Hazard</option>
              <option value="STAFF_SUPPORT">Staff Assistance</option>
              <option value="GENERAL_SUGGESTION">General Suggestion</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TICKETS LIST ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
          Loading feedback tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <FileText size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <h3 style={{ margin: "0 0 6px", color: "var(--text-main)", fontSize: "1rem" }}>No tickets found</h3>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            {search || statusFilter !== "ALL" || categoryFilter !== "ALL"
              ? "No feedback matched your filter options."
              : "No feedback or complaint tickets logged yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredTickets.map((ticket) => {
            const cat = CATEGORIES.find((c) => c.key === ticket.category) || CATEGORIES[0];
            const IconComponent = cat.icon;

            return (
              <div
                key={ticket.id}
                className="panel"
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  borderLeft: `4px solid ${cat.color}`,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8", fontSize: "0.85rem", background: "rgba(56,189,248,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                      {ticket.ticket_no}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: cat.color, fontWeight: 600 }}>
                      <IconComponent size={14} />
                      {cat.label}
                    </span>
                    {getPriorityBadge(ticket.priority)}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {getStatusBadge(ticket.status)}
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 600, color: "var(--text-main)" }}>
                    {ticket.subject}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineClamp: 2, WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {ticket.description}
                  </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Building size={13} /> {ticket.lab_name || "General Department"}
                    </span>
                    {ticket.user_name && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <User size={13} /> {ticket.user_name} {ticket.user_reg_no ? `(${ticket.user_reg_no})` : ""}
                      </span>
                    )}
                  </div>

                  {ticket.staff_response && (
                    <div style={{ color: "#34d399", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <CheckCircle2 size={13} /> Response Provided by {ticket.responded_by || "TO"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SUBMIT NEW TICKET MODAL ── */}
      {showSubmitModal && (
        <div className="modal-backdrop" onClick={() => setShowSubmitModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquarePlus style={{ color: "#38bdf8" }} />
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Submit Complaint or Facility Feedback
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", marginBottom: 14 }}>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", marginBottom: 14 }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Department Laboratory
                </label>
                <select
                  value={formLabId}
                  onChange={(e) => setFormLabId(e.target.value ? Number(e.target.value) : "")}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "0.85rem" }}
                >
                  <option value="">General Facility / Common Area</option>
                  {LAB_OPTIONS.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "0.85rem" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Urgency / Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "0.85rem" }}
                  >
                    <option value="LOW">Low (General suggestion/Question)</option>
                    <option value="MEDIUM">Medium (Standard equipment issue)</option>
                    <option value="HIGH">High (Impacts ongoing practicals)</option>
                    <option value="URGENT">Urgent (Safety risk / Sparking / Leak)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Brief Subject / Problem Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bench 3 Digital Multimeter display flickering"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "0.85rem" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Detailed Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide precise details: bench number, equipment tag if known, error messages, or exact hazard observed..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "0.85rem", resize: "vertical" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-main)", padding: "9px 16px", borderRadius: 8, fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    color: "#ffffff",
                    padding: "9px 20px",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Send size={15} />
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW / RESOLVE TICKET MODAL ── */}
      {selectedTicket && (
        <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8", fontSize: "0.9rem" }}>
                    {selectedTicket.ticket_no}
                  </span>
                  {getPriorityBadge(selectedTicket.priority)}
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {selectedTicket.subject}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Metadata strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "var(--bg-app)", padding: 12, borderRadius: 8, fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Laboratory:</span>
                  <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{selectedTicket.lab_name || "General Facility"}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Submitted By:</span>
                  <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                    {selectedTicket.user_name || "Student"} {selectedTicket.user_reg_no ? `• ${selectedTicket.user_reg_no}` : ""}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                  Issue Description
                </label>
                <div style={{ background: "var(--bg-app)", padding: 14, borderRadius: 8, color: "var(--text-main)", fontSize: "0.88rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {selectedTicket.description}
                </div>
              </div>

              {/* Staff Response (if any) */}
              {selectedTicket.staff_response && (
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16,185,129,0.25)", padding: 14, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: "#34d399", fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5 }}>
                      <CheckCircle2 size={15} /> Technical Officer Action Note
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {selectedTicket.responded_at ? new Date(selectedTicket.responded_at).toLocaleString() : ""}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-main)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                    {selectedTicket.staff_response}
                  </div>
                  {selectedTicket.responded_by && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6, textAlign: "right" }}>
                      — Resolved by {selectedTicket.responded_by}
                    </div>
                  )}
                </div>
              )}

              {/* Staff Resolution Form (Only visible to Technical Officers / Lecturers / Admins) */}
              {isStaff && (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14, marginTop: 4 }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-main)", marginBottom: 8 }}>
                    Update Ticket Status & Log Staff Action Note
                  </label>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <select
                      value={resStatus}
                      onChange={(e) => setResStatus(e.target.value as any)}
                      style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "0.85rem" }}
                    >
                      <option value="UNDER_REVIEW">Mark: Under Review (Inspection in progress)</option>
                      <option value="RESOLVED">Mark: Resolved (Repaired / Handled)</option>
                      <option value="CLOSED">Mark: Closed (No further action)</option>
                    </select>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Describe maintenance action taken, spare parts swapped, or instructions for the student..."
                    value={resNote}
                    onChange={(e) => setResNote(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontSize: "0.85rem", marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(selectedTicket.id)}
                      style={{
                        background: "#059669",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 18px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: updatingStatus ? "not-allowed" : "pointer",
                      }}
                    >
                      {updatingStatus ? "Saving..." : "Save Resolution & Update"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
