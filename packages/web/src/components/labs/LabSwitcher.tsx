"use client";

import { useState } from "react";

const options = [
  "Electronics Laboratory",
  "Power Systems Laboratory",
  "Software Laboratory",
  "Communication Laboratory",
  "Biomedical Laboratory",
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
