"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { notifications } from "@/lib/demoData";

export default function NotificationsPage() {
  const [filter, setFilter] = useState("All");
  const tabs = ["All", "Critical", "Warning", "Success", "Info"];

  const filtered = filter === "All" ? notifications : notifications.filter((n) => {
    if (filter === "Critical") return n.type === "danger";
    if (filter === "Warning") return n.type === "warn";
    if (filter === "Info") return n.type === "info";
    return true;
  });

  return (
    <AppShell title="Notifications" subtitle="System alerts, approvals, and overdue prompts">
      {/* Stats Row */}
      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(61,131,246,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3d83f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <div className="stat-value">12</div>
          <div className="stat-label">Total</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(255,77,87,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4d57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <div className="stat-value" style={{ color: "#ff6d86" }}>3</div>
          <div className="stat-label">Unread</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(243,174,42,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f3ae2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <div className="stat-value" style={{ color: "#ffc762" }}>2</div>
          <div className="stat-label">Critical Alerts</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(243,174,42,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f3ae2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <div className="stat-value" style={{ color: "#fbc95f" }}>2</div>
          <div className="stat-label">Pending Actions</div>
        </article>
      </section>

      {/* Filters */}
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <button key={t} className={`tab-btn ${filter === t ? "active" : ""}`} type="button" onClick={() => setFilter(t)}>
                {t}
              </button>
            ))}
            <select className="select" style={{ minWidth: 140 }}>
              <option>All Categories</option>
              <option>Inventory</option>
              <option>Access</option>
              <option>System</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#6fa0cf", fontSize: "0.9rem" }}>3 unread</span>
            <button className="ghost-btn" type="button" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1dd5e6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ color: "#1dd5e6" }}>Mark All Read</span>
            </button>
          </div>
        </div>

        {/* Notification Cards */}
        <div className="notice-list">
          {filtered.map((n, idx) => (
            <article key={idx} className={`notice-item ${n.type}`}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div className="notice-icon-wrap" style={{ background: n.type === "danger" ? "rgba(255,77,87,0.15)" : n.type === "warn" ? "rgba(243,174,42,0.15)" : "rgba(61,131,246,0.15)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={n.type === "danger" ? "#ff4d57" : n.type === "warn" ? "#f3ae2a" : "#6fb5ff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{n.title}</strong>
                      {n.unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4d57", display: "inline-block" }}/>}
                      {n.category && (
                        <span className="badge info" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4, verticalAlign: "middle" }}><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/></svg>
                          {n.category}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ color: "#5a8abb", fontSize: "0.82rem" }}>{n.time}</span>
                      <button className="notice-action-btn success" type="button" title="Acknowledge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button className="notice-action-btn danger" type="button" title="Dismiss">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: 0, color: "#87b1da", lineHeight: 1.5 }}>{n.body}</p>
                  {n.actionLabel && (
                    <button className="ghost-btn" style={{ marginTop: 10, color: "#ff6d86", borderColor: "#7a3154" }} type="button">{n.actionLabel}</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
