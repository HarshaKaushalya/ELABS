"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Save, Plus } from "lucide-react";

export default function CreateAssignmentPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"REPORT" | "PRE_LAB" | "OTHER">("REPORT");
  const [description, setDescription] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await apiFetch(`/academic/modules/${moduleId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          description: description || undefined,
          openedAt: openedAt ? new Date(openedAt).toISOString() : undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          maxScore,
        }),
      });

      if (res.ok) {
        router.push(`/labs/module/${moduleId}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create assignment");
      }
    } catch (err) {
      setError("Network connection error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Create New Assignment" subtitle="Add a Lab Report or Pre-Lab Evaluation">
      <div style={{ marginBottom: 20 }}>
        <Link href={`/labs/module/${moduleId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#3d83f6", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Module Overview
        </Link>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>ASSIGNMENT TITLE</label>
              <input type="text" required placeholder="e.g. Lab 3 Report — Router Configurations" value={title} onChange={e => setTitle(e.target.value)}
                style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>EVALUATION TYPE</label>
                <select value={type} onChange={e => setType(e.target.value as any)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 12px", boxSizing: "border-box" }}>
                  <option value="REPORT">Lab Report</option>
                  <option value="PRE_LAB">Pre-Lab Submission</option>
                  <option value="OTHER">Other Assignment</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>MAX SCORE / POINTS</label>
                <input type="number" min={1} max={1000} required value={maxScore} onChange={e => setMaxScore(Number(e.target.value))}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>INSTRUCTIONS / DESCRIPTION</label>
              <textarea rows={6} placeholder="Provide instructions to students, list what steps they need to complete, and mention formatting guidelines..." value={description} onChange={e => setDescription(e.target.value)}
                style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>OPEN DATE</label>
                <input type="datetime-local" value={openedAt} onChange={e => setOpenedAt(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>DUE DATE</label>
                <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
              </div>
            </div>

            {error && <div style={{ color: "#ff4d57", fontSize: "0.82rem", background: "#ff4d5715", padding: "10px 14px", borderRadius: 8 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <Link href={`/labs/module/${moduleId}`}>
                <button type="button" style={{ padding: "10px 22px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
              </Link>
              <button type="submit" disabled={submitting} style={{
                padding: "10px 26px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none",
                borderRadius: 8, color: "#fff", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8
              }}>
                <Save size={14} />
                <span>{submitting ? "Creating..." : "Create Assignment"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
