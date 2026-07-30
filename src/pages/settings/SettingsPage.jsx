import React from "react";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function SettingsPage() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Your profile and preferences.
        </p>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Profile
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p style={{ color: "var(--muted)" }}>Name</p>
            <p style={{ color: "var(--text)" }}>{user?.name || "—"}</p>
          </div>
          <div>
            <p style={{ color: "var(--muted)" }}>Email</p>
            <p style={{ color: "var(--text)" }}>{user?.email}</p>
          </div>
          <div>
            <p style={{ color: "var(--muted)" }}>Role</p>
            <p style={{ color: "var(--text)" }}>{user?.isPlatformAdmin ? "Platform admin" : user?.role?.name || "—"}</p>
          </div>
          <div>
            <p style={{ color: "var(--muted)" }}>Tenant</p>
            <p style={{ color: "var(--text)" }}>{user?.tenant?.name || "—"}</p>
          </div>
        </div>
      </div>

      <div className="card p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Appearance
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Defaults to light. Your choice is remembered on this device.
          </p>
        </div>
        <button className="theme-toggle-track" onClick={toggleTheme} aria-label="Toggle dark mode" aria-pressed={isDark}>
          <div className="theme-toggle-thumb">{isDark ? <Moon size={12} color="#8790A3" /> : <Sun size={12} color="#D98A0E" />}</div>
        </button>
      </div>
    </div>
  );
}
