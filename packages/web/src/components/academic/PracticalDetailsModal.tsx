"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  X,
  ClipboardList,
  ShieldAlert,
  Edit,
  BookOpen,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

export type PracticalDocument = {
  id: number;
  docType: "MANUAL" | "SAFETY" | "GUIDELINE" | "OTHER";
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  createdAt: string;
  uploadedByName?: string | null;
};

export type PracticalDetail = {
  id: number;
  moduleCode: string;
  labNumber: string;
  labTitle?: string;
  equipStatus: "Working" | "Not Working" | "Under Maintenance";
  numSessions?: number;
  notes?: string;
  completionRequirements?: string | null;
  safetyGuidelines?: string | null;
  moduleName?: string;
};

const DOC_TAB_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ALL: { label: "All Documents", color: "#3d83f6", icon: FileText },
  MANUAL: { label: "Lab Manuals", color: "#10b981", icon: BookOpen },
  SAFETY: { label: "Safety Regulations", color: "#ef4444", icon: ShieldAlert },
  GUIDELINE: { label: "Report Guidelines", color: "#f59e0b", icon: ClipboardList },
};

const EQUIP_CONFIG = {
  Working: { color: "#18d18f", bg: "#18d18f15", icon: CheckCircle2 },
  "Not Working": { color: "#ff4d57", bg: "#ff4d5715", icon: AlertCircle },
  "Under Maintenance": { color: "#f59e0b", bg: "#f59e0b15", icon: AlertTriangle },
};

export function PracticalDetailsModal({
  practicalId,
  mod,
  isStaff = false,
  onClose,
  onUpdated,
}: {
  practicalId: number;
  mod?: { code: string; name?: string };
  isStaff?: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [data, setData] = useState<{ practical: PracticalDetail; documents: PracticalDocument[] } | null>(null);
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
        if (onUpdated) onUpdated();
      }
    } catch {
      alert("Failed to update practical requirements");
    } finally {
      setSavingContent(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      setUploadError("Document title is required.");
      return;
    }
    if (!selectedFile && !externalUrl.trim()) {
      setUploadError("Please choose a file or provide an external URL.");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");

      const formData = new FormData();
      formData.append("title", uploadTitle);
      formData.append("docType", uploadDocType);
      if (externalUrl.trim()) {
        formData.append("externalUrl", externalUrl.trim());
      }
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const res = await apiFetch(`/academic/practicals/${practicalId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        setUploadError(d.error || "Upload failed");
        return;
      }

      setShowUploadForm(false);
      setUploadTitle("");
      setSelectedFile(null);
      setExternalUrl("");
      loadDetails();
      if (onUpdated) onUpdated();
    } catch {
      setUploadError("Failed to upload document. Network or server error.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await apiFetch(`/academic/practicals/${practicalId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadDetails();
        if (onUpdated) onUpdated();
      }
    } catch {
      alert("Failed to delete document");
    }
  };

  const p = data?.practical;
  const docs = data?.documents || [];

  const filteredDocs = docs.filter((d) => {
    if (activeDocTab === "ALL") return true;
    return d.docType === activeDocTab;
  });

  const equipCfg = p ? EQUIP_CONFIG[p.equipStatus] || EQUIP_CONFIG["Working"] : EQUIP_CONFIG["Working"];
  const moduleCode = mod?.code || p?.moduleCode || "MODULE";
  const moduleName = mod?.name || p?.moduleName || "Electrical and Information Engineering";

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
                {moduleCode} · {p?.labNumber || "Practical"}
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
              {moduleName} · Department of Electrical and Information Engineering
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
                        style={{ padding: "6px 16px", background: "#3d83f6", border: "none", borderRadius: 6, color: "#fff", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
                      >
                        {savingContent ? "Saving…" : "Save Requirements"}
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
                            fontSize: "0.84rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700, marginBottom: 4 }}>
                          CATEGORY *
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
                            fontSize: "0.84rem",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="MANUAL">Lab Manual</option>
                          <option value="SAFETY">Safety Document</option>
                          <option value="GUIDELINE">Report Guidelines</option>
                          <option value="OTHER">Other Reference</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 700, marginBottom: 4 }}>
                          ATTACH FILE (PDF, DOCX, ZIP)
                        </label>
                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedFile(e.target.files[0]);
                              if (!uploadTitle) setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                            }
                          }}
                          style={{
                            width: "100%",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: "6px 8px",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
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
                            fontSize: "0.84rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    {uploadError && (
                      <div style={{ color: "#ef4444", fontSize: "0.8rem", background: "rgba(239, 68, 68, 0.1)", padding: "6px 10px", borderRadius: 6 }}>
                        {uploadError}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setShowUploadForm(false)}
                        style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploading}
                        style={{
                          padding: "6px 18px",
                          background: "#10b981",
                          border: "none",
                          borderRadius: 6,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Upload size={14} />
                        <span>{uploading ? "Uploading…" : "Save & Upload"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Filter Pills */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
                  {Object.entries(DOC_TAB_CONFIG).map(([tabKey, cfg]) => {
                    const active = activeDocTab === tabKey;
                    const count = tabKey === "ALL" ? docs.length : docs.filter((d) => d.docType === tabKey).length;
                    return (
                      <button
                        key={tabKey}
                        type="button"
                        onClick={() => setActiveDocTab(tabKey)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: active ? `1px solid ${cfg.color}` : "1px solid var(--border-color)",
                          background: active ? `${cfg.color}15` : "var(--bg-app)",
                          color: active ? cfg.color : "var(--text-muted)",
                          fontWeight: active ? 700 : 500,
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>{cfg.label}</span>
                        <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: 10, background: active ? cfg.color : "var(--border-color)", color: active ? "#fff" : "var(--text-muted)" }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Documents List */}
                {filteredDocs.length === 0 ? (
                  <div
                    style={{
                      padding: "36px 20px",
                      textAlign: "center",
                      background: "var(--bg-app)",
                      borderRadius: 12,
                      border: "1px dashed var(--border-color)",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    No documents found in this category. {isStaff && "Click 'Upload Document' above to add manuals or safety rules."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredDocs.map((doc) => {
                      const cfg = DOC_TAB_CONFIG[doc.docType] || DOC_TAB_CONFIG["ALL"];
                      const sizeStr = doc.fileSize ? `${(doc.fileSize / (1024 * 1024)).toFixed(2)} MB` : "";
                      return (
                        <div
                          key={doc.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 14,
                            padding: "12px 16px",
                            background: "var(--bg-app)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 10,
                            transition: "border-color 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 8,
                                background: `${cfg.color}18`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                color: cfg.color,
                              }}
                            >
                              <FileText size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>{doc.title}</span>
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: `${cfg.color}20`, color: cfg.color }}>
                                  {cfg.label}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                                <span>{doc.fileName}</span>
                                {sizeStr && <span>• {sizeStr}</span>}
                                {doc.uploadedByName && <span>• Uploaded by {doc.uploadedByName}</span>}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <a
                              href={doc.fileUrl.startsWith("http") ? doc.fileUrl : `http://localhost:4000${doc.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              download={doc.fileName}
                              style={{
                                padding: "6px 14px",
                                background: "linear-gradient(135deg, #3d83f6, #2563eb)",
                                color: "#fff",
                                borderRadius: 6,
                                textDecoration: "none",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                boxShadow: "0 2px 6px rgba(59, 130, 246, 0.25)",
                              }}
                            >
                              {doc.fileUrl.startsWith("http") ? <ExternalLink size={13} /> : <Download size={13} />}
                              <span>{doc.fileUrl.startsWith("http") ? "Open Link" : "Download"}</span>
                            </a>

                            {isStaff && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                title="Delete document"
                                style={{
                                  padding: "6px 8px",
                                  background: "transparent",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  borderRadius: 6,
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
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
      </div>
    </div>
  );
}
