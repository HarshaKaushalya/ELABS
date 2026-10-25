"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Bot,
  Send,
  X,
  Sparkles,
  Zap,
  Activity,
  Cpu,
  Layers,
  FileText,
  ExternalLink,
  ShieldCheck,
  Key,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DatasheetInfo {
  model: string;
  name: string;
  manufacturer: string;
  category: string;
  datasheetUrl: string;
  manualUrl?: string;
  specs?: Record<string, string>;
  pinoutOrPorts?: string[];
  safetyGuidelines?: string[];
  labApplications?: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  datasheet?: DatasheetInfo | null;
  sources?: string[];
  timestamp: Date;
}

const EIE_SUGGESTIONS = [
  {
    icon: FileText,
    label: "Datasheets",
    text: "Can you give me the datasheet, pinouts, and specs for the Rigol DS1054Z oscilloscope?",
  },
  {
    icon: Zap,
    label: "High Voltage",
    text: "What are the high-voltage test facilities and safety rules in the Power Systems Lab?",
  },
  {
    icon: Activity,
    label: "Electronics Lab",
    text: "Which digital multimeters, power supplies, and oscilloscopes are available in the Electronics Lab?",
  },
  {
    icon: Cpu,
    label: "Cisco Networks",
    text: "How do I configure VLANs on the Cisco Catalyst 2960 switch in the Information Engineering Lab?",
  },
  {
    icon: ShieldCheck,
    label: "Multimeter Limits",
    text: "What are the maximum voltage and current measurement limits for the Fluke 87V multimeter?",
  },
  {
    icon: Layers,
    label: "All 6 Labs",
    text: "List all 6 department laboratories, their building locations, and key experimental facilities.",
  },
];

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [keyInput, setKeyInput] = useState<string>("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-pro");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load user & Gemini key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("elabs_gemini_api_key") || "";
    setGeminiKey(savedKey);
    setKeyInput(savedKey);

    const savedModel = localStorage.getItem("elabs_gemini_model");
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Save Gemini Key
  const handleSaveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      localStorage.removeItem("elabs_gemini_api_key");
      setGeminiKey("");
      setIsKeyModalOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem("elabs_gemini_api_key", trimmed);
        setGeminiKey(trimmed);
        setIsKeyModalOpen(false);
      } else {
        alert(data.error || "Invalid Google Gemini API Key. Please verify the key in Google AI Studio.");
      }
    } catch {
      localStorage.setItem("elabs_gemini_api_key", trimmed);
      setGeminiKey(trimmed);
      setIsKeyModalOpen(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    setInput("");
    const userMsgId = uid();
    const userMsg: Message = { id: userMsgId, role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          apiKey: geminiKey || undefined,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: data.answer || "No response received.",
        provider: data.provider,
        datasheet: data.datasheet,
        sources: data.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content:
            "⚠️ Unable to connect to the ELABS AI service. Please verify that the API server is running or check your network connection.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <AppShell title="ELABS AI Laboratory Agent">
      {/* Self-contained fixed-height card perfectly fitted into the viewport */}
      <div className="ai-page-container">
        {/* Top Control Bar */}
        <div className="ai-page-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 flex-shrink-0">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold text-[var(--text-main)]">ELABS Laboratory Intelligence</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                  {geminiKey ? "Gemini Pro Grounded" : "EIE Knowledge Engine"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Department of Electrical & Information Engineering • University of Ruhuna
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Model Selector */}
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                localStorage.setItem("elabs_gemini_model", e.target.value);
              }}
              className="bg-[var(--bg-card-hover)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none hover:border-[var(--cyan)] transition-colors cursor-pointer"
            >
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Precision)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
            </select>

            {/* Gemini API Key Button */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                geminiKey
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/25"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20"
              }`}
            >
              <Key size={13} />
              <span>{geminiKey ? "Gemini Key Linked" : "Add Gemini Key"}</span>
              {geminiKey && <CheckCircle2 size={12} className="text-emerald-500 ml-0.5" />}
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>New Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Chat Messages View */}
        <div ref={scrollRef} className="ai-page-messages">
          {messages.length === 0 ? (
            /* Welcome & Suggestions Screen */
            <div className="max-w-3xl mx-auto py-6 w-full">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/25">
                  <Sparkles size={28} className="text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
                  ELABS Engineering Agent
                </h2>
                <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-lg mx-auto mt-2 leading-relaxed">
                  Ask any question regarding the Department's 6 laboratories, equipment inventory,
                  safety guidelines, or request full <span className="text-[var(--cyan)] font-semibold">technical datasheets & pinouts</span>.
                </p>
                {!geminiKey && (
                  <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-xs text-[var(--cyan)] font-medium">
                    <Sparkles size={13} />
                    <span>Have a Gemini Pro key? Click <strong>Add Gemini Key</strong> above to connect directly.</span>
                  </div>
                )}
              </div>

              {/* Suggestion Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {EIE_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(s.text)}
                    className="ai-suggestion-card group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform text-[var(--cyan)]">
                      <s.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cyan)] block mb-0.5">
                        {s.label}
                      </span>
                      <p className="text-xs text-[var(--text-main)] leading-relaxed">
                        {s.text}
                      </p>
                    </div>
                    <ChevronRight size={15} className="text-[var(--text-muted)] group-hover:text-[var(--cyan)] ml-auto flex-shrink-0 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            <div className="max-w-4xl mx-auto space-y-5 w-full">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}

                  <div className={msg.role === "user" ? "ai-bubble-user" : "ai-bubble-assistant"}>
                    {/* Assistant Metadata Header */}
                    {msg.role === "assistant" && (
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-color)] text-[11px] text-[var(--cyan)]">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Sparkles size={12} />
                          <span>{msg.provider || "ELABS Lab Intelligence"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--cyan)] transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}

                    {/* Rich Equipment Datasheet Card if attached */}
                    {msg.datasheet && (
                      <div className="ai-datasheet-card">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-[var(--cyan)] tracking-wider">
                              <FileText size={12} />
                              <span>Verified Technical Datasheet</span>
                            </div>
                            <h4 className="text-base font-bold text-[var(--text-main)] mt-0.5">
                              {msg.datasheet.model}
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                              {msg.datasheet.name} • {msg.datasheet.manufacturer}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {msg.datasheet.datasheetUrl && (
                              <a
                                href={msg.datasheet.datasheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--cyan)] hover:opacity-90 text-white font-bold text-xs transition-opacity shadow-md"
                              >
                                <ExternalLink size={12} />
                                <span>Official Datasheet</span>
                              </a>
                            )}
                            {msg.datasheet.manualUrl && (
                              <a
                                href={msg.datasheet.manualUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] text-xs border border-[var(--border-color)] transition-colors"
                              >
                                <span>User Manual</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Markdown Content */}
                    <div className="ai-markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    <div className="mt-2 text-[10px] text-[var(--text-muted)] text-right">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="ai-bubble-assistant flex items-center gap-3 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--cyan)] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-[var(--cyan)] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-[var(--cyan)] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Querying laboratory database & Gemini knowledge...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Bottom Input Bar */}
        <div className="ai-page-input-bar">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about laboratory equipment, datasheets, pinouts, or safety..."
                disabled={isLoading}
                className="ai-textarea"
                style={{ minHeight: "44px" }}
              />
            </div>

            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Ask</span>
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Gemini API Key Modal (Theme-Adaptive) */}
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl relative text-[var(--text-main)]">
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-[var(--cyan)] flex items-center justify-center">
                  <Key size={16} />
                </div>
                <h3 className="text-base font-bold text-[var(--text-main)]">Google Gemini Pro API Key</h3>
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                Connect your personal Google Gemini account to activate real-time generative reasoning.
                Get your key at{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--cyan)] underline font-medium"
                >
                  Google AI Studio
                </a>.
              </p>

              <div className="space-y-3 mb-5">
                <label className="text-xs font-semibold text-[var(--text-main)] block">
                  API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[var(--bg-card-hover)] border border-[var(--border-color)] focus:border-[var(--cyan)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-5 py-2 rounded-xl bg-[var(--cyan)] hover:opacity-90 text-white font-bold text-xs transition-opacity shadow-lg cursor-pointer"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
