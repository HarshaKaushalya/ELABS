export function PresencePanel() {
  const rows = [
    ["Electronics Laboratory", "18/25", 72],
    ["Software Laboratory", "28/30", 93],
    ["Power Systems Laboratory", "8/20", 40],
  ];

  return (
    <section className="panel">
      <h3>Presence Panel</h3>
      {rows.map((r) => (
        <div key={r[0]} style={{ marginBottom: 10 }}>
          <div className="list-row" style={{ borderBottom: 0, padding: "0 0 8px" }}>
            <span>{r[0]}</span>
            <span>{r[1]}</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${r[2]}%` }} /></div>
        </div>
      ))}
    </section>
  );
}
