"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useSocket } from "@/hooks/useSocket";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface Message {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  targetType: "ALL" | "GROUP" | "USER";
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

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("elabs_access_token") ?? sessionStorage.getItem("elabs_access_token");
}

function getUser(): { roles?: string[]; fullName?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("elabs_user") ?? sessionStorage.getItem("elabs_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function MessagesPage() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setToken(getToken());
    const u = getUser();
    setIsAdmin(u?.roles?.includes("SYSTEM_ADMIN") ?? false);
    setMounted(true);
  }, []);

  const { on } = useSocket(token);

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [activeMsg, setActiveMsg] = useState<Message | null>(null);
  const [unread,    setUnread]    = useState(0);
  const [loading,   setLoading]   = useState(true);

  // Compose state (admin only)
  const [composeOpen,  setComposeOpen]  = useState(false);
  const [subject,      setSubject]      = useState("");
  const [body,         setBody]         = useState("");
  const [targetType,   setTargetType]   = useState<"ALL" | "GROUP" | "USER">("ALL");
  const [targetGroup,  setTargetGroup]  = useState("");
  const [targetUser,   setTargetUser]   = useState<number | "">("");
  const [groups,       setGroups]       = useState<string[]>([]);
  const [students,     setStudents]     = useState<Student[]>([]);
  const [sending,      setSending]      = useState(false);
  const [sentMsg,      setSentMsg]      = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Load inbox
  const loadInbox = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/messages/inbox`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setMessages(data.messages ?? []);
        setUnread(data.unreadCount ?? 0);
        if (!activeMsg && data.messages?.length) setActiveMsg(data.messages[0]);
      }
    } finally { setLoading(false); }
  }, [token, activeMsg]);

  useEffect(() => { loadInbox(); }, []);

  // Load groups + students for admin compose
  useEffect(() => {
    if (!isAdmin || !token) return;
    fetch(`${API}/messages/groups`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setGroups(d.groups ?? [])).catch(() => {});
    fetch(`${API}/messages/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setStudents(d.students ?? [])).catch(() => {});
  }, [isAdmin, token]);

  // Real-time: new message pushed via socket
  useEffect(() => {
    const off = on("new_message", (msg: Message) => {
      setMessages(prev => [msg, ...prev]);
      setUnread(prev => prev + 1);
    });
    return () => { off(); };
  }, [on]);

  const markRead = async (msg: Message) => {
    setActiveMsg(msg);
    if (!msg.isRead) {
      await fetch(`${API}/messages/${msg.id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      setUnread(prev => Math.max(0, prev - 1));
    }
  };

  const sendBroadcast = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const payload: any = { subject, body, targetType };
      if (targetType === "GROUP") payload.targetGroup = targetGroup;
      if (targetType === "USER") payload.targetUser = targetUser;
      const r = await fetch(`${API}/messages/send`, {
        method: "POST", headers,
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setSentMsg(`✅ Message sent successfully!`);
        setSubject(""); setBody(""); setComposeOpen(false);
        setTimeout(() => setSentMsg(""), 3000);
        loadInbox();
      } else {
        const err = await r.json();
        setSentMsg(`❌ ${err.error ?? "Failed to send"}`);
      }
    } finally { setSending(false); }
  };

  if (!mounted) return <AppShell title="Messages" subtitle="Live messaging & announcements — powered by WebSocket"><div style={{ padding: 40, textAlign: "center", color: "#4a6580" }}>Loading...</div></AppShell>;

  return (
    <AppShell title="Messages" subtitle="Live messaging & announcements — powered by WebSocket">

      {sentMsg && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8,
          background: sentMsg.startsWith("✅") ? "#18d18f20" : "#ff4d5720",
          border: `1px solid ${sentMsg.startsWith("✅") ? "#18d18f40" : "#ff4d5740"}`,
          color: sentMsg.startsWith("✅") ? "#18d18f" : "#ff4d57", fontWeight: 600 }}>
          {sentMsg}
        </div>
      )}

      {/* Admin compose panel */}
      {isAdmin && (
        <div className="panel" style={{ marginBottom: 16, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "#e8f0fe", fontSize: "0.95rem" }}>📢 Send Announcement</h3>
            <button onClick={() => setComposeOpen(o => !o)}
              style={{ background: composeOpen ? "#ff4d5720" : "linear-gradient(135deg,#3d83f6,#1dd5e6)",
                border: composeOpen ? "1px solid #ff4d5760" : "none",
                color: composeOpen ? "#ff4d57" : "#fff",
                borderRadius: 8, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
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
                      style={{ padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s",
                        background: targetType === t ? "#3d83f620" : "transparent",
                        border: `1px solid ${targetType === t ? "#3d83f6" : "#1a2d4a"}`,
                        color: targetType === t ? "#3d83f6" : "#7ea5d6" }}>
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
                style={{ background: "#0a1628", border: "1px solid #1a2d4a", borderRadius: 8, color: "#e8f0fe",
                  padding: "10px 14px", fontSize: "0.88rem", resize: "vertical", fontFamily: "inherit" }} />

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={sendBroadcast} disabled={sending || !subject.trim() || !body.trim()}
                  style={{ padding: "10px 28px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)",
                    border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                    cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
                  {sending ? "Sending…" : "📤 Send Message"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14, alignItems: "start" }}>

        {/* Inbox list */}
        <div className="panel" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a2d4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#e8f0fe", fontWeight: 700, fontSize: "0.9rem" }}>📥 Inbox</span>
            {unread > 0 && (
              <span style={{ background: "#3d83f6", borderRadius: 20, color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px" }}>
                {unread} unread
              </span>
            )}
          </div>

          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#4a6580" }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#4a6580" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                No messages yet
              </div>
            ) : messages.map(msg => (
              <div key={msg.id} onClick={() => markRead(msg)}
                style={{ padding: "14px 16px", borderBottom: "1px solid #0a1628", cursor: "pointer", transition: "all 0.15s",
                  background: activeMsg?.id === msg.id ? "#3d83f610" : msg.isRead ? "transparent" : "#1dd5e608",
                  borderLeft: `3px solid ${activeMsg?.id === msg.id ? "#3d83f6" : msg.isRead ? "transparent" : "#1dd5e6"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: msg.isRead ? "#7ea5d6" : "#e8f0fe", fontWeight: msg.isRead ? 500 : 700, fontSize: "0.88rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                    {msg.subject}
                  </span>
                  {!msg.isRead && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1dd5e6", flexShrink: 0, marginTop: 4 }} />}
                </div>
                <div style={{ color: "#4a6580", fontSize: "0.75rem" }}>
                  From {msg.senderName} · {timeAgo(msg.createdAt)}
                </div>
                <div style={{ color: "#5a8abb", fontSize: "0.78rem", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {msg.body.substring(0, 60)}…
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message detail */}
        <div className="panel" style={{ padding: 0, minHeight: 400 }}>
          {activeMsg ? (
            <>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2d4a", background: "#1a2d4a" }}>
                <h2 style={{ margin: "0 0 6px", color: "#e8f0fe", fontSize: "1.05rem" }}>{activeMsg.subject}</h2>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: "#7ea5d6", fontSize: "0.82rem" }}>From {activeMsg.senderName}</span>
                  <span style={{ color: "#4a6580", fontSize: "0.75rem" }}>{new Date(activeMsg.createdAt).toLocaleString()}</span>
                  <span style={{ background: "#3d83f620", border: "1px solid #3d83f640", borderRadius: 20,
                    color: "#3d83f6", fontSize: "0.7rem", fontWeight: 700, padding: "2px 10px" }}>
                    {activeMsg.targetType === "ALL" ? "🌐 All Students" : activeMsg.targetType === "GROUP" ? "👥 Group" : "👤 Direct"}
                  </span>
                </div>
              </div>
              <div style={{ padding: "24px 24px", lineHeight: 1.75, color: "#c8daf0", fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>
                {activeMsg.body}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minHeight: 400, color: "#4a6580", gap: 12 }}>
              <div style={{ fontSize: 48 }}>💬</div>
              <div>Select a message to read</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </AppShell>
  );
}
