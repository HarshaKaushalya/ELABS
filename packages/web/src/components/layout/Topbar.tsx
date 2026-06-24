"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/components/layout/ThemeProvider";
import Link from "next/link";

type TopbarProps = {
  title: string;
  subtitle?: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
};

export function Topbar({ title, subtitle, onToggleSidebar, isSidebarCollapsed }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { me, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
          <p>{subtitle}</p>
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
            <div className="topbar-notify-wrap">
              <button
                type="button"
                className="topbar-icon-button"
                onClick={() => setShowNotifications((s) => !s)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </button>
              <span className="topbar-badge">7</span>
            </div>

            {/* Role Pill */}
            <div className="topbar-role-pill">
              {displayRole}
            </div>

            {/* User Avatar + Dropdown */}
            <div className="topbar-user-menu-wrap" style={{ position: "relative" }}>
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
