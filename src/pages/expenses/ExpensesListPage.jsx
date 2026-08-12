import React, { useEffect, useState } from "react";
import { FileText, Check, X } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import { Field, SelectInput, TextArea } from "../../components/FormField.jsx";
import { fieldExpensesApi } from "../../api/fieldExpenses.api.js";
import { programsApi } from "../../api/programs.api.js";
import { resolveAssetUrl } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const TABS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

function formatAmount(amount) {
  return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function ReviewModal({ expense, onClose, onReviewed }) {
  const toast = useToast();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(status) {
    setSaving(true);
    setError("");
    try {
      await fieldExpensesApi.review(expense.id, { status, reviewNotes: notes || undefined });
      toast.success(status === "APPROVED" ? "Expense approved" : "Expense rejected");
      onReviewed();
    } catch (err) {
      setError(err.message || "Couldn't review this expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10,12,16,0.45)" }}
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <p className="display text-base font-semibold" style={{ color: "var(--text)" }}>
          Review expense
        </p>

        <div className="flex flex-col gap-1 text-sm" style={{ color: "var(--text)" }}>
          <span>
            <strong>{expense.user.name || expense.user.email}</strong> · {expense.program.name}
          </span>
          <span style={{ color: "var(--muted)" }}>{new Date(expense.expenseDate).toLocaleDateString()}</span>
          <span>{expense.description}</span>
          <span className="mono font-semibold">{formatAmount(expense.amount)}</span>
          {expense.documentUrl && (
            <a
              href={resolveAssetUrl(expense.documentUrl)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm"
              style={{ color: "var(--violet)" }}
            >
              <FileText size={14} /> View supporting document
            </a>
          )}
        </div>

        <Field label="Notes (optional)">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && (
          <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary btn-danger"
            onClick={() => submit("REJECTED")}
            disabled={saving}
          >
            <X size={14} /> Reject
          </button>
          <button type="button" className="btn-primary" onClick={() => submit("APPROVED")} disabled={saving}>
            <Check size={14} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesListPage() {
  const { can } = usePermissions();
  const canReview = can(ACTIONS.EXPENSES_EDIT);

  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [tab, setTab] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (programId) params.programId = programId;
      if (tab !== "ALL") params.status = tab;
      const [expenses, programList] = await Promise.all([fieldExpensesApi.list(params), programsApi.list()]);
      setRows(expenses);
      setPrograms(programList);
    } catch (err) {
      setError(err.message || "Couldn't load expenses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, tab]);

  const { filtered, query, setQuery } = useSearchedRows(rows, ["description", "user.name", "user.email", "program.name"]);
  const { pageRows, page, pageSize, setPage, setPageSize } = usePagedRows(filtered, 10);

  const columns = [
    { key: "expenseDate", label: "Date", render: (r) => new Date(r.expenseDate).toLocaleDateString() },
    { key: "program", label: "Program", render: (r) => r.program.name },
    { key: "user", label: "Submitted by", render: (r) => r.user.name || r.user.email },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", render: (r) => <span className="mono">{formatAmount(r.amount)}</span> },
    {
      key: "document",
      label: "Document",
      render: (r) =>
        r.documentUrl ? (
          <a href={resolveAssetUrl(r.documentUrl)} target="_blank" rel="noreferrer" style={{ color: "var(--violet)" }}>
            <FileText size={16} />
          </a>
        ) : (
          "—"
        ),
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "",
      render: (r) =>
        canReview && r.status === "PENDING" ? (
          <button type="button" className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => setReviewing(r)}>
            Review
          </button>
        ) : (
          r.reviewedBy && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              by {r.reviewedBy.name || r.reviewedBy.email}
            </span>
          )
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Field expenses
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Money enumerators spend in the field, submitted from the mobile app with a supporting document for each claim.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={t === tab ? "btn-primary" : "btn-secondary"}
            style={{ height: 34, padding: "0 14px" }}
          >
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="max-w-xs flex-1">
          <Field label="Program">
            <SelectInput value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="" className="text-black">All programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id} className="text-black">
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="flex-1 min-w-[200px]">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by description or submitter…" />
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} rows={pageRows} loading={loading} emptyLabel="No expenses submitted yet." />
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {reviewing && (
        <ReviewModal
          expense={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={() => {
            setReviewing(null);
            loadAll();
          }}
        />
      )}
    </div>
  );
}
