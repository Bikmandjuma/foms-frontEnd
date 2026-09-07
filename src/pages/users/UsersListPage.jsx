import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, Users2, UserPlus, ChevronDown } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import { SelectInput } from "../../components/FormField.jsx";
import { usersApi } from "../../api/users.api.js";
import { rolesApi } from "../../api/roles.api.js";
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
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const { filtered, query, setQuery } = useSearchedRows(rows, ["name", "firstName", "lastName", "email", "telephone", "role.name"]);
  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(filtered, 10);

  useEffect(() => {
    rolesApi
      .list()
      .then((list) => {
        setRoles(list);
        // Default view is Supervisors, per spec — falls back to "All roles"
        // if this tenant doesn't have one named that yet.
        const supervisor = list.find((r) => r.name.trim().toLowerCase() === "supervisor");
        if (supervisor) setRoleId(supervisor.id);
      })
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await usersApi.list(roleId ? { roleId } : undefined);
      setRows(data);
    } catch (err) {
      setError(err.message || "Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

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
            <span
              className="mono text-xs font-medium ml-2 align-middle px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}
            >
              {filtered.length}
            </span>
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Everyone with access to this tenant's workspace.
          </p>
        </div>
        {canCreate && (
          <div className="relative">
            <button className="btn-primary" onClick={() => setAddMenuOpen((o) => !o)}>
              <Plus size={16} />
              Add user
              <ChevronDown size={14} />
            </button>
            {addMenuOpen && (
              <div
                className="absolute right-0 mt-1 rounded-lg shadow-lg z-10"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", minWidth: 240 }}
                onMouseLeave={() => setAddMenuOpen(false)}
              >
                <Link
                  to="/users/new/supervisor-enumerator"
                  className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm table-row"
                  onClick={() => setAddMenuOpen(false)}
                >
                  <Users2 size={15} /> Supervisor &amp; Enumerator
                </Link>
                <Link
                  to="/users/new/other"
                  className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm table-row"
                  onClick={() => setAddMenuOpen(false)}
                >
                  <UserPlus size={15} /> Others (HR, Data Manager…)
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email, phone, or role…" />
        <SelectInput value={roleId} onChange={(e) => setRoleId(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </SelectInput>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No users yet, add the first one." />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
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
