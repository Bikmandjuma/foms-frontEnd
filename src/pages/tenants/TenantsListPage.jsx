import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { tenantsApi } from "../../api/tenants.api.js";

export default function TenantsListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await tenantsApi.list());
    } catch (err) {
      setError(err.message || "Couldn't load tenants.");
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
      await tenantsApi.remove(pendingDelete.id);
      setRows((r) => r.filter((t) => t.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete tenant.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "createdAt", label: "Created", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <Link to={`/tenants/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }}>
            <Pencil size={14} />
          </Link>
          <button className="btn-secondary btn-danger" style={{ height: 32, padding: "0 10px" }} onClick={() => setPendingDelete(r)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            Tenants
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Platform-admin only. Every customer workspace on Huska.
          </p>
        </div>
        <Link to="/tenants/new" className="btn-primary">
          <Plus size={16} />
          Add tenant
        </Link>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No tenants yet — add the first one." />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete tenant?"
        message={`This permanently removes "${pendingDelete?.name}" and everything inside it — users, roles, programs, beneficiaries. This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
