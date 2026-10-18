"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import {
  Users,
  CheckCircle2,
  Package,
  Clock,
  ArrowLeftRight,
  AlertTriangle,
  Building2,
  RefreshCw,
  BarChart3,
  Calendar,
  Layers,
} from "lucide-react";

type AnalyticsSummary = {
  totalEquipment: number;
  availableEquipment: number;
  borrowedEquipment: number;
  maintenanceEquipment: number;
  outOfServiceEquipment: number;
  equipmentUtilizationRate: number;
  totalBorrows: number;
  activeBorrows: number;
  returnedBorrows: number;
  overdueBorrows: number;
  overdueRate: number;
  totalAttendance: number;
  todayAttendance: number;
  activeHeadcount: number;
  avgDurationMinutes: number;
  totalUsers: number;
  totalStudents: number;
  totalStaff: number;
  totalLabs: number;
};

type CategoryStat = {
  category: string;
  total: number;
  available: number;
  borrowed: number;
};

type LabPresence = {
  labId: number;
  labName: string;
  location: string;
  currentHeadcount: number;
  todayVisits: number;
};

type DailyAttendance = {
  entryDate: string;
  label: string;
  checkIns: number;
  uniqueStudents: number;
};

type ActivityEvent = {
  type: "ATTENDANCE" | "BORROW";
  id: number;
  actorName: string;
  labName: string;
  action: string;
  timestamp: string;
};

type AnalyticsData = {
  summary: AnalyticsSummary;
  categories: CategoryStat[];
  byLab: { labId: number; labName: string; total: number; available: number; borrowed: number }[];
  labPresence: LabPresence[];
  dailyAttendance: DailyAttendance[];
  activityFeed: ActivityEvent[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/analytics/overview");
      if (!res.ok) {
        throw new Error("Unable to retrieve operational analytics");
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      setError(err.message || "Failed to connect to analytics service");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary;
  const categories = data?.categories ?? [];
  const labPresence = data?.labPresence ?? [];
  const dailyAttendance = data?.dailyAttendance ?? [];
  const activityFeed = data?.activityFeed ?? [];

  // Calculate highest daily check-ins for scaling the attendance chart
  const maxDaily = Math.max(...dailyAttendance.map((d) => Number(d.checkIns || 0)), 10);

  return (
    <AppShell title="Laboratory Analytics" subtitle="Live facility occupancy, equipment circulation, and operational metrics">
      {/* Top Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Status: <strong style={{ color: "#059669" }}>Live Synchronized</strong>
          </span>
          {lastRefreshed && (
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              · Refreshed at {lastRefreshed}
            </span>
          )}
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="secondary-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "0.85rem" }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.3)", borderRadius: 10, padding: "14px 18px", color: "#dc2626", marginBottom: 20, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <section className="stats-grid" style={{ marginBottom: 24 }}>
        {/* Active Headcount */}
        <article className="stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Active Headcount
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(5, 150, 105, 0.12)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1 }}>
            {loading ? "..." : summary?.activeHeadcount ?? 0}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Students inside labs right now · <strong style={{ color: "var(--text-main)" }}>{summary?.todayAttendance ?? 0}</strong> today
          </p>
        </article>

        {/* Equipment Utilization */}
        <article className="stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Equipment Utilization
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(37, 99, 235, 0.12)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1 }}>
            {loading ? "..." : `${summary?.equipmentUtilizationRate ?? 0}%`}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <strong style={{ color: "#d97706" }}>{summary?.borrowedEquipment ?? 0}</strong> of {summary?.totalEquipment ?? 0} items currently on loan
          </p>
        </article>

        {/* Active Borrow Loans */}
        <article className="stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Active Borrow Loans
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(217, 119, 6, 0.12)", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowLeftRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1 }}>
            {loading ? "..." : summary?.activeBorrows ?? 0}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            <strong style={{ color: "#059669" }}>{summary?.returnedBorrows ?? 0}</strong> returned · {summary?.totalBorrows ?? 0} lifetime loans
          </p>
        </article>

        {/* Overdue Rate */}
        <article className="stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Overdue Loan Rate
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(220, 38, 38, 0.12)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: (summary?.overdueBorrows ?? 0) > 0 ? "#dc2626" : "var(--text-main)", lineHeight: 1 }}>
            {loading ? "..." : `${summary?.overdueRate ?? 0}%`}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {summary?.overdueBorrows ?? 0} item{(summary?.overdueBorrows ?? 0) === 1 ? "" : "s"} past scheduled return date
          </p>
        </article>
      </section>

      {/* Main Analysis Grid */}
      <section className="grid-2" style={{ marginBottom: 24 }}>
        {/* Attendance Trends */}
        <article className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)" }}>
                Attendance & Entry Activity
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Daily student access logs across all department laboratories
              </p>
            </div>
            <span style={{ fontSize: "0.78rem", background: "rgba(37,99,235,0.08)", color: "#2563eb", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
              Last 7 Days
            </span>
          </div>

          {dailyAttendance.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-app)", borderRadius: 8, border: "1px dashed var(--border-color)", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <Calendar size={24} style={{ marginBottom: 8, opacity: 0.6 }} />
              <div>No attendance entries recorded in the last 7 days.</div>
              <div style={{ fontSize: "0.75rem", marginTop: 4 }}>Entries will automatically populate as students scan into laboratories.</div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingTop: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160, paddingBottom: 10, borderBottom: "1px solid var(--border-color)" }}>
                {dailyAttendance.map((day) => {
                  const heightPercent = Math.max(Math.round((Number(day.checkIns) / maxDaily) * 100), 12);
                  return (
                    <div key={day.entryDate} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>
                        {day.checkIns}
                      </span>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 36,
                          height: `${heightPercent}%`,
                          background: "#2563eb",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.3s ease",
                        }}
                        title={`${day.label}: ${day.checkIns} entries (${day.uniqueStudents} unique students)`}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                {dailyAttendance.map((day) => (
                  <span key={day.entryDate} style={{ flex: 1, textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {day.label.split(",")[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Inventory Category Breakdown */}
        <article className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)" }}>
                Equipment by Category
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Allocation and availability distribution across equipment types
              </p>
            </div>
            <span style={{ fontSize: "0.78rem", background: "var(--bg-app)", color: "var(--text-muted)", padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border-color)" }}>
              {categories.length} Categories
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categories.slice(0, 7).map((cat) => {
              const total = Number(cat.total || 0);
              const available = Number(cat.available || 0);
              const borrowed = Number(cat.borrowed || 0);
              const availPct = total > 0 ? Math.round((available / total) * 100) : 100;
              return (
                <div key={cat.category}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{cat.category}</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      <strong style={{ color: "#059669" }}>{available}</strong> avail ·{" "}
                      {borrowed > 0 && <span style={{ color: "#d97706" }}>{borrowed} out · </span>}
                      {total} total
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "var(--bg-app)", borderRadius: 3, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${availPct}%`, background: "#059669", height: "100%" }} />
                    <div style={{ width: `${100 - availPct}%`, background: "#d97706", height: "100%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {/* Laboratory Capacity & Real-Time Presence */}
      <section className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)" }}>
              Laboratory Operational Status
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Headcount and resource allocation per electrical & information engineering lab
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Laboratory</th>
                <th>Location</th>
                <th>Active Headcount</th>
                <th>Check-ins Today</th>
                <th>Equipment Count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {labPresence.map((lab) => {
                const labEquipment = data?.byLab.find((b) => b.labId === lab.labId)?.total ?? 0;
                const active = Number(lab.currentHeadcount || 0);
                return (
                  <tr key={lab.labId}>
                    <td>
                      <strong style={{ color: "var(--text-main)" }}>{lab.labName}</strong>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {lab.location || "Department Wing"}
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: active > 0 ? "#059669" : "var(--text-muted)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: active > 0 ? "#059669" : "#94a3b8" }} />
                        {active} present
                      </span>
                    </td>
                    <td style={{ color: "var(--text-main)", fontSize: "0.88rem" }}>
                      {lab.todayVisits}
                    </td>
                    <td>
                      <span style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb", padding: "2px 8px", borderRadius: 4, fontSize: "0.8rem", fontWeight: 600 }}>
                        {labEquipment} assets
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: 6, fontWeight: 600, background: "rgba(5,150,105,0.1)", color: "#059669" }}>
                        Operational
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Integrated Live Operational Activity Audit Feed */}
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)" }}>
              Recent Operational Activity
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Real-time audit log of student check-ins, departures, and equipment circulation
            </p>
          </div>
        </div>

        {activityFeed.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-app)", borderRadius: 8, border: "1px dashed var(--border-color)" }}>
            No recent activity recorded today.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Student / Borrower</th>
                  <th>Laboratory</th>
                  <th>Action</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {activityFeed.map((ev, idx) => {
                  const isAttendance = ev.type === "ATTENDANCE";
                  const isCheckIn = ev.action === "CHECK_IN";
                  const isBorrow = ev.action === "BORROWED";
                  const dateStr = new Date(ev.timestamp).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  return (
                    <tr key={`${ev.type}-${ev.id}-${idx}`}>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: isAttendance ? "rgba(37,99,235,0.08)" : "rgba(217,119,6,0.08)", color: isAttendance ? "#2563eb" : "#d97706" }}>
                          {isAttendance ? <Users size={12} /> : <Package size={12} />}
                          <span>{ev.type}</span>
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-main)" }}>{ev.actorName}</strong>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {ev.labName}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: isCheckIn || isBorrow ? "rgba(5,150,105,0.1)" : "rgba(100,116,139,0.1)", color: isCheckIn || isBorrow ? "#059669" : "var(--text-muted)" }}>
                          {ev.action.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "monospace" }}>
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
