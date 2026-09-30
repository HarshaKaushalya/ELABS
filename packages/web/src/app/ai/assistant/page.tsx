"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getUser } from "@/lib/auth";
import {
  Bot, Send, Paperclip, X, Loader2, Sparkles,
  BarChart2, Package, Calendar, Users, AlertTriangle,
  ChevronRight, RefreshCw, Database, Cpu,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const AI_BASE = process.env.NEXT_PUBLIC_AI_BASE_URL ?? "http://localhost:8001";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";
interface Message {
  id: string;
  role: Role;
  content: string;
  attachedDoc?: string;
  isStreaming?: boolean;
  timestamp: Date;
}

// ─── Suggestion Chips ─────────────────────────────────────────────────────────

const STUDENT_SUGGESTIONS = [
  { icon: Package,       text: "What equipment do I currently have checked out?" },
  { icon: Calendar,      text: "What are my upcoming lab sessions this week?" },
  { icon: BarChart2,     text: "What is the current inventory available in the lab?" },
  { icon: Users,         text: "What's the current occupancy of the Software Lab?" },
];

const STAFF_SUGGESTIONS = [
  { icon: AlertTriangle, text: "Show me all overdue equipment transactions" },
  { icon: BarChart2,     text: "Give me a full inventory summary by status" },
  { icon: Users,         text: "How many students are in each lab right now?" },
  { icon: Package,       text: "Which items are currently under maintenance?" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function isStaffRole(roles: string[] = []) {
  return roles.some(r =>
    ["SYSTEM_ADMIN", "MODULE_COORDINATOR", "LECTURER", "LAB_TECHNICIAN"].includes(r)
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
          <Bot size={16} className="text-white" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`relative max-w-[78%] px-4 py-3 rounded-2xl shadow-md text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-sm"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm"
        }`}
      >
        {/* Attached doc badge */}
        {msg.attachedDoc && (
          <div className="flex items-center gap-1.5 mb-2 text-xs opacity-80">
            <Paperclip size={11} />
            <span className="truncate max-w-[180px]">{msg.attachedDoc}</span>
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose dark:prose-invert prose-sm max-w-none
            prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
            prose-h1:text-cyan-600 dark:prose-h1:text-cyan-300
            prose-h2:text-cyan-600 dark:prose-h2:text-cyan-300
            prose-h3:text-cyan-600 dark:prose-h3:text-cyan-300
            prose-strong:text-cyan-700 dark:prose-strong:text-cyan-300
            prose-code:text-cyan-700 dark:prose-code:text-cyan-200
            prose-code:bg-slate-100 dark:prose-code:bg-slate-700
            prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-blockquote:border-l-cyan-400
            prose-table:text-xs
            prose-th:text-cyan-700 dark:prose-th:text-cyan-300
            prose-th:bg-slate-100 dark:prose-th:bg-slate-700">
            <ReactMarkdown>{msg.content + (msg.isStreaming ? "▌" : "")}</ReactMarkdown>
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-[10px] mt-1.5 ${isUser ? "text-blue-200/60" : "text-slate-400 dark:text-slate-500"} text-right`}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-end">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg flex-shrink-0">
        <Bot size={16} className="text-white" />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">ELABS AI is thinking...</span>
        </div>
      </div>
    </div>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onSuggestion, suggestions, userName }: {
  onSuggestion: (t: string) => void;
  suggestions: typeof STUDENT_SUGGESTIONS;
  userName: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-12 px-4">
      {/* Logo */}
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
          <Sparkles size={36} className="text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-400 border-2 border-white dark:border-slate-900 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Hello{userName ? `, ${userName.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
          I'm <span className="text-cyan-500 dark:text-cyan-400 font-semibold">ELABS AI</span>, your intelligent lab assistant.
          I have live access to the laboratory database.
        </p>
      </div>

      {/* Capability pills */}
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {[
          { icon: Database, label: "Live DB Access" },
          { icon: Package,  label: "Inventory Tracking" },
          { icon: Calendar, label: "Lab Schedules" },
          { icon: Cpu,      label: "AI-Powered" },
        ].map(c => (
          <div key={c.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
            <c.icon size={12} className="text-cyan-500 dark:text-cyan-400" />
            {c.label}
          </div>
        ))}
      </div>

      {/* Suggestion chips */}
      <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestions.map((s) => (
          <button
            key={s.text}
            onClick={() => onSuggestion(s.text)}
            className="group flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-500/60 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all text-left shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors">
              <s.icon size={15} className="text-cyan-500 dark:text-cyan-400" />
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors leading-snug">
              {s.text}
            </span>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-cyan-400 ml-auto flex-shrink-0 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load user ──
  useEffect(() => {
    const user = getUser();
    if (user) {
      setUserEmail(user.email);
      setUserName(user.fullName ?? user.email);
      setUserRoles(user.roles ?? []);
    }
  }, []);

  // ── Check Ollama status ──
  useEffect(() => {
    fetch(`${AI_BASE}/health`)
      .then(r => r.json())
      .then(d => setOllamaOnline(d.ollama?.online && d.ollama?.model_loaded))
      .catch(() => setOllamaOnline(false));
  }, []);

  // ── Auto-scroll ──
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  // ── Send message ──
  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;

    setInput("");
    const attachedDoc = uploadedDocs.length > 0 ? uploadedDocs[uploadedDocs.length - 1] : undefined;
    if (attachedDoc) setUploadedDocs([]);

    const userMsg: Message = { id: uid(), role: "user", content: text, attachedDoc, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Build history for context (last 6 turns)
    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

    // Find most recent doc in history
    let contextDoc = attachedDoc;
    if (!contextDoc) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].attachedDoc) { contextDoc = messages[i].attachedDoc; break; }
      }
    }

    // Add streaming placeholder
    const assistantId = uid();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", isStreaming: true, timestamp: new Date() }]);

    // Stream from /chat/stream
    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${AI_BASE}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          user_email: userEmail,
          document_id: contextDoc || null,
          history,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const chunk = JSON.parse(line.slice(6));
            if (chunk.done) break;
            if (chunk.token) {
              setMessages(prev =>
                prev.map(m => m.id === assistantId
                  ? { ...m, content: m.content + chunk.token }
                  : m
                )
              );
            }
          } catch {}
        }
      }

      // Mark streaming done
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m));

    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + " *(stopped)*", isStreaming: false } : m));
      } else {
        // Fallback to non-streaming
        try {
          const res = await fetch(`${AI_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, user_email: userEmail, document_id: contextDoc || null, history }),
          });
          const data = await res.json();
          setMessages(prev => prev.map(m => m.id === assistantId
            ? { ...m, content: data.answer ?? "Sorry, I could not process that.", isStreaming: false }
            : m
          ));
        } catch {
          setMessages(prev => prev.map(m => m.id === assistantId
            ? { ...m, content: "⚠️ Could not connect to the AI server. Make sure the AI backend is running.", isStreaming: false }
            : m
          ));
        }
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, userEmail, uploadedDocs]);

  // ── Upload ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${AI_BASE}/upload`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setUploadedDocs(prev => [...prev, data.document_id ?? file.name]);
      }
    } catch {}
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Key handler ──
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => { setMessages([]); setUploadedDocs([]); };
  const stopGeneration = () => { abortRef.current?.abort(); };

  const suggestions = isStaffRole(userRoles) ? STAFF_SUGGESTIONS : STUDENT_SUGGESTIONS;
  const hasMessages = messages.length > 0;

  return (
    <AppShell title="AI Assistant">
      <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">ELABS AI Assistant</h1>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${ollamaOnline ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {ollamaOnline === null ? "Checking..." : ollamaOnline ? "llama3.2 · Live" : "Database-only mode"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw size={13} />
                New Chat
              </button>
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5 scroll-smooth">
          {!hasMessages ? (
            <WelcomeScreen
              onSuggestion={(t) => sendMessage(t)}
              suggestions={suggestions}
              userName={userName}
            />
          ) : (
            <>
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
              {isLoading && !messages.find(m => m.isStreaming) && <TypingIndicator />}
            </>
          )}
        </div>

        {/* ── Input Area ── */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 md:px-8 py-4">

          {/* Uploaded doc tags */}
          {uploadedDocs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {uploadedDocs.map((doc, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-600 dark:text-cyan-300">
                  <Paperclip size={11} />
                  <span className="max-w-[160px] truncate">{doc}</span>
                  <button onClick={() => setUploadedDocs(prev => prev.filter((_, j) => j !== i))} className="hover:text-slate-800 dark:hover:text-white ml-0.5">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            {/* Upload button */}
            <label className="flex-shrink-0 cursor-pointer">
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.txt,.docx" onChange={handleUpload} />
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-cyan-500/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                {isUploading ? <Loader2 size={16} className="text-cyan-500 animate-spin" /> : <Paperclip size={16} className="text-slate-500 dark:text-slate-400" />}
              </div>
            </label>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about equipment, lab sessions, borrowing status..."
                disabled={isLoading}
                className="w-full resize-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-cyan-500/60 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors max-h-32 overflow-y-auto leading-relaxed disabled:opacity-50 shadow-sm"
                style={{ minHeight: "44px" }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                }}
              />
            </div>

            {/* Send / Stop button */}
            {isLoading ? (
              <button
                onClick={stopGeneration}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/30 transition-colors"
              >
                <X size={16} className="text-red-400" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg hover:shadow-cyan-500/30 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                <Send size={16} className="text-white" />
              </button>
            )}
          </div>

          {/* Suggestion chips when chat is active */}
          {hasMessages && !isLoading && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-none">
              {suggestions.slice(0, 3).map(s => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-500/60 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-all whitespace-nowrap"
                >
                  <s.icon size={11} className="text-cyan-500 dark:text-cyan-400" />
                  {s.text.length > 40 ? s.text.slice(0, 38) + "…" : s.text}
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2">
            ELABS AI has live database access · Answers are based on real-time lab data
          </p>
        </div>
      </div>
    </AppShell>
  );
}
