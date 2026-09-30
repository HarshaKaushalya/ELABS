"use client";

import { useState } from "react";

export function DamageReportDialog() {
  const [itemTag, setItemTag] = useState("ELABS-PS-0003");
  const [notes, setNotes] = useState("Front panel cracked near display area.");

  return (
    <section className="panel">
      <h3>Damage Report</h3>
      <div style={{ display: "grid", gap: 10 }}>
        <input className="input" value={itemTag} onChange={(e) => setItemTag(e.target.value)} placeholder="Item tag" />
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        <button type="button" className="danger-btn">Submit Damage Report</button>
      </div>
    </section>
  );
}
