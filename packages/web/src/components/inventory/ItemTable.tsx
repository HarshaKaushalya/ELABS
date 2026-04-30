export function ItemTable() {
  const rows = [
    ["ELABS-EL-0001", "Oscilloscope DS1054Z", "AVAILABLE"],
    ["ELABS-EL-0002", "Digital Multimeter UT61E", "BORROWED"],
    ["ELABS-PS-0003", "Power Supply GPD-3303S", "MAINTENANCE"],
  ];

  return (
    <section className="panel">
      <h3>Item Table</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Tag</th><th>Item</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                <td>{r[0]}</td>
                <td>{r[1]}</td>
                <td><span className={r[2] === "AVAILABLE" ? "badge success" : r[2] === "BORROWED" ? "badge warn" : "badge info"}>{r[2]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
