import React, { useEffect, useState } from "react";
import { Plus, RotateCw, Trash2 } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import { Field, SelectInput, TextArea } from "../../components/FormField.jsx";
import { replacementsApi } from "../../api/replacements.api.js";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const TABS = ["ALL", "APPROVED", "PENDING"];
const TAB_LABELS = { ALL: "All", APPROVED: "Auto-replaced", PENDING: "Awaiting a candidate" };

const MATCH_STYLE = {
  VILLAGE: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)", label: "Same village" },
  CELL: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)", label: "Same cell" },
  SECTOR: { bg: "rgba(217,138,14,0.12)", fg: "var(--amber)", label: "Same sector" },
  DISTRICT: { bg: "rgba(217,138,14,0.12)", fg: "var(--amber)", label: "Same district" },
  PROVINCE: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)", label: "Same province" },
};

function MatchBadge({ level }) {
  if (!level) {
    return (
      <span className="badge" style={{ backgroundColor: "rgba(108,92,231,0.12)", color: "var(--violet)" }}>
        No geographic overlap
      </span>
    );
  }
  const s = MATCH_STYLE[level] || MATCH_STYLE.PROVINCE;
  return (
    <span className="badge" style={{ backgroundColor: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

export default function ReplacementRequestsPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canDelete = can(ACTIONS.REPLACEMENTS_DELETE);

  const [tab, setTab] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [form, setForm] = useState({ originalRespondentId: "", reason: "" });
  const [pendingDelete, setPendingDelete] = useState(null);

  const { filtered, query, setQuery } = useSearchedRows(rows, [
    "originalRespondent.name",
    "originalRespondent.code",
    "candidateRespondent.name",
    "candidateRespondent.code",
    "reason",
  ]);
  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(filtered, 10);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [requests, benList] = await Promise.all([
        replacementsApi.list(tab === "ALL" ? {} : { status: tab }),
        beneficiariesApi.list(),
      ]);
      setRows(requests);
      setBeneficiaries(benList);
    } catch (err) {
      setError(err.message || "Couldn't load replacement requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.originalRespondentId || !form.reason.trim()) return;
    setCreating(true);
    setError("");
    try {
      const result = await replacementsApi.create({ originalRespondentId: form.originalRespondentId, reason: form.reason.trim() });
      if (result.candidateRespondent) {
        toast.success(`Replaced with ${result.candidateRespondent.name} (${result.candidateRespondent.code})`);
      } else {
        toast.info("No eligible respondent was available yet — this request is queued.");
      }
      setForm({ originalRespondentId: "", reason: "" });
      loadAll();
    } catch (err) {
      setError(err.message || "Couldn't create that replacement request.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRetry(id) {
    setRetryingId(id);
    setError("");
    try {
      await replacementsApi.retry(id);
      toast.success("Replacement resolved");
      loadAll();
    } catch (err) {
      setError(err.message || "Still no eligible respondent is available.");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await replacementsApi.remove(pendingDelete.id);
      setRows((r) => r.filter((x) => x.id !== pendingDelete.id));
      toast.success("Request deleted");
    } catch (err) {
      setError(err.message || "Couldn't delete that request.");
    } finally {
      setPendingDelete(null);
    }
  }

  const columns = [
    { key: "original", label: "Respondent who couldn't be reached", render: (r) => `${r.originalRespondent?.name} (${r.originalRespondent?.code})` },
    { key: "candidate", label: "Replaced with", render: (r) => (r.candidateRespondent ? `${r.candidateRespondent.name} (${r.candidateRespondent.code})` : "—") },
    { key: "matchLevel", label: "Match", render: (r) => (r.status === "APPROVED" ? <MatchBadge level={r.matchLevel} /> : <span style={{ color: "var(--muted)" }}>—</span>) },
    { key: "reason", label: "Reason" },
    { key: "requestedBy", label: "Requested by", render: (r) => r.requestedBy?.name || r.requestedBy?.email },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status === "APPROVED" ? "COMPLETED" : r.status} /> },
    { key: "createdAt", label: "Date", render: (r) => new Date(r.createdAt).toLocaleString() },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex items-center gap-2 justify-end">
          {r.status === "PENDING" && (
            <button
              className="btn-secondary"
              style={{ height: 32, padding: "0 10px" }}
              onClick={() => handleRetry(r.id)}
              disabled={retryingId === r.id}
              title="Search again for a candidate"
            >
              <RotateCw size={14} className={retryingId === r.id ? "animate-spin" : ""} />
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
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Replacement requests
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          The system searches village → cell → sector → district for a replacement and
          applies it immediately. If several respondents share the closest matching tier, one is picked at
          random among them.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="card p-5 flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Raise a new request
        </p>
        <Field label="Respondent who can't be reached" required>
          <SelectInput required value={form.originalRespondentId} onChange={(e) => setForm((f) => ({ ...f, originalRespondentId: e.target.value }))}>
            <option value="" className="text-black">
              Select a respondent…
            </option>
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id} className="text-black">
                {b.name} ({b.code})
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Reason" required>
          <TextArea
            required
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. 3 documented contact attempts, no response"
          />
        </Field>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={creating}>
            <Plus size={16} />
            {creating ? "Searching…" : "Submit request"}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? "range-btn active" : "range-btn"}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search by respondent, code, or reason…" />
      </div>

      <div className="card">
        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No replacement requests here." />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this request?"
        message="This removes the request record. If it already replaced a respondent, that replacement itself is not undone."
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
