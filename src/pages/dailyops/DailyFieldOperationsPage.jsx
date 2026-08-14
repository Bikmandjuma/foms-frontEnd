import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList, Users2, Calendar, Clock, MapPin, RefreshCw } from "lucide-react";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { fieldCheckInsApi } from "../../api/fieldCheckIns.api.js";
import { programsApi } from "../../api/programs.api.js";
import { programTeamsApi } from "../../api/programTeams.api.js";

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function timeUsed(checkIn) {
  if (!checkIn?.checkInAt) return "—";
  const end = checkIn.checkOutAt ? new Date(checkIn.checkOutAt) : new Date();
  const mins = Math.max(0, Math.round((end.getTime() - new Date(checkIn.checkInAt).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// The single status the spec asks for per enumerator: absent if they never
// checked in today; otherwise the dominant issue in what they've recorded
// (mostly not-found or mostly relocated), falling back to "Active" for a
// normal day with no dominant problem.
function deriveStatus(entry) {
  if (!entry.checkIn) return "ABSENT";
  const { notFound, relocated, completed, refused } = entry;
  const total = notFound + relocated + completed + refused;
  if (total === 0) return entry.checkIn.checkOutAt ? "CHECKED_OUT" : "ACTIVE";
  if (notFound >= relocated && notFound > completed && notFound > refused) return "NOT_FOUND";
  if (relocated > notFound && relocated > completed && relocated > refused) return "RELOCATED";
  return entry.checkIn.checkOutAt ? "CHECKED_OUT" : "ACTIVE";
}

const STATUS_LABELS = {
  ABSENT: "Absent",
  ACTIVE: "Active",
  CHECKED_OUT: "Checked out",
  NOT_FOUND: "Mostly not found",
  RELOCATED: "Mostly relocated",
};

export default function DailyFieldOperationsPage() {
  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [groups, setGroups] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [roster, setRoster] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    programsApi.list().then((list) => {
      setPrograms(list);
      if (list.length > 0) setProgramId((p) => p || list[0].id);
    });
  }, []);

  useEffect(() => {
    setTeamId("");
    if (!programId) {
      setGroups([]);
      return;
    }
    programTeamsApi
      .listGroups(programId)
      .then((list) => setGroups(list.filter((g) => g.adopted)))
      .catch(() => setGroups([]));
  }, [programId]);

  async function load() {
    if (!programId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fieldCheckInsApi.roster({ programId, teamId: teamId || undefined, date });
      setRoster(res.roster || []);
      setSummary(res.summary || null);
    } catch (err) {
      setError(err.message || "Couldn't load today's field operations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, teamId, date]);

  const enrichedRoster = useMemo(
    () =>
      roster.map((r) => ({
        ...r,
        status: deriveStatus(r),
        interviewed: r.completed + r.refused + r.notFound + r.relocated,
      })),
    [roster]
  );

  const { filtered, query, setQuery } = useSearchedRows(enrichedRoster, ["name", "district", "province"]);
  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(filtered, 10);

  const columns = [
    { key: "name", label: "Name" },
    { key: "checkInAt", label: "Check-in", render: (r) => formatTime(r.checkIn?.checkInAt) },
    { key: "checkOutAt", label: "Checkout", render: (r) => formatTime(r.checkIn?.checkOutAt) },
    { key: "timeUsed", label: "Time used", render: (r) => timeUsed(r.checkIn) },
    {
      key: "progress",
      label: "Interviewed",
      render: (r) => (
        <div className="flex flex-col gap-1" style={{ minWidth: 120 }}>
          <span className="mono text-xs" style={{ color: "var(--text)" }}>
            {r.interviewed}/{r.assigned} {r.assigned > r.interviewed && `(${r.assigned - r.interviewed} left)`}
          </span>
          <div style={{ height: 5, borderRadius: 999, backgroundColor: "var(--surface-2)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: r.assigned > 0 ? `${Math.min(100, (r.interviewed / r.assigned) * 100)}%` : "0%",
                backgroundColor: "var(--teal)",
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (r) => (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
          <MapPin size={12} /> {[r.province, r.district].filter(Boolean).join(" / ") || "—"}
        </span>
      ),
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} label={STATUS_LABELS[r.status]} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Clock size={20} style={{ color: "var(--violet)" }} />
            Daily Field Operations
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Select a group to see each enumerator's day ,check-in, progress, location, and status.
          </p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="card p-4 flex flex-col gap-4">
        <div className="flex items-end gap-3 flex-wrap">
          <Field label="Program">
            <SelectInput icon={ClipboardList} value={programId} onChange={(e) => setProgramId(e.target.value)} style={{ minWidth: 200 }}>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Group">
            <SelectInput icon={Users2} value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={groups.length === 0} style={{ minWidth: 200 }}>
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.teamId} value={g.teamId}>
                  {g.groupName || g.groupCode}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date">
            <TextInput icon={Calendar} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name or location…" />
        </div>

        {summary && (
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span style={{ color: "var(--muted)" }}>
              <strong style={{ color: "var(--text)" }}>{summary.present}</strong>/{summary.staffTotal} present
            </span>
            <span style={{ color: "var(--muted)" }}>
              <strong style={{ color: "var(--status-active-fg)" }}>{summary.completed}</strong> completed
            </span>
            <span style={{ color: "var(--muted)" }}>
              <strong style={{ color: "var(--amber)" }}>{summary.notFound}</strong> not found
            </span>
            <span style={{ color: "var(--muted)" }}>
              <strong style={{ color: "var(--amber)" }}>{summary.relocated}</strong> relocated
            </span>
            <span style={{ color: "var(--muted)" }}>
              <strong style={{ color: "var(--rose)" }}>{summary.refused}</strong> refused
            </span>
            <span style={{ color: "var(--muted)" }}>
              <strong style={{ color: "var(--rose)" }}>{summary.deseased}</strong> deseased
            </span>
          </div>
        )}

        {error && (
          <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
            {error}
          </div>
        )}

        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No staff assigned to this program yet." />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}
