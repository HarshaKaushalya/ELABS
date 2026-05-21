"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Semester = {
  id: number;
  name: string;
  level: number;
  moduleCount: number;
};

const groupColors: Record<number, string> = {
  1: "#1dd5e6", 2: "#3d83f6", 3: "#7d5cff", 4: "#f3ae2a",
  5: "#ff7043", 6: "#18d18f", 7: "#e040fb", 8: "#ff4d57", 9: "#a798ff",
};

const groupIcons: Record<number, string> = {
  1: "🔬", 2: "⚡", 3: "📡", 4: "🔌",
  5: "📊", 6: "☀️", 7: "📶", 8: "🚀", 9: "🧪",
};

export default function LabsPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/academic/semesters")
      .then((r) => r.json())
      .then((d) => setSemesters(d.semesters ?? []))
      .catch(() => setError("Failed to load semester groups"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Lab Groups" subtitle="Select your semester group to view modules and lab sessions">
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "#7ea5d6" }}>
          Loading semester groups…
        </div>
      )}
      {error && (
        <div style={{ padding: 40, textAlign: "center", color: "#ff4d57" }}>{error}</div>
      )}

      {!loading && !error && (
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
          padding: "0 0 32px",
        }}>
          {semesters.map((sem) => {
            const color = groupColors[sem.level] ?? "#7ea5d6";
            const icon = groupIcons[sem.level] ?? "🔭";
            const isRnD = sem.level === 9;
            return (
              <Link key={sem.id} href={`/labs/${sem.id}`} style={{ textDecoration: "none" }}>
                <article
                  style={{
                    background: "linear-gradient(135deg, #0d1b2e 0%, #0a1628 100%)",
                    border: `1px solid ${color}30`,
                    borderRadius: 16,
                    padding: 24,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${color}80`;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${color}20`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
                    (e.currentTarget as HTMLElement).style.transform = "none";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  {/* Background glow */}
                  <div style={{
                    position: "absolute", top: -30, right: -30,
                    width: 120, height: 120,
                    background: `${color}10`, borderRadius: "50%",
                  }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: `${color}18`, border: `1px solid ${color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24,
                    }}>
                      {icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: "#e8f0fe", fontWeight: 700, fontSize: "1.05rem" }}>
                        {sem.name}
                      </h3>
                      <span style={{
                        fontSize: "0.78rem", color: color, fontWeight: 600,
                        background: `${color}15`, padding: "2px 10px", borderRadius: 20,
                      }}>
                        {isRnD ? "Research & Development" : `Year ${Math.ceil(sem.level / 2)}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: "#7ea5d6", fontSize: "0.82rem" }}>Modules</div>
                      <div style={{ color: color, fontWeight: 700, fontSize: "1.6rem" }}>
                        {sem.moduleCount}
                      </div>
                    </div>
                    <div style={{ color: color, fontSize: "1.4rem", opacity: 0.6 }}>→</div>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
