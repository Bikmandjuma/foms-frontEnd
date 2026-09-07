import React, { useEffect, useState } from "react";
import { Users2, MapPin, Phone, CheckCircle2, Shuffle, ChevronLeft, ClipboardList } from "lucide-react";
import { Field, SelectInput } from "../../components/FormField.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { programTeamsApi } from "../../api/programTeams.api.js";
import { programsApi } from "../../api/programs.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function AssignGroupsPage() {
  const toast = useToast();
  const { can } = usePermissions();
  const canEdit = can(ACTIONS.TEAMS_EDIT);

  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedGroup, setSelectedGroup] = useState(null); // groupCode selected for drill-in
  const [teamDetail, setTeamDetail] = useState(null); // full ProgramTeam once adopted
  const [adopting, setAdopting] = useState(false);
  const [confirmAssignFor, setConfirmAssignFor] = useState(null); // { userId, name }
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    programsApi.list().then((list) => {
      setPrograms(list);
      if (list.length > 0) setProgramId((p) => p || list[0].id);
    });
  }, []);

  async function loadGroups() {
    if (!programId) return;
    setLoading(true);
    setError("");
    try {
      const data = await programTeamsApi.listGroups(programId);
      setGroups(data);
    } catch (err) {
      setError(err.message || "Couldn't load groups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
    setSelectedGroup(null);
    setTeamDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  async function openGroup(group) {
    setSelectedGroup(group);
    if (!group.adopted) {
      setTeamDetail(null);
      return;
    }
    // Already adopted — pull the full team (with members) from the standard endpoint.
    setLoading(true);
    try {
      const res = await programTeamsApi.get(programId);
      const team = res.teams.find((t) => t.id === group.teamId);
      setTeamDetail(team);
    } catch (err) {
      toast.error(err.message || "Couldn't load this group's detail.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdopt(group) {
    setAdopting(true);
    try {
      const team = await programTeamsApi.adoptGroup(programId, group.groupCode);
      toast.success(`${group.groupName || group.groupCode} linked to this program`);
      await loadGroups();
      setTeamDetail(team);
      setSelectedGroup((g) => ({ ...g, adopted: true, teamId: team.id }));
    } catch (err) {
      toast.error(err.message || "Couldn't link this group.");
    } finally {
      setAdopting(false);
    }
  }

  async function handleConfirmAssign() {
    if (!confirmAssignFor || !teamDetail) return;
    setAssigning(true);
    try {
      const res = await programTeamsApi.assignRandom(teamDetail.id, confirmAssignFor.userId);
      toast.success(res.message || `${res.beneficiaryName} assigned`);
      setConfirmAssignFor(null);
      const freshGroups = await programTeamsApi.listGroups(programId);
      setGroups(freshGroups);
      setSelectedGroup((g) => freshGroups.find((fg) => fg.groupCode === g.groupCode) || g);
      const refreshed = await programTeamsApi.get(programId);
      setTeamDetail(refreshed.teams.find((t) => t.id === teamDetail.id));
    } catch (err) {
      toast.error(err.message || "Couldn't assign a respondent.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Users2 size={20} style={{ color: "var(--violet)" }} />
          Assign Groups
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Pick a program, pick a group, then assign respondents to its enumerators one click at a time.
        </p>
      </div>

      <Field label="Program">
        <SelectInput icon={ClipboardList} value={programId} onChange={(e) => setProgramId(e.target.value)} style={{ minWidth: 260 }}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectInput>
      </Field>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {!selectedGroup && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <p style={{ color: "var(--muted)" }}>Loading groups…</p>}
          {!loading && groups.length === 0 && (
            <p style={{ color: "var(--muted)" }}>No imported groups yet — add Supervisors & Enumerators via a group import first.</p>
          )}
          {groups.map((g) => (
            <button
              key={g.groupCode}
              onClick={() => openGroup(g)}
              className="card p-4 text-left flex flex-col gap-2 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold" style={{ color: "var(--text)" }}>
                    {g.groupName || g.groupCode}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {g.groupCode}
                  </p>
                </div>
                {g.hasAssignments && <CheckCircle2 size={20} style={{ color: "var(--status-active-fg)" }} />}
              </div>
              <p className="text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}>
                <MapPin size={12} /> {[g.district, g.province].filter(Boolean).join(", ") || "No region set"}
              </p>
              <div className="flex items-center justify-between text-xs mt-1">
                <span style={{ color: "var(--muted)" }}>{g.supervisor?.name || "No supervisor"}</span>
                <span
                  className="mono px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}
                >
                  {g.enumeratorCount} enumerators
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--muted)" }}>Eligible respondents nearby</span>
                <span
                  className="mono px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: g.eligibleRespondentCount > 0 ? "var(--status-active-bg)" : "var(--surface-2)",
                    color: g.eligibleRespondentCount > 0 ? "var(--status-active-fg)" : "var(--muted)",
                  }}
                >
                  {g.eligibleRespondentCount}
                </span>
              </div>
              {!g.adopted && (
                <span className="text-xs font-medium mt-1" style={{ color: "var(--violet)" }}>
                  Not yet linked to this program
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {selectedGroup && (
        <div className="flex flex-col gap-4">
          <button className="btn-secondary self-start" onClick={() => setSelectedGroup(null)}>
            <ChevronLeft size={15} />
            Back to groups
          </button>

          <div className="card p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-lg" style={{ color: "var(--text)" }}>
                {selectedGroup.groupName || selectedGroup.groupCode}
              </p>
              <p className="text-sm flex items-center gap-1 mt-1" style={{ color: "var(--muted)" }}>
                <MapPin size={13} /> {[selectedGroup.district, selectedGroup.province].filter(Boolean).join(", ") || "No region set"}
              </p>
              {selectedGroup.supervisor && (
                <p className="text-sm flex items-center gap-1 mt-1" style={{ color: "var(--muted)" }}>
                  <Phone size={13} /> {selectedGroup.supervisor.name} (supervisor) — {selectedGroup.supervisor.telephone || "—"}
                </p>
              )}
              <p className="text-sm flex items-center gap-2 mt-2">
                <span
                  className="mono px-2 py-0.5 rounded-full font-semibold text-xs"
                  style={{
                    backgroundColor: selectedGroup.eligibleRespondentCount > 0 ? "var(--status-active-bg)" : "var(--surface-2)",
                    color: selectedGroup.eligibleRespondentCount > 0 ? "var(--status-active-fg)" : "var(--muted)",
                  }}
                >
                  {selectedGroup.eligibleRespondentCount} eligible respondents in this region
                </span>
              </p>
            </div>
            {!selectedGroup.adopted && canEdit && (
              <button className="btn-primary" onClick={() => handleAdopt(selectedGroup)} disabled={adopting}>
                {adopting ? "Linking…" : "Link group to this program"}
              </button>
            )}
          </div>

          {selectedGroup.adopted && teamDetail && (
            <div className="flex flex-col gap-3">
              {teamDetail.members.map((m) => (
                <div key={m.id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-medium" style={{ color: "var(--text)" }}>
                      {m.user.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Enumerator
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => setConfirmAssignFor({ userId: m.user.id, name: m.user.name })}
                    disabled={!canEdit || selectedGroup.eligibleRespondentCount === 0}
                    title={
                      !canEdit
                        ? "You don't have permission to assign respondents"
                        : selectedGroup.eligibleRespondentCount === 0
                          ? "No unassigned respondents left in this region"
                          : undefined
                    }
                  >
                    <Shuffle size={14} />
                    Assign respondent
                  </button>
                </div>
              ))}
              {teamDetail.members.length === 0 && (
                <p style={{ color: "var(--muted)" }}>This group has no enumerators.</p>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAssignFor)}
        title="Assign a respondent"
        message={`A random unassigned respondent from this group's district/province will be assigned to ${confirmAssignFor?.name}. Continue?`}
        confirmLabel={assigning ? "Assigning…" : "Assign"}
        danger={false}
        onConfirm={handleConfirmAssign}
        onCancel={() => setConfirmAssignFor(null)}
      />
    </div>
  );
}
