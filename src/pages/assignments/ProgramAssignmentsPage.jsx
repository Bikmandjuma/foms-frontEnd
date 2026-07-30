import React, { useEffect, useState } from "react";
import { Plus, Square, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Field, SelectInput } from "../../components/FormField.jsx";
import { programAssignmentsApi } from "../../api/programAssignments.api.js";
import { usersApi } from "../../api/users.api.js";
import { programsApi } from "../../api/programs.api.js";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function ProgramAssignmentsPage() {
  const { can } = usePermissions();
  const manage = can(ACTIONS.ASSIGNMENTS_MANAGE);

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ userId: "", programId: "" });
  const [pendingDelete, setPendingDelete] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [assignments, userList, programList] = await Promise.all([
        programAssignmentsApi.list(),
        usersApi.list(),
        programsApi.list(),
      ]);
      setRows(assignments);
      setUsers(userList);
      setPrograms(programList);
    } catch (err) {
      setError(err.message || "Couldn't load program assignments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.userId || !form.programId) return;
    setCreating(true);
    setError("");
    try {
      const created = await programAssignmentsApi.create(form);
      setRows((r) => [created, ...r]);
      setForm({ userId: "", programId: "" });
    } catch (err) {
      setError(err.message || "Couldn't create assignment.");
    } finally {
      setCreating(false);
    }
  }

  async function handleEnd(row) {
    try {
      const updated = await programAssignmentsApi.end(row.id);
      setRows((r) => r.map((a) => (a.id === row.id ? updated : a)));
    } catch (err) {
      setError(err.message || "Couldn't end assignment.");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await programAssignmentsApi.remove(pendingDelete.id);
      setRows((r) => r.filter((a) => a.id !== pendingDelete.id));
    } catch (err) {
      setError(err.message || "Couldn't delete assignment.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "user", label: "User", render: (r) => r.user?.name || r.user?.email },
    { key: "program", label: "Program", render: (r) => r.program?.name },
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
          Program assignments
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Which users are assigned to which programs.
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
            <Field label="Program">
              <SelectInput required value={form.programId} onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value }))}>
                <option value="">Select a program…</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No program assignments yet." />
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
