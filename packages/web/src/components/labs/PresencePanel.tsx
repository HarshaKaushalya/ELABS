export function PresencePanel() {
  const rows = [
    ["Power Systems and High Voltage Laboratory", "14/25", 56],
    ["Electric Machines and Power Electronics Laboratory", "8/20", 40],
    ["Electronics and Measurement Laboratory", "18/30", 60],
    ["Communication and Systems Engineering Laboratory", "6/20", 30],
    ["Information Engineering Laboratory", "20/30", 66],
    ["24 × 7 Undergraduate Development Project Laboratory", "12/24", 50],
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
