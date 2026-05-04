"use client";

import { useState, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import clsx from "clsx";

const suggestedPrompts = [
  { emoji: "🔬", text: "Is Oscilloscope ELABS-EL-0001 available?" },
  { emoji: "⚠️", text: "What's the current occupancy of the Power Systems Lab?" },
  { emoji: "🕐", text: "What are my upcoming lab sessions this week?" },
  { emoji: "📦", text: "How do I borrow an item using barcode?" }
];

type Message = { role: "user" | "assistant"; content: string };

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am ELABS AI, your intelligent laboratory assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (e?: React.FormEvent, overrideMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = overrideMsg || input.trim();
    if (!userMsg || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8002/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer || "Sorry, I couldn't process that." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error connecting to AI service. Please ensure the AI service is running on port 8000." }]);
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

      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setUploadedDocs(prev => [...prev, data.document_id]);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Successfully uploaded "${data.filename}". You can now ask questions based on this document!`
      }]);
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
    <AppShell title="ELABS AI Assistant" subtitle="Intelligent campus support and contextual help">
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
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
            <button
              className="ghost-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{ display: "flex", alignItems: "center", gap: 6, opacity: isUploading ? 0.5 : 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {isUploading ? "Uploading..." : "Upload PDF"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setMessages([{ role: "assistant", content: "Hello! I am ELABS AI, your intelligent laboratory assistant. How can I help you today?" }]);
                setUploadedDocs([]);
              }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              New Chat
            </button>
          </div>
        </div>

        {/* Uploaded Documents Display */}
        {uploadedDocs.length > 0 && (
          <div style={{ marginBottom: 12, padding: "8px 12px", backgroundColor: "rgba(29, 213, 230, 0.1)", borderRadius: "8px", border: "1px solid #1dd5e6", fontSize: "0.85rem" }}>
            <strong>📄 Documents uploaded:</strong> {uploadedDocs.join(", ")}
          </div>
        )}

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              <div style={{
                padding: "12px 16px",
                borderRadius: "12px",
                backgroundColor: msg.role === "user" ? "#1dd5e6" : "rgba(30, 41, 59, 0.5)",
                color: msg.role === "user" ? "#000" : "#e2e8f0",
                border: msg.role === "user" ? "none" : "1px solid #334155",
                borderBottomRightRadius: msg.role === "user" ? 0 : "12px",
                borderBottomLeftRadius: msg.role === "user" ? "12px" : 0
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: "flex-start", padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(30, 41, 59, 0.5)", border: "1px solid #334155", borderBottomLeftRadius: 0 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Prompt Suggestions */}
        {messages.length === 1 && (
          <div className="ai-prompts" style={{ marginBottom: 16 }}>
            {suggestedPrompts.map((p) => (
              <button key={p.text} className="ai-prompt-chip" type="button" onClick={() => sendMessage(undefined, p.text)}>
                <span>{p.emoji}</span> {p.text}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={sendMessage} className="chat-input-row" style={{ marginTop: "auto" }}>
          <input
            className="input"
            placeholder="Ask ELABS AI about equipment, labs, courses, policies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ flex: 1, padding: "14px 16px" }}
            disabled={isLoading || isUploading}
          />
          <button className="primary-btn" type="submit" disabled={!input.trim() || isLoading || isUploading} style={{ padding: "14px 18px", opacity: (!input.trim() || isLoading || isUploading) ? 0.5 : 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
        <div style={{ textAlign: "center", color: "#4a6d9a", fontSize: "0.78rem", marginTop: 8 }}>
          ELABS AI may produce inaccurate information. Upload PDFs to enhance accuracy for lab-specific content.
        </div>
      </section>
    </AppShell>
  );
}

