import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function Page({ params }: PageProps) {
  const { itemId } = await params;

  return (
    <AppShell title="Inventory Item" subtitle={`Item ID: ${itemId}`}>
      <section className="panel">
        <h3>Item Details</h3>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><th>Item ID</th><td>{itemId}</td></tr>
              <tr><th>Tag</th><td>ELABS-{String(itemId).padStart(4, "0")}</td></tr>
              <tr><th>Name</th><td>Instrument Record</td></tr>
              <tr><th>Status</th><td><span className="badge info">Tracked</span></td></tr>
              <tr><th>Last Updated</th><td>{new Date().toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
