import React, { useEffect, useMemo, useState } from "react";
import { Square, Trash2, Users, ClipboardList, Search, CheckSquare } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import { programAssignmentsApi } from "../../api/programAssignments.api.js";
import { usersApi } from "../../api/users.api.js";
import { programsApi } from "../../api/programs.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function ProgramAssignmentsPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canCreate = can(ACTIONS.ASSIGNMENTS_CREATE);
  const canEdit = can(ACTIONS.ASSIGNMENTS_EDIT);
  const canDelete = can(ACTIONS.ASSIGNMENTS_DELETE);

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [programId, setProgramId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState("");

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

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, userSearch]);

  function toggleUser(userId) {
    setSelectedUserIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  function selectAllFiltered() {
    setSelectedUserIds((ids) => Array.from(new Set([...ids, ...filteredUsers.map((u) => u.id)])));
  }

  function clearSelection() {
    setSelectedUserIds([]);
  }

  async function handleBulkAssign(e) {
    e.preventDefault();
    if (!programId || selectedUserIds.length === 0) return;
    setAssigning(true);
    setError("");
    setResult(null);
    try {
      const res = await programAssignmentsApi.bulkCreate({ programId, userIds: selectedUserIds });
      setResult(res);
      toast.success(`Assigned ${res.created?.length ?? 0} user(s) to the program`);
      setSelectedUserIds([]);
      loadAll();
    } catch (err) {
      setError(err.message || "Couldn't assign the selected users.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleEnd(row) {
    try {
      const updated = await programAssignmentsApi.end(row.id);
      setRows((r) => r.map((a) => (a.id === row.id ? updated : a)));
      toast.success("Assignment ended");
    } catch (err) {
      setError(err.message || "Couldn't end assignment.");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await programAssignmentsApi.remove(pendingDelete.id);
      setRows((r) => r.filter((a) => a.id !== pendingDelete.id));
      toast.success("Assignment deleted");
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
    ...(canEdit || canDelete
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                {r.status === "ACTIVE" && canEdit && (
                  <button className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => handleEnd(r)} title="End assignment">
                    <Square size={14} />
                  </button>
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
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Program assignments
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Which users are assigned to which programs — select as many users as you need and assign them in one go.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {result && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}>
          Assigned {result.created?.length ?? 0} user(s){result.skippedCount ? `, skipped ${result.skippedCount} already assigned` : ""}.
        </div>
      )}

      {canCreate && (
        <form onSubmit={handleBulkAssign} className="card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Users size={16} color="var(--violet)" />
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Assign multiple users to a program
            </p>
          </div>

          <div className="max-w-sm">
            <Field label="Program" required>
              <SelectInput icon={ClipboardList} required value={programId} onChange={(e) => setProgramId(e.target.value)}>
                <option value="">Select a program…</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-medium" style={{ color: "var(--text)" }}>
                Select users ({selectedUserIds.length} selected)
              </label>
              <div className="flex items-center gap-2">
                <button type="button" className="text-xs font-medium" style={{ color: "var(--violet)" }} onClick={selectAllFiltered}>
                  Select all shown
                </button>
                <button type="button" className="text-xs font-medium" style={{ color: "var(--muted)" }} onClick={clearSelection}>
                  Clear
                </button>
              </div>
            </div>

            <Field>
              <TextInput icon={Search} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Filter by name or email…" />
            </Field>

            <div
              className="rounded-xl p-2 flex flex-col gap-1 max-h-64 overflow-y-auto"
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {filteredUsers.length === 0 && (
                <p className="text-xs px-2 py-3" style={{ color: "var(--muted)" }}>
                  No users match that search.
                </p>
              )}
              {filteredUsers.map((u) => {
                const checked = selectedUserIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                    style={{ backgroundColor: checked ? "rgba(108,92,231,0.10)" : "transparent" }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleUser(u.id)} style={{ width: "auto" }} />
                    <span className="text-sm flex-1" style={{ color: "var(--text)" }}>
                      {u.name || u.email}
                    </span>
                    {u.role?.name && (
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {u.role.name}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={assigning || !programId || selectedUserIds.length === 0}>
              <CheckSquare size={16} />
              {assigning ? "Assigning…" : `Assign ${selectedUserIds.length || ""} user${selectedUserIds.length === 1 ? "" : "s"}`}
            </button>
          </div>
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
