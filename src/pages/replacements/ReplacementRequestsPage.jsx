import React, { useEffect, useState } from "react";
import { Plus, Check, X, MapPin, AlertTriangle } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { Field, SelectInput, TextArea, TextInput } from "../../components/FormField.jsx";
import { replacementsApi } from "../../api/replacements.api.js";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const TABS = ["PENDING", "APPROVED", "REJECTED", "ALL"];

const MATCH_STYLE = {
  VILLAGE: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)", label: "⭐ Same village" },
  CELL: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)", label: "Same cell" },
  SECTOR: { bg: "rgba(217,138,14,0.12)", fg: "var(--amber)", label: "Same sector" },
  DISTRICT: { bg: "rgba(217,138,14,0.12)", fg: "var(--amber)", label: "Same district" },
  PROVINCE: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)", label: "Same province" },
  OVERRIDE: { bg: "rgba(108,92,231,0.12)", fg: "var(--violet)", label: "Override" },
};

function MatchBadge({ level }) {
  if (!level) return <span style={{ color: "var(--muted)" }}>—</span>;
  const s = MATCH_STYLE[level] || MATCH_STYLE.OVERRIDE;
  return (
    <span className="badge" style={{ backgroundColor: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function locationLine(b) {
  return [b.village, b.cell, b.sector, b.district, b.province].filter(Boolean).join(", ") || "—";
}

function DecideModal({ request, action, onClose, onSubmit }) {
  const [candidateId, setCandidateId] = useState(request.candidateRespondentId || "");
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(action === "APPROVED");
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const needsCandidate = action === "APPROVED";

  useEffect(() => {
    if (action !== "APPROVED") return;
    let cancelled = false;
    replacementsApi
      .candidates(request.originalRespondentId)
      .then((res) => {
        if (!cancelled) setCandidates(res.candidates || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, request.originalRespondentId]);

  const selectedCandidate = candidates.find((c) => c.beneficiary.id === candidateId);
  const requiresOverride = selectedCandidate ? selectedCandidate.matchLevel === null : false;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (needsCandidate && !candidateId) {
      setError("Choose a replacement candidate.");
      return;
    }
    if (requiresOverride && !overrideReason.trim()) {
      setError("This candidate shares no location with the original respondent — record why you're overriding the rule.");
      return;
    }
    setSubmitting(true);
    await onSubmit({
      status: action,
      candidateRespondentId: candidateId || undefined,
      overrideReason: requiresOverride ? overrideReason.trim() : undefined,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(10,12,16,0.45)" }} onClick={onClose}>
      <div className="card w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <p className="display text-base font-semibold mb-2" style={{ color: "var(--text)" }}>
          {action === "APPROVED" ? "Approve" : "Reject"} replacement request?
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Original respondent: <strong>{request.originalRespondent?.name}</strong>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {action === "APPROVED" && (
            <>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Suggested replacements — closest location first
              </p>
              {loadingCandidates && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Searching village → cell → sector → district → province…
                </p>
              )}
              {!loadingCandidates && candidates.length === 0 && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  No available respondents found. You can still search manually below.
                </p>
              )}
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {candidates.map((c) => {
                  const active = candidateId === c.beneficiary.id;
                  const style = MATCH_STYLE[c.matchLevel] || MATCH_STYLE.OVERRIDE;
                  return (
                    <button
                      type="button"
                      key={c.beneficiary.id}
                      onClick={() => setCandidateId(c.beneficiary.id)}
                      className="text-left rounded-xl p-3 flex items-center justify-between gap-3"
                      style={{
                        border: `1px solid ${active ? "var(--violet)" : "var(--border)"}`,
                        backgroundColor: active ? "rgba(108,92,231,0.08)" : "var(--surface-2)",
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                          {c.beneficiary.name} <span className="mono text-xs" style={{ color: "var(--muted)" }}>({c.beneficiary.code})</span>
                        </p>
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--muted)" }}>
                          <MapPin size={11} />
                          {locationLine(c.beneficiary)}
                        </p>
                      </div>
                      <span className="badge shrink-0" style={{ backgroundColor: style.bg, color: style.fg }}>
                        {c.matchLevel ? style.label : "No overlap"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Field label="Or pick by ID directly">
                <TextInput value={candidateId} onChange={(e) => setCandidateId(e.target.value)} placeholder="Paste a beneficiary ID" />
              </Field>

              {requiresOverride && (
                <div className="rounded-xl p-3 flex flex-col gap-2" style={{ backgroundColor: "var(--status-suspended-bg)" }}>
                  <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--status-suspended-fg)" }}>
                    <AlertTriangle size={13} />
                    This candidate is outside the geographic hierarchy — record why
                  </p>
                  <TextArea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. no eligible respondents left anywhere in the district"
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <div className="text-xs rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting} style={action === "REJECTED" ? { backgroundColor: "var(--rose)" } : undefined}>
              {submitting ? "Saving…" : action === "APPROVED" ? "Approve" : "Reject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReplacementRequestsPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canDecide = can(ACTIONS.REPLACEMENTS_EDIT);

  const [tab, setTab] = useState("PENDING");
  const [rows, setRows] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ originalRespondentId: "", candidateRespondentId: "", reason: "" });
  const [decision, setDecision] = useState(null); // { request, action }

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
    if (!form.originalRespondentId || !form.reason) return;
    setCreating(true);
    setError("");
    try {
      await replacementsApi.create({
        originalRespondentId: form.originalRespondentId,
        reason: form.reason,
        candidateRespondentId: form.candidateRespondentId || undefined,
      });
      toast.success("Replacement request submitted");
      setForm({ originalRespondentId: "", candidateRespondentId: "", reason: "" });
      loadAll();
    } catch (err) {
      setError(err.message || "Couldn't create replacement request.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDecide(payload) {
    if (!decision) return;
    try {
      await replacementsApi.decide(decision.request.id, payload);
      toast.success(`Request ${payload.status.toLowerCase()}`);
      setDecision(null);
      loadAll();
    } catch (err) {
      setError(err.message || "Couldn't record that decision.");
    }
  }

  const columns = [
    { key: "original", label: "Original respondent", render: (r) => `${r.originalRespondent?.name} (${r.originalRespondent?.code})` },
    { key: "candidate", label: "Candidate", render: (r) => (r.candidateRespondent ? `${r.candidateRespondent.name} (${r.candidateRespondent.code})` : "—") },
    { key: "matchLevel", label: "Geo match", render: (r) => <MatchBadge level={r.matchLevel} /> },
    { key: "reason", label: "Reason" },
    { key: "requestedBy", label: "Requested by", render: (r) => r.requestedBy?.name || r.requestedBy?.email },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", label: "Created", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    ...(canDecide
      ? [
          {
            key: "actions",
            label: "",
            render: (r) =>
              r.status === "PENDING" ? (
                <div className="flex items-center gap-2 justify-end">
                  <button className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => setDecision({ request: r, action: "APPROVED" })}>
                    <Check size={14} />
                  </button>
                  <button className="btn-secondary btn-danger" style={{ height: 32, padding: "0 10px" }} onClick={() => setDecision({ request: r, action: "REJECTED" })}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  by {r.decidedBy?.name || r.decidedBy?.email || "—"}
                </span>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Replacement requests
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          An enumerator never picks their own replacement every substitution goes through a documented approval,
          searched outward from village to province.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Field label="Suggested candidate (optional)" hint="The approver picks the final replacement from a ranked list this is just a hint.">
            <SelectInput value={form.candidateRespondentId} onChange={(e) => setForm((f) => ({ ...f, candidateRespondentId: e.target.value }))}>
              <option value="" className="text-black">
                Let approver choose…
              </option>
              {beneficiaries
                .filter((b) => b.id !== form.originalRespondentId)
                .map((b) => (
                  <option key={b.id} value={b.id} className="text-black">
                    {b.name} ({b.code})
                  </option>
                ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Reason" required>
          <TextArea required value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. 3 documented contact attempts, no response" />
        </Field>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={creating}>
            <Plus size={16} />
            Submit request
          </button>
        </div>
      </form>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "range-btn active" : "range-btn"}>
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No replacement requests here." />
      </div>

      {decision && (
        <DecideModal request={decision.request} action={decision.action} onClose={() => setDecision(null)} onSubmit={handleDecide} />
      )}
    </div>
  );
}
