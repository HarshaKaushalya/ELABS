"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";

const hours = ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM"];
const entries = [12, 28, 15, 8, 4, 22, 30, 18, 6, 2];
const exits = [0, 6, 9, 12, 18, 8, 5, 10, 25, 30];

export default function AttendancePage() {
  const [mode, setMode] = useState<"entry" | "exit">("entry");

  return (
    <AppShell title="Attendance & Access" subtitle="Scan-based entry tracking and presence monitoring">
      {/* Lab Selector */}
      <div className="panel" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <select className="select" style={{ width: "100%", background: "transparent", border: "1px solid #2a4e84", borderRadius: 12, padding: "12px 16px", color: "#d5ebff", fontSize: "1rem" }}>
          <option>Electronics Lab</option>
          <option>Power Systems Lab</option>
          <option>Communication Lab</option>
          <option>Software Lab</option>
        </select>
      </div>

      {/* Entry/Exit Toggle + Scan Area */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="attendance-toggle">
          <button
            className={`attendance-toggle-btn ${mode === "entry" ? "active" : ""}`}
            type="button"
            onClick={() => setMode("entry")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Entry
          </button>
          <button
            className={`attendance-toggle-btn ${mode === "exit" ? "active" : ""}`}
            type="button"
            onClick={() => setMode("exit")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Exit
          </button>
        </div>

        {/* Scan Zone */}
        <div className="scan-zone">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4a7fb5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 2H2v5"/><path d="M17 2h5v5"/><path d="M2 17v5h5"/><path d="M22 17v5h-5"/>
          </svg>
          <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#d9ebff" }}>Ready to scan</div>
          <div style={{ color: "#6e9ecc", fontSize: "0.9rem" }}>Tap card or enter ID below</div>
        </div>

        {/* ID Input */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
          <input className="input" placeholder="Enter student ID or scan..." style={{ padding: "14px 16px" }} />
          <button className="primary-btn" type="button" style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 24px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 2H2v5"/><path d="M17 2h5v5"/><path d="M2 17v5h5"/><path d="M22 17v5h-5"/>
            </svg>
            Scan
          </button>
        </div>
      </section>

      {/* Hourly Entry/Exit Chart */}
      <section className="panel">
        <h3>Hourly Entry/Exit — Today</h3>
        <p className="panel-subtext">All laboratories combined</p>
        <div className="dual-bar-chart">
          {hours.map((hour, i) => {
            const maxVal = 35;
            const entryH = Math.round((entries[i] / maxVal) * 160);
            const exitH = Math.round((exits[i] / maxVal) * 160);
            return (
              <div key={hour} className="dual-bar-col">
                <div className="dual-bar-bars">
                  <div className="dual-bar-entry" style={{ height: entryH }} title={`Entry: ${entries[i]}`}/>
                  <div className="dual-bar-exit" style={{ height: exitH }} title={`Exit: ${exits[i]}`}/>
                </div>
                <span className="dual-bar-label">{hour}</span>
              </div>
            );
          })}
        </div>
        <div className="chart-legend" style={{ marginTop: 12 }}>
          <div className="legend-item"><div className="legend-dot" style={{ background: "#1dd5e6" }}/> Entries</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "#ff4d57" }}/> Exits</div>
        </div>
      </section>
    </AppShell>
  );
}
