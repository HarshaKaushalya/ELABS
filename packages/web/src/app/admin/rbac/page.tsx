"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AdminUser, fetchAdminUsers } from "@/lib/appData";

function roleBadge(role: string) {
  const cls =
    role === "SYSTEM_ADMIN"
      ? "badge warn"
      : role === "TECHNICIAN"
      ? "badge info"
      : role === "STUDENT"
      ? "badge violet"
      : "badge success";
  return <span className={cls}>{role}</span>;
}

export default function RBACPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const data = await fetchAdminUsers();
      if (!mounted) return;
      setUsers(data);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return users;
    return users.filter((u) => [u.fullName, u.email, u.roles.join(" ")].join(" ").toLowerCase().includes(key));
  }, [users, search]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const totalAdmins = users.filter((u) => u.roles.includes("SYSTEM_ADMIN")).length;

  return (
    <AppShell title="Admin & RBAC" subtitle="User management, roles, and audit monitoring">
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-value">{totalUsers}</div><div className="stat-label">Total Users</div></article>
        <article className="stat-card"><div className="stat-value" style={{ color: "#1ee39c" }}>{activeUsers}</div><div className="stat-label">Active Accounts</div></article>
        <article className="stat-card"><div className="stat-value" style={{ color: "#ffc762" }}>{totalAdmins}</div><div className="stat-label">System Admins</div></article>
        <article className="stat-card"><div className="stat-value">{users.reduce((acc, u) => acc + u.roles.length, 0)}</div><div className="stat-label">Role Assignments</div></article>
      </section>

      <section className="panel">
        <div className="filter-row" style={{ gridTemplateColumns: "1fr auto" }}>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or role..." />
          <button className="secondary-btn" type="button">Export</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th><th>Email</th><th>Roles</th><th>Status</th><th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}>Loading users...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>No users available (requires admin permission).</td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.fullName}</strong></td>
                    <td>{u.email}</td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{u.roles.map((r) => <span key={`${u.id}-${r}`}>{roleBadge(r)}</span>)}</td>
                    <td><span className={u.isActive ? "badge success" : "badge danger"}>{u.isActive ? "Active" : "Inactive"}</span></td>
                    <td>{new Date(u.updatedAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
