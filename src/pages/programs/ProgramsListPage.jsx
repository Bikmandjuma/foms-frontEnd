import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { programsApi } from "../../api/programs.api.js";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function ProgramsListPage() {
  const { can } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await programsApi.list());
    } catch (err) {
      setError(err.message || "Couldn't load programs.");
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
      await programsApi.remove(pendingDelete.id);
      setRows((r) => r.filter((p) => p.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete program.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "scenarioType", label: "Scenario", render: (r) => (r.scenarioType ? r.scenarioType.replaceAll("_", " ") : "—") },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "targetSampleSize", label: "Target sample", render: (r) => r.targetSampleSize ?? "—" },
    { key: "createdAt", label: "Created", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    ...(can(ACTIONS.PROGRAMS_MANAGE)
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                <Link to={`/programs/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }}>
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
            Programs
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Programs beneficiaries and users can be assigned to.
          </p>
        </div>
        {can(ACTIONS.PROGRAMS_MANAGE) && (
          <Link to="/programs/new" className="btn-primary">
            <Plus size={16} />
            Add program
          </Link>
        )}
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No programs yet — add the first one." />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete program?"
        message={`This will permanently remove "${pendingDelete?.name}".`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
