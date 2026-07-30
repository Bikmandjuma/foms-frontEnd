import React, { useEffect, useState } from "react";
import DataTable from "../../components/DataTable.jsx";
import { activityLogsApi } from "../../api/activityLogs.api.js";
import { useSocket } from "../../context/SocketContext.jsx";

const ACTION_COLORS = {
  created: "var(--status-active-fg)",
  updated: "var(--amber)",
  deleted: "var(--rose)",
  assigned: "var(--violet)",
  approved: "var(--status-active-fg)",
  rejected: "var(--rose)",
  "logged in": "var(--muted)",
  "logged out": "var(--muted)",
};

export default function ActivityLogsPage() {
  const { socket } = useSocket();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await activityLogsApi.list({ limit: 150 }));
    } catch (err) {
      setError(err.message || "Couldn't load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Live-update the log as things happen elsewhere in the tenant, without
  // needing to refresh — this is the same event the dashboard's activity
  // feed listens to.
  useEffect(() => {
    if (!socket) return undefined;
    function handler(entry) {
      setRows((r) => [entry, ...r].slice(0, 200));
    }
    socket.on("activity:new", handler);
    return () => socket.off("activity:new", handler);
  }, [socket]);

  const columns = [
    { key: "user", label: "User", render: (r) => r.user?.name || r.user?.email || <span style={{ color: "var(--muted)" }}>System</span> },
    {
      key: "action",
      label: "Action",
      render: (r) => (
        <span style={{ color: ACTION_COLORS[r.action] || "var(--text)", fontWeight: 500 }}>{r.action}</span>
      ),
    },
    { key: "entityType", label: "Entity" },
    {
      key: "metadata",
      label: "Details",
      render: (r) => {
        if (!r.metadata || typeof r.metadata !== "object") return "—";
        const parts = Object.entries(r.metadata).map(([k, v]) => `${k}: ${v}`);
        return <span className="text-xs" style={{ color: "var(--muted)" }}>{parts.join(" · ")}</span>;
      },
    },
    { key: "createdAt", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Activity logs
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          The full audit trail for this tenant — updates live as things happen.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No activity recorded yet." />
      </div>
    </div>
  );
}
