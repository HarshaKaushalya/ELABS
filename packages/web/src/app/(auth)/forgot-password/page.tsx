"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Forgot Password</h1>
        <p className="panel-subtext">Enter your university email and we will send a reset link.</p>
        <div className="login-form">
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.name@ruh.ac.lk" />
          </div>
          <button className="login-button" type="button" onClick={() => setDone(true)}>Send Reset Link</button>
          {done && <div className="notice-item info">If this email exists, a reset link has been issued.</div>}
          <Link href="/login" className="tab-btn">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
