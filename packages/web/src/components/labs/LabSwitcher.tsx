"use client";

import { useState } from "react";

const options = [
  "Power Systems and High Voltage Laboratory",
  "Electric Machines and Power Electronics Laboratory",
  "Electronics and Measurement Laboratory",
  "Communication and Systems Engineering Laboratory",
  "Information Engineering Laboratory",
  "24 × 7 Undergraduate Development Project Laboratory",
];

export function LabSwitcher() {
  const [value, setValue] = useState(options[0]);

  return (
    <section className="panel">
      <h3>Lab Switcher</h3>
      <select className="select" value={value} onChange={(e) => setValue(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </section>
  );
}
