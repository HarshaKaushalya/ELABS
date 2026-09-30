import { AppShell } from "@/components/layout/AppShell";
import { courseCards } from "@/lib/demoData";

export default function CoursesPage() {
  return (
    <AppShell title="Courses & LMS" subtitle="Academic modules, quizzes, and grading">
      <section className="panel">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {courseCards.map((course, idx) => (
            <article key={course.code} className="course-card">
              <div className="course-card-left">
                <div className="course-icon" style={{ background: `${course.gradeColor}18` }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={course.gradeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                  </svg>
                </div>
                <div className="course-info">
                  <div className="course-meta">
                    <span style={{ color: course.gradeColor, fontWeight: 700 }}>{course.code}</span>
                    <span style={{ color: "#5a8abb" }}> · {course.credits} · {course.lab}</span>
                  </div>
                  <h4 className="course-name">{course.name}</h4>
                  <div className="course-details">
                    {course.instructor} · {course.schedule} · {course.students}
                  </div>
                  <div className="course-progress-row">
                    <div className="progress-track" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${course.progress}%`, background: course.gradeColor }}/>
                    </div>
                    <span style={{ color: "#6fa0cf", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{course.progress}% complete</span>
                  </div>
                </div>
              </div>
              <div className="course-card-right">
                <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Next class</div>
                <div style={{ fontWeight: 700, color: "#d9ebff" }}>{course.nextClass}</div>
                <div className="grade-badge" style={{ background: `${course.gradeColor}20`, color: course.gradeColor, borderColor: `${course.gradeColor}40` }}>
                  {course.grade}
                  <span style={{ display: "block", fontSize: "0.65rem", fontWeight: 400 }}>Grade</span>
                </div>
              </div>
              <div className="course-card-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a8abb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
