import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Truck, Bike } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import { vehiclesApi } from "../../api/vehicles.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function VehiclesListPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canCreate = can(ACTIONS.VEHICLES_CREATE);
  const canEdit = can(ACTIONS.VEHICLES_EDIT);
  const canDelete = can(ACTIONS.VEHICLES_DELETE);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const { filtered, query, setQuery } = useSearchedRows(rows, ["name", "driverName", "type"]);
  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(filtered, 10);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await vehiclesApi.list());
    } catch (err) {
      setError(err.message || "Couldn't load vehicles.");
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
      await vehiclesApi.remove(pendingDelete.id);
      setRows((r) => r.filter((v) => v.id !== pendingDelete.id));
      toast.success(`"${pendingDelete.name}" was deleted`);
    } catch (err) {
      setError(err.message || "Couldn't delete vehicle.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    {
      key: "name",
      label: "Name / plate",
      render: (r) => (
        <span className="flex items-center gap-2">
          {r.type === "MOTORCYCLE" ? <Bike size={14} color="var(--muted)" /> : <Truck size={14} color="var(--muted)" />}
          {r.name}
        </span>
      ),
    },
    { key: "type", label: "Type", render: (r) => (r.type === "MOTORCYCLE" ? "Motorcycle" : "Vehicle") },
    { key: "driverName", label: "Driver", render: (r) => r.driverName || <span style={{ color: "var(--muted)" }}>—</span> },
    { key: "capacityPerDay", label: "Capacity/day", render: (r) => (r.capacityPerDay ? `${r.capacityPerDay} respondents` : "No cap") },
    {
      key: "active",
      label: "Status",
      render: (r) => (
        <span
          className="badge"
          style={{
            backgroundColor: r.active ? "var(--status-active-bg)" : "var(--status-inactive-bg)",
            color: r.active ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
          }}
        >
          {r.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    ...(canEdit || canDelete
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                {canEdit && (
                  <Link to={`/vehicles/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }}>
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
            Vehicles
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Optional transport resources name, driver, and daily capacity used by the smart assignment engine when a
            deployment has vehicles or motorcycles to allocate respondents across.
          </p>
        </div>
        {canCreate && (
          <Link to="/vehicles/new" className="btn-primary">
            <Plus size={16} />
            Add vehicle
          </Link>
        )}
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder="Search vehicles by name, driver, or type…" />
      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No vehicles yet , add one if this deployment uses transport." />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete vehicle?"
        message={`This will permanently remove "${pendingDelete?.name}". Past assignments made through it keep their record.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
