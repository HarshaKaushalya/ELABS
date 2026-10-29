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
  Paperclip,
  BookOpen,
  Eye,
  FileCheck,
  UploadCloud,
  HelpCircle,
  Wrench,
  Search,
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

interface AttachedDoc {
  id?: string;
  filename: string;
  originalName: string;
  mimeType?: string;
  size?: number;
  pageCount?: number;
  textContent?: string;
  textSnippet?: string;
  url?: string;
  base64?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  datasheet?: DatasheetInfo | null;
  attachedDoc?: AttachedDoc | null;
  sources?: string[];
  timestamp: Date;
}

interface DepartmentManualSummary {
  id: string;
  courseCode: string;
  title: string;
  department: string;
  semester: string;
  labName: string;
  location: string;
  description: string;
  practicalsCount: number;
  practicals: { number: number; title: string; objective: string }[];
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

const DOCUMENT_QUICK_QUESTIONS = [
  { label: "Procedure & Aim", prompt: "Summarize the experimental procedure, main objectives, and required measurements from this manual." },
  { label: "Equipment to Borrow", prompt: "Which exact equipment and components do I need to borrow from the lab counter for this experiment, and what are their specs?" },
  { label: "Circuit Setup & Wiring", prompt: "Provide a detailed step-by-step practical circuit wiring and apparatus connection guide for this experiment." },
  { label: "Troubleshooting & Errors", prompt: "What are the common bench mistakes, waveform distortions, or deviations in this practical, and how do I troubleshoot them?" },
  { label: "Safety Precautions", prompt: "What are the critical voltage, current limits, and laboratory safety rules for this practical?" },
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

  // Attached Document State
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [departmentManuals, setDepartmentManuals] = useState<DepartmentManualSummary[]>([]);
  const [loadingManuals, setLoadingManuals] = useState(false);
  const [manualSearch, setManualSearch] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch Curated Department Lab Manuals
  const fetchDepartmentManuals = async () => {
    setIsLibraryModalOpen(true);
    if (departmentManuals.length > 0) return;
    setLoadingManuals(true);
    try {
      const res = await fetch("/api/ai/lab-manuals");
      if (res.ok) {
        const data = await res.json();
        setDepartmentManuals(data);
      }
    } catch (e) {
      console.warn("Failed to fetch department manuals:", e);
    } finally {
      setLoadingManuals(false);
    }
  };

  // Select a Curated Department Manual as Active Document
  const handleSelectCuratedManual = async (manualId: string) => {
    setLoadingManuals(true);
    try {
      const res = await fetch(`/api/ai/lab-manuals/${manualId}`);
      if (res.ok) {
        const fullManual = await res.json();
        const p1 = fullManual.practicals?.[0];
        const textContent = `DEPARTMENT OF ELECTRICAL & INFORMATION ENGINEERING
FACULTY OF ENGINEERING • UNIVERSITY OF RUHUNA
COURSE: ${fullManual.courseCode} — ${fullManual.title}
LABORATORY: ${fullManual.labName} (${fullManual.location})
SEMESTER: ${fullManual.semester}

RECOMMENDED APPARATUS:
${fullManual.recommendedEquipment.map((eq: string) => `- ${eq}`).join("\n")}

PRACTICAL DETAILS:
${fullManual.practicals
  .map(
    (p: any) => `
Practical ${p.number}: ${p.title}
Objective: ${p.objective}
Equipment: ${p.componentsAndEquipment?.join(", ")}
Setup: ${p.circuitSetup}
Procedure:
${p.procedure?.map((s: string, idx: number) => `  ${idx + 1}. ${s}`).join("\n")}
Troubleshooting & Scenarios:
${p.troubleshootingScenarios?.map((t: string) => `  - ${t}`).join("\n")}
Safety Rules:
${p.safetyRules?.map((sr: string) => `  - ${sr}`).join("\n")}
`
  )
  .join("\n")}`;

        setAttachedDoc({
          id: `manual_${manualId}`,
          filename: `${fullManual.courseCode}_Lab_Manual.pdf`,
          originalName: `${fullManual.courseCode}: ${fullManual.title}`,
          mimeType: "application/pdf",
          size: 245000,
          pageCount: fullManual.practicals?.length * 4 || 12,
          textContent,
          textSnippet: `Official EIE Course Lab Manual for ${fullManual.courseCode}: ${p1?.title || fullManual.title}`,
          url: `/ai/lab-manuals/${manualId}`,
        });

        setIsLibraryModalOpen(false);
      }
    } catch (err) {
      alert("Failed to load department manual details.");
    } finally {
      setLoadingManuals(false);
    }
  };

  // Upload custom user document (PDF, TXT, MD, DOCX, Image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ai/upload-document", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to process uploaded file.");
        return;
      }

      const data = await res.json();
      if (data.ok && data.document) {
        setAttachedDoc(data.document);
      }
    } catch (err: any) {
      alert("Network error while uploading document.");
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
    const currentDoc = attachedDoc;
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: text,
      attachedDoc: currentDoc,
      timestamp: new Date(),
    };
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
          document: currentDoc || undefined,
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
        attachedDoc: currentDoc,
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
    setAttachedDoc(null);
  };

  const filteredManuals = departmentManuals.filter(
    (m) =>
      m.courseCode.toLowerCase().includes(manualSearch.toLowerCase()) ||
      m.title.toLowerCase().includes(manualSearch.toLowerCase()) ||
      m.labName.toLowerCase().includes(manualSearch.toLowerCase())
  );

  return (
    <AppShell title="ELABS AI Laboratory Agent">
      {/* Hidden file input for document uploading */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFileUpload}
      />

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
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <BookOpen size={10} />
                  <span>Lab Manuals & Practical Scenarios Ready</span>
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Department of Electrical & Information Engineering • University of Ruhuna
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Curated Lab Manuals Library Button */}
            <button
              type="button"
              onClick={fetchDepartmentManuals}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-main)] transition-colors cursor-pointer"
              title="Open Department Lab Manuals"
            >
              <BookOpen size={13} className="text-[var(--cyan)]" />
              <span>Department Manuals</span>
            </button>

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
                  ELABS Engineering Agent & Practical Guide
                </h2>
                <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-xl mx-auto mt-2 leading-relaxed">
                  Upload a <span className="text-[var(--cyan)] font-semibold">Lab Manual, Datasheet, or Circuit Diagram</span>,
                  and ask questions based on it. The agent combines your document with the{" "}
                  <strong className="text-[var(--text-main)]">Department's live inventory database</strong> to generate
                  practical step-by-step setup guides, wiring schematics, and bench troubleshooting.
                </p>

                {/* Quick Action Badges */}
                <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-[var(--cyan)] font-semibold transition-all cursor-pointer shadow-sm"
                  >
                    <UploadCloud size={14} />
                    <span>Upload Lab Manual / Datasheet (PDF/Img)</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchDepartmentManuals}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-xs text-blue-600 dark:text-blue-400 font-semibold transition-all cursor-pointer shadow-sm"
                  >
                    <BookOpen size={14} />
                    <span>Browse Department Lab Manuals</span>
                  </button>
                </div>
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
                    {/* User Attached Document Pill */}
                    {msg.role === "user" && msg.attachedDoc && (
                      <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-white/15 border border-white/20 text-xs flex items-center gap-2">
                        <FileCheck size={14} className="text-cyan-200" />
                        <span className="font-semibold text-white truncate max-w-xs">
                          {msg.attachedDoc.originalName}
                        </span>
                        <span className="text-[10px] opacity-80 font-mono ml-auto">
                          {msg.attachedDoc.pageCount ? `${msg.attachedDoc.pageCount} pgs` : "Attached"}
                        </span>
                      </div>
                    )}

                    {/* Assistant Metadata Header */}
                    {msg.role === "assistant" && (
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-color)] text-[11px] text-[var(--cyan)]">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Sparkles size={12} />
                          <span>{msg.provider || "ELABS Lab Intelligence"}</span>
                          {msg.attachedDoc && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 ml-2 font-mono text-cyan-600 dark:text-cyan-400">
                              📄 Grounded in {msg.attachedDoc.originalName.slice(0, 24)}...
                            </span>
                          )}
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
                      {attachedDoc
                        ? `Analyzing "${attachedDoc.originalName}" & querying database inventory...`
                        : "Querying laboratory database & Gemini knowledge..."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Bottom Input Bar */}
        <div className="ai-page-input-bar">
          <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
            {/* Active Document Card above input */}
            {attachedDoc && (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs transition-all shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-[var(--cyan)] flex items-center justify-center flex-shrink-0 font-bold text-[11px]">
                    {attachedDoc.mimeType?.includes("pdf")
                      ? "PDF"
                      : attachedDoc.mimeType?.startsWith("image/")
                      ? "IMG"
                      : "DOC"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-main)] truncate block">
                        {attachedDoc.originalName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-[var(--cyan)] font-mono flex-shrink-0">
                        {attachedDoc.pageCount
                          ? `${attachedDoc.pageCount} pgs`
                          : attachedDoc.size
                          ? `${Math.round(attachedDoc.size / 1024)} KB`
                          : "Manual Attached"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {attachedDoc.textSnippet
                        ? attachedDoc.textSnippet.slice(0, 90) + "..."
                        : "Active lab manual / datasheet. The agent will ground answers on this document."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] text-[11px] border border-[var(--border-color)] transition-colors flex items-center gap-1 cursor-pointer"
                    title="Inspect extracted text"
                  >
                    <Eye size={12} />
                    <span>View Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachedDoc(null)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove attached document"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Question Chips if document is attached */}
            {attachedDoc && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <span className="text-[var(--cyan)] font-semibold flex items-center gap-1 flex-shrink-0">
                  <HelpCircle size={12} />
                  <span>Ask Document:</span>
                </span>
                {DOCUMENT_QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(q.prompt)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-hover)] hover:bg-cyan-500/15 hover:text-[var(--cyan)] border border-[var(--border-color)] hover:border-cyan-500/30 text-[var(--text-main)] whitespace-nowrap transition-colors cursor-pointer flex-shrink-0"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {/* Upload in Progress Banner */}
            {isUploadingDoc && (
              <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-[var(--cyan)] flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" />
                <span>Extracting lab manual text & specifications...</span>
              </div>
            )}

            {/* Input Controls */}
            <div className="flex items-end gap-2.5">
              {/* Paperclip Document Attach Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingDoc || isLoading}
                className="h-11 px-3 rounded-xl bg-[var(--bg-card-hover)] hover:bg-cyan-500/15 hover:text-[var(--cyan)] text-[var(--text-muted)] border border-[var(--border-color)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
                title="Attach Lab Manual or Datasheet (PDF, TXT, DOCX, Image)"
              >
                <Paperclip size={16} />
                <span className="hidden sm:inline text-xs font-medium">Attach Manual</span>
              </button>

              {/* Department Library Shortcut */}
              <button
                type="button"
                onClick={fetchDepartmentManuals}
                disabled={isLoading}
                className="h-11 px-3 rounded-xl bg-[var(--bg-card-hover)] hover:bg-blue-500/15 hover:text-blue-500 text-[var(--text-muted)] border border-[var(--border-color)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                title="Pick from Department Lab Manuals"
              >
                <BookOpen size={16} />
                <span className="hidden sm:inline text-xs font-medium">Lab Library</span>
              </button>

              {/* Textarea */}
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
                  placeholder={
                    attachedDoc
                      ? `Ask questions about "${attachedDoc.originalName}" or request practical setup...`
                      : "Ask about laboratory equipment, datasheets, practical scenarios, or safety..."
                  }
                  disabled={isLoading}
                  className="ai-textarea"
                  style={{ minHeight: "44px" }}
                />
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !attachedDoc) || isLoading}
                className="flex-shrink-0 h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Ask</span>
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* 1. Document Text Preview Modal */}
        {isPreviewModalOpen && attachedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl relative text-[var(--text-main)] flex flex-col max-h-[85vh]">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-[var(--cyan)] flex items-center justify-center font-bold text-xs">
                  DOC
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-main)] truncate max-w-md">
                    {attachedDoc.originalName}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {attachedDoc.pageCount ? `${attachedDoc.pageCount} Pages • ` : ""}
                    {attachedDoc.textContent ? `${attachedDoc.textContent.length} Characters extracted` : ""}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mt-4 p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)] font-mono text-xs leading-relaxed whitespace-pre-wrap select-text text-[var(--text-main)]">
                {attachedDoc.textContent || "No text could be extracted from this document."}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-muted)]">
                  Grounding active: The AI will refer to this text when answering your questions.
                </span>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--cyan)] text-white text-xs font-bold hover:opacity-90 cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Department Lab Manuals & Practical Library Modal */}
        {isLibraryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl relative text-[var(--text-main)] flex flex-col max-h-[85vh]">
              <button
                type="button"
                onClick={() => setIsLibraryModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-main)]">
                    Department Laboratory Manuals Library
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Select any curriculum practical manual to attach it and generate bench guides & equipment checkouts.
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative my-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Filter by course code, title, or laboratory name..."
                  className="w-full bg-[var(--bg-card-hover)] border border-[var(--border-color)] focus:border-[var(--cyan)] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none"
                />
              </div>

              {/* Manuals List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingManuals ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-[var(--cyan)]" />
                    <span>Loading department manuals...</span>
                  </div>
                ) : filteredManuals.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                    No laboratory manuals matched your search.
                  </div>
                ) : (
                  filteredManuals.map((manual) => (
                    <div
                      key={manual.id}
                      className="p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-color)] hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-[var(--cyan)] font-mono">
                            {manual.courseCode}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-main)]">
                            {manual.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          📍 {manual.labName} ({manual.location}) • {manual.semester}
                        </p>
                        <p className="text-[11px] text-[var(--text-main)] opacity-90 line-clamp-1">
                          {manual.description}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {manual.practicals?.map((p, pIdx) => (
                            <span
                              key={pIdx}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]"
                            >
                              Practical {p.number}: {p.title.slice(0, 32)}...
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectCuratedManual(manual.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--cyan)] hover:opacity-90 text-white font-bold text-xs flex-shrink-0 transition-opacity shadow-sm cursor-pointer"
                      >
                        Attach Manual
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end mt-4 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Gemini API Key Modal */}
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
                Connect your personal Google Gemini account to activate real-time generative reasoning and deep datasheet reading.
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
