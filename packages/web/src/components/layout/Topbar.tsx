"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useSocket } from "@/hooks/useSocket";
import { getToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Package,
  Calendar,
  Flame,
  Megaphone,
  Settings,
  CheckCheck,
  ChevronRight,
  Inbox
} from "lucide-react";

type TopbarProps = {
  title: string;
  subtitle?: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
};

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  meta?: any;
}

const NOTIF_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  BORROW_APPROVED:  { icon: <CheckCircle2 size={15} />, color: "#18d18f", bg: "rgba(24, 209, 143, 0.15)" },
  BORROW_OVERDUE:   { icon: <AlertTriangle size={15} />, color: "#f3ae2a", bg: "rgba(243, 174, 42, 0.15)" },
  BORROW_RETURNED:  { icon: <Package size={15} />, color: "#3d83f6", bg: "rgba(61, 131, 246, 0.15)" },
  LAB_REMINDER:     { icon: <Calendar size={15} />, color: "#1dd5e6", bg: "rgba(29, 213, 230, 0.15)" },
  FIRE_ALERT:       { icon: <Flame size={15} />, color: "#ff4d57", bg: "rgba(255, 77, 87, 0.15)" },
  BROADCAST:        { icon: <Megaphone size={15} />, color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)" },
  SYSTEM:           { icon: <Settings size={15} />, color: "#7ea5d6", bg: "rgba(126, 165, 214, 0.15)" },
};

function formatTimeAgo(isoString: string): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 0) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Topbar({ title, subtitle, onToggleSidebar, isSidebarCollapsed }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const { me, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToken(getToken());
  }, []);

  const { on } = useSocket(token);

  const fetchNotifications = useCallback(async () => {
    if (!me) return;
    try {
      setLoadingNotifs(true);
      const res = await apiFetch("/notifications");
      if (res.ok) {
        const data = await res.json();
        const list = data.notifications ?? [];
        setNotifications(list);
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : list.filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [me]);

  useEffect(() => {
    if (me) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [me, fetchNotifications]);

  // Real-time socket event listener
  useEffect(() => {
    if (!token) return;
    const unsub = on("new_notification", (notif: NotificationItem) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    return () => { unsub(); };
  }, [on, token]);

  // Click outside / escape listeners to auto close popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      try {
        await apiFetch(`/notifications/${notif.id}/read`, { method: "PATCH" });
      } catch (err) {
        console.warn("Failed to mark notification as read:", err);
      }
    }
    setShowNotifications(false);

    if (notif.meta?.url) {
      router.push(notif.meta.url);
    } else if (notif.type.startsWith("BORROW_")) {
      router.push("/inventory");
    } else if (notif.type === "LAB_REMINDER") {
      router.push("/academic-calendar");
    } else if (notif.type === "BROADCAST") {
      router.push("/messages");
    } else {
      router.push("/notifications");
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
    } catch (err) {
      console.warn("Failed to mark all notifications read:", err);
    }
  };

  const initials = me?.fullName
    ? me.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const displayRole = me?.roles?.[0]?.toUpperCase() ?? "USER";

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Hamburger Menu Button */}
        <button
          type="button"
          className="hamburger-btn"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Open menu" : "Close menu"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isSidebarCollapsed ? (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="18" y2="18" />
              </>
            )}
          </svg>
        </button>
        <div>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="topbar-right">
        {/* Search */}
        <div className="topbar-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e96c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search items, labs, users..." className="topbar-search-input" />
        </div>

        {me ? (
          <>
            {/* Theme Toggle */}
            <button
              type="button"
              className="topbar-icon-button"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              )}
            </button>

            {/* Notification Bell */}
            <div className="topbar-notify-wrap" ref={notifRef}>
              <button
                type="button"
                className={`topbar-icon-button ${showNotifications ? "active" : ""}`}
                onClick={() => setShowNotifications((s) => !s)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                title="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </button>
              {unreadCount > 0 && (
                <span className="topbar-badge" aria-hidden="true">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}

              {showNotifications && (
                <div className="topbar-notif-popover" role="dialog" aria-label="Notifications Dropdown">
                  {/* Header */}
                  <div className="topbar-notif-head">
                    <div className="topbar-notif-title-wrap">
                      <div className="topbar-notif-title">
                        <Bell size={16} className="topbar-notif-title-icon" />
                        <span>Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="topbar-notif-count-pill">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="topbar-notif-markall-btn"
                        onClick={handleMarkAllRead}
                        title="Mark all notifications as read"
                      >
                        <CheckCheck size={14} />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  {/* Scrollable list */}
                  <div className="topbar-notif-list">
                    {loadingNotifs && notifications.length === 0 ? (
                      <div className="topbar-notif-loading">
                        <div className="topbar-notif-spinner" />
                        <span>Loading notifications...</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="topbar-notif-empty">
                        <div className="topbar-notif-empty-icon">
                          <Inbox size={26} />
                        </div>
                        <h4>No notifications yet</h4>
                        <p>You&apos;re completely caught up with all laboratory updates and alerts.</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((item) => {
                        const cfg = NOTIF_CONFIG[item.type] || NOTIF_CONFIG.SYSTEM;
                        return (
                          <div
                            key={item.id}
                            className={`topbar-notif-item ${!item.isRead ? "unread" : ""}`}
                            onClick={() => handleNotificationClick(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleNotificationClick(item);
                              }
                            }}
                          >
                            <div
                              className="topbar-notif-item-icon"
                              style={{ color: cfg.color, background: cfg.bg }}
                            >
                              {cfg.icon}
                            </div>
                            <div className="topbar-notif-item-content">
                              <div className="topbar-notif-item-header">
                                <span className="topbar-notif-item-title">{item.title}</span>
                                <span className="topbar-notif-item-time">{formatTimeAgo(item.createdAt)}</span>
                              </div>
                              <p className="topbar-notif-item-body">{item.body}</p>
                            </div>
                            {!item.isRead && (
                              <span className="topbar-notif-item-dot" title="Unread" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="topbar-notif-foot">
                    <Link
                      href="/notifications"
                      className="topbar-notif-all-link"
                      onClick={() => setShowNotifications(false)}
                    >
                      <span>View all notifications</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Role Pill */}
            <div className="topbar-role-pill">
              {displayRole}
            </div>

            {/* User Avatar + Dropdown */}
            <div className="topbar-user-menu-wrap" ref={userMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="topbar-avatar-group"
                onClick={() => setShowUserMenu((s) => !s)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <div className="topbar-avatar">{initials}</div>
                <span className="topbar-user-label">{me.fullName.split(" ")[0]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showUserMenu && (
                <div className="topbar-dropdown">
                  <div className="topbar-dropdown-header">
                    <strong>{me.fullName}</strong>
                    <span>{me.email}</span>
                  </div>
                  <div className="topbar-dropdown-divider" />
                  <button type="button" className="topbar-dropdown-item" onClick={() => { setShowUserMenu(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    My Profile
                  </button>
                  <button type="button" className="topbar-dropdown-item topbar-dropdown-signout" onClick={() => { setShowUserMenu(false); logout(); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Not signed in */
          <Link href="/login" className="topbar-signin-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
