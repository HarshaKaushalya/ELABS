"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useSocket } from "@/hooks/useSocket";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  CheckCircle2,
  AlertTriangle,
  Package,
  Calendar,
  Flame,
  Megaphone,
  Settings,
  Bell,
  BellOff,
  Pin,
  Check,
  ClipboardList,
  XCircle,
  BookOpen,
  Award,
  ArrowRight
} from "lucide-react";

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
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  BORROW_REQUESTED:     { icon: <ClipboardList size={20} />, color: "#f59e0b", label: "Borrow Request" },
  BORROW_APPROVED:      { icon: <CheckCircle2 size={20} />, color: "#18d18f", label: "Approved" },
  BORROW_REJECTED:      { icon: <XCircle size={20} />, color: "#ef4444", label: "Rejected" },
  BORROW_OVERDUE:       { icon: <AlertTriangle size={20} />, color: "#f3ae2a", label: "Overdue" },
  BORROW_RETURNED:      { icon: <Package size={20} />, color: "#3d83f6", label: "Returned" },
  LAB_REMINDER:         { icon: <Calendar size={20} />, color: "#1dd5e6", label: "Lab Session" },
  FIRE_ALERT:           { icon: <Flame size={20} />, color: "#ff4d57", label: "Fire Alert" },
  ASSIGNMENT_PUBLISHED: { icon: <BookOpen size={20} />, color: "#6366f1", label: "Assignment" },
  ASSIGNMENT_GRADED:    { icon: <Award size={20} />, color: "#10b981", label: "Graded" },
  BROADCAST:            { icon: <Megaphone size={20} />, color: "#a78bfa", label: "Announcement" },
  SYSTEM:               { icon: <Settings size={20} />, color: "var(--text-muted)", label: "System" },
};

export default function NotificationsPage() {
  const router = useRouter();
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

  const filters = [
    "All",
    "Borrow Requests",
    "Approved",
    "Rejected",
    "Overdue",
    "Returned",
    "Assignments",
    "Announcements",
    "Reminders"
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/notifications");
      if (r.ok) {
        const data = await r.json();
        const list = data.notifications ?? [];
        setNotifications(list);
        const count = typeof data.unreadCount === "number" ? data.unreadCount : list.filter((n: any) => !n.isRead).length;
        setUnreadCount(count);
        window.dispatchEvent(new CustomEvent("elabs:notifications-updated", { detail: { unreadCount: count } }));
      }
    } catch (err) {
      console.warn("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      load();
    }
  }, [mounted, load]);

  // Real-time push listener
  useEffect(() => {
    if (!token) return;
    const off = on("new_notification", (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => {
        const next = prev + 1;
        window.dispatchEvent(new CustomEvent("elabs:notifications-updated", { detail: { unreadCount: next } }));
        return next;
      });
    });
    return () => { off(); };
  }, [on, token]);

  const markRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => {
      const next = Math.max(0, prev - 1);
      window.dispatchEvent(new CustomEvent("elabs:notifications-updated", { detail: { unreadCount: next } }));
      return next;
    });
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch (err) {
      console.warn("Failed to mark read:", err);
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent("elabs:notifications-updated", { detail: { unreadCount: 0 } }));
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
    } catch (err) {
      console.warn("Failed to mark all read:", err);
    }
  };

  const handleCardClick = (notif: Notification) => {
    if (!notif.isRead) {
      markRead(notif.id);
    }
    if (notif.meta?.url) {
      router.push(notif.meta.url);
    } else if (notif.type.startsWith("BORROW_")) {
      router.push("/inventory");
    } else if (notif.type.startsWith("ASSIGNMENT_")) {
      router.push("/courses");
    } else if (notif.type === "LAB_REMINDER") {
      router.push("/academic-calendar");
    } else if (notif.type === "BROADCAST") {
      router.push("/messages");
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === "All") return true;
    if (filter === "Borrow Requests") return n.type === "BORROW_REQUESTED";
    if (filter === "Approved") return n.type === "BORROW_APPROVED";
    if (filter === "Rejected") return n.type === "BORROW_REJECTED";
    if (filter === "Overdue") return n.type === "BORROW_OVERDUE";
    if (filter === "Returned") return n.type === "BORROW_RETURNED";
    if (filter === "Assignments") return n.type === "ASSIGNMENT_PUBLISHED" || n.type === "ASSIGNMENT_GRADED";
    if (filter === "Announcements") return n.type === "BROADCAST";
    if (filter === "Reminders") return n.type === "LAB_REMINDER";
    const cfg = TYPE_CONFIG[n.type];
    return cfg?.label === filter;
  });

  if (!mounted) {
    return (
      <AppShell title="Notifications" subtitle="Real-time alerts, approvals, and announcements">
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading notifications...</div>
      </AppShell>
    );
  }

  const stats = [
    { label: "Total", value: notifications.length, color: "#3d83f6", icon: <Bell size={18} /> },
    { label: "Unread", value: unreadCount, color: "#ff4d57", icon: <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#ff4d57" }} /> },
    { label: "Requests", value: notifications.filter(n => n.type === "BORROW_REQUESTED").length, color: "#f59e0b", icon: <ClipboardList size={18} /> },
    { label: "Approved", value: notifications.filter(n => n.type === "BORROW_APPROVED").length, color: "#18d18f", icon: <CheckCircle2 size={18} /> },
    { label: "Overdue", value: notifications.filter(n => n.type === "BORROW_OVERDUE").length, color: "#f3ae2a", icon: <AlertTriangle size={18} /> },
  ];

  return (
    <AppShell title="Notifications" subtitle="Real-time alerts, approvals, and announcements">
      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {stats.map(s => (
          <div
            key={s.label}
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${s.color}30`,
              borderRadius: 12,
              padding: "14px 20px",
              flex: "1",
              minWidth: 120
            }}
          >
            <div style={{ display: "flex", alignItems: "center", color: s.color, marginBottom: 4, height: 24 }}>
              {s.icon}
            </div>
            <div style={{ color: s.color, fontSize: "1.6rem", fontWeight: 700, fontFamily: "monospace" }}>
              {s.value}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: 1 }}>
              {s.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {filters.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: filter === f ? "#3d83f630" : "transparent",
                  border: `1px solid ${filter === f ? "#3d83f6" : "var(--border-color)"}`,
                  color: filter === f ? "#3d83f6" : "var(--text-muted)"
                }}
              >
                {f}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              style={{
                padding: "6px 16px",
                background: "transparent",
                border: "1px solid #1dd5e640",
                borderRadius: 20,
                color: "#1dd5e6",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Check size={14} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <BellOff size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
            <div style={{ color: "var(--text-muted)" }}>No notifications in this category</div>
          </div>
        ) : filtered.map(notif => {
          const cfg = TYPE_CONFIG[notif.type] ?? { icon: <Pin size={20} />, color: "var(--text-muted)", label: notif.type };
          return (
            <div
              key={notif.id}
              onClick={() => handleCardClick(notif)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(notif);
                }
              }}
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${notif.isRead ? "var(--border-color)" : cfg.color + "60"}`,
                borderRadius: 12,
                padding: "16px 20px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                opacity: notif.isRead ? 0.75 : 1,
                borderLeft: `4px solid ${notif.isRead ? "var(--border-color)" : cfg.color}`,
                boxShadow: notif.isRead ? "none" : `0 2px 10px ${cfg.color}15`
              }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ color: cfg.color, flexShrink: 0, display: "flex", alignItems: "center", height: 24 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ color: "var(--text-main)", fontSize: "0.92rem" }}>
                        {notif.title}
                      </strong>
                      {!notif.isRead && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: cfg.color,
                            display: "inline-block",
                            flexShrink: 0
                          }}
                          title="Unread"
                        />
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          background: cfg.color + "20",
                          border: `1px solid ${cfg.color}40`,
                          borderRadius: 20,
                          color: cfg.color,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 10px"
                        }}
                      >
                        {cfg.label}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 6px 0", color: "var(--text-muted)", lineHeight: 1.6, fontSize: "0.88rem" }}>
                    {notif.body}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: cfg.color, fontSize: "0.78rem", fontWeight: 600 }}>
                    <span>View details</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
