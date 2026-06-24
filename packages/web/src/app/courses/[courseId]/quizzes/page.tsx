import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { QuizBuilder } from "@/components/courses/QuizBuilder";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function Page({ params }: PageProps) {
  const { courseId } = await params;

  return (
    <AppShell title="Course Quizzes" subtitle={`Course ID: ${courseId}`}>
      <section className="panel" style={{ marginBottom: 12 }}>
        <div className="tab-row">
          <Link className="tab-btn" href={`/courses/${courseId}`}>Overview</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/activities`}>Activities</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/enrollment`}>Enrollment</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/gradebook`}>Gradebook</Link>
          <Link className="tab-btn active" href={`/courses/${courseId}/quizzes`}>Quizzes</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/reports`}>Reports</Link>
        </div>
      </section>

      <QuizBuilder />
    </AppShell>
  );
}
