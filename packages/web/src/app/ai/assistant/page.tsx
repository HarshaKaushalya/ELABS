import { AppShell } from "@/components/layout/AppShell";
import { labs } from "@/lib/demoData";

const suggestedPrompts = [
  { emoji: "🔬", text: "Is Oscilloscope ELABS-EL-0001 available?" },
  { emoji: "⚠️", text: "What's the current occupancy of the Power Systems Lab?" },
  { emoji: "🕐", text: "What are my upcoming lab sessions this week?" },
  { emoji: "📋", text: "Show me pending assignments for EE501" },
  { emoji: "📦", text: "How do I borrow an item using barcode?" },
  { emoji: "💡", text: "Explain the borrowing policy for students" },
];

export default function AIAssistantPage() {
  return (
    <AppShell title="ELABS AI Assistant" subtitle="Intelligent campus support and contextual help">
      <section className="panel">
        {/* AI Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="ai-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1dd5e6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0 }}>ELABS AI</h3>
              <p style={{ margin: 0, color: "#18d18f", fontSize: "0.85rem" }}>● Online · Powered by ELABS Intelligence Engine</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="secondary-btn" type="button" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Document
            </button>
            <button className="ghost-btn" type="button" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              New Chat
            </button>
          </div>
        </div>

        {/* AI Response Bubble */}
        <div className="ai-response-area" style={{ marginBottom: 16 }}>
          <div className="notice-item info" style={{ borderColor: "#2b5b8e" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span>•</span>
              <div>
                <strong>Finding lab resources</strong>
                <div style={{ color: "#7caad6", marginTop: 6 }}>How can I assist you today?</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contextual Info Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <div className="ai-context-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Electronics Lab</strong>
                <div style={{ color: "#7caad6", marginTop: 4, fontSize: "0.85rem" }}>Currently: 18/25 occupied</div>
              </div>
              <span className="badge success">Active</span>
            </div>
          </div>
          <div className="ai-context-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Oscilloscope DS1054Z</strong>
                <div style={{ color: "#7caad6", marginTop: 4, fontSize: "0.85rem" }}>ELABS-EL-0001 · Available</div>
              </div>
              <span className="badge success">Available</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="badge info" style={{ fontFamily: "Consolas, monospace", fontSize: "0.78rem" }}>ELABS-EL-0001</span>
            </div>
          </div>
          <div className="ai-context-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>EE501 – Digital Electronics</strong>
                <div style={{ color: "#7caad6", marginTop: 4, fontSize: "0.85rem" }}>Next session: Today 2:00 PM</div>
              </div>
              <span className="badge success" style={{ background: "#0f4c44", color: "#1ee39c" }}>Enrolled</span>
            </div>
          </div>
          <div style={{ color: "#5a8abb", fontSize: "0.8rem" }}>Just now · ELABS AI</div>
        </div>

        {/* Prompt Suggestions */}
        <div className="ai-prompts">
          {suggestedPrompts.map((p) => (
            <button key={p.text} className="ai-prompt-chip" type="button">
              <span>{p.emoji}</span> {p.text}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="chat-input-row" style={{ marginTop: 16 }}>
          <button className="topbar-icon-button" type="button" style={{ padding: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.49"/></svg>
          </button>
          <input className="input" placeholder="Ask ELABS AI about equipment, labs, courses, policies..." style={{ flex: 1, padding: "14px 16px" }} />
          <button className="primary-btn" type="button" style={{ padding: "14px 18px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div style={{ textAlign: "center", color: "#4a6d9a", fontSize: "0.78rem", marginTop: 8 }}>
          ELABS AI may produce inaccurate information.
        </div>
      </section>
    </AppShell>
  );
}
