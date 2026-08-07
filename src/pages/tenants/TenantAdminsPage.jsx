import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { tenantsApi } from "../../api/tenants.api.js";
import { resolveAssetUrl } from "../../api/client.js";

function timeAgo(iso) {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TenantAdminsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { filtered, query, setQuery } = useSearchedRows(rows, ["name", "email", "tenant.name"]);

  useEffect(() => {
    let cancelled = false;
    tenantsApi
      .admins()
      .then((data) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setError(err.message || "Couldn't load tenant administrators."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    {
      key: "name",
      label: "Administrator",
      render: (r) => {
        const avatarSrc = resolveAssetUrl(r.avatarUrl);
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: "var(--violet)", color: "white" }}
            >
              {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : (r.name || r.email)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: "var(--text)" }}>{r.name || "—"}</p>
              <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{r.email}</p>
            </div>
          </div>
        );
      },
    },
    { key: "tenant", label: "Tenant", render: (r) => r.tenant?.name || "—" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "lastSeenAt", label: "Last active", render: (r) => timeAgo(r.lastSeenAt) },
    {
      key: "actions",
      label: "",
      render: (r) =>
        r.tenant?.id ? (
          <Link to={`/tenants/${r.tenant.id}/overview`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }} title="View tenant">
            <ExternalLink size={14} />
          </Link>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Tenant administrators
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Every tenant's admin, across the whole platform. Click through to see a tenant's activity, read-only.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email, or tenant…" />

      <div className="card">
        <DataTable columns={columns} rows={filtered} loading={loading} emptyLabel="No tenant administrators yet." />
      </div>
    </div>
  );
}
