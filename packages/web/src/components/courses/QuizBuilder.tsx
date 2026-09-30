"use client";

import { useState } from "react";

export function QuizBuilder() {
  const [title, setTitle] = useState("Lab Safety Check");
  const [question, setQuestion] = useState("");
  const [items, setItems] = useState<string[]>([
    "Which PPE items are mandatory before entering the power lab?",
    "What is the first action when equipment sparks unexpectedly?",
  ]);

  function addQuestion() {
    const q = question.trim();
    if (!q) return;
    setItems((prev) => [...prev, q]);
    setQuestion("");
  }

  return (
    <section className="panel">
      <h3>Quiz Builder</h3>
      <div style={{ display: "grid", gap: 10 }}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Add question" />
          <button className="primary-btn" type="button" onClick={addQuestion}>Add</button>
        </div>
        <div className="notice-list">
          {items.map((q, idx) => (
            <div key={`${idx}-${q}`} className="notice-item info">
              <strong>Q{idx + 1}</strong>
              <div style={{ marginTop: 6 }}>{q}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
