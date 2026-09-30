import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type PageProps = { params: Promise<{ courseId: string }> };

const students = [
  ["Nadeeja Jayasinghe", "EG/2022/5401", "Active"],
  ["Vihanga Senanayake", "EG/2022/5410", "Active"],
  ["Kavisha Bandara", "EG/2021/4812", "Active"],
  ["Chathura Weerasinghe", "EG/2021/4894", "Pending"],
];

export default async function Page({ params }: PageProps) {
  const { courseId } = await params;

  return (
    <AppShell title="Course Enrollment" subtitle={`Course ID: ${courseId}`}>
      <section className="panel">
        <div className="tab-row">
          <Link className="tab-btn" href={`/courses/${courseId}`}>Overview</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/activities`}>Activities</Link>
          <Link className="tab-btn active" href={`/courses/${courseId}/enrollment`}>Enrollment</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/gradebook`}>Gradebook</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/quizzes`}>Quizzes</Link>
          <Link className="tab-btn" href={`/courses/${courseId}/reports`}>Reports</Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Index</th><th>Status</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s[1]}>
                  <td>{s[0]}</td>
                  <td>{s[1]}</td>
                  <td><span className={s[2] === "Active" ? "badge success" : "badge warn"}>{s[2]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
