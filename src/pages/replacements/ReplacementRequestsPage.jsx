import React, { useEffect, useState } from "react";
import { Plus, Check, X } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { Field, SelectInput, TextArea } from "../../components/FormField.jsx";
import { replacementsApi } from "../../api/replacements.api.js";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const TABS = ["PENDING", "APPROVED", "REJECTED", "ALL"];

function DecideModal({ request, action, beneficiaries, onClose, onSubmit }) {
  const [candidateId, setCandidateId] = useState(request.candidateRespondentId || "");
  const [submitting, setSubmitting] = useState(false);

  const needsCandidate = action === "APPROVED" && !request.candidateRespondentId;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ status: action, candidateRespondentId: candidateId || undefined });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(10,12,16,0.45)" }} onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <p className="display text-base font-semibold mb-2" style={{ color: "var(--text)" }}>
          {action === "APPROVED" ? "Approve" : "Reject"} replacement request?
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Original respondent: <strong>{request.originalRespondent?.name}</strong>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {action === "APPROVED" && (
            <Field label="Replacement candidate" required={needsCandidate}>
              <SelectInput required={needsCandidate} value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
                <option value="">Select a respondent…</option>
                {beneficiaries
                  .filter((b) => b.id !== request.originalRespondentId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
              </SelectInput>
            </Field>
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
  const manage = can(ACTIONS.REPLACEMENTS_MANAGE);

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
      setDecision(null);
      loadAll();
    } catch (err) {
      setError(err.message || "Couldn't record that decision.");
    }
  }

  const columns = [
    { key: "original", label: "Original respondent", render: (r) => `${r.originalRespondent?.name} (${r.originalRespondent?.code})` },
    { key: "candidate", label: "Candidate", render: (r) => (r.candidateRespondent ? `${r.candidateRespondent.name} (${r.candidateRespondent.code})` : "—") },
    { key: "reason", label: "Reason" },
    { key: "requestedBy", label: "Requested by", render: (r) => r.requestedBy?.name || r.requestedBy?.email },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", label: "Created", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    ...(manage
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
          An enumerator never picks their own replacement — every substitution goes through a documented approval here.
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
              <option value="">Select a respondent…</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Suggested candidate (optional)">
            <SelectInput value={form.candidateRespondentId} onChange={(e) => setForm((f) => ({ ...f, candidateRespondentId: e.target.value }))}>
              <option value="">Let approver choose…</option>
              {beneficiaries
                .filter((b) => b.id !== form.originalRespondentId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
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
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "range-btn active" : "range-btn"}
          >
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No replacement requests here." />
      </div>

      {decision && (
        <DecideModal
          request={decision.request}
          action={decision.action}
          beneficiaries={beneficiaries}
          onClose={() => setDecision(null)}
          onSubmit={handleDecide}
        />
      )}
    </div>
  );
}
