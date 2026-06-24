"use client";

import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getUser } from "@/lib/auth";
import clsx from "clsx";
import { Laptop, Users, Calendar, Package, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

const suggestedPrompts = [
  { icon: Laptop, text: "Is Development Laptop available?" },
  { icon: Users, text: "What's the current occupancy of the Software Laboratory?" },
  { icon: Calendar, text: "What are my upcoming lab sessions this week?" },
  { icon: Package, text: "What equipment do I currently have checked out?" }
];

type Message = { role: "user" | "assistant"; content: string; attachedDoc?: string };

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am ELABS AI, your database-connected laboratory assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load student profile context on mount
  useEffect(() => {
    const user = getUser();
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  // Smooth scroll helper
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (e?: React.FormEvent, overrideMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = overrideMsg || input.trim();
    if (!userMsg || isLoading) return;

    setInput("");

    // Capture actively attached doc and clear the input area
    const attachedDoc = uploadedDocs.length > 0 ? uploadedDocs[uploadedDocs.length - 1] : null;
    if (uploadedDocs.length > 0) {
      setUploadedDocs([]);
    }

    setMessages(prev => [...prev, { role: "user", content: userMsg, attachedDoc: attachedDoc || undefined }]);
    setIsLoading(true);

    try {
      // Find the most recent document used in the conversation if one isn't actively attached
      let contextDoc = attachedDoc;
      if (!contextDoc) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].attachedDoc) {
            contextDoc = messages[i].attachedDoc;
            break;
          }
        }
      }

      const res = await fetch("http://localhost:8001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg,
          user_email: userEmail || "student@elabs.local",
          document_id: contextDoc
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer || "Sorry, I couldn't process that." }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Error connecting to AI service. Please ensure the Python AI server is running on port 8001." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || !files[0]) return;

    const file = files[0];
    if (!file.name.endsWith(".pdf")) {
      alert("Please upload a PDF file");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8001/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setUploadedDocs(prev => [...prev, data.document_id]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error uploading file: ${err instanceof Error ? err.message : "Unknown error"}`
      }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <AppShell title="ELABS AI Assistant" subtitle="Intelligent database query assistant and contextual lab help">
      {/* Self-contained CSS for typing indicators and transitions */}
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1.0); opacity: 1; }
        }
        .typing-dot {
          width: 8px;
          height: 8px;
          background-color: var(--muted);
          border-radius: 50%;
          display: inline-block;
          animation: bounce-dot 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .ai-prompt-chip {
          background: var(--panel-2);
          border: 1px solid var(--line);
          color: var(--text);
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 0.88rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .ai-prompt-chip:hover {
          border-color: var(--cyan);
          background: rgba(8, 153, 168, 0.08);
          transform: translateY(-2px);
        }
        .avatar-glow {
          box-shadow: 0 0 12px rgba(29, 213, 230, 0.35);
        }
        [data-theme="light"] .avatar-glow {
          box-shadow: 0 0 12px rgba(8, 153, 168, 0.15);
        }
        .chat-container {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 140px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
      `}</style>

      <section className="chat-container">
        {/* AI Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="avatar-glow" style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(29, 213, 230, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--cyan)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--text)" }}>ELABS Database Agent</h3>
              <p style={{ margin: 0, color: "var(--green)", fontSize: "0.82rem", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }}></span>
                Connected to local MySQL
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setMessages([{ role: "assistant", content: "Hello! I am ELABS AI, your database-connected laboratory assistant. How can I help you today?" }]);
                setUploadedDocs([]);
              }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              New Chat
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div ref={scrollContainerRef} style={{ flex: 1, overflowY: "auto", paddingRight: 8, marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "75%" }}>
              <div style={{
                padding: "14px 18px",
                borderRadius: "14px",
                backgroundColor: msg.role === "user" ? "var(--blue)" : "var(--panel-2)",
                color: msg.role === "user" ? "#ffffff" : "var(--text)",
                border: msg.role === "user" ? "none" : "1px solid var(--line)",
                borderBottomRightRadius: msg.role === "user" ? 0 : "14px",
                borderBottomLeftRadius: msg.role === "user" ? "14px" : 0,
                fontSize: "0.95rem",
                lineHeight: 1.5,
                whiteSpace: "pre-line",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 8
              }}>
                {msg.attachedDoc && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: msg.role === "user" ? "rgba(255,255,255,0.9)" : "var(--cyan)", background: msg.role === "user" ? "rgba(0,0,0,0.15)" : "rgba(29, 213, 230, 0.1)", padding: "4px 10px", borderRadius: "12px", width: "fit-content" }}>
                    <FileText size={12} />
                    Attached: {msg.attachedDoc}
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p style={{margin: "0 0 8px 0", lastChild: {margin: 0}}} {...props} />,
                      ul: ({node, ...props}) => <ul style={{margin: "4px 0 8px 20px", padding: 0}} {...props} />,
                      li: ({node, ...props}) => <li style={{marginBottom: 4}} {...props} />,
                      strong: ({node, ...props}) => <strong style={{fontWeight: 600, color: "var(--cyan)"}} {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: "flex-start", padding: "14px 18px", borderRadius: "14px", backgroundColor: "var(--panel-2)", border: "1px solid var(--line)", borderBottomLeftRadius: 0, display: "flex", gap: 5, alignItems: "center" }}>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            {suggestedPrompts.map((p) => {
              const Icon = p.icon;
              return (
                <button key={p.text} className="ai-prompt-chip" type="button" onClick={() => sendMessage(undefined, p.text)}>
                  <Icon size={14} /> {p.text}
                </button>
              );
            })}
          </div>
        )}

        {/* Input Form Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
          {uploadedDocs.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--cyan)", background: "rgba(29, 213, 230, 0.1)", padding: "4px 10px", borderRadius: "12px", width: "fit-content", border: "1px solid rgba(29, 213, 230, 0.2)" }}>
              <FileText size={12} />
              Attached: {uploadedDocs[uploadedDocs.length - 1]}
              <button type="button" onClick={() => setUploadedDocs([])} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", marginLeft: 4, padding: 0, display: "flex", alignItems: "center" }} title="Remove document">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
          
          <form onSubmit={sendMessage} style={{ display: "flex", gap: 10 }}>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{ padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "center", color: isUploading ? "var(--muted)" : "var(--text)" }}
              title="Attach PDF"
            >
              {isUploading ? (
                <div style={{display: "flex", gap: 2}}><span className="typing-dot" style={{width: 4, height: 4}}></span><span className="typing-dot" style={{width: 4, height: 4}}></span><span className="typing-dot" style={{width: 4, height: 4}}></span></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <input
              className="input"
              placeholder="Ask about equipment, lab occupancy, your sessions, or borrowed tags..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, padding: "14px 18px", fontSize: "0.95rem" }}
              disabled={isLoading || isUploading}
            />
            <button className="primary-btn" type="submit" disabled={!input.trim() || isLoading || isUploading} style={{ padding: "0 22px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </div>
        <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.78rem", marginTop: 8 }}>
          Connected as: <strong>{userEmail || "Guest Student"}</strong> · AI responses are retrieved live from the ELABS database.
        </div>
      </section>
    </AppShell>
  );
}
