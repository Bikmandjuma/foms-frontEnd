import React, { useEffect, useState } from "react";
import { Wand2, ClipboardList, UserPlus, Truck, Download, Trash2, Square, AlertTriangle } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Field, SelectInput } from "../../components/FormField.jsx";
import { beneficiaryAssignmentsApi } from "../../api/beneficiaryAssignments.api.js";
import { programAssignmentsApi } from "../../api/programAssignments.api.js";
import { usersApi } from "../../api/users.api.js";
import { programsApi } from "../../api/programs.api.js";
import { vehiclesApi } from "../../api/vehicles.api.js";
import { downloadBlob } from "../../utils/downloadBlob.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const REPORT_FORMATS = [
  { value: "xlsx", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
];

export default function BeneficiaryAssignmentsPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canCreate = can(ACTIONS.ASSIGNMENTS_CREATE);
  const canEdit = can(ACTIONS.ASSIGNMENTS_EDIT);
  const canDelete = can(ACTIONS.ASSIGNMENTS_DELETE);

  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Step 1 — program + auto-detected enumerators.
  const [programId, setProgramId] = useState("");
  const [enumerators, setEnumerators] = useState(null); // null = not checked yet
  const [checkingEnumerators, setCheckingEnumerators] = useState(false);
  const [assigningEnumeratorId, setAssigningEnumeratorId] = useState("");
  const [assigningEnumerator, setAssigningEnumerator] = useState(false);

  // Step 2 — vehicles for this run.
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);

  // Step 3 — run the engine.
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null); // { program, enumerators, vehicles, totalAssigned, leftover }
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [reportFormat, setReportFormat] = useState("xlsx");
  const [downloading, setDownloading] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  async function loadStatic() {
    setLoading(true);
    setError("");
    try {
      const [programList, userList, vehicleList] = await Promise.all([
        programsApi.list(),
        usersApi.list(),
        vehiclesApi.list({ active: true }),
      ]);
      setPrograms(programList);
      setUsers(userList);
      setAllVehicles(vehicleList);
    } catch (err) {
      setError(err.message || "Couldn't load programs, users, or vehicles.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRows(vehicleId) {
    setRowsLoading(true);
    try {
      setRows(await beneficiaryAssignmentsApi.list({ status: "ACTIVE", ...(vehicleId ? { vehicleId } : {}) }));
    } catch (err) {
      setError(err.message || "Couldn't load assignments.");
    } finally {
      setRowsLoading(false);
    }
  }

  useEffect(() => {
    loadStatic();
    loadRows();
  }, []);

  // Step 1: whenever the program changes, auto-detect its enumerators.
  useEffect(() => {
    setRunResult(null);
    setEnumerators(null);
    if (!programId) return;
    let cancelled = false;
    setCheckingEnumerators(true);
    programAssignmentsApi
      .list({ programId, status: "ACTIVE" })
      .then((assignments) => {
        if (cancelled) return;
        setEnumerators(assignments.map((a) => a.user));
      })
      .catch(() => !cancelled && setEnumerators([]))
      .finally(() => !cancelled && setCheckingEnumerators(false));
    return () => {
      cancelled = true;
    };
  }, [programId]);

  function toggleVehicle(id) {
    setSelectedVehicleIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleAssignEnumerator(e) {
    e.preventDefault();
    if (!assigningEnumeratorId || !programId) return;
    setAssigningEnumerator(true);
    setError("");
    try {
      await programAssignmentsApi.create({ userId: assigningEnumeratorId, programId });
      toast.success("Enumerator assigned to this program");
      setAssigningEnumeratorId("");
      const assignments = await programAssignmentsApi.list({ programId, status: "ACTIVE" });
      setEnumerators(assignments.map((a) => a.user));
    } catch (err) {
      setError(err.message || "Couldn't assign this enumerator.");
    } finally {
      setAssigningEnumerator(false);
    }
  }

  async function handleRunEngine() {
    if (!programId || selectedVehicleIds.length === 0) return;
    setRunning(true);
    setError("");
    try {
      const result = await beneficiaryAssignmentsApi.autoAssign({ programId, vehicleIds: selectedVehicleIds });
      setRunResult(result);
      setActiveVehicleId(result.vehicles[0]?.vehicleId ?? null);
      if (result.totalAssigned === 0) {
        toast.info(
          result.totalCandidates === 0
            ? "No eligible respondents — everyone enrolled in this program already has an active caseworker, or none are enrolled yet."
            : "No respondents were assigned — check the vehicles' capacity."
        );
      } else {
        toast.success(`Assigned ${result.totalAssigned} respondent(s) across ${result.vehicles.length} vehicle(s)`);
      }
      loadRows(activeVehicleId);
    } catch (err) {
      setError(err.message || "Couldn't run the assignment engine.");
    } finally {
      setRunning(false);
    }
  }

  async function handleDownloadReport() {
    if (!programId) return;
    setDownloading(true);
    try {
      const blob = await beneficiaryAssignmentsApi.report({
        programId,
        ...(activeVehicleId ? { vehicleId: activeVehicleId } : {}),
        format: reportFormat,
      });
      downloadBlob(blob, `assignment-report.${reportFormat}`);
    } catch (err) {
      toast.error(err.message || "Couldn't download that report.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleEnd(row) {
    try {
      await beneficiaryAssignmentsApi.end(row.id);
      toast.success("Assignment ended");
      loadRows(activeVehicleId);
    } catch (err) {
      setError(err.message || "Couldn't end assignment.");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await beneficiaryAssignmentsApi.remove(pendingDelete.id);
      setRows((r) => r.filter((a) => a.id !== pendingDelete.id));
      toast.success("Assignment deleted");
    } catch (err) {
      setError(err.message || "Couldn't delete assignment.");
    } finally {
      setPendingDelete(null);
    }
  }

  const noEnumerator = enumerators !== null && enumerators.length === 0;
  const activeVehicle = runResult?.vehicles.find((v) => v.vehicleId === activeVehicleId);

  const historyColumns = [
    { key: "user", label: "Enumerator", render: (r) => r.user?.name || r.user?.email },
    { key: "beneficiary", label: "Beneficiary", render: (r) => `${r.beneficiary?.name} (${r.beneficiary?.code})` },
    { key: "vehicle", label: "Vehicle", render: (r) => r.vehicle?.name || "—" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "assignedAt", label: "Assigned", render: (r) => new Date(r.assignedAt).toLocaleString() },
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
          Respondent assignments
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Choose a program, choose your vehicle(s), click Random Top-Up.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {canCreate && (
        <div className="card p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Wand2 size={16} color="var(--violet)" />
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Smart assignment engine
            </p>
          </div>

          {/* Step 1: Program */}
          <Field label="1. Program" required>
            <SelectInput icon={ClipboardList} required value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="" className="text-black">
                Select a program…
              </option>
              {programs.map((p) => (
                <option key={p.id} value={p.id} className="text-black">
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          {checkingEnumerators && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Checking for enumerators assigned to this program…
            </p>
          )}

          {noEnumerator && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: "var(--status-suspended-bg)" }}>
              <p className="text-sm flex items-center gap-2" style={{ color: "var(--status-suspended-fg)" }}>
                <AlertTriangle size={15} />
                This program has not yet been assigned to an Enumerator.
              </p>
              <form onSubmit={handleAssignEnumerator} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <Field label="Assign an enumerator">
                    <SelectInput required value={assigningEnumeratorId} onChange={(e) => setAssigningEnumeratorId(e.target.value)}>
                      <option value="" className="text-black">
                        Select a user…
                      </option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id} className="text-black">
                          {u.name || u.email}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <button type="submit" className="btn-primary" disabled={assigningEnumerator} style={{ height: 44 }}>
                  <UserPlus size={16} />
                  Assign Enumerator
                </button>
              </form>
            </div>
          )}

          {enumerators && enumerators.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {enumerators.map((e) => (
                <span key={e.id} className="badge" style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}>
                  {e.name || e.email}
                </span>
              ))}
            </div>
          )}

          {/* Step 2: Vehicles */}
          {enumerators && enumerators.length > 0 && (
            <>
              <Field label="2. Vehicle(s) for this run" required>
                {allVehicles.length === 0 ? (
                  <div className="flex items-center gap-2">
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        No vehicles set up yet ,add one under Vehicles first.
                      </p>

                      <Link type="button" to="/vehicles/new" className="text-xs font-medium" style={{ color: "var(--violet)" }}>
                        Add one
                      </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {allVehicles.map((v) => {
                      const selected = selectedVehicleIds.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className="flex items-center gap-3 rounded-xl p-3 cursor-pointer"
                          style={{ border: `1px solid ${selected ? "var(--violet)" : "var(--border)"}`, backgroundColor: selected ? "rgba(108,92,231,0.06)" : "var(--surface-2)" }}
                        >
                          <input type="checkbox" checked={selected} onChange={() => toggleVehicle(v.id)} style={{ width: "auto" }} />
                          <Truck size={15} color="var(--muted)" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                              {v.name}
                            </p>
                            <p className="text-xs" style={{ color: "var(--muted)" }}>
                              {v.driverName ? `Driver: ${v.driverName}` : "No driver set"} ·{" "}
                              {v.capacityPerDay ? `${v.capacityPerDay}/day capacity` : "No capacity cap"}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </Field>

              {/* Step 3: Run */}
              <div className="flex justify-end">
                <button type="button" className="btn-primary" onClick={handleRunEngine} disabled={running || selectedVehicleIds.length === 0}>
                  <Wand2 size={16} />
                  {running ? "Assigning…" : "Random Top-Up"}
                </button>
              </div>
            </>
          )}

          {/* Result: vehicle tabs */}
          {runResult && (
            <div className="flex flex-col gap-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm" style={{ color: "var(--text)" }}>
                  Assigned <strong>{runResult.totalAssigned}</strong> of {runResult.totalCandidates} eligible respondent(s)
                  {runResult.leftover > 0 ? ` — ${runResult.leftover} left over for the next run/trip` : ""}.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={reportFormat}
                    onChange={(e) => setReportFormat(e.target.value)}
                    className="text-xs font-medium rounded-lg px-2 py-1.5 border"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
                  >
                    {REPORT_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-secondary" onClick={handleDownloadReport} disabled={downloading}>
                    <Download size={14} />
                    {downloading ? "Preparing…" : "Download Report"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {runResult.vehicles.map((v, i) => (
                  <button
                    key={v.vehicleId}
                    onClick={() => {
                      setActiveVehicleId(v.vehicleId);
                      loadRows(v.vehicleId);
                    }}
                    className={activeVehicleId === v.vehicleId ? "range-btn active" : "range-btn"}
                  >
                    Car {i + 1} · {v.name} ({v.assigned.length})
                  </button>
                ))}
              </div>

              <div className="card" style={{ backgroundColor: "var(--surface-2)" }}>
                <DataTable
                  columns={[
                    { key: "code", label: "Code", render: (r) => <span className="mono">{r.code}</span> },
                    { key: "name", label: "Respondent" },
                    { key: "userName", label: "Enumerator" },
                  ]}
                  rows={activeVehicle?.assigned || []}
                  loading={false}
                  emptyLabel="This vehicle has no respondents in this run."
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
          {activeVehicleId ? "Assignments for this vehicle" : "All active assignments"}
        </p>
        <div className="card">
          <DataTable columns={historyColumns} rows={rows} loading={rowsLoading} emptyLabel="No beneficiary assignments yet." />
        </div>
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
