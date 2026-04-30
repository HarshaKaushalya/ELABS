"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuditLog, fetchAuditLogs } from "@/lib/appData";

function severityForAction(action: string) {
  const upper = action.toUpperCase();
  if (upper.includes("FAIL") || upper.includes("DENY")) return "danger";
  if (upper.includes("MAINT") || upper.includes("WARN")) return "warn";
  if (upper.includes("CREATE") || upper.includes("BORROW")) return "success";
  return "info";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const data = await fetchAuditLogs();
      if (!mounted) return;
      setLogs(data);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return logs;
    return logs.filter((l) =>
      [l.action, l.entity ?? "", l.entityId ?? "", l.actorName ?? "", l.actorEmail ?? ""].join(" ").toLowerCase().includes(key)
    );
  }, [logs, search]);

  return (
    <AppShell title="Audit Logs" subtitle="Traceability and security event timeline">
      <section className="panel">
        <div className="filter-row" style={{ gridTemplateColumns: "1fr auto" }}>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action, entity, actor..." />
          <button className="secondary-btn" type="button">Refresh</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}>Loading audit logs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>No audit logs found (requires admin permission).</td></tr>
              ) : (
                filtered.map((log) => {
                  const tone = severityForAction(log.action);
                  const badgeClass =
                    tone === "danger" ? "badge danger" : tone === "warn" ? "badge warn" : tone === "success" ? "badge success" : "badge info";
                  return (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>{log.actorName ?? "System"}</td>
                      <td>{log.action}</td>
                      <td>{log.entity ?? "-"}{log.entityId ? `:${log.entityId}` : ""}</td>
                      <td><span className={badgeClass}>{tone.toUpperCase()}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
