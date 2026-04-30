import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ labId: string }> };

export default async function Page({ params }: PageProps) {
  const { labId } = await params;
  const values = [70, 77, 82, 80, 74, 66, 52];

  return (
    <AppShell title="Lab Analytics" subtitle={`Lab ID: ${labId}`}>
      <section className="panel">
        <div className="tab-row">
          <Link className="tab-btn" href={`/labs/${labId}`}>Overview</Link>
          <Link className="tab-btn" href={`/labs/${labId}/activities`}>Activities</Link>
          <Link className="tab-btn active" href={`/labs/${labId}/analytics`}>Analytics</Link>
          <Link className="tab-btn" href={`/labs/${labId}/attendance`}>Attendance</Link>
          <Link className="tab-btn" href={`/labs/${labId}/inventory`}>Inventory</Link>
        </div>

        <h3>Weekly Utilization</h3>
        <div className="line-chart">
          {values.map((v, idx) => (
            <div key={idx} className="line-col line-col-alt" style={{ height: `${v}%` }} />
          ))}
        </div>
        <div className="line-labels">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}</div>
      </section>
    </AppShell>
  );
}
