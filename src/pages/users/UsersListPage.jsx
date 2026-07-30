import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { usersApi } from "../../api/users.api.js";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function UsersListPage() {
  const { can } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await usersApi.list();
      setRows(data);
    } catch (err) {
      setError(err.message || "Couldn't load users.");
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
      await usersApi.remove(pendingDelete.id);
      setRows((r) => r.filter((u) => u.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete user.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "name", label: "Name", render: (r) => r.name || <span style={{ color: "var(--muted)" }}>—</span> },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (r) => r.role?.name || <span style={{ color: "var(--muted)" }}>—</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "telephone", label: "Phone", render: (r) => r.telephone || "—" },
    ...(can(ACTIONS.USERS_MANAGE)
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                <Link to={`/users/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }}>
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
            Users
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Everyone with access to this tenant's workspace.
          </p>
        </div>
        {can(ACTIONS.USERS_MANAGE) && (
          <Link to="/users/new" className="btn-primary">
            <Plus size={16} />
            Add user
          </Link>
        )}
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No users yet — add the first one." />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete user?"
        message={`This will permanently remove ${pendingDelete?.name || pendingDelete?.email}. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
