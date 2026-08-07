import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { authApi } from "../api/auth.api.js";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Enter your account email to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      navigate("/verify-reset-code", { state: { email } });
    } catch (err) {
      setError(err.message || "Couldn't send a reset code. Try again.");
    } finally {
      setSubmitting(false);
    }
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
          <h2 className="display text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
            Forgot your password?
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Enter your account email and we'll send a 6-digit code to reset it. This works for platform admins, tenant admins, and regular users alike.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="field">
              <Mail size={16} color="var(--muted)" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@tenant.rw" autoFocus />
            </div>

            {error && (
              <div className="text-xs rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ height: 46 }} disabled={submitting}>
              {submitting ? "Sending…" : "Send reset code"}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm mt-6" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
