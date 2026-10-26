"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Package,
  Wrench,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  FlaskConical,
  ClipboardList,
  FileSpreadsheet,
  Layers,
  Search,
  Filter,
  Download,
  BookOpen,
  ShieldAlert,
  Eye,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { PracticalDetailsModal } from "@/components/academic/PracticalDetailsModal";

/* ─── Types ────────────────────────────────────────────────────── */
type StudentProfile = {
  group_code?: string;
  groupCode?: string;
  reg_number?: string;
  regNumber?: string;
  semester?: number;
  department?: string;
};

type MasterSlot = {
  id?: number;
  sessionDate: string;
  dayOfWeek?: string | null;
  timeSlot: string;
  moduleCode: string;
  moduleName?: string;
  moduleId?: number;
  labName: string;
  practicalName?: string | null;
  groupCode: string;
  academicYear?: string;
  instructorName?: string | null;
  notes?: string | null;
  status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
};

type SemesterPractical = {
  id: number;
  moduleCode: string;
  labNumber: string;
  labTitle?: string;
  equipStatus: "Working" | "Not Working" | "Under Maintenance";
  numSessions?: number;
  notes?: string;
  completionRequirements?: string | null;
  safetyGuidelines?: string | null;
  moduleId: number;
  moduleName?: string;
  coordinatorName?: string | null;
  documentCount?: number;
  labVenue?: string;
};
type TimetableSlot = {
  id: number;
  date: string;
  time: string;
  lab: string;
  labName?: string;
  practicalName?: string;
  instructorName?: string;
  notes?: string;
  moduleCode: string;
  moduleName: string;
  moduleId: number;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
};

type AssignmentItem = {
  id: number;
  moduleId: number;
  title: string;
  type: "REPORT" | "PRE_LAB" | "OTHER";
  openedAt: string | null;
  dueAt: string | null;
  maxScore: number;
  moduleCode: string;
  moduleName: string;
  submissionId?: number | null;
  submittedAt?: string | null;
};

type QuizItem = {
  id: number;
  moduleId: number;
  title: string;
  openedAt: string | null;
  closedAt: string | null;
  moduleCode: string;
  moduleName: string;
};

type TimelineEvent = {
  id: string;
  date: Date;
  title: string;
  shortTitle: string;
  subtitle: string;
  type: "PRE_LAB" | "LAB_SESSION" | "ASSIGNMENT" | "REPORT" | "QUIZ";
  color: string;
  moduleId: number;
  linkUrl: string;
  time?: string;
  badge?: string;
};

type DashStats = {
  totalLabs: number;
  totalItems: number;
  availableItems: number;
  borrowedItems: number;
  maintenanceItems: number;
  outOfServiceItems: number;
  activeBorrows: number;
  overdueItems: number;
};

type OverdueTx = {
  transactionId: number;
  dueAt: string;
  daysOverdue: number;
  borrowerName: string | null;
  borrowerGroupCode: string | null;
  labName: string;
  purpose: string | null;
  items: { itemId: number; elabsTag: string; name: string; category: string }[];
};

type MyBorrow = {
  transactionId: number;
  dueAt: string | null;
  daysOverdue: number | null;
  labName: string;
  purpose: string | null;
  items: { itemId: number; elabsTag: string; name: string; category: string }[];
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        flex: "1 1 180px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: color + "18",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 4, fontWeight: 500 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: number | string;
  badgeColor?: string;
}) {
  return (
    <div
      style={{
        padding: "16px 24px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--panel)",
      }}
    >
      {icon}
      <h3 style={{ margin: 0, color: "var(--text)", fontSize: "1.05rem", fontWeight: 600 }}>
        {title}
      </h3>
      {badge !== undefined && (
        <span
          style={{
            marginLeft: "auto",
            background: badgeColor ?? "var(--line)",
            color: badgeColor ? "#fff" : "var(--muted)",
            borderRadius: 20,
            padding: "2px 10px",
            fontSize: "0.78rem",
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [stats, setStats] = useState<DashStats | null>(null);
  const [overdue, setOverdue] = useState<OverdueTx[]>([]);
  const [myBorrows, setMyBorrows] = useState<MyBorrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeRange, setTimeRange] = useState<7 | 30>(30);

  // Semester 6 master hub states
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [masterSlots, setMasterSlots] = useState<MasterSlot[]>([]);
  const [semesterModules, setSemesterModules] = useState<{ id: number; code: string; name: string }[]>([]);
  const [semesterGroups, setSemesterGroups] = useState<string[]>([]);
  const [semesterPracticals, setSemesterPracticals] = useState<SemesterPractical[]>([]);
  const [hubTab, setHubTab] = useState<"TIMETABLE" | "PRACTICALS">("TIMETABLE");
  const [ttModuleFilter, setTtModuleFilter] = useState<string>("ALL");
  const [ttGroupFilter, setTtGroupFilter] = useState<string>("ALL");
  const [ttSearch, setTtSearch] = useState<string>("");
  const [pracModuleFilter, setPracModuleFilter] = useState<string>("ALL");
  const [pracSearch, setPracSearch] = useState<string>("");
  const [activePracticalId, setActivePracticalId] = useState<number | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: string; val: string } | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [ttRes, summRes, overdueRes, myBRes, asgnRes, semTtRes, semPracRes] = await Promise.all([
          apiFetch("/timetable"),
          apiFetch("/dashboard/summary"),
          apiFetch("/dashboard/overdue"),
          apiFetch("/dashboard/my-borrows"),
          apiFetch("/academic/assignments").catch(() => ({ ok: false } as any)),
          apiFetch("/academic/semesters/6/timetable").catch(() => ({ ok: false } as any)),
          apiFetch("/academic/semesters/6/practicals").catch(() => ({ ok: false } as any)),
        ]);

        let loadedAssignments: AssignmentItem[] = [];
        let loadedQuizzes: QuizItem[] = [];

        if (ttRes.ok) {
          const d = await ttRes.json();
          setSlots(d.slots ?? []);
          setProfile(d.profile ?? null);
          if (Array.isArray(d.assignments)) {
            loadedAssignments = d.assignments;
          }
          if (Array.isArray(d.quizzes)) {
            loadedQuizzes = d.quizzes;
          }
        }
        if (semTtRes && "ok" in semTtRes && semTtRes.ok) {
          const semData = await (semTtRes as any).json();
          setMasterSlots(semData.slots ?? []);
          setSemesterModules(semData.modules ?? []);
          setSemesterGroups(semData.groups ?? []);
        }
        if (semPracRes && "ok" in semPracRes && semPracRes.ok) {
          const pracData = await (semPracRes as any).json();
          setSemesterPracticals(pracData.practicals ?? []);
        }
        if (summRes.ok) {
          const d = await summRes.json();
          setStats(d.stats ?? null);
        }
        if (overdueRes.ok) {
          const d = await overdueRes.json();
          setOverdue(d.overdue ?? []);
        }
        if (myBRes.ok) {
          const d = await myBRes.json();
          setMyBorrows(d.borrows ?? []);
        }

        // Merge from /academic/assignments if available
        if (asgnRes && "ok" in asgnRes && asgnRes.ok) {
          try {
            const ad = await (asgnRes as any).json();
            if (Array.isArray(ad.assignments)) {
              const existingIds = new Set(loadedAssignments.map((a) => a.id));
              for (const a of ad.assignments) {
                if (!existingIds.has(a.id)) {
                  loadedAssignments.push(a);
                  existingIds.add(a.id);
                }
              }
            }
          } catch {}
        }

        setAssignments(loadedAssignments);
        setQuizzes(loadedQuizzes);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  /* Timeline events */
  const generateTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 1. Timetable sessions
    slots.forEach((slot) => {
      const sessionDate = new Date(slot.date);
      const practicalLabel = slot.practicalName ? slot.practicalName : `Laboratory Session`;
      const roomLabel = slot.labName || slot.lab || "Laboratory";

      events.push({
        id: `lab-${slot.id}`,
        date: sessionDate,
        title: `${practicalLabel} — ${roomLabel}`,
        shortTitle: `${slot.practicalName ? slot.practicalName : roomLabel} (${slot.moduleCode})`,
        subtitle: `${slot.moduleCode} ${slot.moduleName}${slot.instructorName ? ` • ${slot.instructorName}` : ""} • ${slot.time}`,
        type: "LAB_SESSION",
        color: "#f59e0b",
        moduleId: slot.moduleId,
        linkUrl: `/labs/module/${slot.moduleId}?tab=schedule`,
        time: slot.time,
        badge: slot.status === "COMPLETED" ? "Completed" : "Lab Session",
      });
    });

    // 2. Real assignments with due dates
    assignments.forEach((asgn) => {
      if (!asgn.dueAt) return;
      const dueDate = new Date(asgn.dueAt);
      const isPreLab = asgn.type === "PRE_LAB";
      const isReport = asgn.type === "REPORT";
      const color = isPreLab ? "#10b981" : isReport ? "#f59e0b" : "#3d83f6";
      const typeLabel = isPreLab ? "Pre-Lab" : isReport ? "Lab Report" : "Assignment";
      const timeStr = dueDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

      events.push({
        id: `asgn-${asgn.id}`,
        date: dueDate,
        title: `${typeLabel}: ${asgn.title}`,
        shortTitle: `${typeLabel}: ${asgn.title} (${asgn.moduleCode || "EE5304"})`,
        subtitle: `${typeLabel} deadline • ${asgn.moduleCode} ${asgn.moduleName} · Max score: ${asgn.maxScore}`,
        type: isPreLab ? "PRE_LAB" : isReport ? "REPORT" : "ASSIGNMENT",
        color,
        moduleId: asgn.moduleId,
        linkUrl: `/labs/module/${asgn.moduleId}?tab=assignments#assignment-${asgn.id}`,
        time: timeStr !== "00:00" ? timeStr : "23:59",
        badge: `${typeLabel} Due`,
      });
    });

    // 3. Real quizzes with closing deadlines
    quizzes.forEach((quiz) => {
      if (!quiz.closedAt) return;
      const closeDate = new Date(quiz.closedAt);
      const timeStr = closeDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

      events.push({
        id: `quiz-${quiz.id}`,
        date: closeDate,
        title: `Quiz: ${quiz.title}`,
        shortTitle: `Quiz: ${quiz.title} (${quiz.moduleCode})`,
        subtitle: `Quiz closing deadline • ${quiz.moduleCode} ${quiz.moduleName}`,
        type: "QUIZ",
        color: "#8b5cf6",
        moduleId: quiz.moduleId,
        linkUrl: `/labs/module/${quiz.moduleId}?tab=quizzes`,
        time: timeStr !== "00:00" ? timeStr : "23:59",
        badge: "Quiz Closes",
      });
    });

    // 4. Fallback: If no real assignments exist in the database, keep synthetic pre-lab 2 days before slots
    if (assignments.length === 0) {
      slots.forEach((slot) => {
        const sessionDate = new Date(slot.date);
        const preLabDate = new Date(sessionDate);
        preLabDate.setDate(preLabDate.getDate() - 2);
        events.push({
          id: `prelab-${slot.id}`,
          date: preLabDate,
          title: `PRE-LAB is due`,
          shortTitle: `Pre-Lab (${slot.moduleCode})`,
          subtitle: `Assignment due • ${slot.moduleCode} ${slot.moduleName}`,
          type: "PRE_LAB",
          color: "#10b981",
          moduleId: slot.moduleId,
          linkUrl: `/labs/module/${slot.moduleId}?tab=assignments`,
          time: "23:59",
          badge: "Pre-Lab Due",
        });
      });
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const allTimelineEvents = generateTimelineEvents();

  const upcomingEvents = allTimelineEvents.filter((e) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.round((e.date.getTime() - now.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= timeRange;
  });

  const groupedEvents = upcomingEvents.reduce(
    (acc, event) => {
      const dateStr = event.date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(event);
      return acc;
    },
    {} as Record<string, TimelineEvent[]>
  );

  /* Calendar helpers */
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const calendarDays = getDaysInMonth(currentMonth);
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getEventsForDate = (date: Date) =>
    allTimelineEvents.filter(
      (e) =>
        e.date.getDate() === date.getDate() &&
        e.date.getMonth() === date.getMonth() &&
        e.date.getFullYear() === date.getFullYear()
    );

  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  /* ── Master Semester Hub Helpers ───────────────────────────── */
  const filteredMasterSlots = masterSlots.filter((s) => {
    if (ttModuleFilter !== "ALL" && s.moduleCode !== ttModuleFilter) return false;
    if (ttGroupFilter === "MY_GROUP") {
      const myG = profile?.group_code;
      if (!myG) return true;
      const isMyGroup =
        s.groupCode === myG ||
        s.groupCode === "ALL" ||
        s.groupCode === `EE${parseInt(myG.replace("EE", ""), 10)}` ||
        `EE${parseInt(s.groupCode.replace("EE", ""), 10)}` === myG;
      if (!isMyGroup) return false;
    } else if (ttGroupFilter !== "ALL" && s.groupCode !== ttGroupFilter) {
      return false;
    }
    if (!ttSearch.trim()) return true;
    const q = ttSearch.toLowerCase();
    return (
      s.sessionDate.toLowerCase().includes(q) ||
      (s.dayOfWeek && s.dayOfWeek.toLowerCase().includes(q)) ||
      s.moduleCode.toLowerCase().includes(q) ||
      (s.moduleName && s.moduleName.toLowerCase().includes(q)) ||
      (s.practicalName && s.practicalName.toLowerCase().includes(q)) ||
      s.labName.toLowerCase().includes(q) ||
      s.groupCode.toLowerCase().includes(q) ||
      (s.instructorName && s.instructorName.toLowerCase().includes(q))
    );
  });

  const filteredSemesterPracticals = semesterPracticals.filter((p) => {
    if (pracModuleFilter !== "ALL" && p.moduleCode !== pracModuleFilter) return false;
    if (!pracSearch.trim()) return true;
    const q = pracSearch.toLowerCase();
    return (
      p.moduleCode.toLowerCase().includes(q) ||
      (p.moduleName && p.moduleName.toLowerCase().includes(q)) ||
      p.labNumber.toLowerCase().includes(q) ||
      (p.labTitle && p.labTitle.toLowerCase().includes(q)) ||
      (p.labVenue && p.labVenue.toLowerCase().includes(q)) ||
      (p.completionRequirements && p.completionRequirements.toLowerCase().includes(q)) ||
      (p.safetyGuidelines && p.safetyGuidelines.toLowerCase().includes(q))
    );
  });

  const practicalsByModule = filteredSemesterPracticals.reduce((acc, p) => {
    const key = p.moduleCode;
    if (!acc[key]) {
      acc[key] = {
        moduleCode: p.moduleCode,
        moduleName: p.moduleName || p.moduleCode,
        coordinator: p.coordinatorName,
        items: [],
      };
    }
    acc[key].items.push(p);
    return acc;
  }, {} as Record<string, { moduleCode: string; moduleName: string; coordinator?: string | null; items: SemesterPractical[] }>);

  const exportMasterCsv = () => {
    if (filteredMasterSlots.length === 0) return;
    const headers = ["Row", "Date", "Day", "Time Slot", "Module Code", "Module Name", "Practical Experiment", "Venue", "Group", "Instructor", "Status", "Notes"];
    const rows = filteredMasterSlots.map((s, idx) => [
      idx + 1,
      s.sessionDate,
      s.dayOfWeek || "",
      `"${s.timeSlot}"`,
      s.moduleCode,
      `"${s.moduleName || ""}"`,
      `"${s.practicalName || ""}"`,
      `"${s.labName}"`,
      s.groupCode,
      `"${s.instructorName || ""}"`,
      s.status,
      `"${s.notes || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Semester_6_Master_Lab_Timetable.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ── Shared card style */
  const cardStyle: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  /* ── Section body padding */
  const bodyPad: React.CSSProperties = { padding: "20px 24px" };

  if (loading) {
    return (
      <AppShell title="Dashboard" subtitle="Smart Laboratory & Academic Timeline">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 300,
            color: "var(--muted)",
            gap: 12,
            fontSize: "1rem",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid var(--line)",
              borderTopColor: "#4f7ef8",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Loading dashboard…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard" subtitle="Smart Laboratory & Academic Timeline">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── INVENTORY STATS ROW ──────────────────────────────── */}
        {stats && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <StatCard
              icon={<FlaskConical size={22} color="#4f7ef8" />}
              label="Total Labs"
              value={stats.totalLabs}
              color="#4f7ef8"
            />
            <StatCard
              icon={<Package size={22} color="#10b981" />}
              label="Available Items"
              value={stats.availableItems}
              color="#10b981"
              sub={`of ${stats.totalItems} total`}
            />
            <StatCard
              icon={<ArrowLeftRight size={22} color="#f59e0b" />}
              label="Active Borrows"
              value={stats.activeBorrows}
              color="#f59e0b"
            />
            <StatCard
              icon={<AlertTriangle size={22} color="#ef4444" />}
              label="Overdue Returns"
              value={stats.overdueItems}
              color="#ef4444"
            />
            <StatCard
              icon={<Wrench size={22} color="#8b5cf6" />}
              label="Under Maintenance"
              value={stats.maintenanceItems}
              color="#8b5cf6"
            />
            <StatCard
              icon={<XCircle size={22} color="var(--muted)" />}
              label="Out of Service"
              value={stats.outOfServiceItems}
              color="var(--muted)"
            />
          </div>
        )}

        {/* ── MY ACTIVE BORROWS (Student) ──────────────────────── */}
        {myBorrows.length > 0 && (
          <section style={cardStyle}>
            <SectionHeader
              icon={<ArrowLeftRight size={18} color="#f59e0b" />}
              title="My Active Borrows"
              badge={myBorrows.length}
              badgeColor="#f59e0b"
            />
            <div style={bodyPad}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myBorrows.map((b) => {
                  const overdue = b.dueAt && b.daysOverdue != null && b.daysOverdue > 0;
                  const dueDate = b.dueAt
                    ? new Date(b.dueAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "No due date";
                  const bItems: any[] = Array.isArray(b.items)
                    ? b.items
                    : typeof b.items === "string"
                    ? JSON.parse(b.items || "[]")
                    : [];

                  return (
                    <div
                      key={b.transactionId}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: overdue
                          ? "1px solid rgba(239,68,68,0.35)"
                          : "1px solid var(--line)",
                        background: overdue ? "rgba(220,38,38,0.08)" : "var(--panel-2)",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: overdue ? "rgba(239,68,68,0.15)" : "rgba(79,126,248,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Package size={18} color={overdue ? "#ef4444" : "#4f7ef8"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
                          {bItems.map((i: any) => i.name).join(", ")}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 3 }}>
                          {b.labName}
                          {b.purpose ? ` · ${b.purpose}` : ""}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {bItems.map((i: any) => (
                            <span
                              key={i.elabsTag}
                              style={{
                                fontSize: "0.72rem",
                                background: "var(--line)",
                                color: "#4a5568",
                                borderRadius: 6,
                                padding: "2px 8px",
                                fontFamily: "monospace",
                              }}
                            >
                              {i.elabsTag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: overdue ? "#ef4444" : "#10b981",
                          }}
                        >
                          {overdue ? `${b.daysOverdue}d overdue` : `Due ${dueDate}`}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                          Tx #{b.transactionId}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── OVERDUE ITEMS (Admin / Lecturer view) ───────────────── */}
        {overdue.length > 0 && (
          <section style={cardStyle}>
            <SectionHeader
              icon={<AlertTriangle size={18} color="#ef4444" />}
              title="Overdue Inventory Returns"
              badge={overdue.length}
              badgeColor="#ef4444"
            />
            <div style={bodyPad}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {overdue.map((tx) => {
                  const dueDate = new Date(tx.dueAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const txItems: any[] = Array.isArray(tx.items)
                    ? tx.items
                    : typeof tx.items === "string"
                    ? JSON.parse(tx.items || "[]")
                    : [];

                  return (
                    <div
                      key={tx.transactionId}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 14,
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: "1px solid rgba(239,68,68,0.35)",
                        background: "rgba(220,38,38,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: "rgba(239,68,68,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <AlertTriangle size={18} color="#ef4444" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
                          {tx.borrowerName ?? tx.borrowerGroupCode ?? "Unknown"}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 2 }}>
                          {tx.labName}
                          {tx.purpose ? ` · ${tx.purpose}` : ""}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {txItems.map((i: any) => (
                            <span
                              key={i.elabsTag}
                              style={{
                                fontSize: "0.72rem",
                                background: "rgba(220,38,38,0.1)",
                                color: "#ef4444",
                                border: "1px solid rgba(239,68,68,0.35)",
                                borderRadius: 6,
                                padding: "2px 8px",
                                fontFamily: "monospace",
                              }}
                            >
                              {i.elabsTag} · {i.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#ef4444",
                          }}
                        >
                          {tx.daysOverdue}d overdue
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                          Due {dueDate}
                        </div>
                        <Link href="/inventory">
                          <button
                            style={{
                              marginTop: 8,
                              padding: "4px 12px",
                              background: "transparent",
                              border: "1px solid rgba(239,68,68,0.35)",
                              color: "#ef4444",
                              borderRadius: 6,
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            Manage →
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          </section>
        )}

        {/* ── TIMELINE ─────────────────────────────────────────── */}
        <section style={cardStyle}>
          <SectionHeader
            icon={<Clock size={18} color="#f59e0b" />}
            title="Upcoming Schedule"
            badge={upcomingEvents.length}
            badgeColor="#f59e0b"
          />
          <div style={bodyPad}>
            {/* Filter row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {([7, 30] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setTimeRange(n)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    border: "1px solid",
                    borderColor: timeRange === n ? "#4f7ef8" : "var(--line)",
                    background: timeRange === n ? "#4f7ef8" : "var(--panel)",
                    color: timeRange === n ? "#fff" : "var(--muted)",
                    fontWeight: 500,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Next {n} days
                </button>
              ))}
            </div>

            {Object.keys(groupedEvents).length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: "0.9rem",
                }}
              >
                <CheckCircle size={32} color="var(--muted)" style={{ marginBottom: 8 }} />
                <div>No upcoming events in the next {timeRange} days.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {Object.entries(groupedEvents).map(([dateStr, evts]) => (
                  <div key={dateStr}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#4f7ef8",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 12,
                        paddingBottom: 6,
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      {dateStr}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {evts.map((event) => (
                        <div
                          key={event.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "14px 16px",
                            background: "var(--panel-2)",
                            border: "1px solid var(--line)",
                            borderLeft: `4px solid ${event.color}`,
                            borderRadius: "0 10px 10px 0",
                          }}
                        >
                          <div style={{ color: "var(--muted)", fontSize: "0.85rem", minWidth: 45 }}>
                            {event.time || "23:59"}
                          </div>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              background: event.color + "18",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={18} color={event.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color: event.color,
                                fontWeight: 600,
                                fontSize: "0.92rem",
                                marginBottom: 3,
                              }}
                            >
                              {event.title}
                            </div>
                            <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                              {event.subtitle}
                            </div>
                          </div>
                          {event.linkUrl || event.moduleId ? (
                            <Link href={event.linkUrl || `/labs/module/${event.moduleId}?tab=assignments`}>
                              <button
                                style={{
                                  padding: "6px 14px",
                                  background: "var(--panel)",
                                  border: "1px solid var(--line)",
                                  color: "var(--blue)",
                                  borderRadius: 8,
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                View details →
                              </button>
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── CALENDAR ─────────────────────────────────────────── */}
        <section style={cardStyle}>
          <SectionHeader
            icon={<CalendarIcon size={18} color="#4f7ef8" />}
            title="Academic Calendar"
          />
          <div style={bodyPad}>
            {/* Month nav */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <button
                onClick={prevMonth}
                style={{
                  background: "var(--bg-elev)",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <div style={{ fontWeight: 700, color: "var(--text)", fontSize: "1rem" }}>
                {currentMonth.toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <button
                onClick={nextMonth}
                style={{
                  background: "var(--bg-elev)",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Calendar grid */}
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* Week day headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  background: "var(--bg-elev)",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                {weekDays.map((d) => (
                  <div
                    key={d}
                    style={{
                      padding: "10px 0",
                      textAlign: "center",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  background: "var(--panel)",
                }}
              >
                {calendarDays.map((date, i) => {
                  const isToday = date?.toDateString() === new Date().toDateString();
                  const dayEvts = date ? getEventsForDate(date) : [];

                  return (
                    <div
                      key={i}
                      style={{
                        minHeight: 100,
                        padding: "8px",
                        borderRight: "1px solid var(--line)",
                        borderBottom: "1px solid var(--line)",
                        background: isToday ? "rgba(79,126,248,0.12)" : "transparent",
                      }}
                    >
                      {date && (
                        <>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: isToday ? "#4f7ef8" : "transparent",
                              color: isToday ? "#fff" : "var(--text)",
                              fontWeight: isToday ? 700 : 400,
                              fontSize: "0.85rem",
                              marginBottom: 6,
                            }}
                          >
                            {date.getDate()}
                          </div>
                          <div
                            style={{ display: "flex", flexDirection: "column", gap: 3 }}
                          >
                            {dayEvts.map((evt) => (
                              <Link
                                key={evt.id}
                                href={evt.linkUrl || (evt.moduleId ? `/labs/module/${evt.moduleId}?tab=assignments` : "#")}
                                style={{ textDecoration: "none" }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: evt.color,
                                    fontWeight: 600,
                                    background: evt.color + "14",
                                    border: `1px solid ${evt.color}35`,
                                    borderRadius: 4,
                                    padding: "2px 6px",
                                    lineHeight: 1.4,
                                    wordBreak: "break-word",
                                    cursor: "pointer",
                                    transition: "background 0.15s ease",
                                  }}
                                  title={`${evt.title} — ${evt.subtitle}`}
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    {evt.type === "PRE_LAB" ? (
                                      <ClipboardList size={10} />
                                    ) : evt.type === "LAB_SESSION" ? (
                                      <FlaskConical size={10} />
                                    ) : (
                                      <FileText size={10} />
                                    )}
                                    <span>{evt.shortTitle || evt.title}</span>
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: 20,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              {[
                { color: "#f59e0b", label: "Lab Session" },
                { color: "#10b981", label: "Pre-Lab Due" },
                { color: "#3d83f6", label: "Assignment / Report Due" },
                { color: "#8b5cf6", label: "Quiz Closes" },
              ].map((l) => (
                <div
                  key={l.label}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: l.color,
                    }}
                  />
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SEMESTER 6 LABORATORY & CURRICULUM HUB ────────────────── */}
        <section style={{ ...cardStyle, marginTop: 14 }}>
          {/* Header with Google Sheets / Excel styling */}
          <div
            style={{
              padding: "18px 24px",
              background: "linear-gradient(135deg, #107c41, #0b5a2f)",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <FileSpreadsheet size={22} color="#fff" />
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                  Semester 6 Academic & Laboratory Curriculum Hub
                </h2>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    padding: "2px 10px",
                    borderRadius: 14,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Department of EIE
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.85)" }}>
                Master rotational schedules across all groups & modules, plus the complete semester practicals catalog
              </div>
            </div>

            {/* Student group pill */}
            {profile?.group_code && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: 10,
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Users size={16} color="#fff" />
                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  Your Assigned Group: <strong style={{ color: "#a7f3d0" }}>{profile.group_code}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Excel Workbook Sheet Tabs */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-elev)",
              borderBottom: "1px solid var(--line)",
              padding: "0 20px",
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={() => setHubTab("TIMETABLE")}
              style={{
                padding: "12px 20px",
                border: "none",
                borderBottom: hubTab === "TIMETABLE" ? "3px solid #107c41" : "3px solid transparent",
                background: hubTab === "TIMETABLE" ? "var(--panel)" : "transparent",
                color: hubTab === "TIMETABLE" ? "#107c41" : "var(--muted)",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FileSpreadsheet size={16} />
              <span>Sheet 1: Master Timetable (Spreadsheet View)</span>
              <span style={{ fontSize: "0.72rem", padding: "1px 7px", borderRadius: 10, background: hubTab === "TIMETABLE" ? "#107c41" : "var(--line)", color: hubTab === "TIMETABLE" ? "#fff" : "var(--muted)" }}>
                {masterSlots.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHubTab("PRACTICALS")}
              style={{
                padding: "12px 20px",
                border: "none",
                borderBottom: hubTab === "PRACTICALS" ? "3px solid #3d83f6" : "3px solid transparent",
                background: hubTab === "PRACTICALS" ? "var(--panel)" : "transparent",
                color: hubTab === "PRACTICALS" ? "#3d83f6" : "var(--muted)",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Layers size={16} />
              <span>Sheet 2: Practicals Matrix (All Modules Catalog)</span>
              <span style={{ fontSize: "0.72rem", padding: "1px 7px", borderRadius: 10, background: hubTab === "PRACTICALS" ? "#3d83f6" : "var(--line)", color: hubTab === "PRACTICALS" ? "#fff" : "var(--muted)" }}>
                {semesterPracticals.length}
              </span>
            </button>
          </div>

          {/* ── SHEET 1: MASTER LAB TIMETABLE (EXCEL GRID VIEW) ────────── */}
          {hubTab === "TIMETABLE" && (
            <div>
              {/* Excel Formula & Coordinates Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--panel-2)",
                  borderBottom: "1px solid var(--line)",
                  padding: "6px 14px",
                  gap: 10,
                  fontSize: "0.82rem",
                  fontFamily: "monospace",
                }}
              >
                <div
                  style={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    padding: "3px 10px",
                    fontWeight: 700,
                    color: "#107c41",
                    minWidth: 46,
                    textAlign: "center",
                  }}
                >
                  {activeCell ? `${activeCell.col}${activeCell.row + 1}` : "A1"}
                </div>
                <div style={{ color: "var(--muted)", fontWeight: 700 }}>fx</div>
                <div
                  style={{
                    flex: 1,
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    padding: "3px 12px",
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {activeCell ? activeCell.val : masterSlots.length > 0 ? `${masterSlots[0].moduleCode}: ${masterSlots[0].practicalName || masterSlots[0].labName}` : "Ready"}
                </div>
              </div>

              {/* Toolbar: Filters & Search */}
              <div
                style={{
                  padding: "12px 20px",
                  background: "var(--panel)",
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {/* Module Filter */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--muted)" }}>MODULE:</span>
                    <select
                      value={ttModuleFilter}
                      onChange={(e) => setTtModuleFilter(e.target.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: "var(--panel-2)",
                        color: "var(--text)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="ALL">All Modules ({semesterModules.length})</option>
                      {semesterModules.map((m) => (
                        <option key={m.id} value={m.code}>
                          {m.code} — {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Group Filter */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--muted)" }}>GROUP:</span>
                    <select
                      value={ttGroupFilter}
                      onChange={(e) => setTtGroupFilter(e.target.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: ttGroupFilter === "MY_GROUP" ? "1px solid #10b981" : "1px solid var(--line)",
                        background: ttGroupFilter === "MY_GROUP" ? "rgba(16, 185, 129, 0.12)" : "var(--panel-2)",
                        color: ttGroupFilter === "MY_GROUP" ? "#10b981" : "var(--text)",
                        fontWeight: ttGroupFilter === "MY_GROUP" ? 700 : 500,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="ALL">All Groups (Master Rotation)</option>
                      {profile?.group_code && (
                        <option value="MY_GROUP">★ My Group ({profile.group_code}) Only</option>
                      )}
                      {semesterGroups.map((g) => (
                        <option key={g} value={g}>
                          Group {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search box */}
                  <div style={{ position: "relative", minWidth: 220 }}>
                    <Search size={14} color="var(--muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      value={ttSearch}
                      onChange={(e) => setTtSearch(e.target.value)}
                      placeholder="Search dates, practicals, venues…"
                      style={{
                        padding: "6px 10px 6px 30px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: "var(--panel-2)",
                        color: "var(--text)",
                        fontSize: "0.8rem",
                        width: "100%",
                      }}
                    />
                  </div>
                </div>

                {/* CSV Export */}
                <button
                  type="button"
                  onClick={exportMasterCsv}
                  disabled={filteredMasterSlots.length === 0}
                  style={{
                    padding: "7px 16px",
                    background: "linear-gradient(135deg, #107c41, #0b5a2f)",
                    border: "none",
                    borderRadius: 6,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    cursor: filteredMasterSlots.length > 0 ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 6px rgba(16, 124, 65, 0.25)",
                  }}
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Excel Table Grid */}
              <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--bg-elev)" }}>
                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                      <th style={{ padding: "8px 12px", borderRight: "1px solid var(--line)", color: "var(--muted)", width: 44, textAlign: "center", fontSize: "0.72rem" }}>#</th>
                      <th style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--muted)", fontWeight: 700, fontSize: "0.72rem" }}>DATE & DAY (A)</th>
                      <th style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--muted)", fontWeight: 700, fontSize: "0.72rem" }}>TIME (B)</th>
                      <th style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--muted)", fontWeight: 700, fontSize: "0.72rem" }}>MODULE (C)</th>
                      <th style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--muted)", fontWeight: 700, fontSize: "0.72rem" }}>PRACTICAL EXPERIMENT (D)</th>
                      <th style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--muted)", fontWeight: 700, fontSize: "0.72rem" }}>LABORATORY VENUE (E)</th>
                      <th style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--muted)", fontWeight: 700, fontSize: "0.72rem" }}>GROUP (F)</th>
                      <th style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--muted)", fontWeight: 700, fontSize: "0.72rem" }}>INSTRUCTOR (G)</th>
                      <th style={{ padding: "8px 14px", color: "var(--muted)", fontWeight: 700, fontSize: "0.72rem" }}>STATUS (H)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMasterSlots.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                          No timetable slots match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredMasterSlots.map((s, idx) => {
                        const myG = profile?.group_code;
                        const isMyGroup =
                          myG &&
                          (s.groupCode === myG ||
                            s.groupCode === `EE${parseInt(myG.replace("EE", ""), 10)}` ||
                            `EE${parseInt(s.groupCode.replace("EE", ""), 10)}` === myG);

                        return (
                          <tr
                            key={s.id ?? idx}
                            style={{
                              borderBottom: "1px solid var(--line)",
                              background: isMyGroup ? "rgba(16, 185, 129, 0.08)" : idx % 2 === 0 ? "var(--panel)" : "var(--panel-2)",
                              borderLeft: isMyGroup ? "4px solid #10b981" : "4px solid transparent",
                              cursor: "pointer",
                            }}
                          >
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "A", val: s.sessionDate })}
                              style={{ padding: "8px 12px", borderRight: "1px solid var(--line)", textAlign: "center", color: "var(--muted)", fontSize: "0.74rem" }}
                            >
                              {idx + 1}
                            </td>
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "A", val: `${s.sessionDate} (${s.dayOfWeek || ""})` })}
                              style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", fontWeight: 600, color: "var(--text)" }}
                            >
                              {new Date(s.sessionDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                            </td>
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "B", val: s.timeSlot })}
                              style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", fontFamily: "monospace", color: "var(--muted)" }}
                            >
                              {s.timeSlot}
                            </td>
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "C", val: `${s.moduleCode} ${s.moduleName || ""}` })}
                              style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", fontWeight: 700, color: "#3d83f6" }}
                            >
                              {s.moduleCode}
                            </td>
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "D", val: s.practicalName || "Lab Session" })}
                              style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--text)", fontWeight: isMyGroup ? 700 : 500 }}
                            >
                              {s.practicalName || "Laboratory Practical Session"}
                            </td>
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "E", val: s.labName })}
                              style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--text)" }}
                            >
                              {s.labName}
                            </td>
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "F", val: s.groupCode })}
                              style={{ padding: "8px 14px", borderRight: "1px solid var(--line)" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 700, color: isMyGroup ? "#10b981" : "var(--text)" }}>
                                  {s.groupCode}
                                </span>
                                {isMyGroup && (
                                  <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "#10b98120", color: "#10b981" }}>
                                    Your Group
                                  </span>
                                )}
                              </div>
                            </td>
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "G", val: s.instructorName || "" })}
                              style={{ padding: "8px 14px", borderRight: "1px solid var(--line)", color: "var(--muted)", fontSize: "0.78rem" }}
                            >
                              {s.instructorName || "—"}
                            </td>
                            <td
                              onClick={() => setActiveCell({ row: idx, col: "H", val: s.status })}
                              style={{ padding: "8px 14px" }}
                            >
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  background: s.status === "COMPLETED" ? "#10b98118" : s.status === "CANCELLED" ? "#ef444418" : "#3d83f618",
                                  color: s.status === "COMPLETED" ? "#10b981" : s.status === "CANCELLED" ? "#ef4444" : "#3d83f6",
                                }}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SHEET 2: SEMESTER PRACTICALS MATRIX (ALL MODULES CATALOG) ── */}
          {hubTab === "PRACTICALS" && (
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Matrix Toolbar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  paddingBottom: 14,
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--muted)" }}>MODULE:</span>
                    <select
                      value={pracModuleFilter}
                      onChange={(e) => setPracModuleFilter(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: "var(--panel-2)",
                        color: "var(--text)",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="ALL">All Modules ({Object.keys(practicalsByModule).length})</option>
                      {semesterModules.map((m) => (
                        <option key={m.id} value={m.code}>
                          {m.code} — {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ position: "relative", minWidth: 260 }}>
                    <Search size={14} color="var(--muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      value={pracSearch}
                      onChange={(e) => setPracSearch(e.target.value)}
                      placeholder="Search practical titles, requirements, safety rules…"
                      style={{
                        padding: "6px 10px 6px 30px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: "var(--panel-2)",
                        color: "var(--text)",
                        fontSize: "0.82rem",
                        width: "100%",
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  Showing <strong>{filteredSemesterPracticals.length}</strong> practical experiments across 6th Semester
                </div>
              </div>

              {/* Practicals Grouped by Module */}
              {Object.keys(practicalsByModule).length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                  No practicals match your search filter.
                </div>
              ) : (
                Object.values(practicalsByModule).map((group) => (
                  <div
                    key={group.moduleCode}
                    style={{
                      background: "var(--panel-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {/* Module Header Bar */}
                    <div
                      style={{
                        padding: "12px 18px",
                        background: "var(--bg-elev)",
                        borderBottom: "1px solid var(--line)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem", padding: "3px 10px", borderRadius: 6, background: "#3d83f620", color: "#3d83f6" }}>
                          {group.moduleCode}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
                          {group.moduleName}
                        </span>
                        {group.coordinator && (
                          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                            • Coordinator: {group.coordinator}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.76rem", color: "var(--muted)", fontWeight: 600 }}>
                        {group.items.length} Practicals Required
                      </span>
                    </div>

                    {/* Practicals List */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {group.items.map((p, idx) => (
                        <div
                          key={p.id}
                          style={{
                            padding: "14px 18px",
                            borderBottom: idx === group.items.length - 1 ? "none" : "1px solid var(--line)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 16,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ flex: "1 1 500px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "var(--panel)", border: "1px solid var(--line)", color: "var(--text)" }}>
                                {p.labNumber}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
                                {p.labTitle || "Practical Experiment"}
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                • 📍 {p.labVenue || "Laboratory"}
                              </span>
                            </div>

                            {/* Requirements summary */}
                            {p.completionRequirements && (
                              <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: 6 }}>
                                <strong style={{ color: "#3d83f6" }}>Requirements: </strong>
                                {p.completionRequirements.slice(0, 160)}…
                              </div>
                            )}

                            {/* Safety badge */}
                            {p.safetyGuidelines && (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.74rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.08)", padding: "2px 8px", borderRadius: 6 }}>
                                <ShieldAlert size={12} />
                                <span>Safety regulations & PPE protocols defined</span>
                              </div>
                            )}
                          </div>

                          {/* Right Action Button */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <div style={{ textAlign: "right", marginRight: 6 }}>
                              <div style={{ fontSize: "0.74rem", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                <BookOpen size={12} />
                                <span>{p.documentCount || 0} Documents</span>
                              </div>
                              <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Manual & Guidelines</div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActivePracticalId(p.id)}
                              style={{
                                padding: "8px 16px",
                                background: "linear-gradient(135deg, #3d83f6, #2563eb)",
                                border: "none",
                                borderRadius: 8,
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                boxShadow: "0 2px 6px rgba(61, 131, 246, 0.25)",
                              }}
                            >
                              <Eye size={13} />
                              <span>View Details & Manual</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Modal for Practical Details & Documents */}
        {activePracticalId && (
          <PracticalDetailsModal
            practicalId={activePracticalId}
            onClose={() => setActivePracticalId(null)}
          />
        )}

      </div>
    </AppShell>
  );
}
