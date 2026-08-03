import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import { usersApi } from "../../api/users.api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function UsersListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { can } = usePermissions();
  const canCreate = can(ACTIONS.USERS_CREATE);
  const canEdit = can(ACTIONS.USERS_EDIT);
  const canDelete = can(ACTIONS.USERS_DELETE);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(rows, 10);

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
      toast.success(`${pendingDelete.name || pendingDelete.email} was deleted`);
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
    {
      key: "actions",
      label: "",
      // Anyone with users:edit/users:delete sees every icon on every row.
      // Everyone else only ever sees their OWN row's view/edit — never
      // another person's, and never a delete icon at all, admin's row
      // included — that's the point of granular, per-action permissions.
      render: (r) => {
        const isSelf = r.id === user?.id;
        const showView = canEdit || isSelf;
        const showEdit = canEdit || isSelf;
        const showDelete = canDelete && !isSelf;
        if (!showView && !showEdit && !showDelete) {
          return <span style={{ color: "var(--muted)" }}>—</span>;
        }
        return (
          <div className="flex items-center gap-2 justify-end">
            {showView && (
              <Link to={`/users/${r.id}`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }} title="View profile">
                <Eye size={14} />
              </Link>
            )}
            {showEdit && (
              <Link to={`/users/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }} title="Edit">
                <Pencil size={14} />
              </Link>
            )}
            {showDelete && (
              <button
                className="btn-secondary btn-danger"
                style={{ height: 32, padding: "0 10px" }}
                onClick={() => setPendingDelete(r)}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      },
    },
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
        {canCreate && (
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
        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No users yet — add the first one." />
        <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
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
