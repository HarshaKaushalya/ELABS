import { AppShell } from "@/components/layout/AppShell";
import { labs, labUtilizationData } from "@/lib/demoData";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" subtitle="Smart Laboratory & Inventory Overview">
      {/* Primary Stats Row */}
      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(29,213,230,0.15)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1dd5e6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v7l4 8H5l4-8V3z"/><path d="M9 3h6"/></svg>
          </div>
          <div className="stat-value">5</div>
          <div className="stat-label">Active Labs</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(61,131,246,0.15)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3d83f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div className="stat-value">47</div>
          <div className="stat-label">Items Borrowed</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(243,174,42,0.15)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f3ae2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-value">12</div>
          <div className="stat-label">Due Returns</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(125,92,255,0.15)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7d5cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div className="stat-value">148</div>
          <div className="stat-label">Attendance Today</div>
        </article>
      </section>

      {/* Secondary Stats Row */}
      <section className="stats-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginBottom: 20 }}>
        <article className="stat-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="stat-icon-circle" style={{ background: "rgba(125,92,255,0.2)", width: 48, height: 48, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a798ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="stat-value" style={{ fontSize: "2rem" }}>9</span>
              <span className="stat-chip chip-green">↗ 3 enrolling</span>
            </div>
            <div className="stat-label">Active Courses</div>
          </div>
        </article>
        <article className="stat-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="stat-icon-circle" style={{ background: "rgba(243,174,42,0.2)", width: 48, height: 48, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f3ae2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="stat-value" style={{ fontSize: "2rem" }}>7</span>
              <span className="stat-chip chip-red">↘ 2 critical</span>
            </div>
            <div className="stat-label">System Alerts</div>
          </div>
        </article>
      </section>

      {/* Lab Utilization Chart */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3>Lab Utilization — This Week</h3>
            <p className="card-subtitle">Occupancy % by laboratory</p>
          </div>
          <div className="stat-chip chip-green" style={{ fontSize: "0.85rem" }}>↗ +14% vs last week</div>
        </div>

        <div className="chart-container">
          <svg viewBox="0 0 700 260" className="utilization-chart">
            {/* Y-axis labels */}
            <text x="25" y="30" fill="#6fa0cf" fontSize="12" textAnchor="end">100</text>
            <text x="25" y="85" fill="#6fa0cf" fontSize="12" textAnchor="end">75</text>
            <text x="25" y="140" fill="#6fa0cf" fontSize="12" textAnchor="end">50</text>
            <text x="25" y="195" fill="#6fa0cf" fontSize="12" textAnchor="end">25</text>
            <text x="25" y="245" fill="#6fa0cf" fontSize="12" textAnchor="end">0</text>

            {/* Grid lines */}
            <line x1="35" y1="25" x2="680" y2="25" stroke="#1a3a65" strokeWidth="0.5"/>
            <line x1="35" y1="80" x2="680" y2="80" stroke="#1a3a65" strokeWidth="0.5"/>
            <line x1="35" y1="135" x2="680" y2="135" stroke="#1a3a65" strokeWidth="0.5"/>
            <line x1="35" y1="190" x2="680" y2="190" stroke="#1a3a65" strokeWidth="0.5"/>
            <line x1="35" y1="240" x2="680" y2="240" stroke="#1a3a65" strokeWidth="0.5"/>

            {/* Electronics line (cyan) */}
            <polyline
              fill="none"
              stroke="#1dd5e6"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points="75,143 182,100 289,57 396,35 503,80 610,135 680,192"
            />
            {/* Electronics fill */}
            <polygon
              fill="url(#cyanGrad)"
              opacity="0.15"
              points="75,143 182,100 289,57 396,35 503,80 610,135 680,192 680,240 75,240"
            />

            {/* Power Systems line (blue) */}
            <polyline
              fill="none"
              stroke="#3d83f6"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points="75,170 182,125 289,80 396,100 503,125 610,165 680,210"
            />

            {/* Software line (violet) */}
            <polyline
              fill="none"
              stroke="#a798ff"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points="75,152 182,110 289,75 396,85 503,145 610,185 680,215"
            />

            {/* X-axis labels */}
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <text key={d} x={75 + i * 107} y="258" fill="#6fa0cf" fontSize="12" textAnchor="middle">{d}</text>
            ))}

            {/* Gradient defs */}
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1dd5e6" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#1dd5e6" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="chart-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: "#1dd5e6" }}/> Electronics</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "#3d83f6" }}/> Power Systems</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "#a798ff" }}/> Software</div>
        </div>
      </section>

      {/* Lab Status */}
      <section className="panel">
        <div className="card-header">
          <h3>Lab Status</h3>
        </div>
        <div className="lab-status-list">
          {labs.slice(0, 5).map((lab) => (
            <div key={lab.name} className="lab-status-item">
              <div className="lab-name">
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: lab.fill > 0 ? lab.color : "#6fa0cf", display: "inline-block" }}/>
                  {lab.name}
                </span>
                <span className="lab-count">{lab.occupancy}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${lab.fill}%`, background: lab.color }}/>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
