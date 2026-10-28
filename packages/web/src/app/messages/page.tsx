"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useSocket } from "@/hooks/useSocket";
import {
  Mail,
  Globe,
  Users,
  User,
  AlertTriangle,
  Clock,
  Send,
  Inbox,
  Check,
  MailOpen,
  CornerUpLeft,
  MessageSquare,
  X,
  Search,
} from "lucide-react";
import { apiFetch, getAccessToken } from "@/lib/api";
import { getUser } from "@/lib/auth";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Message {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  senderId?: number;
  recipientName?: string;
  targetType: "ALL" | "GROUP" | "USER";
  targetGroup?: string;
  targetUser?: number;
  recipientCount?: number;
  readCount?: number;
  createdAt: string;
  isRead: boolean;
}

interface Contact {
  id: number;
  fullName: string;
  email: string;
  role: string;
  regNumber?: string;
  groupCode?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  SYSTEM_ADMIN:       { label: "Admin",       color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  MODULE_COORDINATOR: { label: "Coordinator", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  LECTURER:           { label: "Lecturer",    color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
  TECHNICIAN:         { label: "Technician",  color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  STUDENT:            { label: "Student",     color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" },
};

const DEFAULT_DEPARTMENT_MESSAGES: Message[] = [
  {
    id: 9001,
    subject: "Welcome to Department Laboratories & ELABS Portal",
    senderName: "Faculty Administrator",
    senderId: 1,
    targetType: "ALL",
    body: `Welcome to the Department of Electrical and Information Engineering Laboratories management portal.

This messaging facility connects all undergraduate students, module coordinators, lecturers, and laboratory technical officers. You can:
• Receive laboratory announcements and timetable updates
• Communicate with lab technicians regarding equipment calibration, workstation assignments, and borrowing requests
• Inquire about practical pre-requisites and safety protocols

For any urgent laboratory access issues, please contact the respective lab technician or the department office.`,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isRead: true,
  },
  {
    id: 9002,
    subject: "High Voltage Lab Safety Protocols & PPE Requirements",
    senderName: "Lab Technician",
    senderId: 4,
    targetType: "ALL",
    body: `Notice to all students attending practicals in the Power Systems and High Voltage Laboratory:

1. Covered shoes and safety laboratory coats are compulsory at all times inside the test bays.
2. Under no circumstance should any student energize an impulse generator or high-voltage test transformer without instructor supervision.
3. Discharge earth rods must be verified before inspecting sphere gap voltmeters.

Please review the laboratory safety manual before your scheduled practical.`,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    isRead: true,
  },
  {
    id: 9003,
    subject: "Electronics Lab: Workstation Calibration & Kit Reservations",
    senderName: "Dr. EIE Lecturer",
    senderId: 2,
    targetType: "ALL",
    body: `The Tektronix digital storage oscilloscopes and arbitrary function generators in the Electronics & Measurement Laboratory have completed periodic calibration.

If your project group requires FPGA boards or specialized sensor kits for upcoming practicals, please submit a reservation request through the Inventory tab at least 24 hours in advance.`,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    isRead: true,
  },
];

// ─── Compose Modal ──────────────────────────────────────────────────────────
interface ComposeModalProps {
  isStaff: boolean;
  contacts: Contact[];
  groups: string[];
  onClose: () => void;
  onSent: () => void;
  initialRecipient?: Contact | null;
  initialSubject?: string;
}

function ComposeModal({
  isStaff,
  contacts,
  groups,
  onClose,
  onSent,
  initialRecipient,
  initialSubject,
}: ComposeModalProps) {
  const [subject, setSubject] = useState(initialSubject || "");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"ALL" | "GROUP" | "USER">(
    initialRecipient ? "USER" : isStaff ? "GROUP" : "USER"
  );
  const [targetGroup, setTargetGroup] = useState(groups[0] || "");
  const [targetUser, setTargetUser] = useState<number | "">(initialRecipient ? initialRecipient.id : "");
  const [contactSearch, setContactSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const term = contactSearch.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.regNumber ?? "").toLowerCase().includes(term) ||
      (c.role ?? "").toLowerCase().includes(term)
    );
  });

  const selectedContact = contacts.find((c) => c.id === targetUser) || initialRecipient;

  const send = async () => {
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (!body.trim()) {
      setError("Message content cannot be empty");
      return;
    }
    if (targetType === "USER" && !targetUser) {
      setError("Please select a recipient");
      return;
    }
    if (targetType === "GROUP" && !targetGroup) {
      setError("Please select a target group");
      return;
    }

    setSending(true);
    setError("");

    try {
      const payload: Record<string, unknown> = { subject, body, targetType };
      if (targetType === "GROUP") payload.targetGroup = targetGroup;
      if (targetType === "USER") payload.targetUser = targetUser;

      const r = await apiFetch("/messages/send", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        onSent();
        onClose();
      } else {
        const err = await r.json().catch(() => ({}));
        setError(err.error || "Failed to send message. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: 16,
          width: "min(640px, 95vw)",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "var(--text-main)",
                fontSize: "1.05rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Mail size={18} color="#2563eb" />
              <span>{initialRecipient ? "Reply to Message" : "New Message"}</span>
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {isStaff
                ? "Broadcast to students, groups, or send a direct message"
                : "Send a direct message to lecturers, technical staff, or administrators"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Audience Selection — Staff only */}
          {isStaff && (
            <div>
              <label
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 8,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Audience
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["ALL", "GROUP", "USER"] as const).map((t) => {
                  const active = targetType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTargetType(t)}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        background: active ? "rgba(37, 99, 235, 0.12)" : "var(--bg-app)",
                        border: `1px solid ${active ? "#2563eb" : "var(--border-color)"}`,
                        color: active ? "#2563eb" : "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {t === "ALL" && <Globe size={14} />}
                      {t === "GROUP" && <Users size={14} />}
                      {t === "USER" && <User size={14} />}
                      <span>{t === "ALL" ? "All Department" : t === "GROUP" ? "Lab Group" : "Direct User"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group Picker */}
          {targetType === "GROUP" && isStaff && (
            <div>
              <label
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 8,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Target Lab Group
              </label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  color: "var(--text-main)",
                  padding: "10px 14px",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              >
                <option value="">— Select student group —</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient Picker — Direct Message */}
          {targetType === "USER" && (
            <div>
              <label
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 8,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Recipient
              </label>

              {selectedContact ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(37, 99, 235, 0.08)",
                    border: "1px solid rgba(37, 99, 235, 0.25)",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "#fff",
                      fontSize: "0.88rem",
                      flexShrink: 0,
                    }}
                  >
                    {selectedContact.fullName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--text-main)",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedContact.fullName}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {selectedContact.email}
                    </div>
                  </div>
                  <span
                    style={{
                      background: ROLE_BADGE[selectedContact.role]?.bg || "rgba(0,0,0,0.06)",
                      color: ROLE_BADGE[selectedContact.role]?.color || "var(--text-muted)",
                      borderRadius: 20,
                      padding: "2px 10px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                    }}
                  >
                    {ROLE_BADGE[selectedContact.role]?.label ?? selectedContact.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUser("");
                      setContactSearch("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Search
                      size={16}
                      color="var(--text-muted)"
                      style={{ position: "absolute", left: 12, pointerEvents: "none" }}
                    />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search recipient by name, email, or role…"
                      style={{
                        width: "100%",
                        background: "var(--bg-app)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 8,
                        color: "var(--text-main)",
                        padding: "10px 14px 10px 36px",
                        fontSize: "0.88rem",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 10,
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    {filteredContacts.length === 0 ? (
                      <div
                        style={{
                          padding: "16px",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                          textAlign: "center",
                        }}
                      >
                        No matching contacts found
                      </div>
                    ) : (
                      filteredContacts.slice(0, 30).map((c) => {
                        const rb = ROLE_BADGE[c.role] ?? {
                          label: c.role,
                          color: "var(--text-muted)",
                          bg: "rgba(0,0,0,0.06)",
                        };
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setTargetUser(c.id);
                              setContactSearch("");
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border-color)",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37, 99, 235, 0.08)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: rb.bg,
                                border: `1px solid ${rb.color}40`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                color: rb.color,
                                fontSize: "0.82rem",
                                flexShrink: 0,
                              }}
                            >
                              {c.fullName.charAt(0)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  color: "var(--text-main)",
                                  fontWeight: 600,
                                  fontSize: "0.86rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.fullName}
                              </div>
                              <div style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}>
                                {c.regNumber ? `${c.regNumber} · ${c.email}` : c.email}
                              </div>
                            </div>
                            <span
                              style={{
                                background: rb.bg,
                                color: rb.color,
                                borderRadius: 16,
                                padding: "2px 8px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {rb.label}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <label
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                fontWeight: 700,
                display: "block",
                marginBottom: 8,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Schedule clarification for High Voltage Lab practical"
              style={{
                width: "100%",
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-main)",
                padding: "10px 14px",
                fontSize: "0.88rem",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* Body */}
          <div>
            <label
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                fontWeight: 700,
                display: "block",
                marginBottom: 8,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Message Content
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here…"
              rows={6}
              style={{
                width: "100%",
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-main)",
                padding: "10px 14px",
                fontSize: "0.88rem",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
                lineHeight: 1.6,
                outline: "none",
              }}
            />
          </div>

          {/* Error Notice */}
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#ef4444",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-muted)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending}
              style={{
                padding: "10px 24px",
                background: "#2563eb",
                border: "none",
                borderRadius: 8,
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.75 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
              }}
            >
              {sending ? (
                <>
                  <Clock size={15} />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Messages Page ─────────────────────────────────────────────────────
export default function MessagesPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Data state
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [activeMsg, setActiveMsg] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Contact | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<string[]>([]);

  // Toast feedback
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  const isStaff =
    user?.roles?.some((r: string) => ["SYSTEM_ADMIN", "MODULE_COORDINATOR", "LECTURER"].includes(r)) ?? false;

  const { on } = useSocket(token);

  // Load inbox (stable callback with empty dependencies)
  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/messages/inbox");
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = data.messages ?? [];
        if (msgs.length > 0) {
          setInbox(msgs);
          const count = typeof data.unreadCount === "number" ? data.unreadCount : msgs.filter((m) => !m.isRead).length;
          setUnread(count);
          window.dispatchEvent(new CustomEvent("elabs:messages-updated", { detail: { unreadCount: count } }));
        } else {
          setInbox(DEFAULT_DEPARTMENT_MESSAGES);
          setUnread(0);
          window.dispatchEvent(new CustomEvent("elabs:messages-updated", { detail: { unreadCount: 0 } }));
        }
      } else {
        setInbox(DEFAULT_DEPARTMENT_MESSAGES);
        setUnread(0);
        window.dispatchEvent(new CustomEvent("elabs:messages-updated", { detail: { unreadCount: 0 } }));
      }
    } catch {
      setInbox(DEFAULT_DEPARTMENT_MESSAGES);
      setUnread(0);
      window.dispatchEvent(new CustomEvent("elabs:messages-updated", { detail: { unreadCount: 0 } }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load sent messages (stable callback with empty dependencies)
  const loadSent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/messages/sent");
      if (res.ok) {
        const data = await res.json();
        setSent(data.messages ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const t = getAccessToken();
    setToken(t);
    const u = getUser();
    setUser(u);
    setMounted(true);
  }, []);

  // Contacts and groups initial load
  useEffect(() => {
    if (!mounted) return;

    // Fetch contacts
    apiFetch("/messages/contacts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.contacts?.length > 0) {
          setContacts(d.contacts);
        } else {
          setContacts([
            { id: 1, fullName: "Faculty Administrator", email: "admin@elabs.eng.ruh.ac.lk", role: "SYSTEM_ADMIN" },
            { id: 2, fullName: "Dr. EIE Lecturer", email: "lecturer@elabs.eng.ruh.ac.lk", role: "LECTURER" },
            { id: 4, fullName: "Lab Technical Officer", email: "tech@elabs.eng.ruh.ac.lk", role: "TECHNICIAN" },
          ]);
        }
      })
      .catch(() => {});

    // Fetch groups
    apiFetch("/messages/groups")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.groups?.length > 0) {
          setGroups(d.groups);
        } else {
          setGroups(["Group 01", "Group 02", "Group 03", "Group 04", "Group 05"]);
        }
      })
      .catch(() => {});
  }, [mounted]);

  // Tab change & data fetching
  useEffect(() => {
    if (!mounted) return;
    if (tab === "sent") {
      loadSent();
    } else {
      loadInbox();
    }
  }, [tab, mounted, loadInbox, loadSent]);

  // Auto-select first message when list changes and no message is selected
  useEffect(() => {
    const currentList = tab === "sent" ? sent : inbox;
    if (currentList.length > 0 && !activeMsg) {
      setActiveMsg(currentList[0]);
    }
  }, [tab, inbox, sent, activeMsg]);

  // Real-time socket listener
  useEffect(() => {
    const off = on("new_message", (msg: Message) => {
      setInbox((prev) => [msg, ...prev]);
      setUnread((prev) => {
        const next = prev + 1;
        window.dispatchEvent(new CustomEvent("elabs:messages-updated", { detail: { unreadCount: next } }));
        return next;
      });
      showToast(`New message: ${msg.subject}`, true);
    });
    return () => {
      off();
    };
  }, [on]);

  // Listen for updates from other components
  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ unreadCount?: number }>;
      if (typeof custom.detail?.unreadCount === "number") {
        setUnread(custom.detail.unreadCount);
      }
    };
    window.addEventListener("elabs:messages-updated", handleUpdated);
    return () => window.removeEventListener("elabs:messages-updated", handleUpdated);
  }, []);

  const handleSelectMessage = (msg: Message) => {
    setActiveMsg(msg);
    if (tab === "inbox" && !msg.isRead) {
      if (msg.id < 9000) {
        apiFetch(`/messages/${msg.id}/read`, { method: "PATCH" }).catch(() => {});
      }
      setInbox((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)));
      setUnread((prev) => {
        const next = Math.max(0, prev - 1);
        window.dispatchEvent(new CustomEvent("elabs:messages-updated", { detail: { unreadCount: next } }));
        return next;
      });
    }
  };

  const handleTabChange = (newTab: "inbox" | "sent") => {
    if (tab === newTab) return;
    setTab(newTab);
    setActiveMsg(null);
  };

  const markAllRead = async () => {
    apiFetch("/messages/mark-all-read", { method: "PATCH" }).catch(() => {});
    setInbox((prev) => prev.map((m) => ({ ...m, isRead: true })));
    setUnread(0);
    window.dispatchEvent(new CustomEvent("elabs:messages-updated", { detail: { unreadCount: 0 } }));
  };

  const handleSent = () => {
    showToast("Message sent successfully!", true);
    loadSent();
    loadInbox();
  };

  const handleOpenReply = () => {
    if (!activeMsg) return;
    const recipient: Contact = {
      id: activeMsg.senderId ?? 1,
      fullName: activeMsg.senderName,
      email: `${activeMsg.senderName.toLowerCase().replace(/\s+/g, ".")}@eng.ruh.ac.lk`,
      role: "LECTURER",
    };
    setReplyTarget(recipient);
    setReplySubject(
      activeMsg.subject.toLowerCase().startsWith("re:")
        ? activeMsg.subject
        : `Re: ${activeMsg.subject}`
    );
    setComposeOpen(true);
  };

  const displayList = tab === "sent" ? sent : inbox;

  if (!mounted) {
    return (
      <AppShell title="Messages" subtitle="Department communications & announcements">
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
          Loading communications…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Messages" subtitle="Department communications & announcements">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            padding: "14px 22px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "0.88rem",
            background: "var(--bg-card)",
            border: `1px solid ${toast.ok ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            color: toast.ok ? "#10b981" : "#ef4444",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Compose Modal */}
      {composeOpen && (
        <ComposeModal
          isStaff={isStaff}
          contacts={contacts}
          groups={groups}
          initialRecipient={replyTarget}
          initialSubject={replySubject}
          onClose={() => {
            setComposeOpen(false);
            setReplyTarget(null);
            setReplySubject("");
          }}
          onSent={handleSent}
        />
      )}

      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["inbox", "sent"] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: active ? "#2563eb" : "var(--bg-card)",
                  border: `1px solid ${active ? "#2563eb" : "var(--border-color)"}`,
                  color: active ? "#ffffff" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {t === "inbox" ? <Inbox size={15} /> : <Send size={15} />}
                <span>{t === "inbox" ? "Inbox" : "Sent"}</span>
                {t === "inbox" && unread > 0 && (
                  <span
                    style={{
                      background: active ? "#ffffff" : "#2563eb",
                      color: active ? "#2563eb" : "#ffffff",
                      borderRadius: 12,
                      padding: "1px 7px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          {tab === "inbox" && unread > 0 && (
            <button
              onClick={markAllRead}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={14} />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => {
              setReplyTarget(null);
              setReplySubject("");
              setComposeOpen(true);
            }}
            style={{
              padding: "8px 20px",
              background: "#2563eb",
              border: "none",
              borderRadius: 8,
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
            }}
          >
            <Mail size={15} />
            <span>New Message</span>
          </button>
        </div>
      </div>

      {/* ── Main Split View ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Left: Message List */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--bg-app)",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {tab === "inbox" ? `Inbox (${inbox.length})` : `Sent (${sent.length})`}
            </span>
            {loading && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                Updating…
              </span>
            )}
          </div>

          <div style={{ maxHeight: 620, overflowY: "auto" }}>
            {!loading && displayList.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
                  {tab === "inbox" ? <MailOpen size={36} /> : <Send size={36} />}
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 4, color: "var(--text-main)" }}>
                  {tab === "inbox" ? "Your inbox is empty" : "No sent messages"}
                </div>
                <div style={{ fontSize: "0.8rem" }}>
                  Click <strong style={{ color: "#2563eb" }}>New Message</strong> to compose
                </div>
              </div>
            ) : (
              displayList.map((msg) => {
                const isActive = activeMsg?.id === msg.id;
                const isUnread = !msg.isRead && tab === "inbox";

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    style={{
                      padding: "14px 18px",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                      borderBottom: "1px solid var(--border-color)",
                      background: isActive
                        ? "rgba(37, 99, 235, 0.09)"
                        : isUnread
                        ? "rgba(37, 99, 235, 0.03)"
                        : "transparent",
                      borderLeft: `3px solid ${
                        isActive ? "#2563eb" : isUnread ? "#38bdf8" : "transparent"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-main)",
                          fontWeight: isUnread ? 700 : 600,
                          fontSize: "0.88rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {msg.subject}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {isUnread && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#2563eb",
                              display: "inline-block",
                            }}
                          />
                        )}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                          {timeAgo(msg.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div style={{ color: "var(--text-muted)", fontSize: "0.76rem", marginBottom: 4 }}>
                      {tab === "inbox"
                        ? `From: ${msg.senderName}`
                        : `To: ${
                            msg.targetType === "ALL"
                              ? "All Department"
                              : msg.targetType === "GROUP"
                              ? `Group: ${msg.targetGroup}`
                              : msg.recipientName ? msg.recipientName : "Individual Recipient"
                          }`}
                    </div>

                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.4,
                      }}
                    >
                      {msg.body.substring(0, 80)}
                      {msg.body.length > 80 ? "…" : ""}
                    </div>

                    {tab === "sent" && msg.recipientCount !== undefined && (
                      <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                        <span
                          style={{
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#10b981",
                            borderRadius: 12,
                            padding: "1px 8px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          {msg.readCount ?? 0} / {msg.recipientCount} read
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Detail Viewer */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            minHeight: 520,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
            overflow: "hidden",
          }}
        >
          {activeMsg ? (
            <>
              {/* Header */}
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid var(--border-color)",
                  background: "var(--bg-app)",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 12px",
                    color: "var(--text-main)",
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  {activeMsg.subject}
                </h2>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "#ffffff",
                        fontSize: "0.85rem",
                        flexShrink: 0,
                      }}
                    >
                      {tab === "sent" ? "Y" : activeMsg.senderName?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.88rem" }}>
                        {tab === "sent" ? "You (Sender)" : activeMsg.senderName}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}>
                        {formatDate(activeMsg.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        background: "rgba(37, 99, 235, 0.1)",
                        border: "1px solid rgba(37, 99, 235, 0.25)",
                        borderRadius: 16,
                        color: "#2563eb",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {activeMsg.targetType === "ALL" ? (
                        <Globe size={12} />
                      ) : activeMsg.targetType === "GROUP" ? (
                        <Users size={12} />
                      ) : (
                        <User size={12} />
                      )}
                      <span>
                        {activeMsg.targetType === "ALL"
                          ? "All Department"
                          : activeMsg.targetType === "GROUP"
                          ? `Group ${activeMsg.targetGroup}`
                          : activeMsg.recipientName ? activeMsg.recipientName : "Direct Message"}
                      </span>
                    </span>

                    {tab === "sent" && activeMsg.recipientCount !== undefined && (
                      <span
                        style={{
                          background: "rgba(16, 185, 129, 0.12)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          borderRadius: 16,
                          color: "#10b981",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "3px 10px",
                        }}
                      >
                        {activeMsg.readCount ?? 0} / {activeMsg.recipientCount} read
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div
                style={{
                  padding: "26px 28px",
                  lineHeight: 1.8,
                  color: "var(--text-main)",
                  fontSize: "0.94rem",
                  whiteSpace: "pre-wrap",
                  flex: 1,
                  minHeight: 240,
                }}
              >
                {activeMsg.body}
              </div>

              {/* Footer Reply Bar */}
              {tab === "inbox" && (
                <div
                  style={{
                    padding: "14px 24px",
                    borderTop: "1px solid var(--border-color)",
                    background: "var(--bg-app)",
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <button
                    onClick={handleOpenReply}
                    style={{
                      padding: "8px 18px",
                      background: "transparent",
                      border: "1px solid #2563eb",
                      borderRadius: 8,
                      color: "#2563eb",
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <CornerUpLeft size={15} />
                    <span>Reply to {activeMsg.senderName}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                minHeight: 460,
                color: "var(--text-muted)",
                gap: 12,
              }}
            >
              <div style={{ opacity: 0.3 }}>
                <MessageSquare size={54} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-main)" }}>
                Select a message to view
              </div>
              <div style={{ fontSize: "0.82rem" }}>
                or click{" "}
                <strong
                  style={{ color: "#2563eb", cursor: "pointer" }}
                  onClick={() => {
                    setReplyTarget(null);
                    setReplySubject("");
                    setComposeOpen(true);
                  }}
                >
                  New Message
                </strong>{" "}
                to start a conversation
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
