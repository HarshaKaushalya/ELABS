import Link from "next/link";

export default function LtiPage() {
  return (
    <main className="embed-layout" style={{ padding: 24 }}>
      <section className="panel" style={{ maxWidth: 900, width: "100%" }}>
        <h1>LTI Launch Gateway</h1>
        <p className="panel-subtext">This endpoint is prepared for LMS/LTI integration token exchange.</p>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><th>Path</th><td>/embed/lti</td></tr>
              <tr><th>Status</th><td>Ready for LMS launch handoff</td></tr>
              <tr><th>Next</th><td>Map LMS claims to ELABS user session</td></tr>
            </tbody>
          </table>
        </div>
        <div className="tab-row" style={{ marginTop: 12 }}>
          <Link className="tab-btn" href="/embed/elabs">Embed shell</Link>
          <Link className="tab-btn" href="/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
