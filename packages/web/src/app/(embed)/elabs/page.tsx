import Link from "next/link";

export default function EmbedElabsPage() {
  return (
    <main className="embed-layout" style={{ padding: 24 }}>
      <section className="panel" style={{ maxWidth: 900, width: "100%" }}>
        <h1>Embedded ELABS View</h1>
        <p className="panel-subtext">Use this route to embed ELABS inside another platform via iframe.</p>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><th>Path</th><td>/embed/elabs</td></tr>
              <tr><th>Mode</th><td>Read-only shell container</td></tr>
              <tr><th>Use Case</th><td>LMS and portal integration</td></tr>
            </tbody>
          </table>
        </div>
        <div className="tab-row" style={{ marginTop: 12 }}>
          <Link className="tab-btn" href="/dashboard">Open dashboard</Link>
          <Link className="tab-btn" href="/embed/lti">Open LTI launcher</Link>
        </div>
      </section>
    </main>
  );
}
