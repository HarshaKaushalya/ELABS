"use client";

interface ActivityBreakdown {
  standing: number;
  walking: number;
  running: number;
}

interface Props {
  totalPeople: number;
  peakOccupancy: number;
  activity: ActivityBreakdown;
  videoDuration: number;
  processingTime: number;
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="vision-stat-card">
      <div className="vision-stat-icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="vision-stat-value" style={{ color }}>
        {value}
      </div>
      <div className="vision-stat-label">{label}</div>
      {sub && <div className="vision-stat-sub">{sub}</div>}
    </div>
  );
}

export function AnalysisStats({
  totalPeople,
  peakOccupancy,
  activity,
  videoDuration,
  processingTime,
}: Props) {
  const totalActivity = activity.standing + activity.walking + activity.running || 1;

  function pct(n: number) {
    return `${Math.round((n / totalActivity) * 100)}%`;
  }

  function fmtTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  return (
    <div className="vision-stats-grid">
      <StatCard
        label="People Entered"
        value={totalPeople}
        sub="unique individuals"
        color="#18d18f"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        }
      />
      <StatCard
        label="Peak Occupancy"
        value={peakOccupancy}
        sub="max in frame at once"
        color="#1dd5e6"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        }
      />
      <StatCard
        label="Running"
        value={activity.running}
        sub={`${pct(activity.running)} of activity`}
        color="#ff4d57"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13" cy="5" r="2"/>
            <path d="M10 22v-5l-1-1v-4l6.5-3.5L17 13h3"/>
            <path d="M10 22H7"/>
            <path d="M7 16l3.5-1.5"/>
          </svg>
        }
      />
      <StatCard
        label="Walking"
        value={activity.walking}
        sub={`${pct(activity.walking)} of activity`}
        color="#f59e0b"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="4" r="2"/>
            <path d="M9 22l1-6"/>
            <path d="M15 22l-1-6"/>
            <path d="M6 10l3-4 3 2 3-3"/>
            <path d="M6 14l3-1 3 4"/>
          </svg>
        }
      />
      <StatCard
        label="Standing"
        value={activity.standing}
        sub={`${pct(activity.standing)} of activity`}
        color="#7d5cff"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="4" r="2"/>
            <line x1="12" y1="7" x2="12" y2="16"/>
            <path d="M9 21l3-5 3 5"/>
          </svg>
        }
      />
      <StatCard
        label="Duration / Speed"
        value={fmtTime(videoDuration)}
        sub={`Processed in ${fmtTime(processingTime)}`}
        color="#4a7fb5"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        }
      />
    </div>
  );
}
