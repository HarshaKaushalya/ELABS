"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { fetchLabDetail } from "@/lib/appData";

export default function Page() {
  const params = useParams<{ labId: string }>();
  const labId = params?.labId as string;
  const [lab, setLab] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchLabDetail(labId).then((data) => {
      if (!mounted || !data) return;
      setLab(data.lab);
      setItems(data.items ?? []);
    });
    return () => {
      mounted = false;
    };
  }, [labId]);

  return (
    <AppShell title="Lab Overview" subtitle={`Lab ID: ${labId}`}>
      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="tab-row">
          <Link className="tab-btn active" href={`/labs/${labId}`}>Overview</Link>
          <Link className="tab-btn" href={`/labs/${labId}/activities`}>Activities</Link>
          <Link className="tab-btn" href={`/labs/${labId}/analytics`}>Analytics</Link>
          <Link className="tab-btn" href={`/labs/${labId}/attendance`}>Attendance</Link>
          <Link className="tab-btn" href={`/labs/${labId}/inventory`}>Inventory</Link>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card"><div className="stat-value">{lab?.totalItems ?? 0}</div><div className="stat-label">Total Items</div></article>
        <article className="stat-card"><div className="stat-value" style={{ color: "#1ee39c" }}>{lab?.availableItems ?? 0}</div><div className="stat-label">Available</div></article>
        <article className="stat-card"><div className="stat-value" style={{ color: "#ffc762" }}>{lab?.borrowedItems ?? 0}</div><div className="stat-label">Borrowed</div></article>
        <article className="stat-card"><div className="stat-value" style={{ color: "#ff6d86" }}>{lab?.outOfServiceItems ?? 0}</div><div className="stat-label">Out of Service</div></article>
      </section>

      <section className="panel">
        <h3>{lab?.name ?? "Lab"}</h3>
        <p className="panel-subtext">Location: {lab?.location ?? "Main Campus"} | Floor: {lab?.floor ?? "-"}</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tag</th><th>Name</th><th>Status</th></tr></thead>
            <tbody>
              {items.slice(0, 8).map((it) => (
                <tr key={it.id}><td>{it.elabsTag}</td><td>{it.name}</td><td>{it.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
