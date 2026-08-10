import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, ClipboardList, FileUp } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { programsApi } from "../../api/programs.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";
import ImportBeneficiariesModal from "./ImportBeneficiariesModal.jsx";

export default function BeneficiariesListPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canCreate = can(ACTIONS.BENEFICIARIES_CREATE);
  const canEdit = can(ACTIONS.BENEFICIARIES_EDIT);
  const canDelete = can(ACTIONS.BENEFICIARIES_DELETE);

  const [rows, setRows] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const [programId, setProgramId] = useState("");
  const [search, setSearch] = useState("");

  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(rows, 10);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [beneficiaryList, programList] = await Promise.all([
        beneficiariesApi.list({ programId: programId || undefined, search: search || undefined }),
        programsApi.list(),
      ]);
      setRows(beneficiaryList);
      setPrograms(programList);
    } catch (err) {
      setError(err.message || "Couldn't load beneficiaries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce server-side filtering as the supervisor types/selects.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, search]);

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await beneficiariesApi.remove(pendingDelete.id);
      setRows((r) => r.filter((b) => b.id !== pendingDelete.id));
      toast.success(`${pendingDelete.name} was deleted`);
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
    {
      key: "location",
      label: "Location",
      render: (r) => [r.district?.name, r.sector?.name, r.cell?.name, r.village?.name].filter(Boolean).join(" / ") || "—",
    },
    { key: "programs", label: "Programs", render: (r) => (r.programs?.length ? r.programs.map((p) => p.name).join(", ") : "—") },
    { key: "outcome", label: "Outcome", render: (r) => <StatusBadge status={r.outcome || "PENDING"} /> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    ...(canEdit || canDelete
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                {canEdit && (
                  <Link to={`/beneficiaries/${r.id}/edit`} className="btn-secondary" style={{ height: 32, padding: "0 10px" }}>
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
            Beneficiaries
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            People enrolled in one or more of this tenant's programs.
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setShowImport(true)}>
              <FileUp size={16} />
              Import Excel
            </button>
            <Link to="/beneficiaries/new" className="btn-primary">
              <Plus size={16} />
              Add beneficiary
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Field>
            <TextInput icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code, phone, or village…" />
          </Field>
        </div>
        <div className="sm:w-64">
          <Field>
            <SelectInput icon={ClipboardList} value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="" className="text-black">All programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id} className="text-black">
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No beneficiaries match yet ,add the first one or adjust your filters." />
        <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete beneficiary?"
        message={`This will permanently remove ${pendingDelete?.name} (${pendingDelete?.code}).`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {showImport && (
        <ImportBeneficiariesModal
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}
    </div>
  );
}
