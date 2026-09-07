import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Utensils, Settings, Plus, FileSpreadsheet, ChevronRight, Users2, Calendar, ShieldCheck, CalendarDays, Power } from "lucide-react";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { mealTransportReportsApi } from "../../api/mealTransportReports.api.js";
import { rolesApi } from "../../api/roles.api.js";
import { usersApi } from "../../api/users.api.js";
import { programsApi } from "../../api/programs.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const EMPTY_CONFIG_FORM = { submitterRoleId: "", approverUserId: "", programId: "", title: "", subtitle: "" };
const EMPTY_WEEK_FORM = { label: "", weekStart: "", weekEnd: "" };

export default function MealTransportReportsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(ACTIONS.MEAL_TRANSPORT_REPORTS_MANAGE);
  const canCreate = canManage || can(ACTIONS.MEAL_TRANSPORT_REPORTS_CREATE);

  const [myConfig, setMyConfig] = useState(null);
  const [myEligibleWeeks, setMyEligibleWeeks] = useState([]);
  const [makingReportFor, setMakingReportFor] = useState(null);
  const [toApprove, setToApprove] = useState([]);

  const [configs, setConfigs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [configForm, setConfigForm] = useState(EMPTY_CONFIG_FORM);
  const [savingConfig, setSavingConfig] = useState(false);

  // Week scheduling (report management)
  const [scheduleProgramId, setScheduleProgramId] = useState("");
  const [weeks, setWeeks] = useState([]);
  const [weekForm, setWeekForm] = useState(EMPTY_WEEK_FORM);
  const [savingWeek, setSavingWeek] = useState(false);

  // Reports by role/week (report management)
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [roleReports, setRoleReports] = useState([]);
  const [roleReportsLoading, setRoleReportsLoading] = useState(false);

  useEffect(() => {
    mealTransportReportsApi.myConfig().then(setMyConfig).catch(() => {});
    mealTransportReportsApi.myEligibleWeeks().then(setMyEligibleWeeks).catch(() => {});
    // Non-managers get back only reports where they're the assigned
    // approver, the backend scopes this automatically, so this is safe to
    // call regardless of permission level.
    mealTransportReportsApi
      .listAll()
      .then((list) => setToApprove(list.filter((r) => r.status === "PENDING_APPROVAL")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!canCreate) return;
    mealTransportReportsApi.listConfigs().then(setConfigs).catch(() => {});
  }, [canCreate]);

  useEffect(() => {
    if (!canManage) return;
    rolesApi.list().then(setRoles).catch(() => {});
    usersApi.list().then(setUsers).catch(() => {});
    programsApi.list().then(setPrograms).catch(() => {});
  }, [canManage]);

  useEffect(() => {
    if (!scheduleProgramId) {
      setWeeks([]);
      return;
    }
    mealTransportReportsApi.listWeeks(scheduleProgramId).then(setWeeks).catch(() => setWeeks([]));
  }, [scheduleProgramId]);

  useEffect(() => {
    if (!selectedRoleId) {
      setRoleReports([]);
      return;
    }
    setRoleReportsLoading(true);
    mealTransportReportsApi
      .listAll({ roleId: selectedRoleId, weekId: selectedWeekId || undefined })
      .then(setRoleReports)
      .catch(() => setRoleReports([]))
      .finally(() => setRoleReportsLoading(false));
  }, [selectedRoleId, selectedWeekId]);

  async function handleMakeReport(weekId, configId) {
    setMakingReportFor(weekId);
    try {
      const report = await mealTransportReportsApi.makeReportForWeek(weekId, configId);
      navigate(`/meal-transport-reports/${report.id}`);
    } catch (err) {
      toast.error(err.message || "Couldn't open this week's report.");
    } finally {
      setMakingReportFor(null);
    }
  }

  async function handleSaveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await mealTransportReportsApi.upsertConfig(configForm);
      toast.success("Configuration saved");
      setConfigForm(EMPTY_CONFIG_FORM);
      const fresh = await mealTransportReportsApi.listConfigs();
      setConfigs(fresh);
    } catch (err) {
      toast.error(err.message || "Couldn't save this configuration.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleCreateWeek(e) {
    e.preventDefault();
    setSavingWeek(true);
    try {
      await mealTransportReportsApi.createWeek({ programId: scheduleProgramId, ...weekForm });
      toast.success("Week scheduled");
      setWeekForm(EMPTY_WEEK_FORM);
      const fresh = await mealTransportReportsApi.listWeeks(scheduleProgramId);
      setWeeks(fresh);
    } catch (err) {
      toast.error(err.message || "Couldn't schedule this week.");
    } finally {
      setSavingWeek(false);
    }
  }

  async function handleToggleWeek(week) {
    try {
      const updated = await mealTransportReportsApi.updateWeek(week.id, { enabled: !week.enabled });
      setWeeks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      toast.success(updated.enabled ? `${updated.label} is now visible to eligible users` : `${updated.label} is now hidden`);
    } catch (err) {
      toast.error(err.message || "Couldn't update this week.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Utensils size={20} style={{ color: "var(--violet)" }} />
          Meal &amp; Transport Reports
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Weekly expense reports, digitally signed by the person who made it and the supervisor who approves it.
        </p>
      </div>

      {/* ============================================================
          PERSONAL, reports you're making or approving yourself
      ============================================================ */}

      {toApprove.length > 0 && (
        <div className="card p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Awaiting your approval
          </p>
          {toApprove.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/meal-transport-reports/${r.id}`)}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-left table-row"
              style={{ border: "1px solid var(--border)" }}
            >
              <span className="text-sm" style={{ color: "var(--text)" }}>
                <strong>{r.user.name}</strong>, {r.week.label}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                <ChevronRight size={15} style={{ color: "var(--muted)" }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {(myConfig || myEligibleWeeks.length > 0) && (
        <div className="card p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            My reports
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Only weeks your program manager has made visible show up here.
          </p>

          <div className="flex flex-col gap-2">
            {myEligibleWeeks.length === 0 && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No weeks are open for reports yet.
              </p>
            )}
            {myEligibleWeeks.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {w.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(w.weekStart).toLocaleDateString()} to {new Date(w.weekEnd).toLocaleDateString()}
                  </p>
                </div>
                {w.myReport ? (
                  <button
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "var(--violet)" }}
                    onClick={() => navigate(`/meal-transport-reports/${w.myReport.id}`)}
                  >
                    <StatusBadge status={w.myReport.status} />
                    <ChevronRight size={15} />
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => handleMakeReport(w.id)} disabled={makingReportFor === w.id}>
                    <Plus size={16} />
                    {makingReportFor === w.id ? "Opening…" : "Make report"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          MANAGEMENT, separate from the personal section above, only
          visible to whoever holds the manage permission.
      ============================================================ */}

      {canManage && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <ShieldCheck size={15} style={{ color: "var(--muted)" }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Report management
            </p>
            <div className="flex-1" style={{ borderTop: "1px solid var(--border)" }} />
          </div>

          <div className="card p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Settings size={15} />
              Configure roles
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Any role can be set up to submit these reports, Facilitator, Data Collector, or any other role. The program must be a
              real, existing one you confirm here, the person filling in the report never types it themselves.
            </p>

            <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Submitter role" required>
                <SelectInput
                  required
                  value={configForm.submitterRoleId}
                  onChange={(e) => setConfigForm((f) => ({ ...f, submitterRoleId: e.target.value }))}
                >
                  <option value="">Select a role…</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Approver (Supervisor)" required>
                <SelectInput
                  required
                  value={configForm.approverUserId}
                  onChange={(e) => setConfigForm((f) => ({ ...f, approverUserId: e.target.value }))}
                >
                  <option value="">Select a person…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.role?.name ? `(${u.role.name})` : ""}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Program" required hint="Must be a real, existing program, confirmed by you, not typed by the report-filler">
                <SelectInput
                  required
                  value={configForm.programId}
                  onChange={(e) => setConfigForm((f) => ({ ...f, programId: e.target.value }))}
                >
                  <option value="">Select a program…</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Form title" hint="Optional, shown above the subtitle">
                <TextInput
                  value={configForm.title}
                  onChange={(e) => setConfigForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. MASTERCARD FOUNDATION"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Form subtitle">
                  <TextInput
                    value={configForm.subtitle}
                    onChange={(e) => setConfigForm((f) => ({ ...f, subtitle: e.target.value }))}
                    placeholder="Weekly Meal & Transport Expense Report Form"
                  />
                </Field>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="btn-primary" disabled={savingConfig}>
                  {savingConfig ? "Saving…" : "Save configuration"}
                </button>
              </div>
            </form>

            {configs.length > 0 && (
              <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                {configs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--surface-2)" }}>
                    <span style={{ color: "var(--text)" }}>
                      <strong>{c.submitterRole.name}</strong>, approved by {c.approver.name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {c.program.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <CalendarDays size={15} />
              Schedule weeks
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Pick a program, then schedule its reporting weeks, each with its own From and To dates. Only enabled weeks are visible
              to eligible users.
            </p>

            <Field label="Program">
              <SelectInput value={scheduleProgramId} onChange={(e) => setScheduleProgramId(e.target.value)} style={{ maxWidth: 260 }}>
                <option value="">Select a program…</option>
                {[...new Map(configs.map((c) => [c.program.id, c.program])).values()].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            {scheduleProgramId && (
              <>
                <form onSubmit={handleCreateWeek} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <Field label="Label" required>
                    <TextInput
                      required
                      value={weekForm.label}
                      onChange={(e) => setWeekForm((f) => ({ ...f, label: e.target.value }))}
                      placeholder="Week 1"
                    />
                  </Field>
                  <Field label="From" required>
                    <TextInput
                      icon={Calendar}
                      type="date"
                      required
                      value={weekForm.weekStart}
                      onChange={(e) => setWeekForm((f) => ({ ...f, weekStart: e.target.value }))}
                    />
                  </Field>
                  <Field label="To" required>
                    <TextInput
                      icon={Calendar}
                      type="date"
                      required
                      value={weekForm.weekEnd}
                      onChange={(e) => setWeekForm((f) => ({ ...f, weekEnd: e.target.value }))}
                    />
                  </Field>
                  <button type="submit" className="btn-primary" disabled={savingWeek}>
                    {savingWeek ? "Saving…" : "Add week"}
                  </button>
                </form>

                <div className="flex flex-col gap-2">
                  {weeks.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No weeks scheduled yet.</p>}
                  {weeks.map((w) => (
                    <div key={w.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ border: "1px solid var(--border)" }}>
                      <button
                        className="text-left flex-1"
                        onClick={() => navigate(`/meal-transport-reports/weeks/${w.id}`)}
                      >
                        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                          {w.label}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {new Date(w.weekStart).toLocaleDateString()} to {new Date(w.weekEnd).toLocaleDateString()}
                        </p>
                      </button>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: w.enabled ? "var(--status-active-fg)" : "var(--muted)" }}>
                          {w.enabled ? "Visible" : "Hidden"}
                        </span>
                        <button
                          className="btn-secondary"
                          style={{ height: 30, padding: "0 10px" }}
                          onClick={() => handleToggleWeek(w)}
                        >
                          <Power size={13} />
                          {w.enabled ? "Disable" : "Enable"}
                        </button>
                        <ChevronRight size={15} style={{ color: "var(--muted)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Users2 size={15} />
              Reports by role
            </p>
            <div className="flex items-end gap-3 flex-wrap">
              <Field label="Role">
                <SelectInput value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} style={{ maxWidth: 220 }}>
                  <option value="">Select a role…</option>
                  {configs.map((c) => (
                    <option key={c.submitterRole.id} value={c.submitterRole.id}>
                      {c.submitterRole.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Week (optional)">
                <SelectInput value={selectedWeekId} onChange={(e) => setSelectedWeekId(e.target.value)} style={{ maxWidth: 220 }}>
                  <option value="">All weeks</option>
                  {weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            {roleReportsLoading && <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}
            {!roleReportsLoading && selectedRoleId && roleReports.length === 0 && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>No reports from this role yet.</p>
            )}
            {roleReports.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/meal-transport-reports/${r.id}`)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-left table-row"
                style={{ border: "1px solid var(--border)" }}
              >
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  <strong>{r.user.name}</strong>, {r.week.label}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <ChevronRight size={15} style={{ color: "var(--muted)" }} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {!myConfig && myEligibleWeeks.length === 0 && !canCreate && !canManage && toApprove.length === 0 && (
        <div className="card flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>
          <FileSpreadsheet size={18} className="mr-2" />
          Your role isn't configured for meal &amp; transport reports yet.
        </div>
      )}
    </div>
  );
}
