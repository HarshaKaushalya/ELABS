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
          width: 380, height: 530, backgroundColor: "var(--bg-card, #0a172c)",
          border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: 18,
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 240, 255, 0.15)",
          marginBottom: 16, display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", backgroundColor: "#0b1b36",
            borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)", borderRadius: "50%", padding: 6, display: "flex" }}>
                <Bot size={17} color="#050c1d" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.88rem", color: "#f1f5f9", fontWeight: 700 }}>ELABS AI Agent</h3>
                <span style={{ fontSize: "0.72rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, backgroundColor: "#10b981", borderRadius: "50%", display: "inline-block" }} />
                  Grounded • 6 Labs Active
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link
                href="/ai/assistant"
                title="Open Fullscreen Assistant"
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4, display: "flex" }}
              >
                <Maximize2 size={16} />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4, display: "flex" }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1, padding: "14px", overflowY: "auto", display: "flex",
            flexDirection: "column", gap: 12, backgroundColor: "#071224"
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%", padding: "10px 14px", borderRadius: 14, fontSize: "0.82rem", lineHeight: 1.5,
                  backgroundColor: msg.role === "user" ? "linear-gradient(135deg, #0284c7, #1d4ed8)" : "#0d1f3b",
                  background: msg.role === "user" ? "linear-gradient(135deg, #0284c7, #2563eb)" : "#0d1f3b",
                  color: "#f1f5f9",
                  border: msg.role === "user" ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(56, 189, 248, 0.18)",
                  borderBottomRightRadius: msg.role === "user" ? 3 : 14,
                  borderBottomLeftRadius: msg.role === "ai" ? 3 : 14,
                  wordBreak: "break-word"
                }}>
                  {msg.datasheet?.datasheetUrl && (
                    <div style={{
                      marginBottom: 8, padding: "6px 8px", backgroundColor: "rgba(0, 240, 255, 0.08)",
                      border: "1px solid rgba(0, 240, 255, 0.25)", borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#00f0ff" }}>
                        📄 {msg.datasheet.model}
                      </span>
                      <a
                        href={msg.datasheet.datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.7rem", color: "#38bdf8", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 2 }}
                      >
                        Datasheet <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 12px", borderRadius: 12, backgroundColor: "#0d1f3b", border: "1px solid rgba(56, 189, 248, 0.2)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} color="#00f0ff" className="animate-pulse" />
                  <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Searching inventory & manuals...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div style={{
            padding: "6px 12px", backgroundColor: "#081529",
            borderTop: "1px solid rgba(56, 189, 248, 0.12)",
            display: "flex", gap: 6, overflowX: "auto"
          }}>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip.query)}
                style={{
                  padding: "3px 8px", borderRadius: 999, fontSize: "0.68rem",
                  backgroundColor: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)",
                  color: "#7dd3fc", whiteSpace: "nowrap", cursor: "pointer"
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
              padding: "10px 14px", backgroundColor: "#0b1b36",
              borderTop: "1px solid rgba(56, 189, 248, 0.15)",
              display: "flex", gap: 8
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about equipment, datasheets..."
              style={{
                flex: 1, backgroundColor: "#071224", border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: 10, padding: "8px 12px", color: "#f1f5f9", fontSize: "0.82rem", outline: "none"
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: "#00f0ff", border: "none", borderRadius: 10, width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                opacity: isLoading || !input.trim() ? 0.5 : 1
              }}
            >
              <Send size={15} color="#040b17" />
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
          background: "linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 6px 24px rgba(0, 240, 255, 0.4)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          transform: isOpen ? "scale(0.92)" : "scale(1)"
        }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.transform = "scale(1)"; }}
      >
        {isOpen ? <X size={24} color="#040b17" /> : <Bot size={26} color="#040b17" />}
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
