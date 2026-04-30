import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function Page({ params }: PageProps) {
  const { courseId } = await params;
  const rows = [
    ["Lab 01: Instrument familiarization", "Completed"],
    ["Lab 02: Measurement accuracy", "Completed"],
    ["Lab 03: Circuit assembly", "In Progress"],
    ["Lab 04: Signal analysis", "Scheduled"],
  ];

  return (
    <AppShell title="Course Activities" subtitle={`Course ID: ${courseId}`}>
      <section className="panel">
        <div className="tab-row">
          <Link className="tab-btn" href={`/courses/${courseId}`}>Overview</Link>
          <Link className="tab-btn active" href={`/courses/${courseId}/activities`}>Activities</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/enrollment`}>Enrollment</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/gradebook`}>Gradebook</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/quizzes`}>Quizzes</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/reports`}>Reports</Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Activity</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]}>
                  <td>{r[0]}</td>
                  <td><span className={r[1] === "Completed" ? "badge success" : r[1] === "In Progress" ? "badge warn" : "badge info"}>{r[1]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
