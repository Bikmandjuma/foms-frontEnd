import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Sun, Moon, ChevronDown, Settings, LogOut, UserCircle, Bell, CheckCheck, Repeat, UserPlus, Info } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { resolveAssetUrl } from "../api/client.js";
import { useNotifications } from "../context/NotificationContext.jsx";
import { usePermissions } from "../permissions/usePermissions.js";
import { ACTIONS } from "../permissions/permissions.js";

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

const NOTIFICATION_ICONS = {
  ASSIGNMENT_PROGRAM: UserPlus,
  ASSIGNMENT_BENEFICIARY: UserPlus,
  REPLACEMENT_REQUESTED: Repeat,
  REPLACEMENT_DECIDED: Repeat,
  SYSTEM: Info,
};

/**
 * Where a notification's "related content" lives, and whether the current
 * user is actually allowed to go there. Returns null when there's nowhere
 * sensible to send them (SYSTEM messages) or when they lack the permission
 * for it — in which case the bell just marks it read and stays put, rather
 * than navigating somewhere that immediately shows "Access restricted".
 */
function resolveNotificationTarget(notification, can) {
  switch (notification.type) {
    case "ASSIGNMENT_PROGRAM":
    case "ASSIGNMENT_BENEFICIARY":
      return can(ACTIONS.ASSIGNMENTS_VIEW) ? "/assignments/programs" : null;
    case "REPLACEMENT_REQUESTED":
    case "REPLACEMENT_DECIDED":
      // The replacements route has no permission gate — any authenticated
      // user can raise/track requests — so this is always reachable.
      return "/replacements";
    default:
      return null;
  }
}

function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  function handleNotificationClick(n) {
    if (!n.read) markRead(n.id);
    const target = resolveNotificationTarget(n, can);
    if (target) {
      setOpen(false);
      navigate(target);
    }
    // No permitted target — just stays where it is; marking read above is
    // still the right behavior even when there's nowhere to go.
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <Bell size={16} color="var(--muted)" className={unreadCount > 0 ? "bell-has-unread" : ""} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: "var(--rose)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 12px 32px rgba(16,24,40,0.16)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--violet)" }}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 340 }}>
            {notifications.length === 0 && (
              <p className="text-sm text-center py-10" style={{ color: "var(--muted)" }}>
                You're all caught up.
              </p>
            )}
            {notifications.map((n) => {
              const Icon = NOTIFICATION_ICONS[n.type] || Info;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: n.read ? "transparent" : "rgba(108,92,231,0.06)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(108,92,231,0.12)" }}
                  >
                    <Icon size={14} style={{ color: "var(--violet)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs leading-snug" style={{ color: "var(--text)" }}>
                      {n.message}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: "var(--violet)" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Topbar({ title, onOpenMobileNav }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarSrc = resolveAssetUrl(user?.avatarUrl);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header
      className="flex items-center justify-between gap-4 px-6 py-4 sticky top-0 z-30"
      style={{ backgroundColor: "color-mix(in srgb, var(--bg) 85%, transparent)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden" onClick={onOpenMobileNav} aria-label="Open navigation">
          <Menu size={20} color="var(--muted)" />
        </button>
        <h1 className="display text-lg font-semibold truncate" style={{ color: "var(--text)" }}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="theme-toggle-track" onClick={toggleTheme} aria-label="Toggle dark mode" aria-pressed={isDark}>
          <div className="theme-toggle-thumb">{isDark ? <Moon size={12} color="#8790A3" /> : <Sun size={12} color="#D98A0E" />}</div>
        </button>

        <NotificationBell />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl cursor-pointer"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold overflow-hidden"
              style={{ backgroundColor: "var(--violet)", color: "white", border: "1px solid var(--border)" }}
            >
              {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <span className="hidden sm:block text-sm max-w-[140px] truncate" style={{ color: "var(--text)" }}>
              {user?.name || user?.email}
            </span>
            <ChevronDown size={14} color="var(--muted)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden z-50"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 12px 32px rgba(16,24,40,0.16)" }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                  {user?.name || "Unnamed user"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                  {user?.email}
                </p>
              </div>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left"
                style={{ color: "var(--text)" }}
              >
                <Settings size={16} color="var(--muted)" />
                Settings
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left"
                style={{ color: "var(--text)" }}
              >
                <UserCircle size={16} color="var(--muted)" />
                My profile
              </button>
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left"
                  style={{ color: "var(--rose)" }}
                >
                  <LogOut size={16} color="var(--rose)" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
