import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import { rolesApi } from "../../api/roles.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function RolesListPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canCreate = can(ACTIONS.ROLES_CREATE);
  const canEdit = can(ACTIONS.ROLES_EDIT);
  const canDelete = can(ACTIONS.ROLES_DELETE);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const { filtered, query, setQuery } = useSearchedRows(rows, ["name", "description"]);
  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(filtered, 10);

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
      toast.success(`Role "${pendingDelete.name}" was deleted`);
    } catch (err) {
      setError(err.message || "Couldn't delete role. It may still be assigned to users.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description", render: (r) => r.description || <span style={{ color: "var(--muted)" }}>—</span> },
    ...(canEdit || canDelete
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                {canEdit && (
                  <Link to={`/roles/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }}>
                    <Pencil size={14} />
                  </Link>
                )}
                {canDelete && (
                  <button className="btn-secondary btn-danger" style={{ height: 32, padding: "0 10px" }} onClick={() => setPendingDelete(r)}>
                    <Trash2 size={14} />
                  </button>
                )}
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
            <span
              className="mono text-xs font-medium ml-2 align-middle px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}
            >
              {filtered.length}
            </span>
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Roles scoped to this tenant. Assign them to users on the Users page.
          </p>
        </div>
        {canCreate && (
          <Link to="/roles/new" className="btn-primary">
            <Plus size={16} />
            Add role
          </Link>
        )}
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder="Search roles by name or description…" />
      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No roles yet — add the first one." />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
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
