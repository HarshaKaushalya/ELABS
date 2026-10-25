"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getUser } from "@/lib/auth";
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
  AlertCircle,
  HelpCircle,
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
  const [keyStatus, setKeyStatus] = useState<"not_set" | "valid" | "invalid">("not_set");
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-pro");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load user & Gemini key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("elabs_gemini_api_key") || "";
    setGeminiKey(savedKey);
    setKeyInput(savedKey);
    if (savedKey) {
      setKeyStatus("valid");
    }

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
      setKeyStatus("not_set");
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
        setKeyStatus("valid");
        setIsKeyModalOpen(false);
      } else {
        alert(data.error || "Invalid Google Gemini API Key. Please check the key in Google AI Studio.");
        setKeyStatus("invalid");
      }
    } catch {
      // Still store if offline or verify endpoint fails
      localStorage.setItem("elabs_gemini_api_key", trimmed);
      setGeminiKey(trimmed);
      setKeyStatus("valid");
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
      <div className="flex flex-col h-[calc(100vh-64px)] bg-[#070e1b] text-slate-100">
        {/* Top Control Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-cyan-900/30 bg-[#091427]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-100">ELABS Laboratory Intelligence</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {geminiKey ? "Gemini Pro Grounded" : "EIE Knowledge Engine"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Department of Electrical & Information Engineering • University of Ruhuna
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Model Selector */}
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                localStorage.setItem("elabs_gemini_model", e.target.value);
              }}
              className="bg-[#0b1b36] border border-cyan-500/25 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 outline-none hover:border-cyan-400 transition-colors cursor-pointer"
            >
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Precision)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
            </select>

            {/* Gemini API Key Button */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                geminiKey
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
              }`}
            >
              <Key size={13} />
              <span>{geminiKey ? "Gemini Key Linked" : "Add Gemini Key"}</span>
              {geminiKey && <CheckCircle2 size={12} className="text-emerald-400 ml-0.5" />}
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-700/60 transition-colors"
              >
                <RefreshCw size={13} />
                <span>New Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Chat Messages View */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {messages.length === 0 ? (
            /* Welcome & Suggestions Screen */
            <div className="max-w-3xl mx-auto py-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-500/20">
                  <Sparkles size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                  ELABS Engineering Agent
                </h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
                  Ask any question regarding the Department's 6 laboratories, equipment inventory,
                  safety guidelines, or request full <span className="text-cyan-400 font-semibold">technical datasheets & pinouts</span>.
                </p>
                {!geminiKey && (
                  <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-xs text-cyan-300">
                    <Sparkles size={13} className="text-cyan-400" />
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
                    className="flex items-start gap-3.5 p-4 rounded-xl bg-[#0b172c]/70 hover:bg-[#0f203d] border border-cyan-900/40 hover:border-cyan-500/50 text-left transition-all duration-200 group shadow-lg"
                  >
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <s.icon size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-0.5">
                        {s.label}
                      </span>
                      <p className="text-xs text-slate-300 group-hover:text-white leading-relaxed">
                        {s.text}
                      </p>
                    </div>
                    <ChevronRight size={15} className="text-slate-600 group-hover:text-cyan-400 ml-auto flex-shrink-0 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            <div className="max-w-4xl mx-auto space-y-6">
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

                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-lg text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm"
                        : "bg-[#0b172c] border border-cyan-900/40 text-slate-200 rounded-bl-sm"
                    }`}
                  >
                    {/* Assistant Metadata Header */}
                    {msg.role === "assistant" && (
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-cyan-900/30 text-[11px] text-cyan-400">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Sparkles size={12} />
                          <span>{msg.provider || "ELABS Lab Intelligence"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}

                    {/* Rich Equipment Datasheet Card if attached */}
                    {msg.datasheet && (
                      <div className="mb-4 p-4 rounded-xl bg-[#0e203c] border border-cyan-500/30 shadow-md">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                              <FileText size={12} />
                              <span>Verified Technical Datasheet</span>
                            </div>
                            <h4 className="text-base font-bold text-white mt-0.5">
                              {msg.datasheet.model}
                            </h4>
                            <p className="text-xs text-slate-400">
                              {msg.datasheet.name} • {msg.datasheet.manufacturer}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {msg.datasheet.datasheetUrl && (
                              <a
                                href={msg.datasheet.datasheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#040b17] font-bold text-xs transition-colors shadow-md"
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
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors"
                              >
                                <span>User Manual</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Markdown Content */}
                    <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed
                      prose-headings:text-cyan-300 prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
                      prose-h3:text-base prose-h4:text-sm
                      prose-p:my-2
                      prose-ul:my-2 prose-ul:pl-4 prose-li:my-0.5
                      prose-table:text-xs prose-table:border-collapse prose-table:my-3
                      prose-th:bg-[#071324] prose-th:text-cyan-300 prose-th:p-2 prose-th:border prose-th:border-cyan-900/50
                      prose-td:p-2 prose-td:border prose-td:border-cyan-900/30 prose-td:text-slate-300
                      prose-a:text-cyan-400 prose-a:underline hover:prose-a:text-cyan-300
                      prose-code:text-cyan-300 prose-code:bg-[#06101f] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                      prose-pre:bg-[#050d1a] prose-pre:border prose-pre:border-cyan-900/40 prose-pre:rounded-xl">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500 text-right">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm px-5 py-3.5 bg-[#0b172c] border border-cyan-900/40 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-slate-400">
                      Querying laboratory database & Gemini knowledge...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex-shrink-0 border-t border-cyan-900/30 bg-[#091427]/80 backdrop-blur-md px-4 md:px-8 py-3.5">
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
                className="w-full resize-none bg-[#0b172c] border border-cyan-900/40 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors max-h-32 overflow-y-auto leading-relaxed shadow-inner"
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

        {/* Gemini API Key Modal */}
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0c1830] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Key size={16} />
                </div>
                <h3 className="text-base font-bold text-white">Google Gemini Pro API Key</h3>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Connect your personal or institutional Google Gemini account to activate real-time generative reasoning.
                Get your key at{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 underline font-medium"
                >
                  Google AI Studio
                </a>.
              </p>

              <div className="space-y-3 mb-5">
                <label className="text-xs font-semibold text-slate-300 block">
                  API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#081224] border border-cyan-900/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#040b17] font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
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
