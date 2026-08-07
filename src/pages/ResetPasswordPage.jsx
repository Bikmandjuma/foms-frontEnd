import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Zap, CheckCircle2 } from "lucide-react";
import { authApi } from "../api/auth.api.js";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(resetToken, password);
      setDone(true);
    } catch (err) {
      setError(err.message || "Couldn't reset your password. Start the process again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!resetToken && !done) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--bg)" }}>
        <div className="card p-6 max-w-sm text-center">
          <p className="text-sm mb-4" style={{ color: "var(--text)" }}>
            Start from the forgot-password page so we have a verified reset link for your account.
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

        {done ? (
          <div className="card p-6 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--status-active-bg)" }}>
              <CheckCircle2 size={22} color="var(--status-active-fg)" />
            </div>
            <h2 className="display text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
              Password reset
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              You can now sign in with your new password. Any other device you were signed in on has been logged out.
            </p>
            <Link to="/login" className="btn-primary" style={{ display: "inline-flex" }}>
              Go to sign in
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="display text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>
              Set a new password
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Choose a new password for your account.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="field">
                <Lock size={16} color="var(--muted)" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min. 8 characters)"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ display: "flex", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={16} color="var(--muted)" /> : <Eye size={16} color="var(--muted)" />}
                </button>
              </div>
              <div className="field">
                <Lock size={16} color="var(--muted)" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              {error && (
                <div className="text-xs rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ height: 46 }} disabled={submitting}>
                {submitting ? "Saving…" : "Reset password"}
                {!submitting && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        )}

        {!done && (
          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm mt-6" style={{ color: "var(--muted)" }}>
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
