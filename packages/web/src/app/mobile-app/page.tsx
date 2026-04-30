import { AppShell } from "@/components/layout/AppShell";

const screens = [
  ["Home", "Dashboard and quick actions"],
  ["Login", "Credential and SSO access"],
  ["Scan Borrow", "Technician borrowing flow"],
  ["Scan Return", "Return verification flow"],
  ["Scan Entry", "Attendance scan"],
  ["Notifications", "Alerts and approvals"],
  ["AI Assistant", "Contextual support"],
];

export default function MobileAppPage() {
  return (
    <AppShell title="Mobile Companion" subtitle="iOS and Android app screens for technicians and students">
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="list-row" style={{ borderBottom: 0 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>ELABS Mobile Companion</h3>
            <p className="panel-subtext">Optimized for scanning, lab access, AI support, and notifications</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="badge info">7 Screens</div>
            <div className="badge violet">2 Platforms</div>
          </div>
        </div>

        <div className="tab-row" style={{ marginBottom: 16 }}>
          {screens.map(([name, detail], idx) => (
            <button key={name} className={`tab-btn ${idx === 0 ? "active" : ""}`} type="button">
              {name} - {detail}
            </button>
          ))}
        </div>

        <div className="mobile-preview-grid">
          {screens.slice(0, 4).map(([name]) => (
            <article key={name} className="mobile-preview">
              <div className="mobile-screen-head" />
              <h4 style={{ marginTop: 8 }}>{name}</h4>
              <p style={{ color: "#73a4d2" }}>UI concept preview</p>
              <div className="notice-item" style={{ marginTop: 12 }}>
                <strong>{name}</strong>
                <div style={{ color: "#82b1dc", marginTop: 6 }}>Matching web workflow and role permissions.</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
