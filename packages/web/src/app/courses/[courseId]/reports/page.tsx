import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function Page({ params }: PageProps) {
  const { courseId } = await params;

  const weekly = [62, 70, 68, 74, 79, 83];

  return (
    <AppShell title="Course Reports" subtitle={`Course ID: ${courseId}`}>
      <section className="panel">
        <div className="tab-row">
          <Link className="tab-btn" href={`/courses/${courseId}`}>Overview</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/activities`}>Activities</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/enrollment`}>Enrollment</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/gradebook`}>Gradebook</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/quizzes`}>Quizzes</Link>
          <Link className="tab-btn active" href={`/courses/${courseId}/reports`}>Reports</Link>
        </div>

        <h3>Weekly Completion Trend</h3>
        <div className="line-chart" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
          {weekly.map((v, i) => (
            <div key={i} className="line-col" style={{ height: `${v}%` }} />
          ))}
        </div>
        <div className="bar-labels" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
          {['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((w) => <span key={w}>{w}</span>)}
        </div>
      </section>
    </AppShell>
  );
}
