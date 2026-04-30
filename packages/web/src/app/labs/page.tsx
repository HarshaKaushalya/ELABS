import { AppShell } from "@/components/layout/AppShell";
import { labs } from "@/lib/demoData";

const labIcons: Record<string, JSX.Element> = {
  "Electronics Laboratory": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1dd5e6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>,
  "Power Systems Laboratory": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f3ae2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  "Communication Laboratory": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7d5cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  "Biomedical Laboratory": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff4d57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  "Software Laboratory": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a798ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>,
  "Undergraduate Research Lab": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#18d18f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
};

export default function LabsPage() {
  return (
    <AppShell title="Laboratories" subtitle="Lab operations, occupancy, and utilization">
      <section className="lab-card-grid">
        {labs.map((lab) => {
          const [current, max] = lab.occupancy.split("/").map(Number);
          const isActive = lab.fill > 0;
          const fillPct = max > 0 ? Math.round((current / max) * 100) : 0;

          return (
            <article key={lab.name} className="lab-card">
              <div className="lab-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="lab-card-icon" style={{ background: `${lab.color}15`, color: lab.color }}>
                    {labIcons[lab.name] || <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
                  </div>
                  <div>
                    <h4 className="lab-card-title">{lab.name}</h4>
                    <span className="lab-card-block">{lab.block}</span>
                  </div>
                </div>
                <span className={`badge ${isActive ? "success" : "warn"}`} style={{ fontSize: "0.75rem" }}>
                  {isActive ? "Active" : "Idle"}
                </span>
              </div>

              <div className="lab-card-occupancy">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#7ea5d6", fontSize: "0.85rem" }}>Occupancy</span>
                  <span style={{ color: lab.color, fontWeight: 600, fontSize: "0.85rem" }}>{current}/{max}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${fillPct}%`, background: lab.color }}/>
                </div>
              </div>

              <div className="lab-card-stats">
                <div className="lab-card-stat">
                  <strong>{lab.items}</strong>
                  <span>Items</span>
                </div>
                <div className="lab-card-stat">
                  <strong>{lab.available}</strong>
                  <span>Available</span>
                </div>
                <div className="lab-card-stat">
                  <strong>{lab.courses}</strong>
                  <span>Courses</span>
                </div>
              </div>

              <div className="lab-card-footer">
                <span style={{ color: "#7ea5d6", fontSize: "0.85rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 4 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Manager: {lab.manager}
                </span>
                <a href={`/labs/${lab.name.toLowerCase().replace(/\s+/g, "-")}`} className="view-all">
                  View Details &rsaquo;
                </a>
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
