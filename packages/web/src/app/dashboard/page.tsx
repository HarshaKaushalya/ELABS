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
} from "lucide-react";
import Link from "next/link";

/* ─── Types ────────────────────────────────────────────────────── */
type TimetableSlot = {
  id: number;
  date: string;
  time: string;
  lab: string;
  moduleCode: string;
  moduleName: string;
  moduleId: number;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
};

type TimelineEvent = {
  id: string;
  date: Date;
  title: string;
  subtitle: string;
  type: "PRE_LAB" | "LAB_SESSION";
  color: string;
  moduleId: number;
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
  const [stats, setStats] = useState<DashStats | null>(null);
  const [overdue, setOverdue] = useState<OverdueTx[]>([]);
  const [myBorrows, setMyBorrows] = useState<MyBorrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  useEffect(() => {
    async function loadAll() {
      try {
        const [ttRes, summRes, overdueRes, myBRes] = await Promise.all([
          apiFetch("/timetable"),
          apiFetch("/dashboard/summary"),
          apiFetch("/dashboard/overdue"),
          apiFetch("/dashboard/my-borrows"),
        ]);

        if (ttRes.ok) {
          const d = await ttRes.json();
          setSlots(d.slots ?? []);
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

    slots.forEach((slot) => {
      const sessionDate = new Date(slot.date);

      events.push({
        id: `lab-${slot.id}`,
        date: sessionDate,
        title: `Laboratory Session — ${slot.lab}`,
        subtitle: `${slot.moduleCode} ${slot.moduleName} • ${slot.time}`,
        type: "LAB_SESSION",
        color: "#f59e0b",
        moduleId: slot.moduleId,
      });

      const preLabDate = new Date(sessionDate);
      preLabDate.setDate(preLabDate.getDate() - 2);
      events.push({
        id: `prelab-${slot.id}`,
        date: preLabDate,
        title: `PRE-LAB is due`,
        subtitle: `Assignment due • ${slot.moduleCode} ${slot.moduleName}`,
        type: "PRE_LAB",
        color: "#10b981",
        moduleId: slot.moduleId,
      });
    });

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
                          {(b.items as any[])
                            .map((i: any) => i.name)
                            .join(", ")}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 3 }}>
                          {b.labName}
                          {b.purpose ? ` · ${b.purpose}` : ""}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {(b.items as any[]).map((i: any) => (
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
                          {(tx.items as any[]).map((i: any) => (
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
                            {event.type === "PRE_LAB" ? "23:59" : ""}
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
                          {event.moduleId ? (
                            <Link href={`/labs/module/${event.moduleId}`}>
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
                                href={evt.moduleId ? `/labs/module/${evt.moduleId}` : "#"}
                                style={{ textDecoration: "none" }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: evt.color,
                                    fontWeight: 600,
                                    background: evt.color + "14",
                                    borderRadius: 4,
                                    padding: "2px 5px",
                                    lineHeight: 1.4,
                                    wordBreak: "break-word",
                                    cursor: "pointer",
                                  }}
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                     {evt.type === "PRE_LAB" ? <ClipboardList size={10} /> : <FlaskConical size={10} />}
                                     <span>{evt.type === "PRE_LAB" ? "Pre-lab" : evt.title.replace("Laboratory Session — ", "") || "Lab"}</span>
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
                { color: "#10b981", label: "Pre-lab Due" },
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

      </div>
    </AppShell>
  );
}
