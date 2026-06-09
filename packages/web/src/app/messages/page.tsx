"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useSocket } from "@/hooks/useSocket";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface Message {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  targetType: "ALL" | "GROUP" | "USER";
  targetGroup?: string;
  recipientCount?: number;
  readCount?: number;
  createdAt: string;
  isRead: boolean;
}

interface Student { id: number; fullName: string; regNumber: string; groupCode: string; }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function readFromStorage(key: string): string | null {
  try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); }
  catch { return null; }
}

export default function MessagesPage() {
  // ── Auth state (populated after first render to avoid hydration mismatch) ──
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const t = readFromStorage("elabs_access_token");
    setToken(t);
    try {
      const u = JSON.parse(readFromStorage("elabs_user") ?? "{}");
      setIsAdmin(u?.roles?.includes("SYSTEM_ADMIN") ?? false);
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  const { on } = useSocket(token);

  // ── UI state ──
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [activeMsg, setActiveMsg] = useState<Message | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"ALL" | "GROUP" | "USER">("ALL");
  const [targetGroup, setTargetGroup] = useState("");
  const [targetUser, setTargetUser] = useState<number | "">("");
  const [groups, setGroups] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load inbox — only runs after token is available ──
  const loadInbox = useCallback(async (tkn: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/messages/inbox`, {
        headers: { Authorization: `Bearer ${tkn}` }
      });
      if (r.ok) {
        const data = await r.json();
        const msgs: Message[] = data.messages ?? [];
        setMessages(msgs);
        setUnread(data.unreadCount ?? 0);
        setActiveMsg(prev => prev ?? (msgs[0] ?? null));
      } else {
        console.error("Inbox fetch failed:", r.status, await r.text());
      }
    } catch (e) {
      console.error("Inbox fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load sent (admin only) ──
  const loadSent = useCallback(async (tkn: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/messages/sent`, {
        headers: { Authorization: `Bearer ${tkn}` }
      });
      if (r.ok) {
        const data = await r.json();
        setSentMessages(data.messages ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  // ── Trigger fetches when token becomes available ──
  useEffect(() => {
    if (!token) return;
    loadInbox(token);
    if (isAdmin) {
      // Load admin compose helpers
      fetch(`${API}/messages/groups`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setGroups(d.groups ?? [])).catch(() => {});
      fetch(`${API}/messages/students`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setStudents(d.students ?? [])).catch(() => {});
    }
  }, [token, isAdmin, loadInbox]);

  // Load sent tab when switched to
  useEffect(() => {
    if (tab === "sent" && token && isAdmin) {
      loadSent(token);
      setActiveMsg(null);
    } else if (tab === "inbox" && token) {
      loadInbox(token);
    }
  }, [tab]);

  // ── Real-time: new message pushed via socket ──
  useEffect(() => {
    const off = on("new_message", (msg: Message) => {
      setMessages(prev => [msg, ...prev]);
      setUnread(prev => prev + 1);
      showToast(`📨 New message: ${msg.subject}`, true);
    });
    return () => { off(); };
  }, [on]);

  const markRead = async (msg: Message) => {
    setActiveMsg(msg);
    if (!msg.isRead && token) {
      await fetch(`${API}/messages/${msg.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      setUnread(prev => Math.max(0, prev - 1));
    }
  };

  const sendBroadcast = async () => {
    if (!subject.trim() || !body.trim() || !token) return;
    setSending(true);
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
        showToast("✅ Message sent successfully!", true);
        setSubject(""); setBody(""); setTargetUser(""); setComposeOpen(false);
        // Refresh sent tab
        loadSent(token);
      } else {
        const err = await r.json().catch(() => ({}));
        showToast(`❌ ${err.error ?? "Failed to send"}`, false);
      }
    } catch {
      showToast("❌ Network error", false);
    } finally {
      setSending(false);
    }
  };

  // ── Display list depending on tab ──
  const displayList = tab === "sent" ? sentMessages : messages;
  const activeIsInSent = tab === "sent";

  if (!mounted) {
    return (
      <AppShell title="Messages" subtitle="Live messaging & announcements">
        <div style={{ padding: 40, textAlign: "center", color: "#4a6580" }}>Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Messages" subtitle="Live messaging & announcements — powered by WebSocket">

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem",
          background: toast.ok ? "#18d18f20" : "#ff4d5720",
          border: `1px solid ${toast.ok ? "#18d18f60" : "#ff4d5760"}`,
          color: toast.ok ? "#18d18f" : "#ff4d57",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "slideIn 0.3s ease"
        }}>
          {toast.msg}
        </div>
      )}

      {/* Admin compose panel */}
      {isAdmin && (
        <div className="panel" style={{ marginBottom: 16, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "#e8f0fe", fontSize: "0.95rem" }}>📢 Send Announcement</h3>
            <button onClick={() => setComposeOpen(o => !o)}
              style={{
                background: composeOpen ? "#ff4d5720" : "linear-gradient(135deg,#3d83f6,#1dd5e6)",
                border: composeOpen ? "1px solid #ff4d5760" : "none",
                color: composeOpen ? "#ff4d57" : "#fff",
                borderRadius: 8, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem"
              }}>
              {composeOpen ? "✕ Cancel" : "+ Compose"}
            </button>
          </div>

          {composeOpen && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Audience */}
              <div>
                <label style={{ color: "#7ea5d6", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: 6 }}>AUDIENCE</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["ALL", "GROUP", "USER"] as const).map(t => (
                    <button key={t} onClick={() => setTargetType(t)}
                      style={{
                        padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s",
                        background: targetType === t ? "#3d83f620" : "transparent",
                        border: `1px solid ${targetType === t ? "#3d83f6" : "#1a2d4a"}`,
                        color: targetType === t ? "#3d83f6" : "#7ea5d6"
                      }}>
                      {t === "ALL" ? "🌐 All Students" : t === "GROUP" ? "👥 Group" : "👤 Individual"}
                    </button>
                  ))}
                </div>
              </div>

              {targetType === "GROUP" && (
                <select value={targetGroup} onChange={e => setTargetGroup(e.target.value)}
                  style={{ background: "#0a1628", border: "1px solid #1a2d4a", borderRadius: 8, color: "#e8f0fe", padding: "9px 14px" }}>
                  <option value="">— Select group —</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}

              {targetType === "USER" && (
                <select value={targetUser} onChange={e => setTargetUser(Number(e.target.value))}
                  style={{ background: "#0a1628", border: "1px solid #1a2d4a", borderRadius: 8, color: "#e8f0fe", padding: "9px 14px" }}>
                  <option value="">— Select student —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.regNumber} — {s.fullName} ({s.groupCode})</option>
                  ))}
                </select>
              )}

              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
                style={{ background: "#0a1628", border: "1px solid #1a2d4a", borderRadius: 8, color: "#e8f0fe", padding: "10px 14px", fontSize: "0.9rem" }} />

              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Message body…" rows={4}
                style={{ background: "#0a1628", border: "1px solid #1a2d4a", borderRadius: 8, color: "#e8f0fe", padding: "10px 14px", fontSize: "0.88rem", resize: "vertical", fontFamily: "inherit" }} />

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={sendBroadcast} disabled={sending || !subject.trim() || !body.trim()}
                  style={{
                    padding: "10px 28px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)",
                    border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                    cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1
                  }}>
                  {sending ? "Sending…" : "📤 Send Message"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setTab("inbox")}
          style={{
            padding: "8px 22px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            background: tab === "inbox" ? "#3d83f6" : "transparent",
            border: `1px solid ${tab === "inbox" ? "#3d83f6" : "#1a2d4a"}`,
            color: tab === "inbox" ? "#fff" : "#7ea5d6"
          }}>
          📥 Inbox {unread > 0 && <span style={{ background: "#1dd5e6", color: "#0a1628", borderRadius: 20, padding: "2px 8px", fontSize: "0.7rem", marginLeft: 6 }}>{unread}</span>}
        </button>
        {isAdmin && (
          <button onClick={() => setTab("sent")}
            style={{
              padding: "8px 22px", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
              background: tab === "sent" ? "#3d83f6" : "transparent",
              border: `1px solid ${tab === "sent" ? "#3d83f6" : "#1a2d4a"}`,
              color: tab === "sent" ? "#fff" : "#7ea5d6"
            }}>
            📤 Sent
          </button>
        )}
      </div>

      {/* Message list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 14, alignItems: "start" }}>

        {/* List */}
        <div className="panel" style={{ padding: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a2d4a" }}>
            <span style={{ color: "#e8f0fe", fontWeight: 700, fontSize: "0.88rem" }}>
              {tab === "inbox" ? "📥 Inbox" : "📤 Sent Messages"}
            </span>
          </div>

          <div style={{ maxHeight: 560, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#4a6580" }}>Loading…</div>
            ) : displayList.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#4a6580" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{tab === "inbox" ? "📭" : "📤"}</div>
                <div style={{ fontSize: "0.85rem" }}>{tab === "inbox" ? "No messages yet" : "No sent messages"}</div>
              </div>
            ) : displayList.map(msg => (
              <div key={msg.id} onClick={() => setActiveMsg(msg)}
                style={{
                  padding: "14px 16px", borderBottom: "1px solid #0a1628", cursor: "pointer", transition: "all 0.15s",
                  background: activeMsg?.id === msg.id ? "#3d83f615" : (msg.isRead || activeIsInSent) ? "transparent" : "#1dd5e608",
                  borderLeft: `3px solid ${activeMsg?.id === msg.id ? "#3d83f6" : (msg.isRead || activeIsInSent) ? "transparent" : "#1dd5e6"}`
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                  <span style={{
                    color: (msg.isRead || activeIsInSent) ? "#7ea5d6" : "#e8f0fe",
                    fontWeight: (msg.isRead || activeIsInSent) ? 500 : 700, fontSize: "0.88rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1
                  }}>{msg.subject}</span>
                  {!msg.isRead && !activeIsInSent && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1dd5e6", flexShrink: 0, marginTop: 5 }} />}
                </div>
                <div style={{ color: "#4a6580", fontSize: "0.75rem" }}>
                  {activeIsInSent
                    ? `To: ${msg.targetType === "ALL" ? "All Students" : msg.targetType === "GROUP" ? msg.targetGroup : "Individual"} · ${msg.recipientCount ?? 0} recipients`
                    : `From ${msg.senderName}`
                  } · {timeAgo(msg.createdAt)}
                </div>
                <div style={{ color: "#5a8abb", fontSize: "0.78rem", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {msg.body.substring(0, 60)}{msg.body.length > 60 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="panel" style={{ padding: 0, minHeight: 420 }}>
          {activeMsg ? (
            <>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid #1a2d4a", background: "#0f1e35" }}>
                <h2 style={{ margin: "0 0 8px", color: "#e8f0fe", fontSize: "1.05rem" }}>{activeMsg.subject}</h2>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {activeIsInSent
                    ? <span style={{ color: "#7ea5d6", fontSize: "0.82rem" }}>Sent by You</span>
                    : <span style={{ color: "#7ea5d6", fontSize: "0.82rem" }}>From {activeMsg.senderName}</span>
                  }
                  <span style={{ color: "#4a6580", fontSize: "0.75rem" }}>{new Date(activeMsg.createdAt).toLocaleString()}</span>
                  <span style={{
                    background: "#3d83f620", border: "1px solid #3d83f640", borderRadius: 20,
                    color: "#3d83f6", fontSize: "0.7rem", fontWeight: 700, padding: "2px 10px"
                  }}>
                    {activeMsg.targetType === "ALL" ? "🌐 All Students" : activeMsg.targetType === "GROUP" ? `👥 ${activeMsg.targetGroup}` : "👤 Direct"}
                  </span>
                  {activeIsInSent && activeMsg.recipientCount !== undefined && (
                    <span style={{ background: "#1dd5e620", border: "1px solid #1dd5e640", borderRadius: 20, color: "#1dd5e6", fontSize: "0.7rem", fontWeight: 700, padding: "2px 10px" }}>
                      {activeMsg.readCount ?? 0}/{activeMsg.recipientCount} read
                    </span>
                  )}
                </div>
              </div>
              <div style={{ padding: "24px", lineHeight: 1.8, color: "#c8daf0", fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>
                {activeMsg.body}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 420, color: "#4a6580", gap: 12 }}>
              <div style={{ fontSize: 52 }}>💬</div>
              <div style={{ fontSize: "0.9rem" }}>Select a message to read</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
      `}</style>
    </AppShell>
  );
}
