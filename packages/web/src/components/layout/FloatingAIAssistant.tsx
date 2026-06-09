"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles } from "lucide-react";

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hi! I'm your ELABS AI Assistant. How can I help you today?" }
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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error("Network response was not ok");

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Sorry, I am currently offline or unable to connect to the backend." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{
          width: 340, height: 500, backgroundColor: "#0a1732",
          border: "1px solid #204072", borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(29, 213, 230, 0.2)",
          marginBottom: 16, display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          {/* Header */}
          <div style={{ padding: "16px", backgroundColor: "#0f2244", borderBottom: "1px solid #204072", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "linear-gradient(135deg, #1dd5e6 0%, #3d83f6 100%)", borderRadius: "50%", padding: 6, display: "flex" }}>
                <Bot size={18} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#e8f0fe", fontWeight: 600 }}>ELABS AI</h3>
                <span style={{ fontSize: "0.75rem", color: "#18d18f", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, backgroundColor: "#18d18f", borderRadius: "50%", display: "inline-block" }}></span> Online
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "#7ea5d6", cursor: "pointer", padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px", borderRadius: 12, fontSize: "0.85rem", lineHeight: 1.5,
                  backgroundColor: msg.role === "user" ? "#1dd5e615" : "#122a54",
                  color: msg.role === "user" ? "#1dd5e6" : "#d9ebff",
                  border: msg.role === "user" ? "1px solid #1dd5e630" : "1px solid #204072",
                  borderBottomRightRadius: msg.role === "user" ? 2 : 12,
                  borderBottomLeftRadius: msg.role === "ai" ? 2 : 12,
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: 12, backgroundColor: "#122a54", border: "1px solid #204072", borderBottomLeftRadius: 2 }}>
                  <Sparkles size={16} color="#7ea5d6" className="animate-pulse" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} style={{ padding: "12px 16px", backgroundColor: "#0f2244", borderTop: "1px solid #204072", display: "flex", gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI assistant..."
              style={{
                flex: 1, backgroundColor: "#0a1732", border: "1px solid #204072", borderRadius: 8, padding: "8px 12px",
                color: "#e8f0fe", fontSize: "0.85rem", outline: "none"
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: "#1dd5e6", border: "none", borderRadius: 8, width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                opacity: isLoading || !input.trim() ? 0.5 : 1
              }}
            >
              <Send size={16} color="#050c1d" style={{ marginLeft: -2 }} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #1dd5e6 0%, #3d83f6 100%)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(29, 213, 230, 0.4)", transition: "transform 0.2s ease, box-shadow 0.2s ease",
          transform: isOpen ? "scale(0.9)" : "scale(1)"
        }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.transform = "scale(1.05)"; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.transform = "scale(1)"; }}
      >
        {isOpen ? <X size={26} color="#fff" /> : <Bot size={28} color="#fff" />}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  );
}
