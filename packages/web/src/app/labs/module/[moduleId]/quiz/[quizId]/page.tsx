"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  BookOpen, Clock, AlertTriangle, ArrowLeft, CheckCircle,
  XCircle, Award, Check, Eye
} from "lucide-react";

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  timeLimitMins: number;
  openedAt: string | null;
  closedAt: string | null;
  maxAttempts: number;
};

type Question = {
  id: number;
  questionText: string;
  type: "MCQ" | "SHORT";
  options: string[] | null;
  points: number;
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
  totalPoints: number;
  type: "MCQ" | "SHORT";
};


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
            // Auto submit immediately if time expired while away
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

  const startQuiz = async () => {
    try {
      const res = await apiFetch(`/academic/quizzes/${quizId}/start`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setTakingAttemptId(data.attemptId);
        setSelectedAnswers({});
        setTimeLeft(quiz!.timeLimitMins * 60);
      } else {
        const err = await res.json();
        alert(err.error || "Cannot start quiz");
      }
    } catch (err) {
      alert("Network error");
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

    const confirmSubmit = window.confirm("Are you sure you want to submit the quiz?");
    if (!confirmSubmit) return;

    performSubmit(takingAttemptId, selectedAnswers);
  };

  const autoSubmit = async (attemptId: number, answers: Record<number, string>) => {
    alert("Time has expired! Your quiz is being submitted automatically.");
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
        // Load latest attempt as review
        const latest = attempts[0] || null;
        if (latest) {
          loadReview(latest);
        } else {
          // reload to get new attempt list
          const freshRes = await apiFetch(`/academic/quizzes/${quizId}`);
          const freshData = await freshRes.json();
          if (freshData.attempts?.[0]) loadReview(freshData.attempts[0]);
        }
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
      <AppShell title="Loading..." subtitle="">
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

  // Formatting remaining time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Taking active attempt UI
  if (takingAttemptId) {
    const timerUrgent = timeLeft < 60; // less than a minute
    return (
      <AppShell title={quiz.title} subtitle="Quiz in Progress">
        {/* Floating Timer */}
        <div style={{
          position: "sticky", top: 20, zIndex: 100,
          background: timerUrgent ? "rgba(239,68,68,0.95)" : "rgba(79,126,248,0.95)",
          color: "#fff", padding: "12px 24px", borderRadius: 30,
          display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
          fontWeight: 700, fontSize: "1.1rem", width: "max-content", margin: "0 auto 20px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)", backdropFilter: "blur(4px)",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          <Clock size={20} />
          <span>TIME REMAINING: {formatTime(timeLeft)}</span>
        </div>

        <form onSubmit={submitQuiz} style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {questions.map((q, idx) => (
            <div key={q.id} className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
                <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "1rem" }}>
                  Question {idx + 1}
                </span>
                <span style={{ fontSize: "0.78rem", background: "var(--line)", padding: "4px 10px", borderRadius: 20, color: "var(--text-muted)", fontWeight: 600 }}>
                  {q.points} {q.points === 1 ? "Point" : "Points"}
                </span>
              </div>
              <p style={{ margin: "0 0 16px", color: "var(--text-main)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                {q.questionText}
              </p>

              {q.type === "MCQ" && q.options && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[q.id] === String(optIdx);
                    return (
                      <label key={optIdx} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                        border: `1px solid ${isSelected ? "#3d83f6" : "var(--border-color)"}`,
                        background: isSelected ? "#3d83f610" : "var(--bg-app)",
                        borderRadius: 8, cursor: "pointer", transition: "all 0.15s"
                      }}>
                        <input type="radio" name={`q-${q.id}`} checked={isSelected} onChange={() => handleSelectOption(q.id, String(optIdx))}
                          style={{ accentColor: "#3d83f6" }} />
                        <span style={{ color: isSelected ? "var(--text-main)" : "var(--text-muted)", fontSize: "0.88rem" }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button type="submit" disabled={submitting} style={{
              padding: "12px 30px", background: "linear-gradient(135deg,#3d83f6,#1dd5e6)", border: "none",
              borderRadius: 10, color: "#fff", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(61,131,246,0.3)"
            }}>
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </form>
      </AppShell>
    );
  }

  // Quiz Landing Page / Results Review UI
  const completedAttempts = attempts.filter((a) => a.submittedAt !== null);
  const attemptsRemaining = quiz.maxAttempts - completedAttempts.length;

  return (
    <AppShell title={quiz.title} subtitle="Quiz Dashboard">
      <div style={{ marginBottom: 20 }}>
        <Link href={`/labs/module/${moduleId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#3d83f6", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Module Overview
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr min(380px, 100%)", gap: 20, alignItems: "start" }}>
        {/* Left Side: Attempt history and attempt detail review */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Landing / Status Panel */}
          <div className="panel" style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
            <h2 style={{ margin: "0 0 12px", color: "var(--text-main)", fontSize: "1.1rem" }}>Instructions</h2>
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 20 }}>
              {quiz.description || "Complete the quiz within the time limit. Make sure to review your answers before submitting."}
            </div>

            {attemptsRemaining > 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: 12, background: "rgba(139,92,246,0.06)", padding: "16px 20px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.9rem" }}>You have {attemptsRemaining} attempts remaining.</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Time limit: {quiz.timeLimitMins} Minutes per attempt.</div>
                </div>
                <button onClick={startQuiz} style={{ padding: "10px 24px", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  Start Quiz
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
                          <button onClick={() => loadReview(att)} style={{
                            padding: "4px 10px", background: isSelected ? "#8b5cf6" : "transparent",
                            border: `1px solid ${isSelected ? "#8b5cf6" : "var(--border-color)"}`,
                            borderRadius: 6, color: isSelected ? "#fff" : "var(--text-muted)", cursor: "pointer", fontWeight: 600,
                            display: "inline-flex", alignItems: "center", gap: 4
                          }}>
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

          {/* Active Review Detailed panel */}
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
                    const isMcq = ans.type === "MCQ";
                    const pointsPct = ans.totalPoints > 0 ? (ans.pointsAwarded / ans.totalPoints) * 100 : 0;
                    const isFullyCorrect = pointsPct === 100;
                    const isPartiallyCorrect = pointsPct > 0 && pointsPct < 100;
                    
                    return (
                      <div key={idx} className="panel" style={{
                        padding: 20, background: "var(--bg-card)", border: "1px solid var(--border-color)",
                        borderLeft: `4px solid ${isFullyCorrect ? "#18d18f" : isPartiallyCorrect ? "#f59e0b" : "#ff4d57"}`,
                        borderRadius: "0 10px 10px 0"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <span style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.9rem" }}>Question {idx + 1}</span>
                          <span style={{
                            fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                            background: isFullyCorrect ? "#18d18f20" : isPartiallyCorrect ? "#f59e0b20" : "#ff4d5720",
                            color: isFullyCorrect ? "#18d18f" : isPartiallyCorrect ? "#f59e0b" : "#ff4d57"
                          }}>
                            {ans.pointsAwarded} / {ans.totalPoints} Points
                          </span>
                        </div>
                        <p style={{ margin: "0 0 14px", color: "var(--text-main)", fontSize: "0.9rem", lineHeight: 1.5 }}>{ans.questionText}</p>

                        {isMcq && ans.options && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {ans.options.map((opt, optIdx) => {
                              const isStudentChoice = ans.answerText === String(optIdx);
                              const isCorrectOption = ans.correctAnswer === String(optIdx);
                              
                              let optBg = "var(--bg-app)";
                              let optBorder = "var(--border-color)";
                              let optColor = "var(--text-muted)";
                              
                              if (isCorrectOption) {
                                optBg = "#18d18f15";
                                optBorder = "#18d18f";
                                optColor = "#18d18f";
                              } else if (isStudentChoice && !isCorrectOption) {
                                optBg = "#ff4d5715";
                                optBorder = "#ff4d57";
                                optColor = "#ff4d57";
                              }

                              return (
                                <div key={optIdx} style={{
                                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                                  border: `1px solid ${optBorder}`, background: optBg, borderRadius: 6,
                                  fontSize: "0.85rem", color: optColor, fontWeight: (isStudentChoice || isCorrectOption) ? 600 : 400
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {isCorrectOption ? (
                                      <CheckCircle size={14} color="#18d18f" />
                                    ) : isStudentChoice ? (
                                      <XCircle size={14} color="#ff4d57" />
                                    ) : (
                                      <div style={{ width: 14, height: 14 }} />
                                    )}
                                  </div>
                                  <span>{opt}</span>
                                  {isStudentChoice && <span style={{ fontSize: "0.68rem", background: "rgba(0,0,0,0.15)", padding: "1px 6px", borderRadius: 4, marginLeft: "auto" }}>Your Selection</span>}
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

        {/* Right Side: Metadata Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="panel" style={{ padding: 20, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
            <h3 style={{ margin: "0 0 16px", color: "var(--text-main)", fontSize: "0.95rem" }}>Quiz Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Clock size={16} color="#8b5cf6" />
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TIME LIMIT</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 600 }}>{quiz.timeLimitMins} Minutes</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Award size={16} color="#18d18f" />
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TOTAL MARKS</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 700 }}>
                    {questions.reduce((s, q) => s + Number(q.points), 0)} Points
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <BookOpen size={16} color="#6366f1" />
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>QUESTIONS</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 500 }}>{questions.length} Items</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
