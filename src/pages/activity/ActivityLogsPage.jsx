import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  History,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Check,
  X,
  LogIn,
  LogOut,
  Wand2,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import { activityLogsApi } from "../../api/activityLogs.api.js";
import { useSocket } from "../../context/SocketContext.jsx";

// Every action gets a color + icon so the feed reads at a glance instead of
// as a wall of text. Falls back gracefully for any action string the
// backend adds later that isn't in this list yet.
const ACTION_STYLE = {
  created: { color: "var(--status-active-fg)", bg: "var(--status-active-bg)", icon: Plus },
  updated: { color: "var(--amber)", bg: "rgba(217,138,14,0.12)", icon: Pencil },
  deleted: { color: "var(--rose)", bg: "var(--status-suspended-bg)", icon: Trash2 },
  assigned: { color: "var(--violet)", bg: "rgba(108,92,231,0.12)", icon: Link2 },
  "bulk assigned": { color: "var(--violet)", bg: "rgba(108,92,231,0.12)", icon: Link2 },
  "auto-assigned": { color: "var(--violet)", bg: "rgba(108,92,231,0.12)", icon: Wand2 },
  approved: { color: "var(--status-active-fg)", bg: "var(--status-active-bg)", icon: Check },
  rejected: { color: "var(--rose)", bg: "var(--status-suspended-bg)", icon: X },
  "checked in": { color: "var(--muted)", bg: "var(--surface-2)", icon: LogIn },
  "checked out": { color: "var(--muted)", bg: "var(--surface-2)", icon: LogOut },
  "checked out (overridden)": { color: "var(--rose)", bg: "var(--status-suspended-bg)", icon: LogOut },
  "recorded outcome": { color: "var(--teal)", bg: "rgba(18,181,166,0.12)", icon: Check },
  "bulk imported": { color: "var(--violet)", bg: "rgba(108,92,231,0.12)", icon: Plus },
};
const DEFAULT_STYLE = { color: "var(--text)", bg: "var(--surface-2)", icon: Repeat };

const PAGE_SIZES = [10, 25, 50];

function ActionBadge({ action }) {
  const style = ACTION_STYLE[action] || DEFAULT_STYLE;
  const Icon = style.icon;
  return (
    <span
      className="badge inline-flex items-center gap-1.5"
      style={{ backgroundColor: style.bg, color: style.color, textTransform: "capitalize" }}
    >
      <Icon size={12} />
      {action}
    </span>
  );
}

function summarizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return "";
  return Object.entries(metadata)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(" · ");
}

export default function ActivityLogsPage() {
  const { socket } = useSocket();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const actionOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (!q) return true;
      const haystack = [r.user?.name, r.user?.email, r.action, r.entityType, summarizeMetadata(r.metadata)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, actionFilter]);

  // Reset to page 1 whenever the filtered set changes shape so we never get
  // stranded on a page that no longer exists.
  useEffect(() => {
    setPage(1);
  }, [search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);

  const columns = [
    {
      key: "user",
      label: "User",
      render: (r) => r.user?.name || r.user?.email || <span style={{ color: "var(--muted)" }}>System</span>,
    },
    { key: "action", label: "Action", render: (r) => <ActionBadge action={r.action} /> },
    {
      key: "entityType",
      label: "Entity",
      render: (r) => <span style={{ color: "var(--muted)" }}>{r.entityType || "—"}</span>,
    },
    {
      key: "metadata",
      label: "Details",
      render: (r) => {
        const summary = summarizeMetadata(r.metadata);
        if (!summary) return <span style={{ color: "var(--muted)" }}>—</span>;
        return (
          <span
            className="text-xs inline-block truncate align-middle"
            style={{ color: "var(--muted)", maxWidth: 260 }}
            title={summary}
          >
            {summary}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "When",
      render: (r) => (
        <span className="mono text-xs whitespace-nowrap" style={{ color: "var(--muted)" }}>
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(108,92,231,0.14)" }}>
          <History size={19} color="var(--violet)" />
        </div>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            Activity logs
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            The full audit trail for this tenant updates live as things happen.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Field>
            <TextInput icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, entity, or details…" />
          </Field>
        </div>
        <div className="sm:w-56">
          <Field>
            <SelectInput value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No activity matches yet." />

        {!loading && filtered.length > 0 && (
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                Showing <strong style={{ color: "var(--text)" }}>{rangeStart}</strong>–
                <strong style={{ color: "var(--text)" }}>{rangeEnd}</strong> of{" "}
                <strong style={{ color: "var(--text)" }}>{filtered.length}</strong>
              </span>
              <select
                className="text-xs font-medium rounded-lg px-2 py-1 border"
                style={{ backgroundColor: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <PageButton icon={ChevronsLeft} onClick={() => setPage(1)} disabled={safePage === 1} label="First page" />
              <PageButton icon={ChevronLeft} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} label="Previous page" />
              <span className="text-xs font-medium px-2" style={{ color: "var(--text)" }}>
                Page {safePage} of {totalPages}
              </span>
              <PageButton icon={ChevronRight} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} label="Next page" />
              <PageButton icon={ChevronsRight} onClick={() => setPage(totalPages)} disabled={safePage === totalPages} label="Last page" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PageButton({ icon: Icon, onClick, disabled, label }) {
  return (
    <button
      type="button"
      className="btn-secondary"
      style={{ height: 30, width: 30, padding: 0, opacity: disabled ? 0.4 : 1 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}
