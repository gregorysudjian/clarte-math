"use client";

import { useState } from "react";

export default function PasswordField() {
  const [visible, setVisible] = useState(false);
  return (
    <label className="hq-field">
      <span>Password</span>
      <span className="hq-password">
        <input name="password" type={visible ? "text" : "password"} autoComplete="current-password" autoFocus required />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>
          {visible ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}
