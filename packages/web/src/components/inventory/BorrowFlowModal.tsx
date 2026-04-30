"use client";

import { useState } from "react";

export function BorrowFlowModal() {
  const [borrower, setBorrower] = useState("EG/2022/5401");
  const [purpose, setPurpose] = useState("Circuit diagnostics");

  return (
    <section className="panel">
      <h3>Borrow Flow</h3>
      <div style={{ display: "grid", gap: 10 }}>
        <input className="input" value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder="Borrower ID" />
        <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose" />
        <button type="button" className="primary-btn">Confirm Borrow</button>
      </div>
    </section>
  );
}
