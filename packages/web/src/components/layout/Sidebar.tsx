"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UniversityBrand } from "./UniversityBrand";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSocket } from "@/hooks/useSocket";
import { getToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type NavLink = {
  label: string;
  href: string;
  icon: string;
  badge?: number | string;
  hideFor?: string[];
};

type NavSection = {
  title: string;
  hideFor?: string[];
  links: NavLink[];
};

const sections: NavSection[] = [
  {
    title: "OVERVIEW",
    links: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    ],
  },
  {
    title: "LAB OPERATIONS",
    links: [
      { label: "Inventory", href: "/inventory", icon: "inventory" },
      { label: "Laboratories", href: "/labs", icon: "labs" },
      { label: "Attendance & Access", href: "/attendance", icon: "attendance", hideFor: ["STUDENT"] },
      { label: "Vision Monitoring",   href: "/vision",   icon: "vision",     hideFor: ["STUDENT"] },
    ],
  },
  {
    title: "COMMUNICATION",
    links: [
      { label: "Messages", href: "/messages", icon: "messages" },
      { label: "Notifications", href: "/notifications", icon: "notifications" },
      { label: "Feedback & Helpdesk", href: "/feedback", icon: "feedback" },
    ],
  },
  {
    title: "INTELLIGENCE",
    links: [
      { label: "ELABS AI", href: "/ai/assistant", icon: "ai" },
      { label: "Analytics", href: "/analytics", icon: "analytics" },
    ],
  },
  {
    title: "ADMIN",
    hideFor: ["STUDENT"],
    links: [
      { label: "Lab Management", href: "/admin/semester-groups", icon: "admin" },
      { label: "RBAC & Users", href: "/admin/rbac", icon: "rbac" },
    ],
  },
];

function NavIcon({ type }: { type: string }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "dashboard":
      return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "inventory":
      return <svg {...props}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
    case "labs":
      return <svg {...props}><path d="M9 3h6v7l4 8H5l4-8V3z"/><path d="M9 3h6"/></svg>;
    case "attendance":
      return <svg {...props}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M12 11l4 4"/><path d="M16 11l-4 4"/><rect x="8" y="1" width="8" height="4" rx="1"/></svg>;
    case "courses":
      return <svg {...props}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case "reports":
      return <svg {...props}><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>;
    case "messages":
      return <svg {...props}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
    case "notifications":
      return <svg {...props}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
    case "feedback":
      return <svg {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case "ai":
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>;
    case "analytics":
      return <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>;
    case "vision":
      return <svg {...props}><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
    case "admin":
      return <svg {...props}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>;
    case "rbac":
      return <svg {...props}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10"/></svg>;
  }
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { me, logout } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    setToken(getToken());
  }, []);

  const { on } = useSocket(token);

  const fetchCounts = useCallback(async () => {
    if (!me) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }
    try {
      const [notifRes, msgRes] = await Promise.all([
        apiFetch("/notifications/unread-count"),
        apiFetch("/messages/unread-count"),
      ]);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setUnreadNotifications(Number(notifData.unreadCount ?? 0));
      }
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setUnreadMessages(Number(msgData.unreadCount ?? 0));
      }
    } catch (err) {
      console.warn("Failed to fetch unread counts in sidebar:", err);
    }
  }, [me]);

  // Periodic polling every 15s
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Refetch when route changes (e.g. visiting /messages or /notifications)
  useEffect(() => {
    fetchCounts();
  }, [pathname, fetchCounts]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (!token) return;
    const unsubNotif = on("new_notification", () => {
      setUnreadNotifications((prev) => prev + 1);
    });
    const unsubMsg = on("new_message", () => {
      setUnreadMessages((prev) => prev + 1);
    });
    return () => {
      unsubNotif();
      unsubMsg();
    };
  }, [on, token]);

  // Custom events to synchronize state instantly across components
  useEffect(() => {
    const handleNotifs = (e: Event) => {
      const custom = e as CustomEvent<{ unreadCount?: number }>;
      if (typeof custom.detail?.unreadCount === "number") {
        setUnreadNotifications(custom.detail.unreadCount);
      } else {
        fetchCounts();
      }
    };
    const handleMsgs = (e: Event) => {
      const custom = e as CustomEvent<{ unreadCount?: number }>;
      if (typeof custom.detail?.unreadCount === "number") {
        setUnreadMessages(custom.detail.unreadCount);
      } else {
        fetchCounts();
      }
    };

    window.addEventListener("elabs:notifications-updated", handleNotifs);
    window.addEventListener("elabs:messages-updated", handleMsgs);
    return () => {
      window.removeEventListener("elabs:notifications-updated", handleNotifs);
      window.removeEventListener("elabs:messages-updated", handleMsgs);
    };
  }, [fetchCounts]);

  const initials = me?.fullName
    ? me.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const displayRole = me?.roles?.[0] ?? "User";

  const getDynamicBadge = (href: string): number | string | undefined => {
    if (href === "/notifications") {
      return unreadNotifications > 0
        ? (unreadNotifications > 99 ? "99+" : unreadNotifications)
        : undefined;
    }
    if (href === "/messages") {
      return unreadMessages > 0
        ? (unreadMessages > 99 ? "99+" : unreadMessages)
        : undefined;
    }
    return undefined;
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="brand">
        <UniversityBrand compact={isCollapsed} />
      </div>

      <nav>
        {sections
          .filter(section => !section.hideFor?.some(role => me?.roles?.includes(role)))
          .map((section) => {
            const visibleLinks = section.links.filter(link => !link.hideFor?.some(role => me?.roles?.includes(role)));
            if (visibleLinks.length === 0) return null;

            return (
              <div key={section.title} className="sidebar-section">
                {!isCollapsed && <p className="sidebar-section-title">{section.title}</p>}
                {visibleLinks.map((link) => {
                  const active = isActive(pathname, link.href);
                  const badge = getDynamicBadge(link.href) ?? link.badge;
                  return (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      className={`sidebar-link ${active ? "active" : ""}`}
                      title={isCollapsed ? (badge != null ? `${link.label} (${badge})` : link.label) : undefined}
                    >
                      <span className="sidebar-link-icon" aria-hidden style={{ position: "relative" }}>
                        <NavIcon type={link.icon} />
                        {isCollapsed && badge != null && (
                          <span
                            style={{
                              position: "absolute",
                              top: -2,
                              right: -2,
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              backgroundColor: "#ff4b56",
                            }}
                          />
                        )}
                      </span>
                      {!isCollapsed && <span>{link.label}</span>}
                      {!isCollapsed && badge != null && (
                        <span className="sidebar-badge">{badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
        })}
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-user">
            {me ? (
              <>
                <div className="sidebar-avatar" style={{ background: "linear-gradient(135deg, #18d18f, #1dd5e6)" }}>{initials}</div>
                <div className="sidebar-user-info">
                  <strong>{me.fullName}</strong>
                  <span>{displayRole}</span>
                </div>
                <button className="sidebar-logout" type="button" title="Sign out" onClick={logout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </>
            ) : (
              <Link href="/login" className="sidebar-signin-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Sign In
              </Link>
            )}
          </div>
        )}
        <button className="sidebar-collapse-btn" type="button" title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <polyline points="9 18 15 12 9 6"/>
            ) : (
              <polyline points="15 18 9 12 15 6"/>
            )}
          </svg>
        </button>
      </div>
    </aside>
  );
}
