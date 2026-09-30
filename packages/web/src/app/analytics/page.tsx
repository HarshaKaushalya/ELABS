import { AppShell } from "@/components/layout/AppShell";
import { labs } from "@/lib/demoData";

const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export default function AnalyticsPage() {
  return (
    <AppShell title="Analytics" subtitle="Data insights and utilization reports">
      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(29,213,230,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1dd5e6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </div>
          <div className="stat-value">62%</div>
          <div className="stat-label">Avg Lab Utilization</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(61,131,246,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3d83f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div className="stat-value">95</div>
          <div className="stat-label">Monthly Borrows</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(125,92,255,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7d5cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className="stat-value">310</div>
          <div className="stat-label">Attendance This Week</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon-circle" style={{ background: "rgba(255,77,87,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4d57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-value" style={{ color: "#ff6d86" }}>7.4%</div>
          <div className="stat-label">Overdue Rate</div>
        </article>
      </section>

      <section className="grid-2">
        <article className="panel">
          <h3>Lab Utilization — This Week</h3>
          <p className="panel-subtext">Occupancy percentage by laboratory per day</p>
          <div className="line-chart">
            {[68, 75, 92, 84, 60, 40, 15].map((v, i) => (
              <div key={i} className="line-col line-col-alt" style={{ height: `${v}%` }} />
            ))}
          </div>
          <div className="line-labels">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
          </div>
        </article>

        <article className="panel">
          <h3>Inventory by Category</h3>
          <p className="panel-subtext">Distribution of managed inventory items</p>
          <div className="notice-list">
            {[
              ["Measurement", 38, "info"],
              ["Signal Source", 22, "info"],
              ["Power", 18, "warn"],
              ["Computing", 15, "violet"],
              ["Biomedical", 12, "danger"],
            ].map(([name, value, tone]) => (
              <div key={String(name)} className="list-row">
                <span>{String(name)}</span>
                <span className={`badge ${tone}`}>{String(value)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid-2" style={{ marginTop: 16 }}>
        <article className="panel">
          <h3>Inventory Transactions — Monthly</h3>
          <div className="line-chart" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
            {[120, 135, 92, 150, 140, 96].map((v, i) => (
              <div key={months[i]} className="line-col" style={{ height: `${Math.round(v / 1.6)}%` }} />
            ))}
          </div>
          <div className="bar-labels" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
            {months.map((m) => <span key={m}>{m}</span>)}
          </div>
        </article>

        <article className="panel">
          <h3>Attendance Trend</h3>
          <div className="line-chart" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
            {[32, 42, 38, 40, 44, 31].map((v, i) => (
              <div key={i} className="line-col line-col-violet" style={{ height: `${v * 2}%` }} />
            ))}
          </div>
          <div className="bar-labels" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
            {["W1 Feb", "W2 Feb", "W3 Feb", "W4 Feb", "W1 Mar", "W2 Mar"].map((m) => <span key={m}>{m}</span>)}
          </div>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>Lab Performance Summary</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Laboratory</th>
                <th>Utilization</th>
                <th>Items</th>
                <th>Incidents</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((lab, idx) => (
                <tr key={lab.name}>
                  <td><strong>{lab.name}</strong></td>
                  <td>{lab.fill}%</td>
                  <td>{lab.items}</td>
                  <td>
                    <span className={idx % 2 ? "badge warn" : "badge success"}>
                      {idx % 2 ? `${idx} incidents` : "0 incidents"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
