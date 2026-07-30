import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { rolesApi } from "../../api/roles.api.js";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function RolesListPage() {
  const { can } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await rolesApi.list());
    } catch (err) {
      setError(err.message || "Couldn't load roles.");
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
      await rolesApi.remove(pendingDelete.id);
      setRows((r) => r.filter((role) => role.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete role. It may still be assigned to users.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description", render: (r) => r.description || <span style={{ color: "var(--muted)" }}>—</span> },
    ...(can(ACTIONS.ROLES_MANAGE)
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                <Link to={`/roles/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }}>
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
            Roles
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Roles scoped to this tenant. Assign them to users on the Users page.
          </p>
        </div>
        {can(ACTIONS.ROLES_MANAGE) && (
          <Link to="/roles/new" className="btn-primary">
            <Plus size={16} />
            Add role
          </Link>
        )}
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No roles yet — add the first one." />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete role?"
        message={`This will permanently remove "${pendingDelete?.name}". Users currently assigned to it should be reassigned first.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
