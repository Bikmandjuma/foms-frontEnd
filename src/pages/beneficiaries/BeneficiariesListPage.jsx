import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function BeneficiariesListPage() {
  const { can } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await beneficiariesApi.list());
    } catch (err) {
      setError(err.message || "Couldn't load beneficiaries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await beneficiariesApi.remove(pendingDelete.id);
      setRows((r) => r.filter((b) => b.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete beneficiary.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "code", label: "Code", render: (r) => <span className="mono">{r.code}</span> },
    { key: "name", label: "Name" },
    { key: "telephone", label: "Phone", render: (r) => r.telephone || "—" },
    { key: "location", label: "Location", render: (r) => [r.district, r.sector].filter(Boolean).join(" / ") || "—" },
    { key: "programs", label: "Programs", render: (r) => (r.programs?.length ? r.programs.map((p) => p.name).join(", ") : "—") },
    { key: "outcome", label: "Outcome", render: (r) => <StatusBadge status={r.outcome || "PENDING"} /> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    ...(can(ACTIONS.BENEFICIARIES_MANAGE)
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                <Link to={`/beneficiaries/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }}>
                  <Pencil size={14} />
                </Link>
                <button className="btn-secondary btn-danger" style={{ height: 32, padding: "0 10px" }} onClick={() => setPendingDelete(r)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            Beneficiaries
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            People enrolled in one or more of this tenant's programs.
          </p>
        </div>
        {can(ACTIONS.BENEFICIARIES_MANAGE) && (
          <Link to="/beneficiaries/new" className="btn-primary">
            <Plus size={16} />
            Add beneficiary
          </Link>
        )}
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No beneficiaries yet — add the first one." />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete beneficiary?"
        message={`This will permanently remove ${pendingDelete?.name} (${pendingDelete?.code}).`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
