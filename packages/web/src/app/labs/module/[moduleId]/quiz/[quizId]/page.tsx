"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Award,
  Check,
  Eye,
  Lock,
  Image as ImageIcon,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  timeLimitMins: number;
  openedAt: string | null;
  closedAt: string | null;
  maxAttempts: number;
  requiresPassword?: boolean;
  password?: string | null;
};

type Question = {
  id: number;
  questionText: string;
  type: "MCQ" | "SHORT";
  options: string[] | null;
  points: number;
  imageUrl?: string | null;
  correctAnswer?: string;
};

type Attempt = {
  id: number;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  attemptNumber: number;
};

type Answer = {
  questionId: number;
  answerText: string;
  isCorrect: boolean | null;
  pointsAwarded: number;
  questionText: string;
  options: string[] | null;
  correctAnswer: string;
  imageUrl?: string | null;
  totalPoints: number;
  type: "MCQ" | "SHORT";
};

// ── Visual Clock Timer Widget ───────────────────────────────────────────────
function VisualClockTimer({
  timeLeft,
  totalLimitMins,
  answeredCount,
  totalQuestions,
}: {
  timeLeft: number;
  totalLimitMins: number;
  answeredCount: number;
  totalQuestions: number;
}) {
  const totalSecs = Math.max(1, totalLimitMins * 60);
  const fraction = Math.max(0, Math.min(1, timeLeft / totalSecs));
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  // Gauge parameters
  const size = 68;
  const strokeWidth = 5;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  const isCritical = timeLeft < 120; // under 2 minutes
  const isUrgent = timeLeft < 300;   // under 5 minutes

  const gaugeColor = isCritical ? "#ef4444" : isUrgent ? "#f59e0b" : "#10b981";
  const glowStyle = isCritical ? "0 0 16px rgba(239,68,68,0.4)" : "none";

  return (
    <div
      style={{
        position: "sticky",
        top: 16,
        zIndex: 100,
        background: "var(--bg-card)",
        border: `1.5px solid ${isCritical ? "#ef4444" : isUrgent ? "#f59e0b" : "var(--border-color)"}`,
        borderRadius: 16,
        padding: "12px 20px",
        margin: "0 auto 24px",
        maxWidth: 800,
        boxShadow: `0 12px 30px rgba(0,0,0,0.2), ${glowStyle}`,
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        transition: "all 0.3s ease",
      }}
    >
      {/* Left: Clock Gauge with Digital Counter */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="rgba(148, 163, 184, 0.15)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated progress ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: "stroke-dashoffset 0.8s linear, stroke 0.3s" }}
            />
          </svg>
          {/* Center Clock Icon */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: gaugeColor,
            }}
          >
            <Clock size={22} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Available Time
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                fontFamily: "monospace",
                color: gaugeColor,
                lineHeight: 1.1,
              }}
            >
              {timeFormatted}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
              / {totalLimitMins}m limit
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: gaugeColor, fontWeight: 600, marginTop: 2 }}>
            {isCritical ? "⚠️ Final 2 minutes remaining!" : isUrgent ? "Passing quickly" : "Time limit running"}
          </div>
        </div>
      </div>

      {/* Right: Question Progress Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 200 }}>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Answer Progress
          </div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-main)", marginTop: 2 }}>
            {answeredCount} of {totalQuestions} answered
          </div>
          {/* Progress bar */}
          <div style={{ width: 140, height: 6, background: "rgba(148, 163, 184, 0.2)", borderRadius: 3, marginTop: 4, marginLeft: "auto", overflow: "hidden" }}>
            <div
              style={{
                width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
                height: "100%",
                background: "linear-gradient(90deg, #3d83f6, #10b981)",
                borderRadius: 3,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { moduleId, quizId } = useParams<{ moduleId: string; quizId: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Take quiz state
  const [takingAttemptId, setTakingAttemptId] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Password Unlock Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [startingQuiz, setStartingQuiz] = useState(false);

  // Review state (selected attempt)
  const [reviewAttempt, setReviewAttempt] = useState<Attempt | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<Answer[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/academic/quizzes/${quizId}`);
      if (res.ok) {
        const data = await res.json();
        setQuiz(data.quiz);
        setQuestions(data.questions ?? []);
        setAttempts(data.attempts ?? []);

        // Check if there is an active ongoing attempt (submittedAt is null)
        const active = data.attempts?.find((a: any) => a.submittedAt === null);
        if (active) {
          setTakingAttemptId(active.id);
          // Resume timer based on startedAt
          const elapsedSecs = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
          const limitSecs = data.quiz.timeLimitMins * 60;
          const remaining = limitSecs - elapsedSecs;
          if (remaining <= 0) {
            autoSubmit(active.id, {});
          } else {
            setTimeLeft(remaining);
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
  }, [quizId]);

  // Timer logic for active quiz
  useEffect(() => {
    if (takingAttemptId && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            autoSubmit(takingAttemptId, selectedAnswers);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [takingAttemptId, timeLeft, selectedAnswers]);

  // Handler for Start Quiz button
  const handleStartQuizClick = () => {
    if (quiz?.requiresPassword) {
      setShowPasswordModal(true);
      setEnteredPassword("");
      setPasswordError("");
    } else {
      startQuiz();
    }
  };

  const startQuiz = async () => {
    setStartingQuiz(true);
    setPasswordError("");
    try {
      const res = await apiFetch(`/academic/quizzes/${quizId}/start`, {
        method: "POST",
        body: JSON.stringify({ password: enteredPassword.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowPasswordModal(false);
        setTakingAttemptId(data.attemptId);
        setSelectedAnswers({});
        setTimeLeft(quiz!.timeLimitMins * 60);
      } else {
        if (quiz?.requiresPassword) {
          setPasswordError(data.error || "Incorrect quiz access password.");
        } else {
          alert(data.error || "Cannot start quiz");
        }
      }
    } catch {
      setPasswordError("Network communication error.");
    } finally {
      setStartingQuiz(false);
    }
  };

  const handleSelectOption = (qId: number, optionIdx: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optionIdx,
    }));
  };

  const submitQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!takingAttemptId) return;

    const confirmSubmit = window.confirm("Are you sure you want to submit your quiz attempt?");
    if (!confirmSubmit) return;

    performSubmit(takingAttemptId, selectedAnswers);
  };

  const autoSubmit = async (attemptId: number, answers: Record<number, string>) => {
    alert("Time limit reached! Your quiz answers are being submitted automatically.");
    performSubmit(attemptId, answers);
  };

  const performSubmit = async (attemptId: number, answers: Record<number, string>) => {
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Format answers array
    const ansList = Object.entries(answers).map(([qId, val]) => ({
      questionId: Number(qId),
      answer: val,
    }));

    // Add empty answers for skipped questions
    questions.forEach((q) => {
      if (answers[q.id] === undefined) {
        ansList.push({ questionId: q.id, answer: "" });
      }
    });

    try {
      const res = await apiFetch(`/academic/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: ansList }),
      });

      if (res.ok) {
        setTakingAttemptId(null);
        await loadData();
        const freshRes = await apiFetch(`/academic/quizzes/${quizId}`);
        const freshData = await freshRes.json();
        if (freshData.attempts?.[0]) loadReview(freshData.attempts[0]);
      } else {
        alert("Failed to submit answers");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const loadReview = async (attempt: Attempt) => {
    setLoadingReview(true);
    setReviewAttempt(attempt);
    try {
      const res = await apiFetch(`/academic/attempts/${attempt.id}`);
      if (res.ok) {
        const data = await res.json();
        setReviewAnswers(data.answers ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReview(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Loading Quiz..." subtitle="">
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
          Loading quiz details...
        </div>
      </AppShell>
    );
  }

  if (!quiz) {
    return (
      <AppShell title="Not Found" subtitle="">
        <div style={{ padding: 60, textAlign: "center", color: "#ff4d57" }}>
          Quiz not found.
        </div>
      </AppShell>
    );
  }

  // ── Taking active attempt UI (with Visual Clock & Apparatus Photos) ───────
  if (takingAttemptId) {
    const answeredCount = Object.keys(selectedAnswers).length;

    return (
      <AppShell title={quiz.title} subtitle="Quiz Evaluation in Progress">
        {/* Visual Clock Timer Header */}
        <VisualClockTimer
          timeLeft={timeLeft}
          totalLimitMins={quiz.timeLimitMins}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
        />

        <form onSubmit={submitQuiz} style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {questions.map((q, idx) => (
            <div key={q.id} className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "1rem" }}>
                  Question {idx + 1}
                </span>
                <span style={{ fontSize: "0.78rem", background: "rgba(139,92,246,0.1)", padding: "4px 10px", borderRadius: 20, color: "#8b5cf6", fontWeight: 600 }}>
                  {q.points} {q.points === 1 ? "Point" : "Points"}
                </span>
              </div>

              {/* Question Text Prompt */}
              <p style={{ margin: "0 0 14px", color: "var(--text-main)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                {q.questionText}
              </p>

              {/* Apparatus / Diagram Photo (if present) */}
              {q.imageUrl && (
                <div
                  style={{
                    margin: "14px 0 18px",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 10,
                    overflow: "hidden",
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, fontSize: "0.74rem", fontWeight: 700, color: "#8b5cf6", marginBottom: 8, letterSpacing: "0.04em" }}>
                    <ImageIcon size={14} />
                    <span>LABORATORY APPARATUS / EXPERIMENTAL SETUP</span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={q.imageUrl}
                    alt={`Apparatus for Question ${idx + 1}`}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 360,
                      objectFit: "contain",
                      borderRadius: 8,
                      background: "#0b0f19",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  />
                </div>
              )}

              {/* MCQ Options */}
              {q.type === "MCQ" && q.options && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[q.id] === String(optIdx);
                    return (
                      <label
                        key={optIdx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          border: `1.5px solid ${isSelected ? "#3d83f6" : "var(--border-color)"}`,
                          background: isSelected ? "rgba(61, 131, 246, 0.08)" : "var(--bg-app)",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={isSelected}
                          onChange={() => handleSelectOption(q.id, String(optIdx))}
                          style={{ accentColor: "#3d83f6", width: 16, height: 16 }}
                        />
                        <span style={{ color: isSelected ? "var(--text-main)" : "var(--text-muted)", fontSize: "0.88rem", fontWeight: isSelected ? 600 : 400 }}>
                          {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, marginBottom: 40 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "12px 32px",
                background: "linear-gradient(135deg,#3d83f6,#1dd5e6)",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(61,131,246,0.3)",
                fontSize: "0.95rem",
              }}
            >
              {submitting ? "Submitting Attempt…" : "Submit Quiz"}
            </button>
          </div>
        </form>
      </AppShell>
    );
  }

  // ── Quiz Landing Page / Results Review UI ─────────────────────────────────
  const completedAttempts = attempts.filter((a) => a.submittedAt !== null);
  const attemptsRemaining = quiz.maxAttempts - completedAttempts.length;

  return (
    <AppShell title={quiz.title} subtitle="Quiz Dashboard">
      <div style={{ marginBottom: 20 }}>
        <Link
          href={`/labs/module/${moduleId}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#3d83f6", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}
        >
          <ArrowLeft size={14} /> Back to Module Overview
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr min(380px, 100%)", gap: 20, alignItems: "start" }}>
        {/* Left Side: Attempt history and attempt detail review */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Landing / Status Panel */}
          <div className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.1rem" }}>Instructions & Policy</h2>
              {quiz.requiresPassword && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", padding: "3px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600 }}>
                  <Lock size={12} /> Password Protected
                </span>
              )}
            </div>

            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 16 }}>
              {quiz.description || "Complete the laboratory quiz within the allotted time limit. Ensure all answers are selected before final submission."}
            </div>

            {/* Instructor Password Notice if available */}
            {quiz.password && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, fontSize: "0.84rem" }}>
                <KeyRound size={16} color="#f59e0b" />
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Instructor Access Code: </span>
                  <strong style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: "0.92rem", letterSpacing: 0.5 }}>{quiz.password}</strong>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: 8 }}>(Share this with students inside the lab)</span>
                </div>
              </div>
            )}

            {attemptsRemaining > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(139,92,246,0.06)", padding: "16px 20px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.9rem" }}>
                    You have {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining.
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Time limit: <strong>{quiz.timeLimitMins} Minutes</strong> per attempt.
                  </div>
                </div>
                <button
                  onClick={handleStartQuizClick}
                  style={{ padding: "10px 24px", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {quiz.requiresPassword && <Lock size={14} />}
                  <span>Start Quiz</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(239,68,68,0.05)", padding: "16px 20px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "0.88rem", fontWeight: 600 }}>
                <AlertTriangle size={18} />
                <span>You have reached the maximum number of attempts for this quiz.</span>
              </div>
            )}
          </div>

          {/* Attempt list if any attempts exist */}
          {completedAttempts.length > 0 && (
            <div className="panel" style={{ padding: 0, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.9rem" }}>Your Previous Attempts</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)" }}>ATTEMPT</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)" }}>COMPLETED AT</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)" }}>SCORE</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)" }}>PERCENTAGE</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", textAlign: "right" }}>REVIEW</th>
                  </tr>
                </thead>
                <tbody>
                  {completedAttempts.map((att) => {
                    const pct = Math.round((att.score! / att.maxScore) * 100);
                    const isSelected = reviewAttempt?.id === att.id;
                    return (
                      <tr key={att.id} style={{ borderBottom: "1px solid var(--border-color)", background: isSelected ? "rgba(139,92,246,0.04)" : "transparent" }}>
                        <td style={{ padding: "12px 18px", fontWeight: 600, color: "var(--text-main)" }}>Attempt #{att.attemptNumber}</td>
                        <td style={{ padding: "12px 18px", color: "var(--text-muted)" }}>{att.submittedAt ? new Date(att.submittedAt).toLocaleString("en-GB") : "—"}</td>
                        <td style={{ padding: "12px 18px", color: "var(--text-main)", fontWeight: 600 }}>{att.score} / {att.maxScore}</td>
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{ fontWeight: 700, color: pct >= 75 ? "#18d18f" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{pct}%</span>
                        </td>
                        <td style={{ padding: "12px 18px", textAlign: "right" }}>
                          <button
                            onClick={() => loadReview(att)}
                            style={{
                              padding: "4px 10px",
                              background: isSelected ? "#8b5cf6" : "transparent",
                              border: `1px solid ${isSelected ? "#8b5cf6" : "var(--border-color)"}`,
                              borderRadius: 6,
                              color: isSelected ? "#fff" : "var(--text-muted)",
                              cursor: "pointer",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Eye size={12} /> {isSelected ? "Viewing" : "Review"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Active Review Detailed panel (including Apparatus Photo) */}
          {reviewAttempt && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.05rem", fontWeight: 700 }}>
                  Detailed Review — Attempt #{reviewAttempt.attemptNumber}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Submitted: {reviewAttempt.submittedAt ? new Date(reviewAttempt.submittedAt).toLocaleString("en-GB") : ""}
                </span>
              </div>

              {loadingReview ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading review...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {reviewAnswers.map((ans, idx) => {
                    const pointsPct = ans.totalPoints > 0 ? (ans.pointsAwarded / ans.totalPoints) * 100 : 0;
                    const isFullyCorrect = pointsPct === 100;
                    const isPartiallyCorrect = pointsPct > 0 && pointsPct < 100;

                    return (
                      <div
                        key={idx}
                        className="panel"
                        style={{
                          padding: 20,
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                          borderLeft: `4px solid ${isFullyCorrect ? "#18d18f" : isPartiallyCorrect ? "#f59e0b" : "#ff4d57"}`,
                          borderRadius: "0 10px 10px 0",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <span style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.9rem" }}>Question {idx + 1}</span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isFullyCorrect ? "#18d18f" : isPartiallyCorrect ? "#f59e0b" : "#ff4d57" }}>
                            {ans.pointsAwarded} / {ans.totalPoints} pts
                          </span>
                        </div>

                        <p style={{ margin: "0 0 12px", color: "var(--text-main)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                          {ans.questionText}
                        </p>

                        {/* Apparatus / Diagram Photo in Review */}
                        {ans.imageUrl && (
                          <div
                            style={{
                              margin: "10px 0 14px",
                              background: "var(--bg-app)",
                              border: "1px solid var(--border-color)",
                              borderRadius: 8,
                              padding: 10,
                              textAlign: "center",
                            }}
                          >
                            <div style={{ textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#8b5cf6", marginBottom: 6 }}>
                              🔬 APPARATUS / EXPERIMENT SETUP
                            </div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ans.imageUrl}
                              alt="Apparatus diagram"
                              style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 6 }}
                            />
                          </div>
                        )}

                        {ans.options && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                            {ans.options.map((opt, optIdx) => {
                              const isStudentChoice = ans.answerText === String(optIdx);
                              const isCorrectChoice = ans.correctAnswer === String(optIdx);
                              return (
                                <div
                                  key={optIdx}
                                  style={{
                                    padding: "8px 12px",
                                    borderRadius: 6,
                                    fontSize: "0.85rem",
                                    background: isCorrectChoice
                                      ? "rgba(24, 209, 143, 0.1)"
                                      : isStudentChoice
                                      ? "rgba(255, 77, 87, 0.1)"
                                      : "var(--bg-app)",
                                    border: `1px solid ${isCorrectChoice ? "#18d18f" : isStudentChoice ? "#ff4d57" : "var(--border-color)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span style={{ color: "var(--text-main)" }}>{opt}</span>
                                  {isCorrectChoice && <span style={{ color: "#18d18f", fontSize: "0.75rem", fontWeight: 700 }}>✓ Correct Answer</span>}
                                  {!isCorrectChoice && isStudentChoice && (
                                    <span style={{ color: "#ff4d57", fontSize: "0.75rem", fontWeight: 700 }}>✗ Your Choice</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Quiz Info Card */}
        <div className="panel" style={{ padding: 22, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
          <h3 style={{ margin: "0 0 14px", color: "var(--text-main)", fontSize: "0.95rem", fontWeight: 700 }}>Quiz Information</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
              <span style={{ color: "var(--text-muted)" }}>Time Limit:</span>
              <strong style={{ color: "var(--text-main)" }}>{quiz.timeLimitMins} Minutes</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
              <span style={{ color: "var(--text-muted)" }}>Total Questions:</span>
              <strong style={{ color: "var(--text-main)" }}>{questions.length}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
              <span style={{ color: "var(--text-muted)" }}>Max Attempts:</span>
              <strong style={{ color: "var(--text-main)" }}>{quiz.maxAttempts}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
              <span style={{ color: "var(--text-muted)" }}>Access Security:</span>
              <strong style={{ color: quiz.requiresPassword ? "#f59e0b" : "#10b981" }}>
                {quiz.requiresPassword ? "Password Protected" : "Open"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Module:</span>
              <strong style={{ color: "var(--text-main)" }}>{quiz.title}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Password Unlock Modal ───────────────────────────────────────────── */}
      {showPasswordModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 26, maxWidth: 440, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
                <Lock size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.1rem" }}>Quiz Access Password</h3>
                <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  This laboratory quiz requires an authorization password
                </p>
              </div>
            </div>

            {passwordError && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 12px", color: "#ef4444", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <AlertTriangle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>
                Enter Access Code / Password *
              </label>
              <input
                type="password"
                placeholder="Enter password given by instructor..."
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    startQuiz();
                  }
                }}
                style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 12px", color: "var(--text-main)", fontSize: "0.95rem" }}
              />
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 6, display: "block" }}>
                Please ask your lab demonstrator or lecturer if you do not have the password.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                disabled={startingQuiz}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => startQuiz()}
                disabled={startingQuiz || !enteredPassword.trim()}
                style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}
              >
                {startingQuiz ? "Verifying…" : "Unlock & Start Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
