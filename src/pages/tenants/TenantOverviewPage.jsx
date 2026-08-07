import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, ShieldCheck, ClipboardList, Heart, Wifi, Eye } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { tenantsApi } from "../../api/tenants.api.js";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}1A` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          {label}
        </p>
        <p className="mono text-lg" style={{ color: "var(--text)" }}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

const TABS = ["Users", "Roles", "Programs", "Respondents", "Activity"];

export default function TenantOverviewPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Users");

  useEffect(() => {
    let cancelled = false;
    tenantsApi
      .overview(id)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message || "Couldn't load this tenant."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;
  if (error) {
    return (
      <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
        {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link to="/tenant-admins" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {data.tenant.name}
          </h2>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: "var(--muted)" }}>
            <Eye size={13} />
            Read-only platform admin view. Nothing here can be added, edited, or deleted.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Users" value={data.counts.users} accent="#12B5A6" />
        <StatCard icon={ShieldCheck} label="Roles" value={data.counts.roles} accent="#D98A0E" />
        <StatCard icon={ClipboardList} label="Programs" value={data.counts.programs} accent="#6C5CE7" />
        <StatCard icon={Heart} label="Respondents" value={data.counts.beneficiaries} accent="#E1495C" />
        <StatCard icon={Wifi} label="Online now" value={data.counts.online} accent="#12B5A6" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "range-btn active" : "range-btn"}>
            {t}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === "Users" && (
          <DataTable
            columns={[
              { key: "name", label: "Name", render: (r) => r.name || "—" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role", render: (r) => r.role?.name || "—" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.users}
            emptyLabel="No users in this tenant yet."
          />
        )}
        {tab === "Roles" && (
          <DataTable
            columns={[
              { key: "name", label: "Name" },
              { key: "description", label: "Description", render: (r) => r.description || "—" },
              { key: "permissions", label: "Permissions", render: (r) => (Array.isArray(r.permissions) ? r.permissions.length : 0) },
            ]}
            rows={data.roles}
            emptyLabel="No roles in this tenant yet."
          />
        )}
        {tab === "Programs" && (
          <DataTable
            columns={[
              { key: "name", label: "Name" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "scenarioType", label: "Scenario", render: (r) => (r.scenarioType ? r.scenarioType.replaceAll("_", " ") : "—") },
            ]}
            rows={data.programs}
            emptyLabel="No programs in this tenant yet."
          />
        )}
        {tab === "Respondents" && (
          <DataTable
            columns={[
              { key: "code", label: "Code", render: (r) => <span className="mono">{r.code}</span> },
              { key: "name", label: "Name" },
              { key: "outcome", label: "Outcome", render: (r) => <StatusBadge status={r.outcome || "PENDING"} /> },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.beneficiaries}
            emptyLabel="No respondents in this tenant yet."
          />
        )}
        {tab === "Activity" && (
          <DataTable
            columns={[
              { key: "user", label: "User", render: (r) => r.user?.name || r.user?.email || "System" },
              { key: "action", label: "Action" },
              { key: "entityType", label: "Entity" },
              { key: "createdAt", label: "When", render: (r) => new Date(r.createdAt).toLocaleString() },
            ]}
            rows={data.activityLogs}
            emptyLabel="No activity recorded yet."
          />
        )}
      </div>
    </div>
  );
}
