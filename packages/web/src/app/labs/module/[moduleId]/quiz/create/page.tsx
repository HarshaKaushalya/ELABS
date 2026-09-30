"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, CheckCircle } from "lucide-react";

type QuestionInput = {
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
};

export default function CreateQuizPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMins, setTimeLimitMins] = useState(30);
  const [openedAt, setOpenedAt] = useState("");
  const [closedAt, setClosedAt] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);

  // Questions state
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { questionText: "", options: ["", "", "", ""], correctAnswer: "0", points: 1 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: "", options: ["", "", "", ""], correctAnswer: "0", points: 1 }
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestionText = (idx: number, text: string) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, questionText: text } : q));
  };

  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
    setQuestions(questions.map((q, i) => {
      if (i === qIdx) {
        const opts = [...q.options];
        opts[optIdx] = text;
        return { ...q, options: opts };
      }
      return q;
    }));
  };

  const updateCorrectAnswer = (qIdx: number, correctIdx: string) => {
    setQuestions(questions.map((q, i) => i === qIdx ? { ...q, correctAnswer: correctIdx } : q));
  };

  const updatePoints = (qIdx: number, pts: number) => {
    setQuestions(questions.map((q, i) => i === qIdx ? { ...q, points: pts } : q));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Validation
    const invalidQ = questions.some(q => !q.questionText.trim() || q.options.some(o => !o.trim()));
    if (invalidQ) {
      setError("Please fill out all question texts and option choices.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiFetch(`/academic/modules/${moduleId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          timeLimitMins,
          openedAt: openedAt ? new Date(openedAt).toISOString() : undefined,
          closedAt: closedAt ? new Date(closedAt).toISOString() : undefined,
          maxAttempts,
          shuffleQuestions,
          questions: questions.map((q, i) => ({
            questionText: q.questionText,
            type: "MCQ",
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points,
            sortOrder: i
          }))
        }),
      });

      if (res.ok) {
        router.push(`/labs/module/${moduleId}`);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create quiz");
      }
    } catch (err) {
      setError("Network connection error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Create New Quiz" subtitle="Build an auto-graded evaluation for this module">
      <div style={{ marginBottom: 20 }}>
        <Link href={`/labs/module/${moduleId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#3d83f6", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Module Overview
        </Link>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Section 1: Quiz Settings */}
          <div className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
            <h2 style={{ margin: "0 0 16px", color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700 }}>1. General Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>QUIZ TITLE</label>
                <input type="text" required placeholder="e.g. Quiz 2 — Advanced Routing & Subnetting" value={title} onChange={e => setTitle(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>DESCRIPTION / INSTRUCTIONS</label>
                <textarea rows={3} placeholder="Explain the topics covered, time limit, max attempts, and rules..." value={description} onChange={e => setDescription(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box", resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>TIME LIMIT (MINUTES)</label>
                  <input type="number" min={1} required value={timeLimitMins} onChange={e => setTimeLimitMins(Number(e.target.value))}
                    style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>MAX ATTEMPTS</label>
                  <input type="number" min={1} max={10} required value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))}
                    style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem", color: "var(--text-main)", marginTop: 20 }}>
                    <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} style={{ accentColor: "#8b5cf6" }} />
                    <span>Shuffle Questions</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>OPEN DATE</label>
                  <input type="datetime-local" value={openedAt} onChange={e => setOpenedAt(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, marginBottom: 8 }}>CLOSE DATE</label>
                  <input type="datetime-local" value={closedAt} onChange={e => setClosedAt(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Questions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ margin: "10px 0 0", color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700 }}>2. Questions ({questions.length})</h2>
            
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontWeight: 700, color: "#8b5cf6", fontSize: "0.95rem" }}>Question {qIdx + 1}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>POINTS</span>
                      <input type="number" min={0.5} step={0.5} value={q.points} onChange={e => updatePoints(qIdx, Number(e.target.value))}
                        style={{ width: 60, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", padding: "4px 8px", textAlign: "center" }} />
                    </div>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(qIdx)} style={{ padding: "6px 10px", background: "#ff4d5715", border: "1px solid #ff4d5740", borderRadius: 8, color: "#ff4d57", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <input type="text" required placeholder="Type question description here..." value={q.questionText} onChange={e => updateQuestionText(qIdx, e.target.value)}
                    style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-main)", padding: "10px 14px", boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: 0.5 }}>OPTIONS & CORRECT SELECTION</span>
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = q.correctAnswer === String(optIdx);
                    return (
                      <div key={optIdx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button type="button" onClick={() => updateCorrectAnswer(qIdx, String(optIdx))} style={{
                          background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center"
                        }}>
                          <CheckCircle size={18} color={isCorrect ? "#18d18f" : "var(--border-color)"} />
                        </button>
                        <input type="text" required placeholder={`Option ${optIdx + 1}`} value={opt} onChange={e => updateOptionText(qIdx, optIdx, e.target.value)}
                          style={{ flex: 1, background: isCorrect ? "#18d18f08" : "var(--bg-app)", border: `1px solid ${isCorrect ? "#18d18f" : "var(--border-color)"}`, borderRadius: 8, color: "var(--text-main)", padding: "9px 12px" }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button type="button" onClick={addQuestion} style={{
              width: "100%", padding: "12px", background: "transparent", border: "1px dashed var(--border-color)",
              borderRadius: 14, color: "var(--text-muted)", cursor: "pointer", fontWeight: 600, display: "flex",
              alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s"
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <Plus size={16} /> Add Another Question
            </button>
          </div>

          {error && <div style={{ color: "#ff4d57", fontSize: "0.82rem", background: "#ff4d5715", padding: "10px 14px", borderRadius: 8 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, marginBottom: 40 }}>
            <Link href={`/labs/module/${moduleId}`}>
              <button type="button" style={{ padding: "10px 22px", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
            </Link>
            <button type="submit" disabled={submitting} style={{
              padding: "10px 26px", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", border: "none",
              borderRadius: 8, color: "#fff", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8
            }}>
              <Save size={14} />
              <span>{submitting ? "Saving..." : "Create Quiz"}</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
