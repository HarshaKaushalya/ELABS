"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { inventoryRows as demoRows } from "@/lib/demoData";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { ItemDetailsModal } from "@/components/inventory/ItemDetailsModal";
import { QrCode } from "lucide-react";

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
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<any>(null);
  const items: InventoryItem[] = demoRows;

  const handleScan = async (decodedText: string) => {
    setIsScanning(false);
    try {
      // In a real app, this would use a proper API client with the auth token.
      // For now, we mock the fetch to demonstrate the flow.
      const res = await fetch(`http://localhost:4000/inventory/items/barcode/${decodedText}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('elabs_token') || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setScannedItem(data.item);
      } else {
        alert("Item not found in database.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to fetch item details.");
    }
  };

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
            <button className="primary-btn flex items-center gap-2" type="button" onClick={() => setIsScanning(true)}>
              <QrCode className="w-4 h-4" />
              Scan Barcode
            </button>
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

      {isScanning && (
        <BarcodeScanner 
          onScan={handleScan} 
          onClose={() => setIsScanning(false)} 
        />
      )}

      {scannedItem && (
        <ItemDetailsModal 
          item={scannedItem} 
          onClose={() => setScannedItem(null)} 
        />
      )}
    </AppShell>
  );
}
