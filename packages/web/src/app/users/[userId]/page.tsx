import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ userId: string }> };

export default async function Page({ params }: PageProps) {
  const { userId } = await params;

  return (
    <AppShell title="User Profile" subtitle={`User ID: ${userId}`}>
      <section className="panel">
        <h3>Profile</h3>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><th>User ID</th><td>{userId}</td></tr>
              <tr><th>Role</th><td><span className="badge info">System User</span></td></tr>
              <tr><th>Status</th><td><span className="badge success">Active</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className="tab-row" style={{ marginTop: 12 }}>
          <Link href="/users" className="tab-btn">Back to users</Link>
          <Link href="/admin/rbac" className="tab-btn">RBAC</Link>
        </div>
      </section>
    </AppShell>
  );
}
