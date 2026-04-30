"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { inventoryRows as demoRows } from "@/lib/demoData";

type InventoryItem = {
  tag: string;
  name: string;
  category: string;
  lab: string;
  status: "Available" | "Borrowed" | "Out of Service" | "Maintenance";
  condition: string;
  borrower: string;
};

function statusBadge(status: string) {
  if (status === "Available") return <span className="badge success">✓ Available</span>;
  if (status === "Borrowed") return <span className="badge danger">◉ Borrowed</span>;
  if (status === "Out of Service") return <span className="badge danger">✕ Out of Service</span>;
  return <span className="badge info">{status}</span>;
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const items: InventoryItem[] = demoRows;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter((it) =>
      [it.tag, it.name, it.category, it.lab, it.status, it.borrower].join(" ").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <AppShell title="Inventory Management" subtitle="Track, borrow, and manage all lab equipment">
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="topbar-search" style={{ minWidth: 260 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e96c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} className="topbar-search-input" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary-btn" type="button">+ Add Item</button>
            <button className="secondary-btn" type="button">Export</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ELABS Tag</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Laboratory</th>
                <th>Status</th>
                <th>Condition</th>
                <th>Borrower</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.tag}>
                  <td style={{ fontFamily: "Consolas, monospace", color: "#1dd5e6", fontWeight: 600 }}>{item.tag}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td>{item.lab}</td>
                  <td>{statusBadge(item.status)}</td>
                  <td>{item.condition}</td>
                  <td>{item.borrower}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
