import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ labId: string }> };

export default async function Page({ params }: PageProps) {
  const { labId } = await params;
  const activities = [
    ["Item borrowed", "ELABS-EL-0002", "09:20 AM"],
    ["Return completed", "ELABS-PS-0001", "10:05 AM"],
    ["Maintenance raised", "ELABS-PS-0003", "11:41 AM"],
    ["Attendance sync", "36 entries", "12:00 PM"],
  ];

  return (
    <AppShell title="Lab Activities" subtitle={`Lab ID: ${labId}`}>
      <section className="panel">
        <div className="tab-row">
          <Link className="tab-btn" href={`/labs/${labId}`}>Overview</Link>
          <Link className="tab-btn active" href={`/labs/${labId}/activities`}>Activities</Link>
          <Link className="tab-btn" href={`/labs/${labId}/analytics`}>Analytics</Link>
          <Link className="tab-btn" href={`/labs/${labId}/attendance`}>Attendance</Link>
          <Link className="tab-btn" href={`/labs/${labId}/inventory`}>Inventory</Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Event</th><th>Reference</th><th>Time</th></tr></thead>
            <tbody>
              {activities.map((a) => (
                <tr key={`${a[0]}-${a[2]}`}><td>{a[0]}</td><td>{a[1]}</td><td>{a[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
