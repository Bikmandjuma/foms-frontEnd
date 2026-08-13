import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Zap, ShieldCheck, Maximize2, Minimize2 } from "lucide-react";
import { NAV } from "../nav.config.js";
import { usePermissions } from "../permissions/usePermissions.js";
import { useAuth } from "../context/AuthContext.jsx";
import { usePresence } from "../context/PresenceContext.jsx";

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { onlineCount } = usePresence();
  const location = useLocation();

  const isActive = (to) => location.pathname === to;
  const isGroupActive = (item) => item.children?.some((c) => location.pathname.startsWith(c.to));

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    NAV.forEach((item) => {
      if (item.type === "group" && isGroupActive(item)) initial[item.key] = true;
    });
    return initial;
  });

  const toggleGroup = (key) => setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  const [isPageFullscreen, setIsPageFullscreen] = useState(Boolean(document.fullscreenElement));

  React.useEffect(() => {
    function onChange() {
      setIsPageFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function togglePageFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // Some embedded/iframe contexts block the Fullscreen API outright —
        // nothing useful to do beyond leaving the toggle where it was.
      });
    }
  }

  return (
    <aside
      className={`fixed lg:sticky top-0 z-40 h-screen w-64 flex-shrink-0 flex flex-col p-4 transition-transform duration-200 self-start ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
      style={{ backgroundColor: "var(--surface)", borderRight: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--violet)" }}>
          <Zap size={18} color="white" strokeWidth={2.5} />
        </div>
        <span className="display text-lg font-semibold" style={{ color: "var(--text)" }}>
          Field<span style={{ color: "var(--violet)" }}>Ops</span>
        </span>
        <button
          className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--muted)" }}
          onClick={togglePageFullscreen}
          aria-label={isPageFullscreen ? "Exit full screen" : "Full screen"}
          title={isPageFullscreen ? "Exit full screen" : "Full screen"}
        >
          {isPageFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
        {NAV.map((item) => {
          if (item.requires && !can(item.requires)) return null;

          if (item.type === "link") {
            return (
              <Link key={item.key} to={item.to} className={`nav-item ${isActive(item.to) ? "active" : ""}`} onClick={onCloseMobile}>
                <item.icon size={17} strokeWidth={2} />
                {item.label}
              </Link>
            );
          }

          const visibleChildren = item.children.filter((c) => !c.requires || can(c.requires));
          if (visibleChildren.length === 0) return null;
          const open = !!openGroups[item.key];

          return (
            <div key={item.key}>
              <button
                type="button"
                className={`nav-item w-full justify-between ${isGroupActive(item) ? "active" : ""}`}
                onClick={() => toggleGroup(item.key)}
                aria-expanded={open}
              >
                <span className="flex items-center gap-3">
                  <item.icon size={17} strokeWidth={2} />
                  {item.label}
                </span>
                <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
              </button>
              {open && (
                <div className="flex flex-col gap-1 mt-1 ml-4 pl-3" style={{ borderLeft: "1px solid var(--border)" }}>
                  {visibleChildren.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      onClick={onCloseMobile}
                      className={`nav-item ${isActive(child.to) ? "active" : ""}`}
                      style={{ fontSize: 13, padding: "7px 10px" }}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 flex flex-col gap-3">
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-2"
          style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <span className="live-presence-dot" />
          <span className="text-xs" style={{ color: "var(--text)" }}>
            <strong className="mono">{onlineCount}</strong> {onlineCount === 1 ? "person" : "people"} online now
          </span>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={15} style={{ color: "var(--teal)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
              {user?.isPlatformAdmin ? "Platform admin" : user?.role?.name || "Signed in"}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
            {user?.tenant?.name || (user?.isPlatformAdmin ? "All tenants" : "")}
          </p>
        </div>
      </div>
    </aside>
  );
}
