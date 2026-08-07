import React, { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Zap, KeyRound } from "lucide-react";
import { authApi } from "../api/auth.api.js";

export default function VerifyResetCodePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  function handleDigitChange(index, value) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[index] = clean;
      return next;
    });
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    setDigits(pasted.padEnd(6, " ").split("").map((c) => (c === " " ? "" : c)));
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = digits.join("");
    setError("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await authApi.verifyResetCode(email, code);
      navigate("/reset-password", { state: { resetToken: result.resetToken } });
    } catch (err) {
      // Invalid/expired code -> stay right here on the 6-digit page, per spec.
      setError(err.message || "That code is invalid or has expired.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  if (!email) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--bg)" }}>
        <div className="card p-6 max-w-sm text-center">
          <p className="text-sm mb-4" style={{ color: "var(--text)" }}>
            Start from the forgot-password page so we know which account this code is for.
          </p>
          <Link to="/forgot-password" className="btn-primary" style={{ display: "inline-flex" }}>
            Go to forgot password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--violet)" }}>
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          <span className="display text-lg font-semibold" style={{ color: "var(--text)" }}>
            Field<span style={{ color: "var(--violet)" }}>Ops</span>
          </span>
        </div>

        <div className="card p-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(108,92,231,0.12)" }}>
            <KeyRound size={18} color="var(--violet)" />
          </div>
          <h2 className="display text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Enter your code
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            We sent a 6-digit code to <strong style={{ color: "var(--text)" }}>{email}</strong>. It expires in 15 minutes.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-2 justify-between" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  maxLength={1}
                  inputMode="numeric"
                  autoFocus={i === 0}
                  className="text-center text-lg font-semibold rounded-xl"
                  style={{
                    width: 44,
                    height: 52,
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              ))}
            </div>

            {error && (
              <div className="text-xs rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ height: 46 }} disabled={submitting}>
              {submitting ? "Verifying…" : "Verify code"}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <Link to="/forgot-password" className="flex items-center justify-center gap-1.5 text-sm mt-6" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={14} />
          Request a new code
        </Link>
      </div>
    </div>
  );
}
