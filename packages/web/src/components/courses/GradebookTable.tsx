export function GradebookTable() {
  const rows = [
    ["Nadeeja Jayasinghe", "88", "A"],
    ["Vihanga Senanayake", "81", "A-"],
    ["Kavisha Bandara", "74", "B+"],
    ["Chathura Weerasinghe", "69", "B"],
  ];

  return (
    <section className="panel">
      <h3>Gradebook</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Student</th><th>Score</th><th>Grade</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                <td>{r[0]}</td>
                <td>{r[1]}</td>
                <td><span className="badge info">{r[2]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
