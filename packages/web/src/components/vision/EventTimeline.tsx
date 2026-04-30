"use client";

interface TimelineEvent {
  time_sec: number;
  event: string;
  detail: string;
}

interface Props {
  events: TimelineEvent[];
}

function fmtTs(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const EVENT_META: Record<string, { icon: string; color: string; bg: string }> = {
  entry: {
    icon: "→",
    color: "#18d18f",
    bg: "rgba(24,209,143,0.12)",
  },
  exit: {
    icon: "←",
    color: "#4a7fb5",
    bg: "rgba(74,127,181,0.12)",
  },
  fire: {
    icon: "🔥",
    color: "#ff4d57",
    bg: "rgba(255,77,87,0.15)",
  },
  smoke: {
    icon: "🌫️",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
  },
  peak_occupancy: {
    icon: "▲",
    color: "#7d5cff",
    bg: "rgba(125,92,255,0.12)",
  },
};

export function EventTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="vision-timeline-empty">
        <span>No events recorded</span>
      </div>
    );
  }

  return (
    <div className="vision-timeline-wrap">
      <div className="vision-timeline-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>Event Timeline · {events.length} events</span>
      </div>
      <div className="vision-timeline">
        {events.map((ev, i) => {
          const meta = EVENT_META[ev.event] ?? {
            icon: "•",
            color: "#6e9ecc",
            bg: "rgba(110,158,204,0.1)",
          };
          return (
            <div
              key={i}
              className="vision-timeline-event"
              style={{ borderLeft: `3px solid ${meta.color}`, background: meta.bg }}
            >
              <span className="vision-timeline-icon">{meta.icon}</span>
              <div className="vision-timeline-body">
                <span className="vision-timeline-detail">{ev.detail}</span>
                <span className="vision-timeline-ts" style={{ color: meta.color }}>
                  {fmtTs(ev.time_sec)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
