import React, { useEffect, useState } from "react";
import { X, Wifi } from "lucide-react";
import { dashboardApi } from "../api/dashboard.api.js";
import { resolveAssetUrl } from "../api/client.js";

export default function OnlineUsersModal({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    dashboardApi
      .onlineUsers()
      .then((data) => !cancelled && setUsers(data))
      .catch((err) => !cancelled && setError(err.message || "Couldn't load who's online."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(10,12,16,0.45)" }} onClick={onClose}>
      <div className="card w-full max-w-sm p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="live-presence-dot" />
            <p className="display text-base font-semibold" style={{ color: "var(--text)" }}>
              Online now
            </p>
            <span className="mono text-xs" style={{ color: "var(--muted)" }}>
              ({users.length})
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <X size={18} color="var(--muted)" />
          </button>
        </div>

        <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 360 }}>
          {loading && (
            <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          )}
          {error && (
            <p className="text-sm text-center py-8" style={{ color: "var(--status-suspended-fg)" }}>
              {error}
            </p>
          )}
          {!loading && !error && users.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <Wifi size={22} color="var(--muted)" />
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Nobody else is online right now.
              </p>
            </div>
          )}
          {users.map((u) => {
            const avatarSrc = resolveAssetUrl(u.avatarUrl);
            const initials = (u.name || u.email || "?")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: "var(--violet)", color: "white" }}
                >
                  {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                    {u.name || u.email}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                    {u.role?.name || (u.tenant ? u.tenant.name : u.email)}
                  </p>
                </div>
                <span className="live-presence-dot flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
