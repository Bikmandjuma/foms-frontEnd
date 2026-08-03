import React, { useEffect, useMemo, useState } from "react";
import { Plus, Square, Trash2, Wand2, ClipboardList, Search, Shuffle, Target, Scale, Truck, Bike, Footprints, Bus, Ban, ExternalLink } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import { Link } from "react-router-dom";
import { beneficiaryAssignmentsApi } from "../../api/beneficiaryAssignments.api.js";
import { usersApi } from "../../api/users.api.js";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { programsApi } from "../../api/programs.api.js";
import { vehiclesApi } from "../../api/vehicles.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const STRATEGIES = [
  { value: "EVEN", label: "Even split", icon: Scale, hint: "Divide the eligible respondents as equally as possible." },
  { value: "DAILY_TARGET", label: "Daily target", icon: Target, hint: "Cap each enumerator at a fixed number; the rest queue for next time." },
  { value: "RANDOM", label: "Random top-up", icon: Shuffle, hint: "Same shuffle, no even-split guarantee — good for ad-hoc top-ups." },
];

const TRANSPORT_MODES = [
  { value: "NONE", label: "None", icon: Ban },
  { value: "VEHICLE", label: "Vehicle", icon: Truck },
  { value: "MOTORCYCLE", label: "Motorcycle", icon: Bike },
  { value: "WALKING", label: "Walking", icon: Footprints },
  { value: "PUBLIC_TRANSPORT", label: "Public transport", icon: Bus },
];

export default function BeneficiaryAssignmentsPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canCreate = can(ACTIONS.ASSIGNMENTS_CREATE);
  const canEdit = can(ACTIONS.ASSIGNMENTS_EDIT);
  const canDelete = can(ACTIONS.ASSIGNMENTS_DELETE);

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  // Manual single assignment (still handy for one-off corrections).
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ userId: "", beneficiaryId: "" });

  // Smart assignment engine.
  const [engineProgramId, setEngineProgramId] = useState("");
  const [engineUserIds, setEngineUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [strategy, setStrategy] = useState("EVEN");
  const [dailyTarget, setDailyTarget] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const [running, setRunning] = useState(false);
  const [engineResult, setEngineResult] = useState(null);

  // Transport is entirely optional — PRD: "the vehicle is just in case, but
  // where there isn't [one]... the vehicle should be optional, not a
  // requirement." Defaults to NONE, which behaves exactly like before.
  const [transportMode, setTransportMode] = useState("NONE");
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
  const [vehicleRiders, setVehicleRiders] = useState({}); // { [vehicleId]: userId[] }

  async function loadVehicles() {
    try {
      setVehicles(await vehiclesApi.list({ active: true }));
    } catch {
      // Not everyone has vehicles:view — the transport picker just won't
      // offer any vehicles rather than breaking the rest of the page.
      setVehicles([]);
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [assignments, userList, beneficiaryList, programList] = await Promise.all([
        beneficiaryAssignmentsApi.list(),
        usersApi.list(),
        beneficiariesApi.list(),
        programsApi.list(),
      ]);
      setRows(assignments);
      setUsers(userList);
      setBeneficiaries(beneficiaryList);
      setPrograms(programList);
    } catch (err) {
      setError(err.message || "Couldn't load beneficiary assignments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    loadVehicles();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, userSearch]);

  function toggleEngineUser(userId) {
    setEngineUserIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  const vehiclesForMode = useMemo(
    () => vehicles.filter((v) => v.type === transportMode),
    [vehicles, transportMode]
  );
  const usesTransport = transportMode === "VEHICLE" || transportMode === "MOTORCYCLE";

  function toggleVehicle(vehicleId) {
    setSelectedVehicleIds((ids) => {
      if (ids.includes(vehicleId)) {
        setVehicleRiders((r) => {
          const next = { ...r };
          delete next[vehicleId];
          return next;
        });
        return ids.filter((id) => id !== vehicleId);
      }
      return [...ids, vehicleId];
    });
  }

  function toggleRider(vehicleId, userId) {
    setVehicleRiders((r) => {
      const current = r[vehicleId] || [];
      const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
      return { ...r, [vehicleId]: next };
    });
  }

  useEffect(() => {
    setSelectedVehicleIds([]);
    setVehicleRiders({});
  }, [transportMode]);

  async function handleRunEngine(e) {
    e.preventDefault();
    if (!engineProgramId || engineUserIds.length === 0) return;
    if (usesTransport && selectedVehicleIds.length > 0) {
      const missingRiders = selectedVehicleIds.filter((id) => !(vehicleRiders[id]?.length > 0));
      if (missingRiders.length > 0) {
        setError("Every selected vehicle needs at least one enumerator riding it.");
        return;
      }
    }
    setRunning(true);
    setError("");
    setEngineResult(null);
    try {
      const payload = {
        programId: engineProgramId,
        userIds: engineUserIds,
        strategy,
        onlyUnassigned,
        transportMode,
        ...(strategy === "DAILY_TARGET" && dailyTarget ? { dailyTarget: Number(dailyTarget) } : {}),
        ...(usesTransport && selectedVehicleIds.length > 0
          ? { vehicles: selectedVehicleIds.map((id) => ({ vehicleId: id, userIds: vehicleRiders[id] || [] })) }
          : {}),
      };
      const res = await beneficiaryAssignmentsApi.autoAssign(payload);
      setEngineResult(res);
      if (res.totalAssigned === 0) {
        toast.info(
          res.totalCandidates === 0
            ? "No eligible respondents — everyone enrolled in this program already has an active caseworker (or none are enrolled yet). Try unchecking \"only unassigned\", or add respondents to the program first."
            : "No respondents were assigned — check your daily target, or the vehicles' capacity if transport is selected.",
          7000
        );
      } else {
        toast.success(`Assigned ${res.totalAssigned} respondent(s) across ${engineUserIds.length} enumerator(s)`);
      }
      loadAll();
    } catch (err) {
      setError(err.message || "Couldn't run the assignment engine.");
    } finally {
      setRunning(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.userId || !form.beneficiaryId) return;
    setCreating(true);
    setError("");
    try {
      const created = await beneficiaryAssignmentsApi.create(form);
      setRows((r) => [created, ...r]);
      toast.success("Beneficiary assigned");
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
      toast.success("Assignment ended");
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

  const columns = [
    { key: "user", label: "User (caseworker)", render: (r) => r.user?.name || r.user?.email },
    { key: "beneficiary", label: "Beneficiary", render: (r) => `${r.beneficiary?.name} (${r.beneficiary?.code})` },
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

      {canCreate && (
        <form onSubmit={handleRunEngine} className="card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Wand2 size={16} color="var(--violet)" />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Smart assignment engine
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                No vehicle or driver required — just a program, your enumerators, and a strategy. Transport below is
                entirely optional. Respondents are clustered by geography (province → district → sector → cell →
                village) before being shuffled, so nearby respondents tend to land with the same enumerator.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Program" required>
              <SelectInput icon={ClipboardList} required value={engineProgramId} onChange={(e) => setEngineProgramId(e.target.value)}>
                <option value="">Select a program…</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Strategy">
              <div className="grid grid-cols-3 gap-2">
                {STRATEGIES.map((s) => {
                  const Icon = s.icon;
                  const active = strategy === s.value;
                  return (
                    <button
                      type="button"
                      key={s.value}
                      onClick={() => setStrategy(s.value)}
                      className="flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium"
                      style={{
                        border: `1px solid ${active ? "var(--violet)" : "var(--border)"}`,
                        backgroundColor: active ? "rgba(108,92,231,0.10)" : "var(--surface-2)",
                        color: active ? "var(--violet)" : "var(--muted)",
                      }}
                      title={s.hint}
                    >
                      <Icon size={14} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          {strategy === "DAILY_TARGET" && (
            <div className="max-w-xs">
              <Field label="Daily target per enumerator" hint="Leftover respondents are never dropped — run the engine again tomorrow to pick up the queue.">
                <TextInput icon={Target} type="number" min="1" value={dailyTarget} onChange={(e) => setDailyTarget(e.target.value)} placeholder="e.g. 15" />
              </Field>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer w-fit" style={{ color: "var(--text)" }}>
            <input type="checkbox" checked={onlyUnassigned} onChange={(e) => setOnlyUnassigned(e.target.checked)} style={{ width: "auto" }} />
            Only assign respondents who don't already have an active caseworker
          </label>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text)" }}>
              Transport
              <span className="font-normal ml-1" style={{ color: "var(--muted)" }}>
                (optional — the engine works fine with none selected)
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TRANSPORT_MODES.map((t) => {
                const Icon = t.icon;
                const active = transportMode === t.value;
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setTransportMode(t.value)}
                    className="flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium"
                    style={{
                      border: `1px solid ${active ? "var(--violet)" : "var(--border)"}`,
                      backgroundColor: active ? "rgba(108,92,231,0.10)" : "var(--surface-2)",
                      color: active ? "var(--violet)" : "var(--muted)",
                    }}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {usesTransport && (
              <div className="rounded-xl p-3 mt-1 flex flex-col gap-3" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{ color: "var(--text)" }}>
                    {transportMode === "MOTORCYCLE" ? "Motorcycles" : "Vehicles"} for this run
                  </p>
                  <Link to="/vehicles/new" className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--violet)" }}>
                    <ExternalLink size={12} />
                    Add one
                  </Link>
                </div>

                {vehiclesForMode.length === 0 && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    No {transportMode === "MOTORCYCLE" ? "motorcycles" : "vehicles"} set up yet — add one, or leave transport
                    on "None" and the engine will assign to enumerators directly.
                  </p>
                )}

                {vehiclesForMode.map((v) => {
                  const selected = selectedVehicleIds.includes(v.id);
                  return (
                    <div key={v.id} className="rounded-lg p-2.5" style={{ backgroundColor: "var(--surface)", border: `1px solid ${selected ? "var(--violet)" : "var(--border)"}` }}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={selected} onChange={() => toggleVehicle(v.id)} style={{ width: "auto" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                            {v.name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>
                            {v.driverName ? `Driver: ${v.driverName}` : "No driver set"} ·{" "}
                            {v.capacityPerDay ? `${v.capacityPerDay}/day` : "No capacity cap"}
                          </p>
                        </div>
                      </label>

                      {selected && (
                        <div className="mt-2 pl-7 flex flex-wrap gap-2">
                          {engineUserIds.length === 0 && (
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              Select enumerators below first, then pick who rides this one.
                            </span>
                          )}
                          {engineUserIds.map((uid) => {
                            const u = users.find((x) => x.id === uid);
                            const riding = (vehicleRiders[v.id] || []).includes(uid);
                            return (
                              <button
                                type="button"
                                key={uid}
                                onClick={() => toggleRider(v.id, uid)}
                                className="badge"
                                style={{
                                  cursor: "pointer",
                                  border: `1px solid ${riding ? "var(--violet)" : "var(--border)"}`,
                                  backgroundColor: riding ? "rgba(108,92,231,0.12)" : "var(--surface-2)",
                                  color: riding ? "var(--violet)" : "var(--muted)",
                                }}
                              >
                                {u?.name || u?.email || "Unknown"}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--text)" }}>
              Enumerators ({engineUserIds.length} selected)
            </label>
            <Field>
              <TextInput icon={Search} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Filter by name or email…" />
            </Field>
            <div
              className="rounded-xl p-2 flex flex-col gap-1 max-h-56 overflow-y-auto"
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {filteredUsers.map((u) => {
                const checked = engineUserIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                    style={{ backgroundColor: checked ? "rgba(108,92,231,0.10)" : "transparent" }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleEngineUser(u.id)} style={{ width: "auto" }} />
                    <span className="text-sm flex-1" style={{ color: "var(--text)" }}>
                      {u.name || u.email}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={running || !engineProgramId || engineUserIds.length === 0}>
              <Wand2 size={16} />
              {running ? "Running…" : "Run assignment"}
            </button>
          </div>

          {engineResult && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--status-active-bg)" }}>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--status-active-fg)" }}>
                Assigned {engineResult.totalAssigned} of {engineResult.totalCandidates} eligible respondent(s)
                {engineResult.leftover > 0 ? ` — ${engineResult.leftover} left over for next time` : ""}.
              </p>
              {engineResult.perVehicle?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {engineResult.perVehicle.map((v) => (
                    <span key={v.vehicleId} className="badge flex items-center gap-1" style={{ backgroundColor: "var(--surface)", color: "var(--violet)" }}>
                      <Truck size={11} />
                      {v.name}: {v.count}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {engineResult.perUser?.map((u) => (
                  <span key={u.userId} className="badge" style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                    {u.name}: {u.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {canCreate && (
        <form onSubmit={handleCreate} className="card p-5 flex flex-col sm:flex-row gap-4 sm:items-end">
          <p className="text-xs font-medium uppercase tracking-widest hidden sm:block" style={{ color: "var(--muted)", writingMode: "vertical-rl" }} />
          <div className="flex-1">
            <Field label="Manual assignment — User">
              <SelectInput value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
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
              <SelectInput value={form.beneficiaryId} onChange={(e) => setForm((f) => ({ ...f, beneficiaryId: e.target.value }))}>
                <option value="">Select a beneficiary…</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <button type="submit" className="btn-secondary" disabled={creating} style={{ height: 44 }}>
            <Plus size={16} />
            Assign one
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
