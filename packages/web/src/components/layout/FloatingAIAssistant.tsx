"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Maximize2, ExternalLink } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string; datasheet?: any }[]>([
    {
      role: "ai",
      content:
        "Hello! I am your **ELABS Laboratory AI Agent**. Ask me about equipment, lab schedules, safety rules, or ask for an official **equipment datasheet** (e.g. *'Rigol DS1054Z datasheet'*).",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const userMessage = (textToSend || input).trim();
    if (!userMessage || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = localStorage.getItem("elabs_gemini_api_key") || undefined;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-gemini-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          apiKey,
        }),
      });

      if (!res.ok) throw new Error("Network response was not ok");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.answer || "No response received.",
          datasheet: data.datasheet,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "⚠️ Unable to reach the ELABS AI service. Please ensure the API server is connected.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickChips = [
    { label: "DS1054Z Datasheet", query: "Give me the datasheet and specs for Rigol DS1054Z" },
    { label: "HV Lab Safety", query: "What are the safety rules in the High Voltage Lab?" },
    { label: "Electronics Lab Items", query: "What equipment is in the Electronics and Measurement Lab?" },
  ];

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{
          width: 380, height: 530, backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)", borderRadius: 18,
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.2), 0 0 20px rgba(8, 153, 168, 0.15)",
          marginBottom: 16, display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", backgroundColor: "var(--bg-card)",
            borderBottom: "1px solid var(--border-color)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "linear-gradient(135deg, var(--cyan) 0%, var(--blue) 100%)", borderRadius: "50%", padding: 6, display: "flex" }}>
                <Bot size={17} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-main)", fontWeight: 700 }}>ELABS AI Agent</h3>
                <span style={{ fontSize: "0.72rem", color: "var(--cyan)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, backgroundColor: "#10b981", borderRadius: "50%", display: "inline-block" }} />
                  Grounded • 6 Labs Active
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link
                href="/ai/assistant"
                title="Open Fullscreen Assistant"
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, display: "flex" }}
              >
                <Maximize2 size={16} />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, display: "flex" }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1, padding: "14px", overflowY: "auto", display: "flex",
            flexDirection: "column", gap: 12, backgroundColor: "var(--bg-app)"
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%", padding: "10px 14px", borderRadius: 14, fontSize: "0.82rem", lineHeight: 1.5,
                  background: msg.role === "user" ? "linear-gradient(135deg, #0284c7, #2563eb)" : "var(--bg-card)",
                  color: msg.role === "user" ? "#ffffff" : "var(--text-main)",
                  border: msg.role === "user" ? "none" : "1px solid var(--border-color)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  borderBottomRightRadius: msg.role === "user" ? 3 : 14,
                  borderBottomLeftRadius: msg.role === "ai" ? 3 : 14,
                  wordBreak: "break-word"
                }}>
                  {msg.datasheet?.datasheetUrl && (
                    <div style={{
                      marginBottom: 8, padding: "6px 8px", backgroundColor: "rgba(8, 153, 168, 0.08)",
                      border: "1px solid var(--cyan)", borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--cyan)" }}>
                        📄 {msg.datasheet.model}
                      </span>
                      <a
                        href={msg.datasheet.datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.7rem", color: "var(--cyan)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 2 }}
                      >
                        Datasheet <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                  <div className="ai-markdown-content" style={{ fontSize: "0.82rem" }}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 12px", borderRadius: 12, backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} color="var(--cyan)" className="animate-pulse" />
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Searching inventory & manuals...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div style={{
            padding: "8px 12px", backgroundColor: "var(--bg-card)",
            borderTop: "1px solid var(--border-color)",
            display: "flex", gap: 6, overflowX: "auto"
          }}>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip.query)}
                style={{
                  padding: "4px 9px", borderRadius: 999, fontSize: "0.7rem",
                  backgroundColor: "var(--bg-card-hover)", border: "1px solid var(--border-color)",
                  color: "var(--cyan)", whiteSpace: "nowrap", cursor: "pointer", fontWeight: 500
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: "10px 14px", backgroundColor: "var(--bg-card)",
              borderTop: "1px solid var(--border-color)",
              display: "flex", gap: 8
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about equipment, datasheets..."
              style={{
                flex: 1, backgroundColor: "var(--bg-card-hover)", border: "1.5px solid var(--border-color)",
                borderRadius: 10, padding: "8px 12px", color: "var(--text-main)", fontSize: "0.82rem", outline: "none"
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                background: "linear-gradient(135deg, var(--cyan) 0%, var(--blue) 100%)", border: "none", borderRadius: 10, width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                opacity: isLoading || !input.trim() ? 0.5 : 1
              }}
            >
              <Send size={15} color="#ffffff" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 54, height: 54, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--cyan) 0%, var(--blue) 100%)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 6px 24px rgba(8, 153, 168, 0.4)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          transform: isOpen ? "scale(0.92)" : "scale(1)"
        }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.transform = "scale(1)"; }}
      >
        {isOpen ? <X size={24} color="#ffffff" /> : <Bot size={26} color="#ffffff" />}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  );
}
