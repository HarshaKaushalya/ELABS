"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useSocket } from "@/hooks/useSocket";
import { CheckCircle2, AlertTriangle, Package, Calendar, Flame, Megaphone, Settings, Bell, BellOff, Pin, Check } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  meta?: any;
}

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

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  BORROW_APPROVED:  { icon: <CheckCircle2 size={20} />, color: "#18d18f", label: "Approved" },
  BORROW_OVERDUE:   { icon: <AlertTriangle size={20} />, color: "#f3ae2a", label: "Overdue" },
  BORROW_RETURNED:  { icon: <Package size={20} />, color: "#3d83f6", label: "Returned" },
  LAB_REMINDER:     { icon: <Calendar size={20} />, color: "#1dd5e6", label: "Lab Session" },
  FIRE_ALERT:       { icon: <Flame size={20} />, color: "#ff4d57", label: "Fire Alert" },
  BROADCAST:        { icon: <Megaphone size={20} />, color: "#a78bfa", label: "Announcement" },
  SYSTEM:           { icon: <Settings size={20} />, color: "var(--text-muted)", label: "System" },
};

export default function NotificationsPage() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
    setMounted(true);
  }, []);

  const { on } = useSocket(token);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [filter,        setFilter]        = useState("All");
  const [loading,       setLoading]       = useState(true);

  const filters = ["All", "Announcement", "Overdue", "Lab Session", "Fire Alert", "Approved", "Returned"];

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } finally { setLoading(false); }
  }, [token]);

  // Trigger load when token is available (token is async-loaded from localStorage)
  useEffect(() => { if (token) load(); }, [token, load]);

  // Real-time push
  useEffect(() => {
    const off = on("new_notification", (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    return () => { off(); };
  }, [on]);

  const markRead = async (id: number) => {
    await fetch(`${API}/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch(`${API}/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const filtered = notifications.filter(n => {
    if (filter === "All") return true;
    const cfg = TYPE_CONFIG[n.type];
    return cfg?.label === filter;
  });

  if (!mounted) return <AppShell title="Notifications" subtitle="Real-time alerts, approvals, and announcements"><div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div></AppShell>;

  return (
    <AppShell title="Notifications" subtitle="Real-time alerts, approvals, and announcements">

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Total",        value: notifications.length,  color: "#3d83f6", icon: <Bell size={18} /> },
          { label: "Unread",       value: unreadCount,            color: "#ff4d57", icon: <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#ff4d57" }} /> },
          { label: "Announcements",value: notifications.filter(n => n.type === "BROADCAST").length, color: "#a78bfa", icon: <Megaphone size={18} /> },
          { label: "Overdue",      value: notifications.filter(n => n.type === "BORROW_OVERDUE").length, color: "#f3ae2a", icon: <AlertTriangle size={18} /> },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: `1px solid ${s.color}30`, borderRadius: 12,
            padding: "14px 20px", flex: "1", minWidth: 120 }}>
            <div style={{ display: "flex", alignItems: "center", color: s.color, marginBottom: 4, height: 24 }}>{s.icon}</div>
            <div style={{ color: s.color, fontSize: "1.6rem", fontWeight: 700, fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "6px 14px", borderRadius: 20, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s",
                  background: filter === f ? "#3d83f630" : "transparent",
                  border: `1px solid ${filter === f ? "#3d83f6" : "var(--border-color)"}`,
                  color: filter === f ? "#3d83f6" : "var(--text-muted)" }}>
                {f}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              style={{ padding: "6px 16px", background: "transparent", border: "1px solid #1dd5e640",
                borderRadius: 20, color: "#1dd5e6", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={14} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <BellOff size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
            <div style={{ color: "var(--text-muted)" }}>No notifications in this category</div>
          </div>
        ) : filtered.map(notif => {
          const cfg = TYPE_CONFIG[notif.type] ?? { icon: <Pin size={20} />, color: "var(--text-muted)", label: notif.type };
          return (
            <div key={notif.id} onClick={() => !notif.isRead && markRead(notif.id)}
              style={{ background: "var(--bg-card)", border: `1px solid ${notif.isRead ? "var(--border-color)" : cfg.color + "40"}`,
                borderRadius: 12, padding: "16px 20px", cursor: notif.isRead ? "default" : "pointer",
                transition: "all 0.2s", opacity: notif.isRead ? 0.7 : 1,
                borderLeft: `4px solid ${notif.isRead ? "var(--border-color)" : cfg.color}` }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ color: cfg.color, flexShrink: 0, display: "flex", alignItems: "center", height: 24 }}>{cfg.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ color: "var(--text-main)", fontSize: "0.9rem" }}>{notif.title}</strong>
                      {!notif.isRead && (
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, display: "inline-block", flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ background: cfg.color + "20", border: `1px solid ${cfg.color}40`, borderRadius: 20,
                        color: cfg.color, fontSize: "0.7rem", fontWeight: 700, padding: "2px 10px" }}>
                        {cfg.label}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{timeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                  <p style={{ margin: 0, color: "#87b1da", lineHeight: 1.6, fontSize: "0.88rem" }}>{notif.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
