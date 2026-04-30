"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { messageThreads } from "@/lib/demoData";

export default function MessagesPage() {
  const [activeId, setActiveId] = useState(messageThreads[0].id);
  const [tab, setTab] = useState<"messages" | "notifications">("messages");
  const activeThread = useMemo(() => messageThreads.find((t) => t.id === activeId) ?? messageThreads[0], [activeId]);

  return (
    <AppShell title="Messages" subtitle="Inbox, threads, and communications">
      {/* Top Tabs */}
      <div className="tab-row" style={{ marginBottom: 16 }}>
        <button className={`tab-btn ${tab === "messages" ? "active" : ""}`} type="button" onClick={() => setTab("messages")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 6 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Messages
        </button>
        <button className={`tab-btn ${tab === "notifications" ? "active" : ""}`} type="button" onClick={() => setTab("notifications")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 6 }}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          Notifications
          <span className="sidebar-badge" style={{ position: "static", marginLeft: 6 }}>2</span>
        </button>
      </div>

      <section className="chat-layout">
        {/* Thread List */}
        <article className="panel" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px" }}>
            <div className="topbar-search" style={{ minWidth: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e96c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search conversations..." className="topbar-search-input" />
            </div>
          </div>

          <div className="chat-thread-list" style={{ flex: 1 }}>
            {messageThreads.map((thread) => (
              <div
                key={thread.id}
                className={`chat-thread ${thread.id === activeThread.id ? "active" : ""}`}
                onClick={() => setActiveId(thread.id)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="chat-avatar" style={{ background: thread.color }}>
                    {thread.initials}
                    {thread.online && <span className="online-dot"/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{thread.name}</strong>
                      <span style={{ color: "#5a8abb", fontSize: "0.78rem", flexShrink: 0 }}>{thread.time}</span>
                    </div>
                    <div style={{ color: "#5a8abb", fontSize: "0.8rem" }}>{thread.role}</div>
                    <div style={{ color: "#6d9ac9", marginTop: 4, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{thread.preview}</div>
                  </div>
                  {thread.unread > 0 && (
                    <span className="sidebar-badge" style={{ position: "static", flexShrink: 0 }}>{thread.unread}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 14 }}>
            <button className="primary-btn" type="button" style={{ width: "100%", textAlign: "center", justifyContent: "center" }}>
              + New Conversation
            </button>
          </div>
        </article>

        {/* Chat Window */}
        <article className="chat-window">
          <div className="chat-window-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="chat-avatar" style={{ background: activeThread.color, width: 42, height: 42, fontSize: "0.9rem" }}>
                {activeThread.initials}
                {activeThread.online && <span className="online-dot"/>}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{activeThread.name}</h3>
                <p style={{ margin: 0, color: activeThread.online ? "#18d18f" : "#6fa0cf", fontSize: "0.85rem" }}>
                  {activeThread.online ? "Online" : "Offline"} · {activeThread.role}
                </p>
              </div>
            </div>
            <button className="topbar-icon-button" type="button" style={{ padding: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
          </div>

          <div className="chat-messages">
            {activeThread.messages.map((msg, idx) => (
              <div key={idx} className={`message-group ${msg.from === "me" ? "message-right" : ""}`}>
                {msg.from !== "me" && (
                  <div className="message-sender-label">{activeThread.initials} · {msg.time}</div>
                )}
                <div className={`message-bubble ${msg.from === "me" ? "message-out" : "message-in"}`}>
                  {msg.text}
                </div>
                <div className={`message-time ${msg.from === "me" ? "message-time-right" : ""}`}>
                  {msg.time}
                  {msg.from === "me" && <span style={{ color: "#1dd5e6", marginLeft: 4 }}>✓✓</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="chat-input-row">
            <button className="topbar-icon-button" type="button" style={{ padding: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.49"/></svg>
            </button>
            <input className="input" placeholder="Type a message..." style={{ flex: 1, padding: "12px 16px" }} />
            <button className="primary-btn" type="button" style={{ padding: "12px 18px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
