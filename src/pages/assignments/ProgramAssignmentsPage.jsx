import React, { useEffect, useState } from "react";
import { ClipboardList, Wand2, Crown, X, UserPlus, Square, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import { programsApi } from "../../api/programs.api.js";
import { programTeamsApi } from "../../api/programTeams.api.js";
import { programAssignmentsApi } from "../../api/programAssignments.api.js";
import { rolesApi } from "../../api/roles.api.js";
import { usersApi } from "../../api/users.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function ProgramAssignmentsPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canConfigure = can(ACTIONS.TEAMS_CREATE);
  const canEditTeams = can(ACTIONS.TEAMS_EDIT);
  const canDeleteTeams = can(ACTIONS.TEAMS_DELETE);
  const canViewAssignments = can(ACTIONS.ASSIGNMENTS_VIEW);
  const canEditAssignments = can(ACTIONS.ASSIGNMENTS_EDIT);
  const canDeleteAssignments = can(ACTIONS.ASSIGNMENTS_DELETE);

  const [programs, setPrograms] = useState([]);
  const [roles, setRoles] = useState([]);
  const [programId, setProgramId] = useState("");
  const [program, setProgram] = useState(null);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [programLoading, setProgramLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const [config, setConfig] = useState({ teamLeaderRoleId: "", teamMemberRoleId: "", membersPerTeam: "" });
  const [editingConfig, setEditingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const [leaderPicks, setLeaderPicks] = useState({});
  const [memberPicks, setMemberPicks] = useState({});
  const [eligibleLeaders, setEligibleLeaders] = useState([]);
  const [eligibleMembers, setEligibleMembers] = useState([]);

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
    const [teamData, assignmentList] = await Promise.all([
      programTeamsApi.get(id),
      programAssignmentsApi.list({ programId: id }),
    ]);
    setProgram(teamData.program);
    setTeams(teamData.teams);
    setAssignments(assignmentList);
    setConfig({
      teamLeaderRoleId: teamData.program.teamLeaderRoleId ?? "",
      teamMemberRoleId: teamData.program.teamMemberRoleId ?? "",
      membersPerTeam: teamData.program.membersPerTeam ?? "",
    });
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

  useEffect(() => {
    if (!config.teamLeaderRoleId) {
      setEligibleLeaders([]);
      return;
    }
    usersApi
      .list({ roleId: config.teamLeaderRoleId })
      .then(setEligibleLeaders)
      .catch(() => setEligibleLeaders([]));
  }, [config.teamLeaderRoleId]);

  useEffect(() => {
    if (!config.teamMemberRoleId) {
      setEligibleMembers([]);
      return;
    }
    usersApi
      .list({ roleId: config.teamMemberRoleId })
      .then(setEligibleMembers)
      .catch(() => setEligibleMembers([]));
  }, [config.teamMemberRoleId]);

  function updateConfig(field, value) {
    setConfig((c) => ({ ...c, [field]: value }));
  }

  async function handleSaveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    setError("");
    try {
      await programTeamsApi.updateConfig({
        programId,
        teamLeaderRoleId: config.teamLeaderRoleId,
        teamMemberRoleId: config.teamMemberRoleId,
        membersPerTeam: Number(config.membersPerTeam),
      });
      await loadProgramData(programId);
      setEditingConfig(false);
      toast.success("Team configuration saved");
    } catch (err) {
      setError(err.message || "Couldn't save this configuration.");
    } finally {
      setSavingConfig(false);
    }
  }

  function handleCancelEditConfig() {
    setConfig({
      teamLeaderRoleId: program?.teamLeaderRoleId ?? "",
      teamMemberRoleId: program?.teamMemberRoleId ?? "",
      membersPerTeam: program?.membersPerTeam ?? "",
    });
    setEditingConfig(false);
  }

  async function handleRun() {
    setRunning(true);
    setError("");
    try {
      const res = await programTeamsApi.runAssignment(programId);
      setResult(res);
      await loadProgramData(programId);
      toast.success(
        `Assigned ${res.respondentsAssigned} respondent(s), placed ${res.membersPlaced} enumerator(s) into groups, and matched ${res.supervisorsAssigned} supervisor(s)`
      );
    } catch (err) {
      setError(err.message || "Couldn't run the assignment engine.");
    } finally {
      setRunning(false);
    }
  }

  async function handleSetLeader(teamId) {
    const userId = leaderPicks[teamId];
    if (!userId) return;
    setError("");
    try {
      await programTeamsApi.setLeader(teamId, userId);
      setLeaderPicks((p) => ({ ...p, [teamId]: "" }));
      await loadProgramData(programId);
      toast.success("Supervisor assigned");
    } catch (err) {
      toast.error(err.message || "Couldn't assign this supervisor.");
    }
  }

  async function handleClearLeader(teamId) {
    setError("");
    try {
      await programTeamsApi.clearLeader(teamId);
      await loadProgramData(programId);
    } catch (err) {
      toast.error(err.message || "Couldn't clear this supervisor.");
    }
  }

  async function handleAddMember(teamId) {
    const userId = memberPicks[teamId];
    if (!userId) return;
    setError("");
    try {
      await programTeamsApi.addMember(teamId, userId);
      setMemberPicks((p) => ({ ...p, [teamId]: "" }));
      await loadProgramData(programId);
      toast.success("Enumerator added to group");
    } catch (err) {
      toast.error(err.message || "Couldn't add this enumerator.");
    }
  }

  async function handleRemoveMember(teamId, userId) {
    setError("");
    try {
      await programTeamsApi.removeMember(teamId, userId);
      await loadProgramData(programId);
    } catch (err) {
      toast.error(err.message || "Couldn't remove this enumerator.");
    }
  }

  async function handleEndAssignment(row) {
    try {
      const updated = await programAssignmentsApi.end(row.id);
      setAssignments((r) => r.map((a) => (a.id === row.id ? updated : a)));
      toast.success("Assignment ended");
    } catch (err) {
      setError(err.message || "Couldn't end assignment.");
    }
  }

  async function handleDeleteAssignment() {
    if (!pendingDelete) return;
    try {
      await programAssignmentsApi.remove(pendingDelete.id);
      setAssignments((r) => r.filter((a) => a.id !== pendingDelete.id));
      toast.success("Assignment deleted");
    } catch (err) {
      setError(err.message || "Couldn't delete assignment.");
    } finally {
      setPendingDelete(null);
    }
  }

  const hasConfig = !!(program?.teamLeaderRoleId && program?.teamMemberRoleId && program?.membersPerTeam);
  const isConfigured = teams.length > 0;
  const placedElsewhere = new Set([...teams.map((t) => t.leader?.id).filter(Boolean), ...teams.flatMap((t) => t.members.map((m) => m.user.id))]);

  const assignmentColumns = [
    { key: "user", label: "User", render: (r) => r.user?.name || r.user?.email },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "assignedAt", label: "Assigned", render: (r) => new Date(r.assignedAt).toLocaleDateString() },
    ...(canEditAssignments || canDeleteAssignments
      ? [
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex items-center gap-2 justify-end">
                {r.status === "ACTIVE" && canEditAssignments && (
                  <button className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => handleEndAssignment(r)} title="End assignment">
                    <Square size={14} />
                  </button>
                )}
                {canDeleteAssignments && (
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
          Pick a program, configure group size, and let the engine automatically staff and geo-match enumerators, supervisors, and respondents.
        </p>
      </div>

      <div className="max-w-sm">
        <Field label="Program">
          <SelectInput icon={ClipboardList} value={programId} onChange={(e) => setProgramId(e.target.value)} disabled={loading}>
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
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {programId && programLoading && <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}

      {programId && !programLoading && (
        <>
          {canConfigure && hasConfig && !editingConfig && (
            <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <ClipboardList size={16} color="var(--violet)" />
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  Supervisor role: <strong>{program.teamLeaderRole?.name}</strong> · Enumerator role: <strong>{program.teamMemberRole?.name}</strong> ·
                  Enumerators per group: <strong>{program.membersPerTeam}</strong>
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
                <ClipboardList size={16} color="var(--violet)" />
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                  {hasConfig ? "Edit team configuration" : "Team configuration"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Supervisor role" required>
                  <SelectInput required value={config.teamLeaderRoleId} onChange={(e) => updateConfig("teamLeaderRoleId", e.target.value)}>
                    <option value="" className="text-black">Select a role…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} className="text-black">
                        {r.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Enumerator role" required>
                  <SelectInput required value={config.teamMemberRoleId} onChange={(e) => updateConfig("teamMemberRoleId", e.target.value)}>
                    <option value="" className="text-black">Select a role…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} className="text-black">
                        {r.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
              <div className="max-w-xs">
                <Field label="Enumerators per group" required hint="Group count is derived automatically from how many active enumerators exist.">
                  <TextInput
                    type="number"
                    min="1"
                    required
                    value={config.membersPerTeam}
                    onChange={(e) => updateConfig("membersPerTeam", e.target.value)}
                  />
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

          {canConfigure && hasConfig && !editingConfig && (
            <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Automatically staff and geo-match enumerators, supervisors, and respondents for this program.
              </p>
              <button type="button" className="btn-primary" onClick={handleRun} disabled={running}>
                <Wand2 size={16} />
                {running ? "Running…" : "Run assignment"}
              </button>
            </div>
          )}

          {result && (
            <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}>
              {result.activeEnumerators} active enumerator(s), {result.activeSupervisors} active supervisor(s) on this program.
              {result.respondentsEnrolled > 0 && ` Enrolled ${result.respondentsEnrolled} new respondent(s) into the program.`} Assigned{" "}
              {result.respondentsAssigned} of {result.respondentsEligible} respondent(s), placed {result.membersPlaced} enumerator(s) into{" "}
              {result.teamsCreated ? `${result.teamsCreated} new ` : ""}group(s), matched {result.supervisorsAssigned} supervisor(s).
              {result.teamsMissingSupervisor > 0 && ` ${result.teamsMissingSupervisor} group(s) still need a supervisor.`}
            </div>
          )}

          {isConfigured && (
            <div className="flex flex-col gap-4">
              {teams.map((team) => {
                const target = Number(config.membersPerTeam) || 0;
                const availableLeaders = eligibleLeaders.filter((u) => !placedElsewhere.has(u.id) || team.leader?.id === u.id);
                const availableMembers = eligibleMembers.filter((u) => !placedElsewhere.has(u.id));
                return (
                  <div key={team.id} className="card p-5 flex flex-col gap-4">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {team.name}
                    </p>

                    <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ backgroundColor: "var(--surface-2)" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Crown size={15} color="var(--amber)" />
                        {team.leader ? (
                          <span className="text-sm truncate" style={{ color: "var(--text)" }}>
                            {team.leader.name || team.leader.email}
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--amber)" }}>
                            No supervisor assigned
                          </span>
                        )}
                      </div>
                      {canEditTeams && (
                        <div className="flex items-center gap-2">
                          <SelectInput
                            value={leaderPicks[team.id] || ""}
                            onChange={(e) => setLeaderPicks((p) => ({ ...p, [team.id]: e.target.value }))}
                            style={{ height: 32 }}
                          >
                            <option value="" className="text-black">Pick a supervisor…</option>
                            {availableLeaders.map((u) => (
                              <option key={u.id} value={u.id} className="text-black">
                                {u.name || u.email}
                              </option>
                            ))}
                          </SelectInput>
                          <button type="button" className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => handleSetLeader(team.id)}>
                            Assign
                          </button>
                          {team.leader && (
                            <button type="button" className="btn-secondary btn-danger" style={{ height: 32, padding: "0 10px" }} onClick={() => handleClearLeader(team.id)}>
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                          Enumerators
                        </p>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          {team.members.length}/{target || "—"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {team.members.length === 0 && (
                          <span className="text-xs" style={{ color: "var(--muted)" }}>
                            No enumerators yet.
                          </span>
                        )}
                        {team.members.map((m) => (
                          <span
                            key={m.id}
                            className="badge flex items-center gap-1"
                            style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                          >
                            {m.user.name || m.user.email}
                            {canDeleteTeams && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(team.id, m.user.id)}
                                aria-label={`Remove ${m.user.name || m.user.email}`}
                                style={{ display: "inline-flex" }}
                              >
                                <X size={12} color="var(--muted)" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      {canEditTeams && (
                        <div className="flex items-center gap-2">
                          <SelectInput
                            value={memberPicks[team.id] || ""}
                            onChange={(e) => setMemberPicks((p) => ({ ...p, [team.id]: e.target.value }))}
                            style={{ height: 32 }}
                          >
                            <option value="" className="text-black">Add a specific person…</option>
                            {availableMembers.map((u) => (
                              <option key={u.id} value={u.id} className="text-black">
                                {u.name || u.email}
                              </option>
                            ))}
                          </SelectInput>
                          <button type="button" className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => handleAddMember(team.id)}>
                            <UserPlus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canViewAssignments && (
            <div className="card">
              <DataTable columns={assignmentColumns} rows={assignments} emptyLabel="No one is assigned to this program yet." />
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete assignment?"
        message="This removes the assignment record entirely (use 'End' instead to keep history)."
        onConfirm={handleDeleteAssignment}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
