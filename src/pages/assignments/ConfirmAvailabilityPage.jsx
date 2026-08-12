import React, { useEffect, useState } from "react";
import { ClipboardList, ShieldCheck, Wand2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import { Field, SelectInput } from "../../components/FormField.jsx";
import AssignRespondentsCard from "../../components/AssignRespondentsCard.jsx";
import { programsApi } from "../../api/programs.api.js";
import { rolesApi } from "../../api/roles.api.js";
import { availabilityChecksApi } from "../../api/availabilityChecks.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

function ProgressBar({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: total > 0 && value >= total ? "var(--teal)" : "var(--violet)" }}
        />
      </div>
      <span className="mono text-xs shrink-0" style={{ color: "var(--muted)" }}>
        {value}/{total} checked
      </span>
    </div>
  );
}

export default function ConfirmAvailabilityPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canConfigure = can(ACTIONS.ASSIGNMENTS_CREATE);

  const [programs, setPrograms] = useState([]);
  const [roles, setRoles] = useState([]);
  const [programId, setProgramId] = useState("");
  const [program, setProgram] = useState(null);
  const [respondents, setRespondents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [programLoading, setProgramLoading] = useState(false);
  const [error, setError] = useState("");

  const [checkerRoleId, setCheckerRoleId] = useState("");
  const [editingConfig, setEditingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([programsApi.list(), rolesApi.list()])
      .then(([p, r]) => {
        setPrograms(p);
        setRoles(r);
      })
      .catch((err) => setError(err.message || "Couldn't load programs."))
      .finally(() => setLoading(false));
  }, []);

  async function loadProgramData(id) {
    const data = await availabilityChecksApi.get(id);
    setProgram(data.program);
    setRespondents(data.respondents);
    setCheckerRoleId(data.program.checkerRoleId ?? "");
  }

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    setProgramLoading(true);
    setError("");
    setResult(null);
    setEditingConfig(false);
    loadProgramData(programId)
      .catch((err) => !cancelled && setError(err.message || "Couldn't load this program."))
      .finally(() => !cancelled && setProgramLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  async function handleSaveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    setError("");
    try {
      await availabilityChecksApi.updateConfig({ programId, checkerRoleId });
      await loadProgramData(programId);
      setEditingConfig(false);
      toast.success("Tracing configuration saved");
    } catch (err) {
      setError(err.message || "Couldn't save this configuration.");
    } finally {
      setSavingConfig(false);
    }
  }

  function handleCancelEditConfig() {
    setCheckerRoleId(program?.checkerRoleId ?? "");
    setEditingConfig(false);
  }

  async function handleAssign() {
    setAssigning(true);
    setError("");
    try {
      const res = await availabilityChecksApi.assign(programId);
      setResult(res);
      await loadProgramData(programId);
      toast.success(`Assigned ${res.totalAssigned} of ${res.totalCandidates} respondent(s)`);
    } catch (err) {
      setError(err.message || "Couldn't assign respondents.");
    } finally {
      setAssigning(false);
    }
  }

  const hasConfig = !!program?.checkerRoleId;
  const checkedCount = respondents.filter((r) => r.availabilityChecks?.[0] && r.availabilityChecks[0].status !== "PENDING").length;

  const { filtered, query, setQuery } = useSearchedRows(respondents, ["code", "name", "telephone"]);
  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(filtered, 10);

  const columns = [
    { key: "code", label: "Code", render: (r) => <span className="mono">{r.code}</span> },
    { key: "name", label: "Name" },
    { key: "telephone", label: "Phone", render: (r) => r.telephone || "—" },
    {
      key: "location",
      label: "Location",
      render: (r) => [r.district?.name, r.sector?.name, r.cell?.name].filter(Boolean).join(" / ") || "—",
    },
    {
      key: "checker",
      label: "Assigned tracer",
      render: (r) => {
        const checker = r.availabilityChecks?.[0]?.user;
        return checker ? checker.name || checker.email : "—";
      },
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (r.availabilityChecks?.[0] ? <StatusBadge status={r.availabilityChecks[0].status} /> : <span style={{ color: "var(--muted)" }}>—</span>),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Tracing
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          An independent check assign a staff role to confirm whether each respondent is actually available, separate from program assignments.
        </p>
      </div>

      <div className="max-w-sm">
        <Field label="Program">
          <SelectInput icon={ClipboardList} value={programId} onChange={(e) => setProgramId(e.target.value)} disabled={loading}>
            <option value="" className="text-black">Select a program…</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id} className="text-black">
                {p.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {programId && programLoading && <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}

      {programId && !programLoading && (
        <>
          {canConfigure && program?.tracingRequired && (
            <AssignRespondentsCard programId={programId} canAssign={canConfigure} onAssigned={() => loadProgramData(programId)} />
          )}

          {canConfigure && hasConfig && !editingConfig && (
            <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldCheck size={16} color="var(--violet)" />
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  Tracer role: <strong>{program.checkerRole?.name}</strong>
                </span>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setEditingConfig(true)}>
                Edit configuration
              </button>
            </div>
          )}

          {canConfigure && (!hasConfig || editingConfig) && (
            <form onSubmit={handleSaveConfig} className="card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} color="var(--violet)" />
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                  {hasConfig ? "Edit tracing configuration" : "Tracing configuration"}
                </p>
              </div>
              <div className="max-w-sm">
                <Field label="Role responsible for tracing" required>
                  <SelectInput required value={checkerRoleId} onChange={(e) => setCheckerRoleId(e.target.value)}>
                    <option value="" className="text-black">Select a role…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} className="text-black">
                        {r.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
              <div className="flex justify-end gap-3">
                {hasConfig && (
                  <button type="button" className="btn-secondary" onClick={handleCancelEditConfig} disabled={savingConfig}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={savingConfig}>
                  {savingConfig ? "Saving…" : hasConfig ? "Save changes" : "Save configuration"}
                </button>
              </div>
            </form>
          )}

          {hasConfig && !editingConfig && (
            <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Splits every respondent in this program with no tracer yet evenly across active users holding the tracer role.
              </p>
              {canConfigure && (
                <button type="button" className="btn-primary" onClick={handleAssign} disabled={assigning}>
                  <Wand2 size={16} />
                  {assigning ? "Assigning…" : "Assign"}
                </button>
              )}
            </div>
          )}

          {result && (
            <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}>
              Assigned {result.totalAssigned} of {result.totalCandidates} respondent(s) across {result.checkers?.length ?? 0} tracer(s).
            </div>
          )}

          {respondents.length > 0 && (
            <div className="card p-4">
              <ProgressBar value={checkedCount} total={respondents.length} />
            </div>
          )}

          <SearchInput value={query} onChange={setQuery} placeholder="Search by code, name, or phone…" />

          <div className="card">
            <DataTable columns={columns} rows={pageRows} emptyLabel="No respondents in this program yet." />
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </>
      )}
    </div>
  );
}
