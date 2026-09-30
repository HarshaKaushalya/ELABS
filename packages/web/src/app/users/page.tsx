"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { fetchAdminUsers } from "@/lib/appData";

export default function Page() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminUsers().then((rows) => setUsers(rows));
  }, []);

  return (
    <AppShell title="Users" subtitle="Directory and account overview">
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Profile</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4}>No users visible. Requires admin permission.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.roles.join(", ")}</td>
                    <td><Link href={`/users/${u.id}`} className="tab-btn">Open</Link></td>
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
