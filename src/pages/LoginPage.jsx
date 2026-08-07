import React, { useState } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Sun, Moon, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [focusField, setFocusField] = useState(null);

  if (!loading && user) {
    const dest = location.state?.from?.pathname || "/";
    return <Navigate to={dest} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter both your email and password to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: "var(--bg)" }}>
      {/* LEFT: brand panel */}
      <div
        className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-10 overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(160deg, #12151C 0%, #0A0C10 60%)"
            : "linear-gradient(160deg, #201A47 0%, #6C5CE7 100%)",
        }}
      >
        <div className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          <span className="display text-lg font-semibold text-white">
            Field<span style={{ color: "#C9C2FF" }}>Ops</span>
          </span>
        </div>

        <div className="relative">
          <h1 className="display text-3xl font-semibold text-white leading-tight max-w-sm">
            Programs, beneficiaries, and field teams one workspace per tenant.
          </h1>
          <p className="text-sm mt-3 max-w-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Sign in with your tenant account to manage users, roles, programs and beneficiaries.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <ShieldCheck size={14} color="rgba(255,255,255,0.5)" />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Multi-tenant, JWT-secured, role-based access
          </span>
        </div>
      </div>

      {/* RIGHT: form */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 sm:px-10 py-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--violet)" }}>
              <Zap size={16} color="white" strokeWidth={2.5} />
            </div>
            <span className="display text-base font-semibold" style={{ color: "var(--text)" }}>
              Field<span style={{ color: "var(--violet)" }}>Ops</span>
            </span>
          </div>
          <div className="hidden lg:block" />
          <button className="theme-toggle-track" onClick={toggleTheme} aria-label="Toggle dark mode" aria-pressed={isDark}>
            <div className="theme-toggle-thumb">{isDark ? <Moon size={12} color="#8790A3" /> : <Sun size={12} color="#D98A0E" />}</div>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-10">
          <div className="w-full max-w-sm">
            <p className="text-xs font-medium tracking-widest uppercase mb-2" style={{ color: "var(--violet)" }}>
              Welcome back
            </p>
            <h2 className="display text-2xl font-semibold mb-1" style={{ color: "var(--text)" }}>
              Sign in to your workspace
            </h2>
            <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
              Use the tenant admin account created for your organization.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div>
                <label htmlFor="email" className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text)" }}>
                  Email
                </label>
                <div className={`field ${focusField === "email" ? "" : ""}`} style={focusField === "email" ? { borderColor: "var(--violet)" } : undefined}>
                  <Mail size={16} color="var(--muted)" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusField("email")}
                    onBlur={() => setFocusField(null)}
                    placeholder="admin@huska.rw"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-xs font-medium block" style={{ color: "var(--text)" }}>
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-medium" style={{ color: "var(--violet)" }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="field" style={focusField === "password" ? { borderColor: "var(--violet)" } : undefined}>
                  <Lock size={16} color="var(--muted)" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusField("password")}
                    onBlur={() => setFocusField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
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
              </div>

              {error && (
                <div className="text-xs rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary mt-1" style={{ height: 50 }} disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
                {!submitting && <ArrowRight size={16} />}
              </button>
            </form>

            {/*<p className="text-xs text-center mt-8" style={{ color: "var(--muted)" }}>
              Platform admin? Seed account: <span className="mono">admin@huska.rw</span>
            </p>*/}
          </div>
        </div>
      </div>
    </div>
  );
}
