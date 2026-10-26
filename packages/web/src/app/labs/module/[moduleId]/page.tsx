"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { 
  CheckCircle2, XCircle, Wrench, FlaskConical, Calendar, ClipboardList, 
  Edit, Save, AlertTriangle, Clock, Check, Trash2, X,
  FileText, BookOpen, Upload, Download, Award, BarChart2, Plus, Eye, ChevronRight,
  FileSpreadsheet, ShieldAlert, FileCheck, ExternalLink, Filter, Search, Copy, File,
  Info, Sparkles, User, MapPin, ArrowRight
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Practical = {
  id: number;
  labNumber: string;
  labTitle: string | null;
  equipStatus: "Working" | "Not Working" | "Under Maintenance";
  numSessions: number;
  notes: string | null;
  sortOrder: number;
  completionRequirements?: string | null;
  safetyGuidelines?: string | null;
  documentCount?: number;
};

type ScheduleSlot = {
  id?: number;
  sessionDate: string;
  dayOfWeek?: string | null;
  timeSlot: string;
  moduleCode: string;
  moduleName?: string;
  moduleId?: number;
  labLabel?: string;
  labName?: string;
  practicalName?: string | null;
  groupCode: string;
  academicYear?: string;
  instructorName?: string | null;
  notes?: string | null;
  status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  semesterId?: number;
};

type PracticalDocument = {
  id: number;
  practicalId: number;
  docType: "MANUAL" | "SAFETY" | "GUIDELINE" | "OTHER";
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  createdAt: string;
  uploadedByName?: string | null;
};

type Session = {
  id: number;
  title: string;
  description: string;
  scheduledDate: string;
  durationHours: number;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  attended: boolean;
  reportSubmitted: boolean;
  completedAt: string | null;
  documentUrl: string | null;
};

type Module = {
  id: number;
  code: string;
  name: string;
  coordinatorName: string | null;
  numStudents: number;
  semesterId: number;
  semesterName: string;
  semesterCoordinator: string | null;
};

type Assignment = {
  id: number;
  title: string;
  type: "REPORT" | "PRE_LAB" | "OTHER";
  description: string | null;
  openedAt: string | null;
  dueAt: string | null;
  maxScore: number;
  submissionId: number | null;
  submittedAt: string | null;
  score: number | null;
  fileName: string | null;
  fileUrl: string | null;
  gradedAt: string | null;
  feedback: string | null;
};

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  timeLimitMins: number;
  openedAt: string | null;
  closedAt: string | null;
  maxAttempts: number;
  questionCount: number;
  totalPoints: number;
  attemptId: number | null;
  attemptSubmittedAt: string | null;
  attemptScore: number | null;
  attemptMaxScore: number | null;
  attemptNumber: number | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch { return null; }
}

const EQUIP_CONFIG = {
  "Working":             { color: "#18d18f", bg: "#18d18f15", icon: CheckCircle2 },
  "Not Working":         { color: "#ff4d57", bg: "#ff4d5715", icon: XCircle },
  "Under Maintenance":   { color: "#f3ae2a", bg: "#f3ae2a15", icon: Wrench },
};

const DOC_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  MANUAL:    { label: "Lab Manual", color: "#3d83f6", bg: "#3d83f615", icon: BookOpen },
  SAFETY:    { label: "Safety Regulations", color: "#ef4444", bg: "#ef444415", icon: ShieldAlert },
  GUIDELINE: { label: "Guidelines & Datasheet", color: "#10b981", bg: "#10b98115", icon: FileCheck },
  OTHER:     { label: "Resource Document", color: "#8b5cf6", bg: "#8b5cf615", icon: FileText },
};

const RUHUNA_TIME_SLOTS = [
  "08:30 - 11:30",
  "13:30 - 16:30",
  "09:00 - 12:00",
  "14:00 - 17:00",
  "08:00 - 10:00",
  "10:30 - 12:30",
];

const STANDARD_LAB_NAMES = [
  "Electric Machines and Power Electronics Laboratory",
  "Renewable Energy and High Voltage Laboratory",
  "Digital Signal Processing Laboratory",
  "Computer Networks & Systems Engineering Laboratory",
  "Control Systems and Automation Laboratory",
  "Communication and Microwave Engineering Laboratory",
  "Electronics and Circuit Design Laboratory",
  "24 × 7 Undergraduate Development Project Laboratory",
];

// ─── Practical Details & Document Hub Modal ──────────────────────────────────
function PracticalDetailsModal({
  practicalId,
  mod,
  isStaff,
  onClose,
  onUpdated,
}: {
  practicalId: number;
  mod: Module;
  isStaff: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [data, setData] = useState<{ practical: Practical; documents: PracticalDocument[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDocTab, setActiveDocTab] = useState<string>("ALL");

  // Editing requirements/safety mode
  const [editingContent, setEditingContent] = useState(false);
  const [completionReqs, setCompletionReqs] = useState("");
  const [safetyGuide, setSafetyGuide] = useState("");
  const [savingContent, setSavingContent] = useState(false);

  // Upload document modal/form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDocType, setUploadDocType] = useState<"MANUAL" | "SAFETY" | "GUIDELINE" | "OTHER">("MANUAL");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/academic/practicals/${practicalId}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setCompletionReqs(d.practical.completionRequirements || "");
        setSafetyGuide(d.practical.safetyGuidelines || "");
      }
    } catch (err) {
      console.error("Failed to load practical details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [practicalId]);

  const handleSaveContent = async () => {
    try {
      setSavingContent(true);
      const res = await apiFetch(`/academic/practicals/${practicalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completionRequirements: completionReqs,
          safetyGuidelines: safetyGuide,
        }),
      });
      if (res.ok) {
        setEditingContent(false);
        loadDetails();
        onUpdated();
      }
    } catch (err) {
      alert("Failed to update practical requirements");
    } finally {
      setSavingContent(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    if (!uploadTitle.trim()) {
      setUploadError("Please provide a document title");
      return;
    }
    if (!selectedFile && !externalUrl.trim()) {
      setUploadError("Please select a file or provide a document URL");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("title", uploadTitle.trim());
      formData.append("docType", uploadDocType);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      if (externalUrl.trim()) {
        formData.append("fileUrl", externalUrl.trim());
      }

      const res = await apiFetch(`/academic/practicals/${practicalId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setShowUploadForm(false);
        setUploadTitle("");
        setSelectedFile(null);
        setExternalUrl("");
        loadDetails();
        onUpdated();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setUploadError(errJson.error || "Failed to upload document");
      }
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to remove this document?")) return;
    try {
      const res = await apiFetch(`/academic/practicals/${practicalId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadDetails();
        onUpdated();
      }
    } catch {
      alert("Failed to delete document");
    }
  };

  const p = data?.practical;
  const docs = data?.documents || [];

  const filteredDocs = docs.filter(d => {
    if (activeDocTab === "ALL") return true;
    return d.docType === activeDocTab;
  });

  const equipCfg = p ? (EQUIP_CONFIG[p.equipStatus] || EQUIP_CONFIG["Working"]) : EQUIP_CONFIG["Working"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: 18,
          width: "min(920px, 96vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 26px",
            borderBottom: "1px solid var(--border-color)",
            background: "linear-gradient(135deg, var(--bg-card), var(--bg-app))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: "#3d83f620", color: "#3d83f6" }}>
                {mod.code} · {p?.labNumber || "Practical"}
              </span>
              {p && (
                <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: equipCfg.bg, color: equipCfg.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <equipCfg.icon size={12} />
                  <span>{p.equipStatus}</span>
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.25rem", fontWeight: 700 }}>
              {p?.labTitle || "Practical Details"}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
              {mod.name} · Department of Electrical and Information Engineering
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--bg-app)",
              border: "1px solid var(--border-color)",
              borderRadius: "50%",
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "24px 26px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
              Loading practical details and documentation…
            </div>
          ) : !p ? (
            <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
              Practical not found.
            </div>
          ) : (
            <>
              {/* Requirements for Full Completion */}
              <div
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 14,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3d83f6", fontWeight: 700, fontSize: "0.95rem" }}>
                    <ClipboardList size={18} />
                    <span>Requirements for Full Completion</span>
                  </div>
                  {isStaff && !editingContent && (
                    <button
                      type="button"
                      onClick={() => setEditingContent(true)}
                      style={{
                        padding: "5px 12px",
                        background: "transparent",
                        border: "1px solid var(--border-color)",
                        borderRadius: 6,
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Edit size={12} />
                      <span>Edit Requirements</span>
                    </button>
                  )}
                </div>

                {editingContent ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <textarea
                      value={completionReqs}
                      onChange={(e) => setCompletionReqs(e.target.value)}
                      rows={6}
                      placeholder="Specify step-by-step full completion criteria (Pre-Lab preparation, In-Lab experiment, Report submission)..."
                      style={{
                        width: "100%",
                        background: "var(--bg-card)",
                        border: "1px solid #3d83f6",
                        borderRadius: 8,
                        padding: "10px 12px",
                        color: "var(--text-main)",
                        fontSize: "0.85rem",
                        lineHeight: 1.6,
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setEditingContent(false)}
                        style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveContent}
                        disabled={savingContent}
                        style={{
                          padding: "6px 16px",
                          background: "#3d83f6",
                          border: "none",
                          borderRadius: 6,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          cursor: savingContent ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Save size={13} />
                        <span>{savingContent ? "Saving…" : "Save Requirements"}</span>
                      </button>
                    </div>
                  </div>
                ) : p.completionRequirements ? (
                  <div style={{ color: "var(--text-main)", fontSize: "0.88rem", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                    {p.completionRequirements}
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontStyle: "italic" }}>
                    No specific completion requirements listed yet. {isStaff && "Click 'Edit Requirements' to set pre-lab, in-lab, and evaluation criteria."}
                  </div>
                )}
              </div>

              {/* Safety Guidelines Card */}
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.04)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 14,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444", fontWeight: 700, fontSize: "0.95rem" }}>
                    <ShieldAlert size={18} />
                    <span>Laboratory Safety Instructions & PPE Regulations</span>
                  </div>
                  {isStaff && !editingContent && (
                    <button
                      type="button"
                      onClick={() => setEditingContent(true)}
                      style={{
                        padding: "5px 12px",
                        background: "transparent",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: 6,
                        color: "#ef4444",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Edit size={12} />
                      <span>Edit Safety Rules</span>
                    </button>
                  )}
                </div>

                {editingContent ? (
                  <textarea
                    value={safetyGuide}
                    onChange={(e) => setSafetyGuide(e.target.value)}
                    rows={4}
                    placeholder="Specify PPE requirements, high voltage/thermal warnings, emergency stop procedures..."
                    style={{
                      width: "100%",
                      background: "var(--bg-card)",
                      border: "1px solid #ef4444",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      lineHeight: 1.6,
                      boxSizing: "border-box",
                    }}
                  />
                ) : p.safetyGuidelines ? (
                  <div style={{ color: "var(--text-main)", fontSize: "0.86rem", lineHeight: 1.65, whiteSpace: "pre-line" }}>
                    {p.safetyGuidelines}
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontStyle: "italic" }}>
                    Standard laboratory electrical safety protocols apply. Safety footwear and protective glasses mandatory.
                  </div>
                )}
              </div>

              {/* Documents & Manuals Section */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      <BookOpen size={18} color="#10b981" />
                      <span>Lab Manuals & Guideline Documents</span>
                    </h3>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 2 }}>
                      Official materials for pre-lab preparation, hardware execution, and report format
                    </div>
                  </div>

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => setShowUploadForm((s) => !s)}
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        border: "none",
                        borderRadius: 8,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                      }}
                    >
                      <Upload size={14} />
                      <span>{showUploadForm ? "Hide Upload Form" : "Upload Document"}</span>
                    </button>
                  )}
                </div>

                {/* Upload Form (for Admin & Technician) */}
                {showUploadForm && isStaff && (
                  <form
                    onSubmit={handleUploadDocument}
                    style={{
                      background: "var(--bg-app)",
                      border: "1px dashed #10b981",
                      borderRadius: 12,
                      padding: "18px 20px",
                      marginBottom: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
                      <Upload size={16} />
                      <span>Upload New Document for {p.labNumber}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700, marginBottom: 4 }}>
                          DOCUMENT TITLE *
                        </label>
                        <input
                          type="text"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          placeholder="e.g. Lab Manual 2026 Revision"
                          required
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: "8px 12px",
                            color: "var(--text-main)",
                            fontSize: "0.85rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700, marginBottom: 4 }}>
                          DOCUMENT CATEGORY
                        </label>
                        <select
                          value={uploadDocType}
                          onChange={(e: any) => setUploadDocType(e.target.value)}
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            color: "var(--text-main)",
                            fontSize: "0.85rem",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="MANUAL">Lab Manual</option>
                          <option value="SAFETY">Safety Document</option>
                          <option value="GUIDELINE">Guideline / Datasheet</option>
                          <option value="OTHER">Other Resource</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700, marginBottom: 4 }}>
                          SELECT FILE (PDF, Word, Excel, ZIP)
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: "6px 10px",
                            color: "var(--text-main)",
                            fontSize: "0.8rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700, marginBottom: 4 }}>
                          OR EXTERNAL URL / CLOUD LINK
                        </label>
                        <input
                          type="url"
                          value={externalUrl}
                          onChange={(e) => setExternalUrl(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: "8px 12px",
                            color: "var(--text-main)",
                            fontSize: "0.85rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    {uploadError && (
                      <div style={{ color: "#ef4444", fontSize: "0.8rem", background: "#ef444415", padding: "8px 12px", borderRadius: 6 }}>
                        {uploadError}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setShowUploadForm(false)}
                        style={{ padding: "7px 16px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploading}
                        style={{
                          padding: "7px 20px",
                          background: "#10b981",
                          border: "none",
                          borderRadius: 6,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          cursor: uploading ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Upload size={13} />
                        <span>{uploading ? "Uploading…" : "Upload & Save"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Document Type Filter Tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {[
                    { id: "ALL", label: `All (${docs.length})` },
                    { id: "MANUAL", label: "📘 Lab Manuals" },
                    { id: "SAFETY", label: "⚠️ Safety Docs" },
                    { id: "GUIDELINE", label: "📋 Guidelines" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveDocTab(f.id)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 16,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: activeDocTab === f.id ? "#3d83f620" : "transparent",
                        border: `1px solid ${activeDocTab === f.id ? "#3d83f6" : "var(--border-color)"}`,
                        color: activeDocTab === f.id ? "#3d83f6" : "var(--text-muted)",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Documents List */}
                {filteredDocs.length === 0 ? (
                  <div
                    style={{
                      padding: 36,
                      textAlign: "center",
                      color: "var(--text-muted)",
                      background: "var(--bg-app)",
                      borderRadius: 12,
                      border: "1px dashed var(--border-color)",
                    }}
                  >
                    <BookOpen size={28} style={{ marginBottom: 8, opacity: 0.6 }} />
                    <div style={{ fontSize: "0.85rem" }}>No documents found for this category</div>
                    {isStaff && (
                      <div style={{ fontSize: "0.75rem", marginTop: 4, color: "#10b981" }}>
                        Click &quot;Upload Document&quot; above to attach manuals, safety rules, or templates.
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredDocs.map((doc) => {
                      const cfg = DOC_TYPE_CONFIG[doc.docType] || DOC_TYPE_CONFIG.OTHER;
                      const Icon = cfg.icon;
                      const downloadHref = doc.fileUrl.startsWith("http")
                        ? doc.fileUrl
                        : `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"}${doc.fileUrl}`;

                      return (
                        <div
                          key={doc.id}
                          style={{
                            background: "var(--bg-app)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 12,
                            padding: "14px 18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 14,
                            transition: "border-color 0.15s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 10,
                                background: cfg.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: cfg.color,
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={20} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.9rem" }}>
                                  {doc.title}
                                </span>
                                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: cfg.bg, color: cfg.color }}>
                                  {cfg.label}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.74rem", color: "var(--text-muted)" }}>
                                <span>{doc.fileName}</span>
                                {doc.fileSize && <span>· {formatFileSize(doc.fileSize)}</span>}
                                <span>· Uploaded {fmt(doc.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <a
                              href={downloadHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              style={{
                                textDecoration: "none",
                                padding: "7px 14px",
                                background: "#3d83f615",
                                border: "1px solid #3d83f640",
                                borderRadius: 8,
                                color: "#3d83f6",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </a>
                            {isStaff && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                title="Remove document"
                                style={{
                                  background: "#ef444415",
                                  border: "1px solid #ef444440",
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 26px",
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-app)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            ELABS Laboratory Management Platform · Ruhuna Engineering
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 22px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              color: "var(--text-main)",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Google Sheets / Excel Style Timetable Component ─────────────────────────
function LabScheduleSpreadsheet({
  mod,
  isStaff,
  initialSlots,
  onSlotsUpdated,
}: {
  mod: Module;
  isStaff: boolean;
  initialSlots: ScheduleSlot[];
  onSlotsUpdated: () => void;
}) {
  const [slots, setSlots] = useState<ScheduleSlot[]>(initialSlots);
  const [semesterModules, setSemesterModules] = useState<{ id: number; code: string; name: string }[]>([]);
  const [semesterGroups, setSemesterGroups] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Filters
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync when initialSlots updates
  useEffect(() => {
    setSlots(initialSlots);
  }, [initialSlots]);

  // Load semester timetable metadata (all modules in this semester)
  useEffect(() => {
    if (mod.semesterId) {
      apiFetch(`/academic/semesters/${mod.semesterId}/timetable`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.slots) && d.slots.length > 0) {
            setSlots(d.slots);
          }
          if (Array.isArray(d.modules)) {
            setSemesterModules(d.modules);
          }
          if (Array.isArray(d.groups)) {
            setSemesterGroups(d.groups);
          }
        })
        .catch((err) => console.warn("Failed to load semester timetable:", err));
    }
  }, [mod.semesterId]);

  // Handle cell edit
  const handleCellChange = (index: number, field: keyof ScheduleSlot, value: any) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      // If date changes, automatically calculate day of week
      if (field === "sessionDate" && value) {
        try {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            copy[index].dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
          }
        } catch {}
      }
      return copy;
    });
    setDirty(true);
  };

  const handleAddRow = () => {
    const today = new Date().toISOString().split("T")[0];
    const newSlot: ScheduleSlot = {
      sessionDate: today,
      dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }),
      timeSlot: "08:30 - 11:30",
      moduleCode: mod.code,
      labName: "Electric Machines and Power Electronics Laboratory",
      practicalName: "Lab 1",
      groupCode: "EE11",
      academicYear: "2026/2027",
      status: "UPCOMING",
      instructorName: mod.coordinatorName || "Lab Staff",
      notes: "",
    };
    setSlots((prev) => [newSlot, ...prev]);
    setDirty(true);
  };

  const handleDuplicateRow = (index: number) => {
    const target = slots[index];
    const copy = { ...target, id: undefined };
    setSlots((prev) => [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]);
    setDirty(true);
  };

  const handleDeleteRow = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const handleSaveTimetable = async () => {
    try {
      setSaving(true);
      const res = await apiFetch(`/academic/semesters/${mod.semesterId}/timetable`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: slots.map((s) => ({
            sessionDate: s.sessionDate ? s.sessionDate.split("T")[0] : new Date().toISOString().split("T")[0],
            dayOfWeek: s.dayOfWeek || "Monday",
            timeSlot: s.timeSlot,
            moduleCode: s.moduleCode,
            labName: s.labName || s.labLabel || "Laboratory",
            practicalName: s.practicalName || null,
            groupCode: s.groupCode,
            academicYear: s.academicYear || "2026/2027",
            status: s.status || "UPCOMING",
            instructorName: s.instructorName || null,
            notes: s.notes || null,
          })),
          notifyStudents: true,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        setDirty(false);
        onSlotsUpdated();
        alert("Master timetable saved successfully! Notifications dispatched to students.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save timetable");
      }
    } catch (e: any) {
      alert("Save error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Row", "Date", "Day", "Time Slot", "Module Code", "Laboratory", "Practical Name", "Group", "Staff In-Charge", "Status", "Notes"];
    const rows = filteredSlots.map((s, idx) => [
      idx + 1,
      s.sessionDate ? s.sessionDate.split("T")[0] : "",
      s.dayOfWeek || "",
      `"${s.timeSlot}"`,
      s.moduleCode,
      `"${s.labName || s.labLabel || ""}"`,
      `"${s.practicalName || ""}"`,
      s.groupCode,
      `"${s.instructorName || ""}"`,
      s.status,
      `"${s.notes || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${mod.semesterName.replace(/\s+/g, "_")}_Master_Lab_Timetable.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick toggle status in view mode
  const handleToggleStatus = async (slotId?: number, currentStatus?: string) => {
    if (!isStaff || !slotId) return;
    const nextStatus = currentStatus === "UPCOMING" ? "COMPLETED" : "UPCOMING";
    try {
      await apiFetch(`/academic/timetable/${slotId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: nextStatus as any } : s))
      );
      onSlotsUpdated();
    } catch {
      alert("Failed to update status");
    }
  };

  // Filtered view
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (selectedModule !== "ALL" && slot.moduleCode !== selectedModule) return false;
      if (selectedGroup !== "ALL" && slot.groupCode !== selectedGroup) return false;
      if (selectedStatus !== "ALL" && slot.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const str = `${slot.sessionDate} ${slot.dayOfWeek} ${slot.timeSlot} ${slot.moduleCode} ${slot.labName || slot.labLabel} ${slot.practicalName} ${slot.groupCode} ${slot.instructorName} ${slot.notes}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [slots, selectedModule, selectedGroup, selectedStatus, searchQuery]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Google Sheets Header / Ribbon */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.02))",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          borderRadius: 14,
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#10b98120",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                border: "1px solid #10b98140",
              }}
            >
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700 }}>
                  {mod.semesterName} Master Laboratory Timetable
                </h3>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#10b98120", color: "#10b981" }}>
                  Google Sheets View
                </span>
                {dirty && (
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#f59e0b20", color: "#f59e0b" }}>
                    Unsaved Edits
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 2 }}>
                Handles rotational schedules for all modules and groups in {mod.semesterName} · Department of EIE
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                padding: "8px 14px",
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                color: "var(--text-main)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            {isStaff && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  padding: "8px 18px",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 10px rgba(16, 185, 129, 0.25)",
                }}
              >
                <Edit size={14} />
                <span>Edit Timetable</span>
              </button>
            )}

            {isStaff && isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleAddRow}
                  style={{
                    padding: "8px 14px",
                    background: "#3d83f620",
                    border: "1px solid #3d83f650",
                    borderRadius: 8,
                    color: "#3d83f6",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={14} />
                  <span>Add Row</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSlots(initialSlots);
                    setDirty(false);
                  }}
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimetable}
                  disabled={saving}
                  style={{
                    padding: "8px 18px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Save size={14} />
                  <span>{saving ? "Saving…" : "Save Changes"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {/* Quick Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Filter size={12} /> FILTER:
            </span>

            {/* Quick button: Show All */}
            <button
              type="button"
              onClick={() => { setSelectedModule("ALL"); setSelectedGroup("ALL"); }}
              style={{
                padding: "4px 10px",
                borderRadius: 14,
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                background: selectedModule === "ALL" && selectedGroup === "ALL" ? "#10b98125" : "transparent",
                border: `1px solid ${selectedModule === "ALL" && selectedGroup === "ALL" ? "#10b981" : "var(--border-color)"}`,
                color: selectedModule === "ALL" && selectedGroup === "ALL" ? "#10b981" : "var(--text-muted)",
              }}
            >
              All Semester Labs
            </button>

            {/* Quick button: This Module */}
            <button
              type="button"
              onClick={() => setSelectedModule(mod.code)}
              style={{
                padding: "4px 10px",
                borderRadius: 14,
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                background: selectedModule === mod.code ? "#3d83f625" : "transparent",
                border: `1px solid ${selectedModule === mod.code ? "#3d83f6" : "var(--border-color)"}`,
                color: selectedModule === mod.code ? "#3d83f6" : "var(--text-muted)",
              }}
            >
              Only {mod.code}
            </button>

            {/* Module dropdown */}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: "0.76rem",
                color: "var(--text-main)",
              }}
            >
              <option value="ALL">All Modules</option>
              {semesterModules.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} - {m.name.length > 24 ? m.name.substring(0, 24) + "…" : m.name}
                </option>
              ))}
            </select>

            {/* Group dropdown */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: "0.76rem",
                color: "var(--text-main)",
              }}
            >
              <option value="ALL">All Groups</option>
              {semesterGroups.map((g) => (
                <option key={g} value={g}>
                  Group {g}
                </option>
              ))}
            </select>

            {/* Status dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: "0.76rem",
                color: "var(--text-main)",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Search box */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 10px" }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule…"
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-main)", fontSize: "0.76rem", width: 140 }}
            />
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div
        className="panel"
        style={{
          padding: 0,
          overflowX: "auto",
          borderRadius: 14,
          border: isEditing ? "2px solid #10b981" : "1px solid var(--border-color)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 1050 }}>
          <thead>
            {/* Column letters row like Excel / Google Sheets */}
            <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.7rem", fontFamily: "monospace" }}>
              <th style={{ width: 42, padding: "6px 8px", textAlign: "center", borderRight: "1px solid var(--border-color)" }}>#</th>
              <th style={{ padding: "6px 12px", textAlign: "left", borderRight: "1px solid var(--border-color)" }}>A · DATE</th>
              <th style={{ padding: "6px 12px", textAlign: "left", borderRight: "1px solid var(--border-color)" }}>B · DAY</th>
              <th style={{ padding: "6px 12px", textAlign: "left", borderRight: "1px solid var(--border-color)" }}>C · TIME SLOT</th>
              <th style={{ padding: "6px 12px", textAlign: "left", borderRight: "1px solid var(--border-color)" }}>D · MODULE</th>
              <th style={{ padding: "6px 12px", textAlign: "left", borderRight: "1px solid var(--border-color)" }}>E · LABORATORY ROOM</th>
              <th style={{ padding: "6px 12px", textAlign: "left", borderRight: "1px solid var(--border-color)" }}>F · PRACTICAL EXPERIMENT</th>
              <th style={{ padding: "6px 12px", textAlign: "center", borderRight: "1px solid var(--border-color)" }}>G · GROUP</th>
              <th style={{ padding: "6px 12px", textAlign: "left", borderRight: "1px solid var(--border-color)" }}>H · INSTRUCTOR</th>
              <th style={{ padding: "6px 12px", textAlign: "center", borderRight: "1px solid var(--border-color)" }}>I · STATUS</th>
              <th style={{ padding: "6px 12px", textAlign: "left", borderRight: isEditing ? "1px solid var(--border-color)" : "none" }}>J · NOTES</th>
              {isEditing && <th style={{ width: 80, padding: "6px 12px", textAlign: "center" }}>ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {filteredSlots.length === 0 ? (
              <tr>
                <td colSpan={isEditing ? 12 : 11} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                  <Calendar size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div>No timetable slots match the selected filters</div>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={handleAddRow}
                      style={{ marginTop: 10, padding: "6px 14px", background: "#10b98120", border: "1px solid #10b981", borderRadius: 6, color: "#10b981", fontSize: "0.78rem", cursor: "pointer", fontWeight: 700 }}
                    >
                      + Add First Slot
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredSlots.map((slot, idx) => {
                const isCurrentModule = slot.moduleCode === mod.code;
                const statusColor = slot.status === "COMPLETED" ? "#10b981" : slot.status === "ONGOING" ? "#3d83f6" : slot.status === "CANCELLED" ? "#ef4444" : "#f59e0b";
                const rowBg = isCurrentModule ? "rgba(61, 131, 246, 0.04)" : idx % 2 === 0 ? "transparent" : "var(--bg-app)";

                return (
                  <tr
                    key={slot.id || `new-${idx}`}
                    style={{
                      background: rowBg,
                      borderBottom: "1px solid var(--border-color)",
                      borderLeft: isCurrentModule ? "3px solid #3d83f6" : "none",
                    }}
                  >
                    {/* Row Index */}
                    <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--text-muted)", fontFamily: "monospace", borderRight: "1px solid var(--border-color)", fontSize: "0.75rem" }}>
                      {idx + 1}
                    </td>

                    {/* Date */}
                    <td style={{ padding: "8px 12px", borderRight: "1px solid var(--border-color)" }}>
                      {isEditing ? (
                        <input
                          type="date"
                          value={slot.sessionDate ? slot.sessionDate.split("T")[0] : ""}
                          onChange={(e) => handleCellChange(idx, "sessionDate", e.target.value)}
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: "var(--text-main)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Calendar size={12} color="#10b981" />
                          <span>{slot.sessionDate ? slot.sessionDate.split("T")[0] : "—"}</span>
                        </span>
                      )}
                    </td>

                    {/* Day */}
                    <td style={{ padding: "8px 12px", borderRight: "1px solid var(--border-color)", color: "var(--text-muted)", fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={slot.dayOfWeek || ""}
                          onChange={(e) => handleCellChange(idx, "dayOfWeek", e.target.value)}
                          placeholder="Monday"
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                          }}
                        />
                      ) : (
                        slot.dayOfWeek || fmtDate(slot.sessionDate)
                      )}
                    </td>

                    {/* Time Slot */}
                    <td style={{ padding: "8px 12px", borderRight: "1px solid var(--border-color)" }}>
                      {isEditing ? (
                        <select
                          value={slot.timeSlot}
                          onChange={(e) => handleCellChange(idx, "timeSlot", e.target.value)}
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 6px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                          }}
                        >
                          {RUHUNA_TIME_SLOTS.map((ts) => (
                            <option key={ts} value={ts}>{ts}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
                          <Clock size={11} />
                          <span>{slot.timeSlot}</span>
                        </span>
                      )}
                    </td>

                    {/* Module Code */}
                    <td style={{ padding: "8px 12px", borderRight: "1px solid var(--border-color)" }}>
                      {isEditing ? (
                        <select
                          value={slot.moduleCode}
                          onChange={(e) => handleCellChange(idx, "moduleCode", e.target.value)}
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 6px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                          }}
                        >
                          {semesterModules.map((m) => (
                            <option key={m.code} value={m.code}>{m.code}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: isCurrentModule ? "#3d83f620" : "var(--bg-card)",
                            border: `1px solid ${isCurrentModule ? "#3d83f650" : "var(--border-color)"}`,
                            color: isCurrentModule ? "#3d83f6" : "var(--text-main)",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                          }}
                        >
                          {slot.moduleCode}
                        </span>
                      )}
                    </td>

                    {/* Laboratory Room */}
                    <td style={{ padding: "8px 12px", borderRight: "1px solid var(--border-color)" }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={slot.labName || slot.labLabel || ""}
                          onChange={(e) => handleCellChange(idx, "labName", e.target.value)}
                          placeholder="e.g. Electric Machines Lab"
                          list="standard-labs-list"
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                          }}
                        />
                      ) : (
                        <span style={{ color: "var(--text-main)", fontWeight: 600 }}>
                          {slot.labName || slot.labLabel || "Laboratory"}
                        </span>
                      )}
                    </td>

                    {/* Practical Experiment */}
                    <td style={{ padding: "8px 12px", borderRight: "1px solid var(--border-color)" }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={slot.practicalName || ""}
                          onChange={(e) => handleCellChange(idx, "practicalName", e.target.value)}
                          placeholder="e.g. Lab 1: Solar PV Characterization"
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                          }}
                        />
                      ) : (
                        <span style={{ color: slot.practicalName ? "var(--text-main)" : "var(--text-muted)", fontStyle: slot.practicalName ? "normal" : "italic" }}>
                          {slot.practicalName || "Practical Session"}
                        </span>
                      )}
                    </td>

                    {/* Group */}
                    <td style={{ padding: "8px 12px", textAlign: "center", borderRight: "1px solid var(--border-color)" }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={slot.groupCode}
                          onChange={(e) => handleCellChange(idx, "groupCode", e.target.value.toUpperCase())}
                          placeholder="EE01"
                          style={{
                            width: 65,
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 6px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        />
                      ) : (
                        <span style={{ background: "#1dd5e615", border: "1px solid #1dd5e640", borderRadius: 4, padding: "2px 8px", color: "#1dd5e6", fontWeight: 700, fontSize: "0.75rem" }}>
                          {slot.groupCode}
                        </span>
                      )}
                    </td>

                    {/* Staff In-Charge / Instructor */}
                    <td style={{ padding: "8px 12px", borderRight: "1px solid var(--border-color)" }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={slot.instructorName || ""}
                          onChange={(e) => handleCellChange(idx, "instructorName", e.target.value)}
                          placeholder="e.g. Eng. Samantha Perera"
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                          }}
                        />
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          {slot.instructorName || "Lab Staff"}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "8px 12px", textAlign: "center", borderRight: isEditing ? "1px solid var(--border-color)" : "none" }}>
                      {isEditing ? (
                        <select
                          value={slot.status}
                          onChange={(e) => handleCellChange(idx, "status", e.target.value)}
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 6px",
                            color: statusColor,
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        >
                          <option value="UPCOMING">UPCOMING</option>
                          <option value="ONGOING">ONGOING</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(slot.id, slot.status)}
                          disabled={!isStaff}
                          title={isStaff ? "Click to toggle status" : undefined}
                          style={{
                            background: statusColor + "18",
                            color: statusColor,
                            border: `1px solid ${statusColor}40`,
                            borderRadius: 14,
                            padding: "2px 10px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            cursor: isStaff ? "pointer" : "default",
                          }}
                        >
                          {slot.status}
                        </button>
                      )}
                    </td>

                    {/* Notes */}
                    <td style={{ padding: "8px 12px", borderRight: isEditing ? "1px solid var(--border-color)" : "none" }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={slot.notes || ""}
                          onChange={(e) => handleCellChange(idx, "notes", e.target.value)}
                          placeholder="Special instructions..."
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 4,
                            padding: "4px 8px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                          }}
                        />
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          {slot.notes || "—"}
                        </span>
                      )}
                    </td>

                    {/* Actions column in Edit mode */}
                    {isEditing && (
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(idx)}
                            title="Duplicate slot"
                            style={{ background: "#3d83f615", border: "1px solid #3d83f640", borderRadius: 4, padding: "3px 6px", color: "#3d83f6", cursor: "pointer" }}
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            title="Delete slot"
                            style={{ background: "#ef444415", border: "1px solid #ef444440", borderRadius: 4, padding: "3px 6px", color: "#ef4444", cursor: "pointer" }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Datalist for autocomplete */}
        <datalist id="standard-labs-list">
          {STANDARD_LAB_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

// ─── Edit Module Modal ────────────────────────────────────────────────────────
function EditPracticalsModal({ mod, practicals, token, onClose, onSaved }: {
  mod: Module; practicals: Practical[]; token: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [rows, setRows] = useState(
    practicals.map(p => ({ labNumber: p.labNumber, labTitle: p.labTitle ?? "", equipStatus: p.equipStatus, numSessions: p.numSessions, notes: p.notes ?? "" }))
  );
  const [coordinatorName, setCoordinatorName] = useState(mod.coordinatorName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError("");
    try {
      await apiFetch(`/academic/modules/${mod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinatorName }),
      });
      await apiFetch(`/academic/modules/${mod.id}/practicals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practicals: rows.map((r, i) => ({
            labNumber: r.labNumber, labTitle: r.labTitle || undefined,
            equipStatus: r.equipStatus, numSessions: r.numSessions,
            notes: r.notes || undefined, sortOrder: i + 1,
          }))
        }),
      });
      onSaved(); onClose();
    } catch { setError("Failed to save changes"); }
    finally { setSaving(false); }
  };

  const updateRow = (i: number, field: string, val: string | number) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const addRow = () => setRows(prev => [...prev, { labNumber: `Lab ${prev.length + 1}`, labTitle: "", equipStatus: "Working", numSessions: 0, notes: "" }]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, width: "min(780px,96vw)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, color: "var(--text-main)", fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
            <Edit size={16} />
            <span>Edit Module Practicals: {mod.code}</span>
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 1 }}>MODULE COORDINATOR</label>
            <input value={coordinatorName} onChange={e => setCoordinatorName(e.target.value)}
              placeholder="e.g. Dr. Kaveen Liyanage"
              style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "9px 14px", fontSize: "0.9rem", boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 10, letterSpacing: 1 }}>LIST OF PRACTICALS</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 80px auto", gap: 8, alignItems: "center" }}>
                  <input value={row.labNumber} onChange={e => updateRow(i, "labNumber", e.target.value)}
                    style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "7px 10px", fontSize: "0.82rem" }} />
                  <input value={row.labTitle} onChange={e => updateRow(i, "labTitle", e.target.value)}
                    placeholder="Lab title (optional)"
                    style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "7px 10px", fontSize: "0.82rem" }} />
                  <select value={row.equipStatus} onChange={e => updateRow(i, "equipStatus", e.target.value)}
                    style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "7px 8px", fontSize: "0.8rem" }}>
                    <option value="Working">Working</option>
                    <option value="Not Working">Not Working</option>
                    <option value="Under Maintenance">Maintenance</option>
                  </select>
                  <input type="number" value={row.numSessions} min={0} onChange={e => updateRow(i, "numSessions", Number(e.target.value))}
                    placeholder="Sessions"
                    style={{ background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "7px 10px", fontSize: "0.82rem", textAlign: "center" }} />
                  <button onClick={() => removeRow(i)}
                    style={{ background: "#ff4d5720", border: "1px solid #ff4d5740", borderRadius: 6, color: "#ff4d57", padding: "7px 10px", cursor: "pointer", fontSize: "0.8rem" }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={addRow}
              style={{ marginTop: 10, padding: "8px 18px", background: "transparent", border: "1px dashed var(--border-color)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer", fontSize: "0.82rem" }}>
              + Add Lab
            </button>
          </div>

          {error && <div style={{ color: "#ff4d57", fontSize: "0.85rem", background: "#ff4d5715", padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> {error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "9px 22px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
            <button onClick={save} disabled={saving}
              style={{ padding: "9px 24px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              <Save size={14} />
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [mod, setMod] = useState<Module | null>(null);
  const [practicals, setPracticals] = useState<Practical[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"practicals" | "schedule" | "sessions" | "assignments" | "quizzes">("practicals");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Detailed modal for single practical
  const [selectedPracticalId, setSelectedPracticalId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const queryTab = sp.get("tab");
      if (
        queryTab &&
        ["practicals", "schedule", "sessions", "assignments", "quizzes"].includes(queryTab)
      ) {
        setTab(queryTab as any);
      }
    }
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        const queryTab = sp.get("tab");
        if (
          queryTab &&
          ["practicals", "schedule", "sessions", "assignments", "quizzes"].includes(queryTab)
        ) {
          setTab(queryTab as any);
        }
      }
    };
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  const switchTab = (nextTab: typeof tab) => {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  useEffect(() => {
    try {
      const u = JSON.parse(readStorage("elabs_user") ?? "{}");
      const roles = u?.roles ?? [];
      setIsAdmin(roles.includes("SYSTEM_ADMIN"));
      setIsStaff(roles.some((r: string) => ["SYSTEM_ADMIN", "TECHNICIAN", "LECTURER"].includes(r)));
    } catch {}
  }, []);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch(`/academic/modules/${moduleId}`).then((r) => r.json()),
      apiFetch(`/academic/modules/${moduleId}/assignments`).then((r) => (r.ok ? r.json() : { assignments: [] })),
      apiFetch(`/academic/modules/${moduleId}/quizzes`).then((r) => (r.ok ? r.json() : { quizzes: [] })),
    ])
      .then(([d, ad, qd]) => {
        setMod(d.module);
        setPracticals(d.practicals ?? []);
        setSchedule(d.schedule ?? []);
        setSessions(d.sessions ?? []);
        setAssignments(ad.assignments ?? []);
        setQuizzes(qd.quizzes ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [moduleId]);

  const exportModuleGrades = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
    const token = readStorage("elabs_access_token") || "";
    window.open(`${apiBase}/academic/modules/${moduleId}/export-grades?token=${encodeURIComponent(token)}`, "_blank");
  };

  const pending = sessions.filter((s) => !(s.attended && s.reportSubmitted));
  const done = sessions.filter((s) => s.attended && s.reportSubmitted);

  const tabStyle = (t: typeof tab, color: string) => ({
    padding: "9px 22px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer" as const,
    background: tab === t ? `${color}20` : "transparent",
    border: `1px solid ${tab === t ? color : "var(--border-color)"}`,
    color: tab === t ? color : "var(--text-muted)",
    transition: "all 0.2s",
  });

  if (loading) {
    return (
      <AppShell title="Loading…" subtitle="">
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading module…</div>
      </AppShell>
    );
  }
  if (!mod) {
    return (
      <AppShell title="Not found" subtitle="">
        <div style={{ padding: 60, textAlign: "center", color: "#ff4d57" }}>Module not found</div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`${mod.code}: ${mod.name}`} subtitle={`${mod.semesterName} · Department of EIE`}>
      {editOpen && isAdmin && (
        <EditPracticalsModal
          mod={mod}
          practicals={practicals}
          token={readStorage("elabs_access_token") ?? ""}
          onClose={() => setEditOpen(false)}
          onSaved={load}
        />
      )}

      {selectedPracticalId !== null && (
        <PracticalDetailsModal
          practicalId={selectedPracticalId}
          mod={mod}
          isStaff={isStaff}
          onClose={() => setSelectedPracticalId(null)}
          onUpdated={load}
        />
      )}

      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
        <Link href="/labs" style={{ color: "#3d83f6", textDecoration: "none" }}>Lab Groups</Link>
        <span>›</span>
        <Link href={`/labs/${mod.semesterId}`} style={{ color: "#3d83f6", textDecoration: "none" }}>{mod.semesterName}</Link>
        <span>›</span>
        <span style={{ color: "var(--text-main)" }}>{mod.code}</span>
      </div>

      {/* Module header card */}
      <div style={{ background: "linear-gradient(135deg,var(--bg-card),var(--bg-app))", border: "1px solid var(--border-color)", borderRadius: 14, padding: "22px 26px", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: 1, color: "#3d83f6", background: "#3d83f615", padding: "3px 12px", borderRadius: 20 }}>
                {mod.code}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>· {mod.semesterName}</span>
            </div>
            <h1 style={{ margin: "0 0 12px", color: "var(--text-main)", fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.4 }}>{mod.name}</h1>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {mod.coordinatorName && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: "0.8rem" }}>
                    {mod.coordinatorName.split(" ").pop()?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.88rem" }}>{mod.coordinatorName}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Module Coordinator</div>
                  </div>
                </div>
              )}
              {mod.semesterCoordinator && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1dd5e620", border: "1px solid #1dd5e640", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#1dd5e6", fontSize: "0.8rem" }}>
                    {mod.semesterCoordinator.split(" ").pop()?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.88rem" }}>{mod.semesterCoordinator}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Semester Coordinator</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
            {/* Stats */}
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ textAlign: "center", background: "var(--bg-app)", borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ color: "#3d83f6", fontWeight: 700, fontSize: "1.4rem" }}>{practicals.length}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>LABS</div>
              </div>
              <div style={{ textAlign: "center", background: "var(--bg-app)", borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ color: "#18d18f", fontWeight: 700, fontSize: "1.4rem" }}>{mod.numStudents}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>STUDENTS</div>
              </div>
              <div style={{ textAlign: "center", background: "var(--bg-app)", borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ color: "#10b981", fontWeight: 700, fontSize: "1.4rem" }}>{schedule.length}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 600 }}>SESSIONS</div>
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={exportModuleGrades}
                  style={{ padding: "9px 18px", background: "#10b981", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={14} />
                  <span>Export Grades</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  style={{ padding: "9px 18px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <button type="button" style={tabStyle("practicals", "#3d83f6")} onClick={() => switchTab("practicals")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FlaskConical size={14} />
            <span>List of Practicals</span>
          </span>
        </button>
        <button type="button" style={tabStyle("schedule", "#10b981")} onClick={() => switchTab("schedule")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FileSpreadsheet size={14} />
            <span>Lab Schedule</span>
            {schedule.length > 0 && <span style={{ background: "#10b98130", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem" }}>{schedule.length}</span>}
          </span>
        </button>
        <button type="button" style={tabStyle("sessions", "#18d18f")} onClick={() => switchTab("sessions")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ClipboardList size={14} />
            <span>Sessions</span>
            {sessions.length > 0 && <span style={{ background: "#18d18f30", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem" }}>{sessions.length}</span>}
          </span>
        </button>
        <button type="button" style={tabStyle("assignments", "#f59e0b")} onClick={() => switchTab("assignments")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FileText size={14} />
            <span>Assignments</span>
            {assignments.length > 0 && <span style={{ background: "#f59e0b30", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem" }}>{assignments.length}</span>}
          </span>
        </button>
        <button type="button" style={tabStyle("quizzes", "#8b5cf6")} onClick={() => switchTab("quizzes")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={14} />
            <span>Quizzes</span>
            {quizzes.length > 0 && <span style={{ background: "#8b5cf630", borderRadius: 20, padding: "1px 8px", fontSize: "0.7rem" }}>{quizzes.length}</span>}
          </span>
        </button>
      </div>

      {/* ─── PRACTICALS TAB ─── */}
      {tab === "practicals" && (
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.95rem" }}>
                List of Practicals — {mod.code}
              </span>
              <div style={{ color: "var(--text-muted)", fontSize: "0.76rem", marginTop: 2 }}>
                Click on any practical to view completion requirements, safety rules, and download lab manuals
              </div>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>
              University of Ruhuna · Faculty of Engineering · EIE Dept.
            </span>
          </div>

          {practicals.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)" }}>
              <FlaskConical size={36} style={{ marginBottom: 10 }} />
              <div>No practicals listed yet{isAdmin && " — click Edit to add"}</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-app)" }}>
                  {["Lab", "Lab Title & Details", "Equipment Status", "Sessions", "Manuals & Guidelines", "Action"].map((h) => (
                    <th key={h} style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.74rem", letterSpacing: 0.8, textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {practicals.map((p, i) => {
                  const cfg = EQUIP_CONFIG[p.equipStatus] ?? EQUIP_CONFIG["Working"];
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPracticalId(p.id)}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        background: i % 2 === 0 ? "transparent" : "var(--bg-app)",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "var(--bg-app)")}
                    >
                      <td style={{ padding: "14px 18px", color: "#3d83f6", fontWeight: 700, width: 90 }}>
                        {p.labNumber}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ color: p.labTitle ? "var(--text-main)" : "#2d4a6a", fontWeight: 600, fontSize: "0.92rem", marginBottom: 3 }}>
                          {p.labTitle ?? "Title not specified"}
                        </div>
                        {p.completionRequirements && (
                          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", maxWidth: 460, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.completionRequirements}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "3px 12px", fontSize: "0.78rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <cfg.icon size={12} />
                          <span>{p.equipStatus}</span>
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", color: p.numSessions > 0 ? "var(--text-main)" : "var(--text-muted)", fontWeight: 600 }}>
                        {p.numSessions > 0 ? `${p.numSessions} session` : "—"}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              background: (p.documentCount || 0) > 0 ? "#10b98115" : "var(--bg-card)",
                              border: `1px solid ${(p.documentCount || 0) > 0 ? "#10b98140" : "var(--border-color)"}`,
                              color: (p.documentCount || 0) > 0 ? "#10b981" : "var(--text-muted)",
                              borderRadius: 14,
                              padding: "3px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <BookOpen size={12} />
                            <span>{(p.documentCount || 0) > 0 ? `${p.documentCount} Document(s)` : "Upload Needed"}</span>
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPracticalId(p.id);
                          }}
                          style={{
                            padding: "6px 14px",
                            background: "transparent",
                            border: "1px solid #3d83f650",
                            borderRadius: 6,
                            color: "#3d83f6",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span>View Details</span>
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── SCHEDULE TAB (EXCEL / GOOGLE SHEETS MASTER TIMETABLE) ─── */}
      {tab === "schedule" && (
        <LabScheduleSpreadsheet
          mod={mod}
          isStaff={isStaff}
          initialSlots={schedule}
          onSlotsUpdated={load}
        />
      )}

      {/* ─── SESSIONS TAB ─── */}
      {tab === "sessions" && (
        <div>
          {sessions.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)" }}>
              <ClipboardList size={36} style={{ marginBottom: 10 }} />
              <div>No sessions recorded yet</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                {[
                  { label: "Total", val: sessions.length, color: "var(--text-muted)" },
                  { label: "Pending", val: pending.length, color: "#f3ae2a" },
                  { label: "Completed", val: done.length, color: "#18d18f" },
                ].map((s) => (
                  <div key={s.label} style={{ flex: 1, minWidth: 100, background: "var(--bg-card)", border: `1px solid ${s.color}25`, borderRadius: 10, padding: "14px 18px" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ color: s.color, fontWeight: 700, fontSize: "1.5rem" }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sessions.map((session, idx) => {
                  const isDone = session.attended && session.reportSubmitted;
                  const badge = isDone ? { label: "Done", color: "#18d18f", bg: "#18d18f15" }
                    : session.status === "ONGOING" ? { label: "Ongoing", color: "#3d83f6", bg: "#3d83f615" }
                    : { label: "Pending", color: "#f3ae2a", bg: "#f3ae2a15" };
                  return (
                    <Link key={session.id} href={`/labs/session/${session.id}`} style={{ textDecoration: "none" }}>
                      <article
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "15px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#2a4a7a")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)")}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${badge.color}20`, border: `1px solid ${badge.color}50`, display: "flex", alignItems: "center", justifyContent: "center", color: badge.color, fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ color: "var(--text-main)", fontWeight: 600 }}>{session.title}</span>
                            <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          </div>
                          <div style={{ display: "flex", gap: 14, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {fmt(session.scheduledDate)}</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {session.durationHours}h</span>
                            {session.attended && <span style={{ color: "#18d18f", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> Attended</span>}
                            {session.reportSubmitted && <span style={{ color: "#18d18f", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> Report</span>}
                          </div>
                        </div>
                        <span style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>›</span>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── ASSIGNMENTS TAB ─── */}
      {tab === "assignments" && (
        <div>
          {isAdmin && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <Link href={`/labs/module/${moduleId}/assignment/create`}>
                <button
                  type="button"
                  style={{ padding: "9px 20px", background: "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Plus size={14} />
                  <span>Create Assignment</span>
                </button>
              </Link>
            </div>
          )}
          {assignments.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)" }}>
              <FileText size={36} style={{ marginBottom: 10 }} />
              <div>No assignments yet{isAdmin && " — click Create Assignment to add one"}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {assignments.map((asgn) => {
                const isSubmitted = !!asgn.submittedAt;
                const isGraded = asgn.score !== null;
                const isOverdue = asgn.dueAt && new Date(asgn.dueAt) < new Date() && !isSubmitted;
                const typeColor = asgn.type === "REPORT" ? "#f59e0b" : asgn.type === "PRE_LAB" ? "#10b981" : "#6366f1";
                const typeLabel = asgn.type === "REPORT" ? "Lab Report" : asgn.type === "PRE_LAB" ? "Pre-Lab" : "Assignment";

                return (
                  <Link key={asgn.id} href={`/labs/module/${moduleId}/assignment/${asgn.id}`} style={{ textDecoration: "none" }}>
                    <div
                      id={`assignment-${asgn.id}`}
                      style={{
                        background: "var(--bg-card)",
                        border: `1px solid ${isOverdue ? "#ef444440" : "var(--border-color)"}`,
                        borderLeft: `4px solid ${typeColor}`,
                        borderRadius: "0 12px 12px 0",
                        padding: "16px 20px",
                        cursor: "pointer",
                        transition: "border-color 0.15s, box-shadow 0.3s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = typeColor + "80")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = isOverdue ? "#ef444440" : "var(--border-color)")}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: typeColor + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FileText size={18} color={typeColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>{asgn.title}</span>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: typeColor + "25", color: typeColor }}>{typeLabel}</span>
                          {isGraded && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#18d18f20", color: "#18d18f" }}>✓ Graded</span>}
                          {isSubmitted && !isGraded && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#3d83f620", color: "#3d83f6" }}>Submitted</span>}
                          {isOverdue && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#ef444420", color: "#ef4444" }}>⚠ Overdue</span>}
                        </div>
                        <div style={{ display: "flex", gap: 18, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                          {asgn.openedAt && <span>Opened: {fmt(asgn.openedAt)}</span>}
                          {asgn.dueAt && <span style={{ color: isOverdue ? "#ef4444" : "var(--text-muted)" }}>Due: {fmt(asgn.dueAt)}</span>}
                          <span>Max score: {asgn.maxScore}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {isGraded ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#18d18f" }}>{asgn.score}<span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/{asgn.maxScore}</span></div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Score</div>
                          </div>
                        ) : isSubmitted ? (
                          <div style={{ color: "#3d83f6", fontSize: "0.8rem", fontWeight: 600 }}>Awaiting grade</div>
                        ) : (
                          <div style={{ color: isOverdue ? "#ef4444" : "var(--text-muted)", fontSize: "0.8rem" }}>
                            {isOverdue ? "Not submitted" : "Not yet submitted"}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── QUIZZES TAB ─── */}
      {tab === "quizzes" && (
        <div>
          {isAdmin && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <Link href={`/labs/module/${moduleId}/quiz/create`}>
                <button
                  type="button"
                  style={{ padding: "9px 20px", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Plus size={14} />
                  <span>Create Quiz</span>
                </button>
              </Link>
            </div>
          )}
          {quizzes.length === 0 ? (
            <div style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 14, border: "1px dashed var(--border-color)" }}>
              <BookOpen size={36} style={{ marginBottom: 10 }} />
              <div>No quizzes yet{isAdmin && " — click Create Quiz to add one"}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {quizzes.map((quiz) => {
                const now = new Date();
                const isOpen = (!quiz.openedAt || new Date(quiz.openedAt) <= now) && (!quiz.closedAt || new Date(quiz.closedAt) >= now);
                const isClosed = quiz.closedAt && new Date(quiz.closedAt) < now;
                const isCompleted = !!quiz.attemptSubmittedAt;
                const pct = quiz.attemptScore !== null && quiz.attemptMaxScore ? Math.round((quiz.attemptScore / quiz.attemptMaxScore) * 100) : null;
                const pctColor = pct === null ? "var(--text-muted)" : pct >= 75 ? "#18d18f" : pct >= 50 ? "#f59e0b" : "#ef4444";

                return (
                  <div key={quiz.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderLeft: "4px solid #8b5cf6", borderRadius: "0 12px 12px 0", padding: "18px 20px", display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#8b5cf620", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <BookOpen size={20} color="#8b5cf6" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>{quiz.title}</span>
                        {isCompleted && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#18d18f20", color: "#18d18f" }}>✓ Completed</span>}
                        {!isCompleted && isOpen && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#8b5cf620", color: "#8b5cf6" }}>Open</span>}
                        {isClosed && !isCompleted && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#ef444420", color: "#ef4444" }}>Closed</span>}
                      </div>
                      <div style={{ display: "flex", gap: 18, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {quiz.timeLimitMins} min</span>
                        <span>{quiz.questionCount} questions · {quiz.totalPoints} pts</span>
                        {quiz.closedAt && <span>Closes: {fmt(quiz.closedAt)}</span>}
                        <span>Max attempts: {quiz.maxAttempts}</span>
                      </div>
                      {quiz.description && <div style={{ marginTop: 6, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{quiz.description.substring(0, 120)}{quiz.description.length > 120 ? "…" : ""}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                      {isCompleted && pct !== null && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 700, fontSize: "1.3rem", color: pctColor }}>{pct}%</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{quiz.attemptScore}/{quiz.attemptMaxScore} pts</div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        {isAdmin && (
                          <Link href={`/labs/module/${moduleId}/quiz/${quiz.id}/results`}>
                            <button
                              type="button"
                              style={{ padding: "6px 14px", background: "#8b5cf615", border: "1px solid #8b5cf640", borderRadius: 8, color: "#8b5cf6", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <BarChart2 size={12} /> Results
                            </button>
                          </Link>
                        )}
                        {(!isCompleted || (quiz.attemptNumber !== null && quiz.attemptNumber < quiz.maxAttempts)) && isOpen && !isAdmin && (
                          <Link href={`/labs/module/${moduleId}/quiz/${quiz.id}`}>
                            <button
                              type="button"
                              style={{ padding: "6px 16px", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", border: "none", borderRadius: 8, color: "#fff", fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}
                            >
                              {isCompleted ? "Retake" : "Start Quiz"}
                            </button>
                          </Link>
                        )}
                        {isCompleted && (
                          <Link href={`/labs/module/${moduleId}/quiz/${quiz.id}`}>
                            <button
                              type="button"
                              style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Eye size={12} /> View Result
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
