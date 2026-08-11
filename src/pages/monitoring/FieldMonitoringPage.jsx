import React, { useEffect, useMemo, useState } from "react";
import {
  LogIn,
  LogOut,
  MapPin,
  Search,
  Download,
  Users2,
  ClipboardCheck,
  AlertTriangle,
  X,
  Send,
  CheckCircle2,
  ListChecks,
  Calendar,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import { Field, SelectInput, TextInput, TextArea } from "../../components/FormField.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import { fieldCheckInsApi } from "../../api/fieldCheckIns.api.js";
import { programsApi } from "../../api/programs.api.js";
import { downloadBlob } from "../../utils/downloadBlob.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const OUTCOMES = ["COMPLETED", "REFUSED", "NOT_FOUND", "RELOCATED", "DECEASED", "REPLACED"];

const OUTCOME_STYLE = {
  PENDING: { bg: "var(--status-inactive-bg)", fg: "var(--status-inactive-fg)" },
  COMPLETED: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)" },
  REFUSED: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)" },
  NOT_FOUND: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)" },
  RELOCATED: { bg: "rgba(217,138,14,0.12)", fg: "var(--amber)" },
  DECEASED: { bg: "var(--status-inactive-bg)", fg: "var(--status-inactive-fg)" },
  REPLACED: { bg: "rgba(108,92,231,0.12)", fg: "var(--violet)" },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}1A` }}>
        <Icon size={17} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          {label}
        </p>
        <p className="mono text-xl mt-0.5" style={{ color: "var(--text)" }}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: total > 0 && value >= total ? "var(--teal)" : "var(--violet)" }}
        />
      </div>
      <span className="mono text-xs shrink-0" style={{ color: "var(--muted)" }}>
        {value}/{total}
      </span>
    </div>
  );
}

/**
 * Today's respondent checklist for one field worker's check-in — the
 * "attendance before checkout" step: every assigned respondent needs a
 * recorded outcome before the session can close.
 */
function RespondentsModal({ checkIn, isOwner, canOverride, onClose, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [checkoutBlocked, setCheckoutBlocked] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  const canEditOutcomes = isOwner;
  const canAddNotes = isOwner;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [respondentsRes, notesRes] = await Promise.all([
        fieldCheckInsApi.todayRespondents(checkIn.id),
        fieldCheckInsApi.listNotes(checkIn.id),
      ]);
      setData(respondentsRes);
      setNotes(notesRes);
    } catch (err) {
      setError(err.message || "Couldn't load today's respondents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn.id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.respondents;
    return data.respondents.filter(
      (r) =>
        r.beneficiary.name.toLowerCase().includes(q) ||
        r.beneficiary.code.toLowerCase().includes(q) ||
        (r.beneficiary.village?.name || "").toLowerCase().includes(q) ||
        (r.beneficiary.sector?.name || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const {
    pageRows: pagedFiltered,
    page: respondentsPage,
    pageSize: respondentsPageSize,
    setPage: setRespondentsPage,
    setPageSize: setRespondentsPageSize,
  } = usePagedRows(filtered, 10);

  async function handleOutcome(beneficiaryId, outcome) {
    setSavingId(beneficiaryId);
    setError("");
    try {
      await fieldCheckInsApi.recordOutcome(checkIn.id, beneficiaryId, { outcome });
      await load();
      onChanged?.();
      toast.success(`Outcome recorded: ${outcome.replaceAll("_", " ").toLowerCase()}`);
    } catch (err) {
      setError(err.message || "Couldn't record that outcome.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMarkAllCompleted() {
    if (!data) return;
    setBulkRunning(true);
    setError("");
    try {
      const pending = data.respondents.filter((r) => !r.visit);
      for (const r of pending) {
        // Sequential on purpose — a caseload is small (tens, not thousands)
        // and this keeps the "one respondent, one write" audit trail intact.
        // eslint-disable-next-line no-await-in-loop
        await fieldCheckInsApi.recordOutcome(checkIn.id, r.beneficiary.id, { outcome: "COMPLETED" });
      }
      await load();
      onChanged?.();
      toast.success("Everyone marked completed");
    } catch (err) {
      setError(err.message || "Couldn't mark everyone as completed.");
    } finally {
      setBulkRunning(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await fieldCheckInsApi.addNote(checkIn.id, noteText.trim());
      setNoteText("");
      setNotes(await fieldCheckInsApi.listNotes(checkIn.id));
      toast.success("Note added");
    } catch (err) {
      setError(err.message || "Couldn't add that note.");
    }
  }

  async function handleCheckout(withOverride) {
    setCheckingOut(true);
    setError("");
    try {
      await fieldCheckInsApi.checkOut(checkIn.id, withOverride ? { overrideReason } : undefined);
      toast.success(withOverride ? "Checked out (override recorded)" : "Checked out");
      onChanged?.();
      onClose();
    } catch (err) {
      if (err.status === 409) {
        setCheckoutBlocked(err.message);
      } else {
        setError(err.message || "Couldn't check out.");
      }
    } finally {
      setCheckingOut(false);
    }
  }

  const total = data?.total ?? 0;
  const completed = data?.completed ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(10,12,16,0.45)" }} onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="display text-base font-semibold" style={{ color: "var(--text)" }}>
              {checkIn.user?.name || checkIn.user?.email}'s respondents
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
              {checkIn.project?.name || "No specific program"} · checked in {new Date(checkIn.checkInAt).toLocaleString()}
            </p>
          </div>
          <button className="btn-secondary" style={{ height: 32, width: 32, padding: 0 }} onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {!loading && data && (
          <div className="mt-3 mb-4">
            <ProgressBar value={completed} total={total} />
          </div>
        )}

        {error && (
          <div className="text-sm rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>
            Loading…
          </p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="flex-1">
                <Field>
                  <TextInput icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code, or village…" />
                </Field>
              </div>
              {canEditOutcomes && total > completed && (
                <button type="button" className="btn-secondary shrink-0" onClick={handleMarkAllCompleted} disabled={bulkRunning}>
                  <CheckCircle2 size={15} />
                  {bulkRunning ? "Marking…" : "Mark rest completed"}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {filtered.length === 0 && (
                <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
                  {total === 0 ? "No respondents assigned for today." : "No respondents match that search."}
                </p>
              )}
              {pagedFiltered.map((r) => {
                const outcome = r.visit?.outcome || "PENDING";
                const style = OUTCOME_STYLE[outcome] || OUTCOME_STYLE.PENDING;
                const saving = savingId === r.beneficiary.id;
                return (
                  <div
                    key={r.beneficiary.id}
                    className="rounded-xl px-3 py-2.5 flex items-center gap-3 flex-wrap sm:flex-nowrap"
                    style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                        {r.beneficiary.name} <span className="mono text-xs" style={{ color: "var(--muted)" }}>({r.beneficiary.code})</span>
                      </p>
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--muted)" }}>
                        <MapPin size={11} />
                        {[r.beneficiary.village?.name, r.beneficiary.sector?.name].filter(Boolean).join(", ") || "—"}
                      </p>
                      {r.visit && r.visit.confirmationStatus === "PENDING" && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--amber)" }}>
                          Waiting confirmation
                        </p>
                      )}
                    </div>
                    {canEditOutcomes ? (
                      <select
                        className="text-xs font-medium rounded-lg px-2.5 py-1.5 border"
                        style={{ backgroundColor: style.bg, color: style.fg, borderColor: "transparent" }}
                        value={outcome}
                        disabled={saving}
                        onChange={(e) => handleOutcome(r.beneficiary.id, e.target.value)}
                      >
                        <option value="PENDING">Not recorded</option>
                        {OUTCOMES.map((o) => (
                          <option key={o} value={o}>
                            {o.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="badge shrink-0" style={{ backgroundColor: style.bg, color: style.fg }}>
                        {outcome.replaceAll("_", " ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {filtered.length > 0 && (
              <Pagination
                page={respondentsPage}
                pageSize={respondentsPageSize}
                total={filtered.length}
                onPageChange={setRespondentsPage}
                onPageSizeChange={setRespondentsPageSize}
              />
            )}

            {/* Field notes */}
            <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                Field notes
              </p>
              <div className="flex flex-col gap-2 mb-3 max-h-32 overflow-y-auto">
                {notes.length === 0 && (
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    No notes recorded yet today.
                  </p>
                )}
                {notes.map((n) => (
                  <div key={n.id} className="flex items-baseline gap-2 text-sm">
                    <span className="mono text-xs shrink-0" style={{ color: "var(--muted)" }}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span style={{ color: "var(--text)" }}>{n.note}</span>
                  </div>
                ))}
              </div>
              {canAddNotes && (
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <div className="flex-1">
                    <TextInput value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="e.g. road blocked, detouring via Karangazi" />
                  </div>
                  <button type="submit" className="btn-secondary shrink-0" disabled={!noteText.trim()}>
                    <Send size={14} />
                  </button>
                </form>
              )}
            </div>

            {/* Checkout */}
            {!checkIn.checkOutAt && (isOwner || canOverride) && (
              <div className="pt-4 mt-4" style={{ borderTop: "1px solid var(--border)" }}>
                {checkoutBlocked && (
                  <div className="rounded-xl p-3 mb-3 flex flex-col gap-2" style={{ backgroundColor: "var(--status-suspended-bg)" }}>
                    <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--status-suspended-fg)" }}>
                      <AlertTriangle size={13} />
                      {checkoutBlocked}
                    </p>
                    {canOverride && (
                      <>
                        <TextArea
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="Reason for overriding the incomplete checkout…"
                        />
                        <button
                          type="button"
                          className="btn-secondary w-fit"
                          style={{ color: "var(--rose)" }}
                          disabled={!overrideReason.trim() || checkingOut}
                          onClick={() => handleCheckout(true)}
                        >
                          <ShieldAlert size={14} />
                          Force checkout with this reason
                        </button>
                      </>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button className="btn-secondary" onClick={onClose}>
                    Close
                  </button>
                  <button className="btn-primary" disabled={checkingOut} onClick={() => handleCheckout(!isOwner)}>
                    <LogOut size={16} />
                    {checkingOut ? "Checking out…" : isOwner ? "Check out" : "Check them out"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FieldMonitoringPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(ACTIONS.MONITORING_MANAGE);

  const [date, setDate] = useState(todayStr());
  const [programId, setProgramId] = useState("");
  const [programs, setPrograms] = useState([]);
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInForm, setCheckInForm] = useState({ projectId: "", note: "" });
  const [modalCheckIn, setModalCheckIn] = useState(null);

  async function loadRoster() {
    setLoading(true);
    setError("");
    try {
      const res = await fieldCheckInsApi.roster({ programId: programId || undefined, date });
      setRosterData(res);
    } catch (err) {
      setError(err.message || "Couldn't load the daily roster.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    programsApi
      .list()
      .then(setPrograms)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, programId]);

  const myEntry = rosterData?.roster.find((r) => r.userId === user?.id);
  const myActiveCheckIn =
    myEntry?.checkIn && !myEntry.checkIn.checkOutAt
      ? { ...myEntry.checkIn, user, project: programs.find((p) => p.id === myEntry.checkIn.projectId) }
      : null;
  const isToday = date === todayStr();

  async function handleCheckIn(e) {
    e.preventDefault();
    setCheckingIn(true);
    setError("");
    try {
      await fieldCheckInsApi.checkIn({ projectId: checkInForm.projectId || undefined, note: checkInForm.note || undefined });
      toast.success("Checked in");
      setCheckInForm({ projectId: "", note: "" });
      loadRoster();
    } catch (err) {
      setError(err.message || "Couldn't check in.");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const blob = await fieldCheckInsApi.exportDaily({ programId: programId || undefined, date });
      downloadBlob(blob, `daily-field-report-${date}.xlsx`);
      toast.success("Daily report downloaded");
    } catch (err) {
      setError(err.message || "Couldn't export the report.");
    } finally {
      setExporting(false);
    }
  }

  const filteredRoster = useMemo(() => {
    if (!rosterData) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rosterData.roster;
    return rosterData.roster.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q)
    );
  }, [rosterData, search]);

  const { pageRows: pagedRoster, page, pageSize, setPage, setPageSize } = usePagedRows(filteredRoster, 10);

  const summary = rosterData?.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            Daily field operations
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Attendance, live progress, respondent outcomes, and duty-of-care for one program on one day.
          </p>
        </div>
        <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
          <Download size={16} />
          {exporting ? "Preparing…" : "Export Excel"}
        </button>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="sm:w-48">
          <Field>
            <TextInput icon={Calendar} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="sm:w-64">
          <Field>
            <SelectInput icon={ClipboardList} value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="" className="text-black">
                All programs
              </option>
              {programs.map((p) => (
                <option key={p.id} value={p.id} className="text-black">
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="flex-1">
          <Field>
            <TextInput icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search field staff by name…" />
          </Field>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users2} label="Present" value={`${summary.present}/${summary.staffTotal}`} accent="#6C5CE7" />
          <StatCard icon={ClipboardCheck} label="Assigned" value={summary.assigned} accent="#12B5A6" />
          <StatCard icon={CheckCircle2} label="Completed" value={summary.completed} accent="#12B5A6" />
          <StatCard icon={X} label="Refused" value={summary.refused} accent="#E1495C" />
          <StatCard icon={AlertTriangle} label="Not found" value={summary.notFound} accent="#D98A0E" />
          <StatCard icon={ListChecks} label="Replaced" value={summary.replaced} accent="#6C5CE7" />
          <StatCard icon={LogOut} label="Absent" value={summary.absent} accent="#8790A3" />
        </div>
      )}

      {/* My check-in */}
      {isToday &&
        (!myActiveCheckIn ? (
          <form onSubmit={handleCheckIn} className="card p-5 flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1">
              <Field label="Program (optional)">
                <SelectInput icon={ClipboardList} value={checkInForm.projectId} onChange={(e) => setCheckInForm((f) => ({ ...f, projectId: e.target.value }))}>
                  <option value="" className="text-black">
                    No specific program
                  </option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id} className="text-black">
                      {p.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Note (optional)">
                <TextInput value={checkInForm.note} onChange={(e) => setCheckInForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. heading to Nyamirambo sector" />
              </Field>
            </div>
            <button type="submit" className="btn-primary" disabled={checkingIn} style={{ height: 44 }}>
              <LogIn size={16} />
              Check in
            </button>
          </form>
        ) : (
          <div className="card p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-col gap-2">
              <p className="text-sm" style={{ color: "var(--text)" }}>
                You're checked in{myActiveCheckIn.project ? ` for ${myActiveCheckIn.project.name}` : ""} since{" "}
                {new Date(myActiveCheckIn.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
              </p>
              {myEntry && <ProgressBar value={myEntry.completed} total={myEntry.assigned} />}
            </div>
            <button className="btn-primary" onClick={() => setModalCheckIn(myActiveCheckIn)}>
              <ListChecks size={16} />
              My respondents
            </button>
          </div>
        ))}

      {/* Roster */}
      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm py-16 text-center" style={{ color: "var(--muted)" }}>
            Loading…
          </p>
        ) : filteredRoster.length === 0 ? (
          <p className="text-sm py-16 text-center" style={{ color: "var(--muted)" }}>
            No field staff assigned for this scope yet.
          </p>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Field staff", "Check-in", "Location", "Progress", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left font-medium py-3 px-4 whitespace-nowrap"
                    style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRoster.map((r) => (
                <tr key={r.userId} className="table-row" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-3 px-4" style={{ color: "var(--text)" }}>
                    {r.name}
                  </td>
                  <td className="py-3 px-4" style={{ color: "var(--text)" }}>
                    {r.checkIn ? new Date(r.checkIn.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="py-3 px-4">
                    {r.checkIn?.currentGpsLat && r.checkIn?.currentGpsLng ? (
                      <span className="mono flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
                        <MapPin size={12} />
                        {r.checkIn.currentGpsLat.toFixed(3)}, {r.checkIn.currentGpsLng.toFixed(3)}
                      </span>
                    ) : r.checkIn?.gpsLat && r.checkIn?.gpsLng ? (
                      <span className="mono flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
                        <MapPin size={12} />
                        {r.checkIn.gpsLat.toFixed(3)}, {r.checkIn.gpsLng.toFixed(3)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <ProgressBar value={r.completed} total={r.assigned} />
                  </td>
                  <td className="py-3 px-4">
                    {!r.checkIn ? (
                      <span className="badge" style={{ backgroundColor: "var(--status-inactive-bg)", color: "var(--status-inactive-fg)" }}>
                        Absent
                      </span>
                    ) : r.checkIn.checkOutAt ? (
                      <span className="badge" style={{ backgroundColor: "var(--status-inactive-bg)", color: "var(--status-inactive-fg)" }}>
                        Checked out
                      </span>
                    ) : r.assigned > 0 && r.completed >= r.assigned ? (
                      <span className="badge" style={{ backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}>
                        Ready to check out
                      </span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}>
                        In the field
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {r.checkIn && (
                      <button
                        className="btn-secondary"
                        style={{ height: 32, padding: "0 12px" }}
                        onClick={() =>
                          setModalCheckIn({
                            ...r.checkIn,
                            user: { id: r.userId, name: r.name, email: r.email },
                            project: programs.find((p) => p.id === programId) || null,
                          })
                        }
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} pageSize={pageSize} total={filteredRoster.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {modalCheckIn && (
        <RespondentsModal
          checkIn={modalCheckIn}
          isOwner={modalCheckIn.user?.id === user?.id}
          canOverride={canManage}
          onClose={() => setModalCheckIn(null)}
          onChanged={loadRoster}
        />
      )}
    </div>
  );
}
