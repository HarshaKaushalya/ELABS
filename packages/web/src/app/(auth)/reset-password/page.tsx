"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const valid = password.length >= 8 && password === confirm;

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Reset Password</h1>
        <p className="panel-subtext">Set a new password for your account.</p>
        <div className="login-form">
          <div className="field">
            <label>New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
          </div>
          <div className="field">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" />
          </div>
          <button className="login-button" type="button" disabled={!valid} onClick={() => setDone(true)}>Update Password</button>
          {done && <div className="notice-item success">Password updated successfully. You can now sign in.</div>}
          <Link href="/login" className="tab-btn">Return to login</Link>
        </div>
      </section>
    </main>
  );
}
