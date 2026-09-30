import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function Page({ params }: PageProps) {
  const { courseId } = await params;

  return (
    <AppShell title="Course Overview" subtitle={`Course ID: ${courseId}`}>
      <section className="panel" style={{ marginBottom: 12 }}>
        <h3>{courseId.toUpperCase()} Overview</h3>
        <p className="panel-subtext">This module includes lectures, labs, quizzes, gradebook, and assignment reporting.</p>
        <div className="tab-row">
          <Link className="tab-btn active" href={`/courses/${courseId}`}>Overview</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/activities`}>Activities</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/enrollment`}>Enrollment</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/gradebook`}>Gradebook</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/quizzes`}>Quizzes</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/reports`}>Reports</Link>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card"><div className="stat-value">32</div><div className="stat-label">Enrolled Students</div></article>
        <article className="stat-card"><div className="stat-value">12</div><div className="stat-label">Completed Labs</div></article>
        <article className="stat-card"><div className="stat-value">4</div><div className="stat-label">Pending Quizzes</div></article>
        <article className="stat-card"><div className="stat-value">86%</div><div className="stat-label">Average Attendance</div></article>
      </section>
    </AppShell>
  );
}
