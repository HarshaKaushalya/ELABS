"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  FileText, Calendar, Clock, Award, Upload, Download,
  CheckCircle, AlertTriangle, ArrowLeft, Send, Check
} from "lucide-react";

type Assignment = {
  id: number;
  title: string;
  type: "REPORT" | "PRE_LAB" | "OTHER";
  description: string | null;
  openedAt: string | null;
  dueAt: string | null;
  maxScore: number;
};

type Submission = {
  id: number;
  submittedAt: string;
  fileUrl: string;
  fileName: string;
  score: number | null;
  gradedAt: string | null;
  feedback: string | null;
  studentId: number;
  studentName: string;
  studentEmail: string;
  regNumber: string | null;
  groupCode: string | null;
};

export default function AssignmentDetailPage() {
  const { moduleId, assignmentId } = useParams<{ moduleId: string; assignmentId: string }>();
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studentSubmission, setStudentSubmission] = useState<Submission | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Student upload state
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  // Grading state
  const [activeGradeSub, setActiveGradeSub] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [gradingSubmitting, setGradingSubmitting] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("elabs_user") ?? sessionStorage.getItem("elabs_user") ?? "{}");
      setIsAdmin(u?.roles?.includes("SYSTEM_ADMIN") || u?.roles?.includes("LECTURER") || u?.roles?.includes("LAB_INSTRUCTOR"));
    } catch {}
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get assignment details
      const res = await apiFetch(`/academic/assignments/${assignmentId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setAssignment(data.assignment);
        if (isAdmin) {
          setSubmissions(data.submissions ?? []);
        } else {
          // If not admin, the submissions list will be empty or contain just our submission
          setStudentSubmission(data.submissions?.[0] ?? null);
        }
      } else {
        // Fallback if not instructor (cannot fetch all submissions)
        const asgnRes = await apiFetch(`/academic/modules/${moduleId}/assignments`);
        if (asgnRes.ok) {
          const data = await asgnRes.json();
          const found = data.assignments?.find((a: any) => a.id === Number(assignmentId));
          if (found) {
            setAssignment({
              id: found.id,
              title: found.title,
              type: found.type,
              description: found.description,
              openedAt: found.openedAt,
              dueAt: found.dueAt,
              maxScore: found.maxScore
            });
            if (found.submissionId) {
              setStudentSubmission({
                id: found.submissionId,
                submittedAt: found.submittedAt,
                fileUrl: found.fileUrl,
                fileName: found.fileName,
                score: found.score,
                gradedAt: found.gradedAt,
                feedback: found.feedback,
                studentId: 0,
                studentName: "",
                studentEmail: "",
                regNumber: null,
                groupCode: null
              });
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assignmentId, isAdmin]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch(`/academic/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setFile(null);
        loadData();
      } else {
        const err = await res.json();
        setUploadError(err.error || "Failed to submit assignment");
      }
    } catch (err) {
      setUploadError("Server connection error");
    } finally {
      setUploading(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGradeSub) return;
    setGradingSubmitting(true);

    try {
      const res = await apiFetch(`/academic/submissions/${activeGradeSub.id}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: Number(gradeScore),
          feedback: gradeFeedback
        })
      });

      if (res.ok) {
        setActiveGradeSub(null);
        loadData();
      } else {
        alert("Failed to save grade");
      }
    } catch (err) {
      alert("Server error");
    } finally {
      setGradingSubmitting(false);
    }
  };

  const startGrading = (sub: Submission) => {
    setActiveGradeSub(sub);
    setGradeScore(sub.score ?? 0);
    setGradeFeedback(sub.feedback ?? "");
  };

  const exportExcel = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
    const token = typeof window !== "undefined" ? localStorage.getItem("elabs_access_token") || "" : "";
    window.open(`${apiBase}/academic/assignments/${assignmentId}/export?token=${encodeURIComponent(token)}`, "_blank");
  };

  if (loading) {
    return (
      <AppShell title="Loading..." subtitle="">
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
          Loading assignment details...
        </div>
      </AppShell>
    );
  }

  if (!assignment) {
    return (
      <AppShell title="Not Found" subtitle="">
        <div style={{ padding: 60, textAlign: "center", color: "#ff4d57" }}>
          Assignment not found.
        </div>
      </AppShell>
    );
  }

  const isOverdue = assignment.dueAt && new Date(assignment.dueAt) < new Date();
  const openedDateStr = assignment.openedAt ? new Date(assignment.openedAt).toLocaleString("en-GB") : "—";
  const duePercent = assignment.dueAt ? Math.max(0, Math.min(100, ((new Date(assignment.dueAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))) : 0;

  return (
    <AppShell title={assignment.title} subtitle={`${assignment.type} Submission Platform`}>
      <div style={{ marginBottom: 20 }}>
        <Link href={`/labs/module/${moduleId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#3d83f6", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Module Overview
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr min(350px, 100%)", gap: 20, alignItems: "start" }}>
        
        {/* Left Side: Description / Instructions and Submissions List/Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Assignment details panel */}
          <div className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
            <h2 style={{ margin: "0 0 12px", color: "var(--text-main)", fontSize: "1.1rem" }}>Instructions</h2>
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-line" }}>
              {assignment.description || "No specific instructions provided. Please submit your work by the due date."}
            </div>
          </div>

          {/* Instructor View: List of all student submissions */}
          {isAdmin && (
            <div className="panel" style={{ padding: 0, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.9rem" }}>Student Submissions ({submissions.length})</span>
                <button onClick={exportExcel} style={{ padding: "6px 14px", background: "#10b981", border: "none", borderRadius: 8, color: "#fff", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <Download size={12} /> Export to Excel
                </button>
              </div>

              {submissions.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                  No submissions have been made yet.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>STUDENT</th>
                        <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>GROUP</th>
                        <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>SUBMITTED AT</th>
                        <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>FILE</th>
                        <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>GRADE</th>
                        <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => {
                        const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
                        return (
                          <tr key={sub.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "12px 18px" }}>
                              <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{sub.studentName}</div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{sub.regNumber || sub.studentEmail}</div>
                            </td>
                            <td style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 600 }}>{sub.groupCode || "—"}</td>
                            <td style={{ padding: "12px 18px", color: "var(--text-muted)" }}>{new Date(sub.submittedAt).toLocaleString("en-GB")}</td>
                            <td style={{ padding: "12px 18px" }}>
                              <a href={`${apiBase}${sub.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3d83f6", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Download size={12} /> {sub.fileName.substring(0, 15)}{sub.fileName.length > 15 ? "..." : ""}
                              </a>
                            </td>
                            <td style={{ padding: "12px 18px" }}>
                              {sub.score !== null ? (
                                <span style={{ color: "#18d18f", fontWeight: 700 }}>{sub.score} <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/{assignment.maxScore}</span></span>
                              ) : (
                                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>Ungraded</span>
                              )}
                            </td>
                            <td style={{ padding: "12px 18px" }}>
                              <button onClick={() => startGrading(sub)} style={{ padding: "4px 10px", background: "#3d83f620", border: "1px solid #3d83f640", borderRadius: 6, color: "#3d83f6", cursor: "pointer", fontWeight: 600 }}>
                                Grade
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Student View: Upload and status feedback */}
          {!isAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Submission Status Table */}
              <div className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
                <h2 style={{ margin: "0 0 16px", color: "var(--text-main)", fontSize: "1.1rem" }}>Submission Status</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Submission status</span>
                    <span style={{
                      fontWeight: 600,
                      color: studentSubmission ? "#18d18f" : isOverdue ? "#ef4444" : "var(--text-main)"
                    }}>
                      {studentSubmission ? "Submitted for grading" : isOverdue ? "Overdue - No submission" : "No submission made yet"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Grading status</span>
                    <span style={{
                      fontWeight: 600,
                      color: studentSubmission?.score !== null ? "#18d18f" : "var(--text-main)"
                    }}>
                      {studentSubmission?.score !== null ? "Graded" : "Not graded"}
                    </span>
                  </div>
                  {studentSubmission && (
                    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Submitted file</span>
                      <a href={`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"}${studentSubmission.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3d83f6", textDecoration: "none", fontWeight: 600 }}>
                        {studentSubmission.fileName}
                      </a>
                    </div>
                  )}
                  {studentSubmission?.score !== null && studentSubmission?.score !== undefined && (
                    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Grade</span>
                      <span style={{ fontWeight: 700, color: "#18d18f", fontSize: "1.1rem" }}>
                        {studentSubmission.score} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/ {assignment.maxScore}</span>
                      </span>
                    </div>
                  )}
                  {studentSubmission?.feedback && (
                    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", paddingBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Feedback</span>
                      <div style={{ background: "var(--bg-app)", padding: 12, borderRadius: 8, fontSize: "0.85rem", color: "var(--text-main)", border: "1px solid var(--border-color)" }}>
                        {studentSubmission.feedback}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload interface */}
              {!isOverdue && (
                <div className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
                  <h2 style={{ margin: "0 0 16px", color: "var(--text-main)", fontSize: "1.1rem" }}>Submit Your Work</h2>
                  <form onSubmit={handleUpload}>
                    <div style={{
                      border: "2px dashed var(--border-color)", borderRadius: 10, padding: 30, textAlign: "center",
                      cursor: "pointer", position: "relative", background: "var(--bg-app)", marginBottom: 16
                    }}>
                      <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                      <Upload size={32} color="#3d83f6" style={{ marginBottom: 10 }} />
                      <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.88rem" }}>
                        {file ? file.name : "Drag & Drop or Click to browse files"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>
                        Allowed files: PDF, DOC, DOCX, ZIP, Image (Max 50MB)
                      </div>
                    </div>
                    {uploadError && <div style={{ color: "#ff4d57", fontSize: "0.82rem", background: "#ff4d5715", padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}><AlertTriangle size={12} style={{ display: "inline", marginRight: 6 }} /> {uploadError}</div>}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="submit" disabled={!file || uploading} style={{
                        padding: "9px 24px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none",
                        borderRadius: 8, color: "#fff", fontWeight: 700, cursor: (!file || uploading) ? "not-allowed" : "pointer",
                        opacity: (!file || uploading) ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8
                      }}>
                        <Send size={14} />
                        <span>{uploading ? "Uploading..." : studentSubmission ? "Update Submission" : "Submit Assignment"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Metadata / Info panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="panel" style={{ padding: 20, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
            <h3 style={{ margin: "0 0 16px", color: "var(--text-main)", fontSize: "0.95rem" }}>Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Calendar size={16} color="#3d83f6" />
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>OPENED ON</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 500 }}>{openedDateStr}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Clock size={16} color={isOverdue ? "#ff4d57" : "#f59e0b"} />
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>DUE BY</div>
                  <div style={{ fontSize: "0.85rem", color: isOverdue ? "#ff4d57" : "var(--text-main)", fontWeight: 600 }}>
                    {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString("en-GB") : "No due date"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Award size={16} color="#18d18f" />
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>MAXIMUM MARKS</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 700 }}>{assignment.maxScore} Marks</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grading Modal */}
      {activeGradeSub && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
          onClick={e => e.target === e.currentTarget && setActiveGradeSub(null)}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, width: "min(500px, 92vw)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1rem" }}>Grade Submission</h3>
              <button onClick={() => setActiveGradeSub(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
            </div>
            <form onSubmit={handleGradeSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>MARKS (MAX {assignment.maxScore})</label>
                <input type="number" min={0} max={assignment.maxScore} step={0.5} required value={gradeScore} onChange={e => setGradeScore(Number(e.target.value))}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>FEEDBACK / COMMENTS</label>
                <textarea rows={4} value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} placeholder="Provide feedback to the student..."
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setActiveGradeSub(null)} style={{ padding: "9px 20px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={gradingSubmitting} style={{ padding: "9px 24px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: gradingSubmitting ? "not-allowed" : "pointer", opacity: gradingSubmitting ? 0.7 : 1 }}>
                  {gradingSubmitting ? "Saving..." : "Save Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
