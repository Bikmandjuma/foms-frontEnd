import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Crown, Users2, Heart, ClipboardList, Pencil, Truck } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import { programsApi } from "../../api/programs.api.js";
import { programTeamsApi } from "../../api/programTeams.api.js";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}1A` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          {label}
        </p>
        <p className="mono text-lg" style={{ color: "var(--text)" }}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span className="text-sm text-right" style={{ color: "var(--text)" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export default function ProgramDetailsPage() {
  const { id } = useParams();
  const { can } = usePermissions();
  const canViewTeams = can(ACTIONS.TEAMS_VIEW);
  const canViewRespondents = can(ACTIONS.BENEFICIARIES_VIEW);
  const canEdit = can(ACTIONS.PROGRAMS_EDIT);

  const tabs = ["Overview", ...(canViewTeams ? ["Groups"] : []), ...(canViewRespondents ? ["Respondents"] : [])];

  const [tab, setTab] = useState("Overview");
  const [program, setProgram] = useState(null);
  const [teams, setTeams] = useState([]);
  const [respondents, setRespondents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(respondents, 10);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const requests = [
          programsApi.get(id),
          canViewTeams ? programTeamsApi.get(id) : Promise.resolve(null),
          canViewRespondents ? beneficiariesApi.list({ programId: id }) : Promise.resolve([]),
        ];
        const [prog, teamData, respondentList] = await Promise.all(requests);
        if (cancelled) return;
        setProgram(prog);
        setTeams(teamData?.teams || []);
        setRespondents(respondentList || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Couldn't load this program.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;
  if (error) {
    return (
      <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
        {error}
      </div>
    );
  }
  if (!program) return null;

  const groupCount = teams.length;
  const memberCount = teams.reduce((n, t) => n + t.members.length + (t.leader ? 1 : 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/programs" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to programs">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
              {program.name}
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              Program overview, groups, and assigned respondents.
            </p>
          </div>
        </div>
        {canEdit && (
          <Link to={`/programs/${program.id}/edit`} className="btn-secondary">
            <Pencil size={14} />
            Edit program
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} label="Status" value={<StatusBadge status={program.status} />} accent="#6C5CE7" />
        <StatCard icon={Users2} label="Groups" value={groupCount} accent="#12B5A6" />
        <StatCard icon={Crown} label="Group members" value={memberCount} accent="#D98A0E" />
        <StatCard icon={Heart} label="Respondents" value={respondents.length} accent="#E1495C" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "range-btn active" : "range-btn"}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="card p-5 flex flex-col gap-1">
          <DetailRow label="Name" value={program.name} />
          <DetailRow label="Description" value={program.description || "—"} />
          <DetailRow label="Scenario" value={program.scenarioType ? program.scenarioType.replaceAll("_", " ") : "—"} />
          <DetailRow label="Status" value={<StatusBadge status={program.status} />} />
          <DetailRow label="Tracing required" value={program.tracingRequired ? "Yes" : "No"} />
          <DetailRow label="Target sample size" value={program.targetSampleSize ?? "—"} />
          <DetailRow label="Start date" value={program.startDate ? new Date(program.startDate).toLocaleDateString() : "—"} />
          <DetailRow label="End date" value={program.endDate ? new Date(program.endDate).toLocaleDateString() : "—"} />
          <DetailRow label="Team count" value={program.teamCount ?? "—"} />
          <DetailRow label="Enumerators per team" value={program.membersPerTeam ?? "—"} />
          <DetailRow label="Created" value={new Date(program.createdAt).toLocaleString()} />
          <DetailRow label="Last updated" value={new Date(program.updatedAt).toLocaleString()} />
        </div>
      )}

      {tab === "Groups" && (
        <div className="flex flex-col gap-4">
          {teams.length === 0 && (
            <div className="card flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>
              No groups configured for this program yet.
            </div>
          )}
          {teams.map((team) => (
            <div key={team.id} className="card p-5 flex flex-col gap-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {team.name}
              </p>

              <div className="flex items-center gap-2 rounded-xl p-3" style={{ backgroundColor: "var(--surface-2)" }}>
                <Crown size={15} color="var(--amber)" />
                {team.leader ? (
                  <span className="text-sm truncate" style={{ color: "var(--text)" }}>
                    {team.leader.name || team.leader.email} <span style={{ color: "var(--muted)" }}>· leader</span>
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: "var(--muted)" }}>
                    No leader assigned
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    Members
                  </p>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {team.members.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.members.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      No members yet.
                    </span>
                  )}
                  {team.members.map((m) => (
                    <span key={m.id} className="badge" style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}>
                      {m.user.name || m.user.email}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                  Vehicles
                </p>
                <div className="flex flex-wrap gap-2">
                  {team.vehicles.length === 0 && (
                    <span className="badge" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--amber)" }}>
                      No vehicle assigned
                    </span>
                  )}
                  {team.vehicles.map((tv) => (
                    <span key={tv.id} className="badge flex items-center gap-1" style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}>
                      <Truck size={12} color="var(--muted)" />
                      {tv.vehicle.name}
                      {tv.vehicle.capacityPerDay != null && ` (${tv.vehicle.capacityPerDay} seats)`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Respondents" && (
        <div className="card">
          <DataTable
            columns={[
              { key: "code", label: "Code", render: (r) => <span className="mono">{r.code}</span> },
              { key: "name", label: "Name" },
              { key: "telephone", label: "Phone", render: (r) => r.telephone || "—" },
              {
                key: "location",
                label: "Location",
                render: (r) => [r.district?.name, r.sector?.name, r.cell?.name, r.village?.name].filter(Boolean).join(" / ") || "—",
              },
              {
                key: "enumerator",
                label: "Enumerator",
                render: (r) => {
                  const enumerator = r.assignments?.[0]?.user;
                  return enumerator ? enumerator.name || enumerator.email : "—";
                },
              },
              { key: "outcome", label: "Outcome", render: (r) => <StatusBadge status={r.outcome || "PENDING"} /> },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={pageRows}
            emptyLabel="No respondents assigned to this program yet."
          />
          <Pagination page={page} pageSize={pageSize} total={respondents.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}
    </div>
  );
}
