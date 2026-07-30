import React, { useEffect, useState } from "react";
import { Plus, Square, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Field, SelectInput } from "../../components/FormField.jsx";
import { beneficiaryAssignmentsApi } from "../../api/beneficiaryAssignments.api.js";
import { usersApi } from "../../api/users.api.js";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function BeneficiaryAssignmentsPage() {
  const { can } = usePermissions();
  const manage = can(ACTIONS.ASSIGNMENTS_MANAGE);

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ userId: "", beneficiaryId: "" });
  const [pendingDelete, setPendingDelete] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [assignments, userList, beneficiaryList] = await Promise.all([
        beneficiaryAssignmentsApi.list(),
        usersApi.list(),
        beneficiariesApi.list(),
      ]);
      setRows(assignments);
      setUsers(userList);
      setBeneficiaries(beneficiaryList);
    } catch (err) {
      setError(err.message || "Couldn't load beneficiary assignments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.userId || !form.beneficiaryId) return;
    setCreating(true);
    setError("");
    try {
      const created = await beneficiaryAssignmentsApi.create(form);
      setRows((r) => [created, ...r]);
      setForm({ userId: "", beneficiaryId: "" });
    } catch (err) {
      setError(err.message || "Couldn't create assignment.");
    } finally {
      setCreating(false);
    }
  }

  async function handleEnd(row) {
    try {
      const updated = await beneficiaryAssignmentsApi.end(row.id);
      setRows((r) => r.map((a) => (a.id === row.id ? updated : a)));
    } catch (err) {
      setError(err.message || "Couldn't end assignment.");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await beneficiaryAssignmentsApi.remove(pendingDelete.id);
      setRows((r) => r.filter((a) => a.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete assignment.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "user", label: "User (caseworker)", render: (r) => r.user?.name || r.user?.email },
    { key: "beneficiary", label: "Beneficiary", render: (r) => `${r.beneficiary?.name} (${r.beneficiary?.code})` },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "assignedAt", label: "Assigned", render: (r) => new Date(r.assignedAt).toLocaleDateString() },
    ...(manage
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                {r.status === "ACTIVE" && (
                  <button className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => handleEnd(r)} title="End assignment">
                    <Square size={14} />
                  </button>
                )}
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
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Beneficiary assignments
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Which users (caseworkers) are responsible for which beneficiaries.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {manage && (
        <form onSubmit={handleCreate} className="card p-5 flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <Field label="User">
              <SelectInput required value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
                <option value="">Select a user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Beneficiary">
              <SelectInput required value={form.beneficiaryId} onChange={(e) => setForm((f) => ({ ...f, beneficiaryId: e.target.value }))}>
                <option value="">Select a beneficiary…</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <button type="submit" className="btn-primary" disabled={creating} style={{ height: 44 }}>
            <Plus size={16} />
            Assign
          </button>
        </form>
      )}

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No beneficiary assignments yet." />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete assignment?"
        message="This removes the assignment record entirely (use 'End' instead to keep history)."
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
