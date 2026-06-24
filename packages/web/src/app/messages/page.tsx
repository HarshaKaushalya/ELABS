"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useSocket } from "@/hooks/useSocket";
import { Mail, Globe, Users, User, AlertTriangle, Clock, Send, Inbox, Check, MailOpen, CornerUpLeft, MessageSquare, X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Message {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  senderId?: number;
  targetType: "ALL" | "GROUP" | "USER";
  targetGroup?: string;
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
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch { return null; }
}

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  SYSTEM_ADMIN:       { label: "Admin",       color: "#ff4d57", bg: "#ff4d5720" },
  MODULE_COORDINATOR: { label: "Coordinator", color: "#f3ae2a", bg: "#f3ae2a20" },
  LECTURER:           { label: "Lecturer",    color: "#a78bfa", bg: "#a78bfa20" },
  STUDENT:            { label: "Student",     color: "#1dd5e6", bg: "#1dd5e620" },
};

// ─── Compose Modal ──────────────────────────────────────────────────────────
function ComposeModal({
  isAdmin, contacts, groups, students,
  onClose, onSent, token,
}: {
  isAdmin: boolean;
  contacts: Contact[];
  groups: string[];
  students: Contact[];
  onClose: () => void;
  onSent: () => void;
  token: string;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"ALL" | "GROUP" | "USER">("USER");
  const [targetGroup, setTargetGroup] = useState("");
  const [targetUser, setTargetUser] = useState<number | "">("");
  const [contactSearch, setContactSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const filteredContacts = contacts.filter(c =>
    c.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.regNumber ?? "").toLowerCase().includes(contactSearch.toLowerCase())
  );

  const selectedContact = contacts.find(c => c.id === targetUser);

  const send = async () => {
    if (!subject.trim() || !body.trim()) { setError("Subject and message are required"); return; }
    if (targetType === "USER" && !targetUser) { setError("Please select a recipient"); return; }
    if (targetType === "GROUP" && !targetGroup) { setError("Please select a group"); return; }

    setSending(true); setError("");
    try {
      const payload: Record<string, unknown> = { subject, body, targetType };
      if (targetType === "GROUP") payload.targetGroup = targetGroup;
      if (targetType === "USER") payload.targetUser = targetUser;

      const r = await fetch(`${API}/messages/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        onSent();
        onClose();
      } else {
        const err = await r.json().catch(() => ({}));
        setError(err.error ?? "Failed to send");
      }
    } catch { setError("Network error"); }
    finally { setSending(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)", animation: "fadeIn 0.15s ease"
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16,
        width: "min(640px, 95vw)", maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)"
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Mail size={18} />
              <span>New Message</span>
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {isAdmin ? "Broadcast to everyone or send a direct message" : "Send a message to admin, staff, or a student"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Audience — admin only shows ALL/GROUP */}
          {isAdmin && (
            <div>
              <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 1 }}>AUDIENCE</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["ALL", "GROUP", "USER"] as const).map(t => (
                  <button key={t} onClick={() => setTargetType(t)}
                    style={{
                      flex: 1, padding: "9px 8px", borderRadius: 10, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s",
                      background: targetType === t ? "linear-gradient(135deg,#3d83f630,#1dd5e630)" : "transparent",
                      border: `1px solid ${targetType === t ? "#3d83f6" : "var(--border-color)"}`,
                      color: targetType === t ? "var(--text-main)" : "var(--text-muted)"
                    }}>
                    {t === "ALL" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Globe size={14} /> All Students</span>
                    ) : t === "GROUP" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Users size={14} /> Group</span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><User size={14} /> Direct</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group picker */}
          {targetType === "GROUP" && isAdmin && (
            <div>
              <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 1 }}>LAB GROUP</label>
              <select value={targetGroup} onChange={e => setTargetGroup(e.target.value)}
                style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, color: "var(--text-main)", padding: "10px 14px", fontSize: "0.9rem" }}>
                <option value="">— Select group —</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}

          {/* Recipient picker — direct message */}
          {targetType === "USER" && (
            <div>
              <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 1 }}>TO</label>
              {selectedContact ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#3d83f615", border: "1px solid #3d83f640", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: "0.85rem", flexShrink: 0 }}>
                    {selectedContact.fullName.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.9rem" }}>{selectedContact.fullName}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{selectedContact.email}</div>
                  </div>
                  <span style={{ background: ROLE_BADGE[selectedContact.role]?.bg, color: ROLE_BADGE[selectedContact.role]?.color, borderRadius: 20, padding: "2px 10px", fontSize: "0.7rem", fontWeight: 700 }}>
                    {ROLE_BADGE[selectedContact.role]?.label ?? selectedContact.role}
                  </span>
                  <button onClick={() => { setTargetUser(""); setContactSearch(""); }}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                    placeholder="Search by name, email, or reg number…"
                    style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, color: "var(--text-main)", padding: "10px 14px", fontSize: "0.9rem", boxSizing: "border-box" }} />
                  {contactSearch && (
                    <div style={{ marginTop: 6, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>
                      {filteredContacts.length === 0 ? (
                        <div style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>No contacts found</div>
                      ) : filteredContacts.slice(0, 20).map(c => {
                        const rb = ROLE_BADGE[c.role] ?? { label: c.role, color: "var(--text-muted)", bg: "var(--text-muted)20" };
                        return (
                          <div key={c.id} onClick={() => { setTargetUser(c.id); setContactSearch(""); }}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--bg-card)", transition: "background 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#3d83f610")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: rb.bg, border: `1px solid ${rb.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: rb.color, fontSize: "0.82rem", flexShrink: 0 }}>
                              {c.fullName.charAt(0)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.fullName}</div>
                              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{c.regNumber ?? c.email}</div>
                            </div>
                            <span style={{ background: rb.bg, color: rb.color, borderRadius: 20, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>{rb.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 1 }}>SUBJECT</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject…"
              style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, color: "var(--text-main)", padding: "10px 14px", fontSize: "0.9rem", boxSizing: "border-box" }} />
          </div>

          {/* Body */}
          <div>
            <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 1 }}>MESSAGE</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Type your message…" rows={5}
              style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 10, color: "var(--text-main)", padding: "10px 14px", fontSize: "0.88rem", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6 }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#ff4d5720", border: "1px solid #ff4d5740", borderRadius: 8, padding: "10px 14px", color: "#ff4d57", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose}
              style={{ padding: "10px 24px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 10, color: "var(--text-muted)", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" }}>
              Cancel
            </button>
            <button onClick={send} disabled={sending}
              style={{ padding: "10px 28px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
              {sending ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Clock size={14} className="animate-pulse" /> Sending…</span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Send size={14} /> Send Message</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const t = readStorage("elabs_access_token");
    setToken(t);
    try {
      const u = JSON.parse(readStorage("elabs_user") ?? "{}");
      setIsAdmin(u?.roles?.includes("SYSTEM_ADMIN") ?? false);
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  const { on } = useSocket(token);

  // ── Data state ──
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [activeMsg, setActiveMsg] = useState<Message | null>(null);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);

  // Compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [students, setStudents] = useState<Contact[]>([]);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  // ── Fetchers ──
  const loadInbox = useCallback(async (tkn: string) => {
    setLoadingInbox(true);
    try {
      const r = await fetch(`${API}/messages/inbox`, { headers: { Authorization: `Bearer ${tkn}` } });
      if (r.ok) {
        const d = await r.json();
        const msgs: Message[] = d.messages ?? [];
        setInbox(msgs);
        setUnread(d.unreadCount ?? 0);
      }
    } catch (e) { console.error("Inbox error:", e); }
    finally { setLoadingInbox(false); }
  }, []);

  const loadSent = useCallback(async (tkn: string) => {
    setLoadingSent(true);
    try {
      const r = await fetch(`${API}/messages/sent`, { headers: { Authorization: `Bearer ${tkn}` } });
      if (r.ok) { const d = await r.json(); setSent(d.messages ?? []); }
    } catch { /* ignore */ }
    finally { setLoadingSent(false); }
  }, []);

  // Load on token ready
  useEffect(() => {
    if (!token) return;
    loadInbox(token);
    // Load contacts for compose
    fetch(`${API}/messages/contacts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setContacts(d.contacts ?? [])).catch(() => {});
    if (isAdmin) {
      fetch(`${API}/messages/groups`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setGroups(d.groups ?? [])).catch(() => {});
      fetch(`${API}/messages/students`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setStudents(d.students ?? [])).catch(() => {});
    }
  }, [token, isAdmin, loadInbox]);

  // Switch tab
  useEffect(() => {
    if (!token) return;
    if (tab === "sent") { loadSent(token); setActiveMsg(null); }
    else { loadInbox(token); }
  }, [tab]);

  // Real-time socket
  useEffect(() => {
    const off = on("new_message", (msg: Message) => {
      setInbox(prev => [msg, ...prev]);
      setUnread(prev => prev + 1);
      showToast(`New message: ${msg.subject}`, true);
    });
    return () => { off(); };
  }, [on]);

  const markRead = async (msg: Message) => {
    setActiveMsg(msg);
    if (!msg.isRead && token) {
      fetch(`${API}/messages/${msg.id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      setUnread(prev => Math.max(0, prev - 1));
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    await fetch(`${API}/messages/mark-all-read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    setInbox(prev => prev.map(m => ({ ...m, isRead: true })));
    setUnread(0);
  };

  const handleSent = () => {
    showToast("Message sent successfully!", true);
    if (token) { loadSent(token); loadInbox(token); }
  };

  const displayList = tab === "sent" ? sent : inbox;
  const isLoading = tab === "sent" ? loadingSent : loadingInbox;

  if (!mounted) return (
    <AppShell title="Messages" subtitle="Live messaging & announcements">
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
    </AppShell>
  );

  return (
    <AppShell title="Messages" subtitle="Real-time messaging — powered by WebSocket">

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          padding: "14px 22px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem",
          background: toast.ok ? "var(--bg-card)" : "#1a0a0d",
          border: `1px solid ${toast.ok ? "#18d18f60" : "#ff4d5760"}`,
          color: toast.ok ? "#18d18f" : "#ff4d57",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", gap: 10,
          animation: "slideIn 0.25s ease"
        }}>
          {toast.msg}
          <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", opacity: 0.6, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Compose Modal */}
      {composeOpen && token && (
        <ComposeModal
          isAdmin={isAdmin}
          contacts={contacts}
          groups={groups}
          students={students}
          token={token}
          onClose={() => setComposeOpen(false)}
          onSent={handleSent}
        />
      )}

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["inbox", "sent"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: "9px 22px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s",
                background: tab === t ? "#3d83f6" : "transparent",
                border: `1px solid ${tab === t ? "#3d83f6" : "var(--border-color)"}`,
                color: tab === t ? "#fff" : "var(--text-muted)",
                display: "flex", alignItems: "center", gap: 6
              }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t === "inbox" ? <Inbox size={14} /> : <Send size={14} />}
                <span>{t === "inbox" ? "Inbox" : "Sent"}</span>
              </span>
              {t === "inbox" && unread > 0 && (
                <span style={{ background: "#1dd5e6", color: "var(--bg-app)", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem", fontWeight: 800 }}>{unread}</span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "inbox" && unread > 0 && (
            <button onClick={markAllRead}
              style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 10, color: "var(--text-muted)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={14} />
              <span>Mark All Read</span>
            </button>
          )}
          <button onClick={() => setComposeOpen(true)}
            style={{ padding: "9px 22px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Mail size={14} />
            <span>New Message</span>
          </button>
        </div>
      </div>

      {/* ── Body: List + Detail ── */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14, alignItems: "start" }}>

        {/* Left: Message List */}
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, letterSpacing: 1 }}>
              {tab === "inbox" ? `INBOX (${inbox.length})` : `SENT (${sent.length})`}
            </span>
            {isLoading && <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Loading…</span>}
          </div>

          <div style={{ maxHeight: 580, overflowY: "auto" }}>
            {!isLoading && displayList.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ marginBottom: 12, color: "var(--text-muted)", display: "flex", justifyContent: "center" }}>
                  {tab === "inbox" ? <MailOpen size={40} /> : <Send size={40} />}
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: 4 }}>{tab === "inbox" ? "Your inbox is empty" : "No sent messages"}</div>
                <div style={{ fontSize: "0.78rem" }}>Click <strong style={{ color: "#3d83f6" }}>New Message</strong> to get started</div>
              </div>
            ) : displayList.map(msg => {
              const isActive = activeMsg?.id === msg.id;
              const unreadMsg = !msg.isRead && tab === "inbox";
              return (
                <div key={msg.id} onClick={() => tab === "inbox" ? markRead(msg) : setActiveMsg(msg)}
                  style={{
                    padding: "13px 16px", cursor: "pointer", transition: "all 0.15s",
                    borderBottom: "1px solid var(--bg-card)",
                    background: isActive ? "#3d83f615" : unreadMsg ? "#1dd5e605" : "transparent",
                    borderLeft: `3px solid ${isActive ? "#3d83f6" : unreadMsg ? "#1dd5e6" : "transparent"}`
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 6 }}>
                    <span style={{ color: unreadMsg ? "var(--text-main)" : "var(--text-muted)", fontWeight: unreadMsg ? 700 : 500, fontSize: "0.86rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {msg.subject}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      {unreadMsg && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1dd5e6", display: "inline-block" }} />}
                      <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", whiteSpace: "nowrap" }}>{timeAgo(msg.createdAt)}</span>
                    </div>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.73rem", marginBottom: 4 }}>
                    {tab === "inbox"
                      ? `From ${msg.senderName}`
                      : `To: ${msg.targetType === "ALL" ? "All Students" : msg.targetType === "GROUP" ? msg.targetGroup : "Individual"}`
                    }
                  </div>
                  <div style={{ color: "#3d5a80", fontSize: "0.76rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {msg.body.substring(0, 70)}{msg.body.length > 70 ? "…" : ""}
                  </div>
                  {tab === "sent" && msg.recipientCount !== undefined && (
                    <div style={{ marginTop: 5, display: "flex", gap: 6 }}>
                      <span style={{ background: "#1dd5e620", color: "#1dd5e6", borderRadius: 20, padding: "1px 8px", fontSize: "0.67rem", fontWeight: 700 }}>
                        {msg.readCount ?? 0}/{msg.recipientCount} read
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Message Detail */}
        <div className="panel" style={{ padding: 0, minHeight: 500 }}>
          {activeMsg ? (
            <>
              {/* Detail Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", background: "linear-gradient(135deg,var(--bg-card),var(--bg-card))" }}>
                <h2 style={{ margin: "0 0 10px", color: "var(--text-main)", fontSize: "1.1rem", lineHeight: 1.4 }}>{activeMsg.subject}</h2>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: "0.8rem", flexShrink: 0 }}>
                      {tab === "sent" ? "Y" : activeMsg.senderName?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.85rem" }}>
                        {tab === "sent" ? "You" : activeMsg.senderName}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{formatDate(activeMsg.createdAt)}</div>
                    </div>
                  </div>
                  <span style={{ background: "#3d83f620", border: "1px solid #3d83f640", borderRadius: 20, color: "#3d83f6", fontSize: "0.7rem", fontWeight: 700, padding: "3px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {activeMsg.targetType === "ALL" ? <Globe size={12} /> : activeMsg.targetType === "GROUP" ? <Users size={12} /> : <User size={12} />}
                    <span>{activeMsg.targetType === "ALL" ? "All Students" : activeMsg.targetType === "GROUP" ? activeMsg.targetGroup : "Direct"}</span>
                  </span>
                  {tab === "sent" && activeMsg.recipientCount !== undefined && (
                    <span style={{ background: "#18d18f20", border: "1px solid #18d18f40", borderRadius: 20, color: "#18d18f", fontSize: "0.7rem", fontWeight: 700, padding: "3px 12px" }}>
                      {activeMsg.readCount ?? 0} / {activeMsg.recipientCount} read
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "28px 28px", lineHeight: 1.85, color: "#c8daf0", fontSize: "0.95rem", whiteSpace: "pre-wrap", minHeight: 200 }}>
                {activeMsg.body}
              </div>

              {/* Footer actions */}
              {tab === "inbox" && (
                <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 10 }}>
                  <button onClick={() => {
                    setComposeOpen(true);
                  }}
                    style={{ padding: "8px 18px", background: "transparent", border: "1px solid #3d83f640", borderRadius: 8, color: "#3d83f6", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <CornerUpLeft size={14} />
                    <span>Reply</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500, color: "#2d4a6a", gap: 14 }}>
              <div style={{ color: "var(--text-muted)", opacity: 0.25, display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <MessageSquare size={60} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#3d5a80" }}>Select a message</div>
              <div style={{ fontSize: "0.82rem", color: "#2d4a6a" }}>or click <strong style={{ color: "#3d83f6", cursor: "pointer" }} onClick={() => setComposeOpen(true)}>New Message</strong> to compose</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px) } to { opacity: 1; transform: none } }
      `}</style>
    </AppShell>
  );
}
