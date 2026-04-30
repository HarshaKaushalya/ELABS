import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PresencePanel } from "@/components/labs/PresencePanel";

type PageProps = { params: Promise<{ labId: string }> };

export default async function Page({ params }: PageProps) {
  const { labId } = await params;

  return (
    <AppShell title="Lab Attendance" subtitle={`Lab ID: ${labId}`}>
      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="tab-row">
          <Link className="tab-btn" href={`/labs/${labId}`}>Overview</Link>
          <Link className="tab-btn" href={`/labs/${labId}/activities`}>Activities</Link>
          <Link className="tab-btn" href={`/labs/${labId}/analytics`}>Analytics</Link>
          <Link className="tab-btn active" href={`/labs/${labId}/attendance`}>Attendance</Link>
          <Link className="tab-btn" href={`/labs/${labId}/inventory`}>Inventory</Link>
        </div>
      </section>

      <PresencePanel />
    </AppShell>
  );
}
