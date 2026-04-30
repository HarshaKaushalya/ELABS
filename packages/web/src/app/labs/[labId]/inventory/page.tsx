import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ItemTable } from "@/components/inventory/ItemTable";
import { BorrowFlowModal } from "@/components/inventory/BorrowFlowModal";
import { DamageReportDialog } from "@/components/inventory/DamageReportDialog";

type PageProps = { params: Promise<{ labId: string }> };

export default async function Page({ params }: PageProps) {
  const { labId } = await params;

  return (
    <AppShell title="Lab Inventory" subtitle={`Lab ID: ${labId}`}>
      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="tab-row">
          <Link className="tab-btn" href={`/labs/${labId}`}>Overview</Link>
          <Link className="tab-btn" href={`/labs/${labId}/activities`}>Activities</Link>
          <Link className="tab-btn" href={`/labs/${labId}/analytics`}>Analytics</Link>
          <Link className="tab-btn" href={`/labs/${labId}/attendance`}>Attendance</Link>
          <Link className="tab-btn active" href={`/labs/${labId}/inventory`}>Inventory</Link>
        </div>
      </section>

      <section className="grid-2">
        <ItemTable />
        <div style={{ display: "grid", gap: 12 }}>
          <BorrowFlowModal />
          <DamageReportDialog />
        </div>
      </section>
    </AppShell>
  );
}
