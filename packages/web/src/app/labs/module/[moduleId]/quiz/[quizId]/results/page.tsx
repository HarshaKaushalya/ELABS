"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft, Download, Award, Clock, BarChart2, LineChart, Eye,
  CheckCircle, XCircle
} from "lucide-react";

type Attempt = {
  attemptId: number;
  score: number;
  maxScore: number;
  submittedAt: string;
  startedAt: string;
  attemptNumber: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  regNumber: string | null;
  groupCode: string | null;
};

type Quiz = {
  id: number;
  title: string;
  moduleId: number;
};

type QuizStats = {
  avg: number | null;
  count: number;
  max: number;
  min: number;
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

export default function QuizResultsPage() {
  const { moduleId, quizId } = useParams<{ moduleId: string; quizId: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Review attempt modal
  const [activeReviewAttempt, setActiveReviewAttempt] = useState<Attempt | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<Answer[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);

  // Chart type state
  const [chartType, setChartType] = useState<"plot" | "bar">("plot");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/academic/quizzes/${quizId}/results`);
      if (res.ok) {
        const data = await res.json();
        setQuiz(data.quiz);
        setAttempts(data.attempts ?? []);
        setDistribution(data.distribution ?? {});
        setStats(data.stats ?? null);
      } else {
        alert("Failed to load results. Ensure you are logged in as an instructor.");
        router.push(`/labs/module/${moduleId}`);
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

  const loadReview = async (attempt: Attempt) => {
    setLoadingReview(true);
    setActiveReviewAttempt(attempt);
    try {
      const res = await apiFetch(`/academic/attempts/${attempt.attemptId}`);
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

  const exportExcel = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
    const token = typeof window !== "undefined" ? localStorage.getItem("elabs_access_token") || "" : "";
    window.open(`${apiBase}/academic/quizzes/${quizId}/export?token=${encodeURIComponent(token)}`, "_blank");
  };

  if (loading) {
    return (
      <AppShell title="Loading Quiz Results..." subtitle="">
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
          Loading statistics and attempts...
        </div>
      </AppShell>
    );
  }

  if (!quiz) {
    return (
      <AppShell title="Not Found" subtitle="">
        <div style={{ padding: 60, textAlign: "center", color: "#ff4d57" }}>
          Quiz not found or unauthorized access.
        </div>
      </AppShell>
    );
  }

  // Find max value in distribution bins for scaling the graph
  const distValues = Object.values(distribution);
  const maxBinVal = Math.max(...distValues, 1);

  return (
    <AppShell title={`${quiz.title} — Analysis`} subtitle="Quiz Mark Distribution & Attempts">
      <div style={{ marginBottom: 20 }}>
        <Link href={`/labs/module/${moduleId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#3d83f6", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Module Overview
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { label: "Class Average", value: stats.avg !== null ? `${stats.avg}%` : "—", color: "#8b5cf6" },
            { label: "Total Graded", value: `${stats.count} Students`, color: "#3d83f6" },
            { label: "Highest Score", value: stats.count > 0 ? `${stats.max}%` : "—", color: "#18d18f" },
            { label: "Lowest Score", value: stats.count > 0 ? `${stats.min}%` : "—", color: "#ff4d57" },
          ].map((c, i) => (
            <div key={i} className="panel" style={{ flex: 1, minWidth: 150, padding: "16px 20px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12 }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr min(380px, 100%)", gap: 20, alignItems: "start" }}>
        {/* Left Side: Attempts table */}
        <div className="panel" style={{ padding: 0, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: "0.9rem" }}>All Attempts ({attempts.length})</span>
            <button onClick={exportExcel} style={{ padding: "6px 14px", background: "#10b981", border: "none", borderRadius: 8, color: "#fff", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <Download size={12} /> Export to Excel
            </button>
          </div>

          {attempts.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
              No attempts have been submitted yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>STUDENT</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>GROUP</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>SUBMITTED AT</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>SCORE</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>PERCENTAGE</th>
                    <th style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 700 }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((att) => {
                    const pct = Math.round((att.score / att.maxScore) * 100);
                    return (
                      <tr key={att.attemptId} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "12px 18px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{att.studentName}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{att.regNumber || att.studentEmail}</div>
                        </td>
                        <td style={{ padding: "12px 18px", color: "var(--text-muted)", fontWeight: 600 }}>{att.groupCode || "—"}</td>
                        <td style={{ padding: "12px 18px", color: "var(--text-muted)" }}>{new Date(att.submittedAt).toLocaleString("en-GB")}</td>
                        <td style={{ padding: "12px 18px", color: "var(--text-main)", fontWeight: 600 }}>{att.score} / {att.maxScore}</td>
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{ fontWeight: 700, color: pct >= 75 ? "#18d18f" : pct >= 50 ? "#f59e0b" : "#ff4d57" }}>{pct}%</span>
                        </td>
                        <td style={{ padding: "12px 18px" }}>
                          <button onClick={() => loadReview(att)} style={{ padding: "4px 10px", background: "#8b5cf620", border: "1px solid #8b5cf640", borderRadius: 6, color: "#8b5cf6", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Eye size={12} /> Review
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

        {/* Right Side: Score Distribution Graph */}
        <div className="panel" style={{ padding: 20, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
              {chartType === "plot" ? <LineChart size={16} color="#8b5cf6" /> : <BarChart2 size={16} color="#8b5cf6" />}
              <span>Marks Distribution</span>
            </h3>
            
            <div style={{ display: "flex", background: "var(--bg-app)", borderRadius: 8, padding: 2, border: "1px solid var(--border-color)" }}>
              <button
                onClick={() => setChartType("plot")}
                style={{
                  padding: "4px 10px", border: "none", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
                  background: chartType === "plot" ? "var(--bg-card)" : "transparent",
                  color: chartType === "plot" ? "#8b5cf6" : "var(--text-muted)",
                  boxShadow: chartType === "plot" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s"
                }}
              >
                Plot
              </button>
              <button
                onClick={() => setChartType("bar")}
                style={{
                  padding: "4px 10px", border: "none", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
                  background: chartType === "bar" ? "var(--bg-card)" : "transparent",
                  color: chartType === "bar" ? "#8b5cf6" : "var(--text-muted)",
                  boxShadow: chartType === "bar" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s"
                }}
              >
                Bar
              </button>
            </div>
          </div>

          {chartType === "plot" ? (() => {
            const bins = ["0-10", "11-20", "21-30", "31-40", "41-50", "51-60", "61-70", "71-80", "81-90", "91-100"];
            const counts = bins.map(b => distribution[b] ?? 0);
            const maxVal = Math.max(...counts, 1);

            const svgW = 340;
            const svgH = 220;
            const padL = 30;
            const padR = 15;
            const padT = 20;
            const padB = 30;
            const graphW = svgW - padL - padR;
            const graphH = svgH - padT - padB;

            const points = counts.map((count, i) => {
              const x = padL + (i / 9) * graphW;
              const y = padT + graphH - (count / maxVal) * graphH;
              return { x, y, count };
            });

            // Smooth cubic bezier spline generator for points
            let pathD = "";
            if (points.length > 0) {
              pathD = `M ${points[0].x} ${points[0].y}`;
              for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                // Control points for smooth curves
                const cpX1 = p0.x + (p1.x - p0.x) / 3;
                const cpY1 = p0.y;
                const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
                const cpY2 = p1.y;
                pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
              }
            }
            const fillD = pathD ? `${pathD} L ${points[points.length - 1].x} ${padT + graphH} L ${points[0].x} ${padT + graphH} Z` : "";

            // Y axis grid values
            const yGridTicks = [0, 0.25, 0.5, 0.75, 1.0].map(p => Math.round(p * maxVal));
            const uniqueTicks = Array.from(new Set(yGridTicks)).sort((a, b) => a - b);

            return (
              <div style={{ position: "relative" }}>
                <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {uniqueTicks.map((tick, i) => {
                    const y = padT + graphH - (tick / maxVal) * graphH;
                    return (
                      <g key={i}>
                        <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                        <text x={padL - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="0.68rem" fontWeight="600">{tick}</text>
                      </g>
                    );
                  })}

                  {/* Fill Area Under Curve */}
                  {fillD && <path d={fillD} fill="url(#chartGradient)" />}

                  {/* Smooth Curve Path */}
                  {pathD && <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" />}
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#3d83f6" />
                    </linearGradient>
                  </defs>

                  {/* Markers & Hover Zones */}
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r={hoveredIdx === idx ? "7" : "4.5"} fill={hoveredIdx === idx ? "#8b5cf6" : "#6366f1"} stroke="var(--bg-card)" strokeWidth="2" style={{ transition: "all 0.15s" }} />
                      
                      {/* X Axis Labels */}
                      <text x={p.x} y={svgH - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="0.58rem" fontWeight="700">
                        {bins[idx]}
                      </text>

                      {/* Invisible larger hover zone for easier mouse targeting */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="18"
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                    </g>
                  ))}

                  {/* Axis Line */}
                  <line x1={padL} y1={padT + graphH} x2={svgW - padR} y2={padT + graphH} stroke="var(--border-color)" strokeWidth="1.5" />
                </svg>

                {/* Custom Floating HTML Tooltip */}
                {hoveredIdx !== null && (
                  <div style={{
                    position: "absolute",
                    left: points[hoveredIdx].x - 55,
                    top: points[hoveredIdx].y - 48,
                    width: 110,
                    padding: "4px 8px",
                    background: "var(--bg-card)",
                    border: "1px solid #8b5cf6",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    fontSize: "0.72rem",
                    textAlign: "center",
                    zIndex: 10,
                    pointerEvents: "none",
                    transition: "all 0.1s ease"
                  }}>
                    <div style={{ fontWeight: 700, color: "#8b5cf6" }}>{bins[hoveredIdx]}% Range</div>
                    <div style={{ color: "var(--text-main)", marginTop: 2 }}>{counts[hoveredIdx]} attempts</div>
                  </div>
                )}
              </div>
            );
          })() : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(distribution).map(([bin, count]) => {
                const pctOfTotal = (count / maxBinVal) * 100;
                return (
                  <div key={bin} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 60, fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>{bin}%</div>
                    <div style={{ flex: 1, background: "var(--bg-app)", height: 16, borderRadius: 8, overflow: "hidden", position: "relative" }}>
                      <div style={{
                        width: `${pctOfTotal}%`, background: "linear-gradient(90deg, #8b5cf6, #3d83f6)",
                        height: "100%", borderRadius: 8, transition: "width 0.5s ease"
                      }} />
                    </div>
                    <div style={{ width: 25, fontSize: "0.78rem", color: "var(--text-main)", fontWeight: 600 }}>{count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Attempt Review Modal */}
      {activeReviewAttempt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
          onClick={e => e.target === e.currentTarget && setActiveReviewAttempt(null)}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, width: "min(680px, 94vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1rem" }}>Review Quiz Attempt</h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Student: {activeReviewAttempt.studentName} ({activeReviewAttempt.regNumber || activeReviewAttempt.studentEmail})
                </p>
              </div>
              <button onClick={() => setActiveReviewAttempt(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
            </div>
            
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {loadingReview ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading student answers...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {reviewAnswers.map((ans, idx) => {
                    const isMcq = ans.type === "MCQ";
                    const isFullyCorrect = ans.pointsAwarded === ans.totalPoints;
                    
                    return (
                      <div key={idx} style={{
                        padding: 16, background: "var(--bg-app)", border: "1px solid var(--border-color)",
                        borderLeft: `4px solid ${isFullyCorrect ? "#18d18f" : "#ff4d57"}`, borderRadius: "0 8px 8px 0"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.85rem" }}>Question {idx + 1}</span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isFullyCorrect ? "#18d18f" : "#ff4d57" }}>
                            {ans.pointsAwarded} / {ans.totalPoints} Pts
                          </span>
                        </div>
                        <p style={{ margin: "0 0 10px", color: "var(--text-main)", fontSize: "0.88rem" }}>{ans.questionText}</p>

                        {isMcq && ans.options && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {ans.options.map((opt, optIdx) => {
                              const isStudentChoice = ans.answerText === String(optIdx);
                              const isCorrectOption = ans.correctAnswer === String(optIdx);
                              
                              let optBg = "transparent";
                              let optColor = "var(--text-muted)";
                              
                              if (isCorrectOption) {
                                optBg = "rgba(24,209,143,0.12)";
                                optColor = "#18d18f";
                              } else if (isStudentChoice && !isCorrectOption) {
                                optBg = "rgba(255,77,87,0.12)";
                                optColor = "#ff4d57";
                              }

                              return (
                                <div key={optIdx} style={{
                                  padding: "8px 12px", background: optBg, borderRadius: 6,
                                  fontSize: "0.8rem", color: optColor, border: `1px solid ${isStudentChoice || isCorrectOption ? optColor : "transparent"}`,
                                  display: "flex", alignItems: "center", gap: 8
                                }}>
                                  {isCorrectOption ? <CheckCircle size={12} /> : isStudentChoice ? <XCircle size={12} /> : <div style={{ width: 12 }} />}
                                  <span>{opt}</span>
                                  {isStudentChoice && <span style={{ fontSize: "0.65rem", background: "rgba(0,0,0,0.1)", padding: "1px 4px", borderRadius: 4, marginLeft: "auto" }}>Selected</span>}
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
          </div>
        </div>
      )}
    </AppShell>
  );
}
