import { AppShell } from "@/components/layout/AppShell";

export default function SystemSettingsPage() {
  return (
    <AppShell title="System Settings" subtitle="Configuration, preferences, and integrations">
      <section className="split-layout">
        <article className="panel">
          <div className="tab-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <button className="tab-btn active" type="button">Profile</button>
            <button className="tab-btn" type="button">Notifications</button>
            <button className="tab-btn" type="button">Security</button>
            <button className="tab-btn" type="button">Appearance</button>
            <button className="tab-btn" type="button">System</button>
          </div>
        </article>

        <article className="panel" style={{ gridColumn: "span 1" }}>
          <h3>Profile Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="panel-subtext">Full Name</label>
              <input className="input" value="Dr. Nadeesha Perera" readOnly />
            </div>
            <div>
              <label className="panel-subtext">Email Address</label>
              <input className="input" value="nadeesha.perera@ruh.ac.lk" readOnly />
            </div>
            <div>
              <label className="panel-subtext">Phone Number</label>
              <input className="input" value="+94 71 234 5678" readOnly />
            </div>
            <div>
              <label className="panel-subtext">Staff ID</label>
              <input className="input" value="RUH-ENG-0001" readOnly />
            </div>
            <div>
              <label className="panel-subtext">Department</label>
              <input className="input" value="Department of Engineering Technology" readOnly />
            </div>
            <div>
              <label className="panel-subtext">Role</label>
              <input className="input" value="System Admin" readOnly />
            </div>
          </div>
          <div style={{ marginTop: 14, textAlign: "right" }}>
            <button className="primary-btn" type="button">Save Profile</button>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
