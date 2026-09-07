import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, PenLine, Download, ChevronDown, FileText, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Field, TextInput } from "../../components/FormField.jsx";
import SignaturePad from "../../components/SignaturePad.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { mealTransportReportsApi } from "../../api/mealTransportReports.api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { downloadBlob } from "../../utils/downloadBlob.js";

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function weekDates(start, end) {
  const days = [];
  const d = new Date(start);
  const dayCount = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  for (let i = 0; i < dayCount; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function EntryModal({ open, date, initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({ mealUsd: "", accommodationUsd: "", transportUsd: "" });
  useEffect(() => {
    if (open) {
      setForm({
        mealUsd: initial?.mealUsd ?? "",
        accommodationUsd: initial?.accommodationUsd ?? "",
        transportUsd: initial?.transportUsd ?? "",
      });
    }
  }, [open, initial]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(10,12,16,0.5)" }}>
      <div className="card w-full max-w-sm p-6 flex flex-col gap-4">
        <p className="font-semibold" style={{ color: "var(--text)" }}>
          {date?.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <Field label="Meal (USD)">
          <TextInput type="number" min="0" step="0.01" value={form.mealUsd} onChange={(e) => setForm((f) => ({ ...f, mealUsd: e.target.value }))} />
        </Field>
        <Field label="Accommodation (USD)">
          <TextInput
            type="number"
            min="0"
            step="0.01"
            value={form.accommodationUsd}
            onChange={(e) => setForm((f) => ({ ...f, accommodationUsd: e.target.value }))}
          />
        </Field>
        <Field label="Transport (USD)">
          <TextInput type="number" min="0" step="0.01" value={form.transportUsd} onChange={(e) => setForm((f) => ({ ...f, transportUsd: e.target.value }))} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={saving}
            onClick={() =>
              onSave({
                mealUsd: Number(form.mealUsd) || 0,
                accommodationUsd: Number(form.accommodationUsd) || 0,
                transportUsd: Number(form.transportUsd) || 0,
              })
            }
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SignatureModal({ open, defaultName, onSign, onClose, signing, roleLabel }) {
  const [mode, setMode] = useState("name"); // "name" | "draw"
  const [name, setName] = useState(defaultName || "");
  const [signatureImage, setSignatureImage] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("name");
      setName(defaultName || "");
      setSignatureImage(null);
      setConfirmed(false);
    }
  }, [open, defaultName]);

  if (!open) return null;

  const ready = mode === "name" ? name.trim().length > 0 : Boolean(signatureImage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(10,12,16,0.5)" }}>
      <div className="card w-full max-w-md p-6 flex flex-col gap-4">
        <div>
          <p className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <PenLine size={16} style={{ color: "var(--violet)" }} />
            Digital signature, {roleLabel}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={mode === "name" ? "range-btn active" : "range-btn"}
            onClick={() => setMode("name")}
          >
            Name
          </button>
          <button
            type="button"
            className={mode === "draw" ? "range-btn active" : "range-btn"}
            onClick={() => setMode("draw")}
          >
            Draw signature
          </button>
        </div>

        {mode === "name" ? (
          <>
            <Field label="Your name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            {name.trim() && (
              <div className="rounded-lg px-4 py-3 text-center" style={{ backgroundColor: "var(--surface-2)" }}>
                <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 26, color: "var(--text)" }}>{name}</span>
              </div>
            )}
          </>
        ) : (
          <SignaturePad onChange={setSignatureImage} />
        )}

        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          {mode === "name" ? "This is my name, used as my signature." : "This is my own signature, drawn just now."}
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!ready || !confirmed || signing}
            onClick={() => onSign({ signatureName: name.trim(), signatureImage: mode === "draw" ? signatureImage : null })}
          >
            {signing ? "Signing…" : "Sign"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MealTransportReportDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [entryModal, setEntryModal] = useState(null); // { date, initial }
  const [savingEntry, setSavingEntry] = useState(false);
  const [signModal, setSignModal] = useState(null); // "preparer" | "approver"
  const [signing, setSigning] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await mealTransportReportsApi.get(id);
      setReport(res);
    } catch (err) {
      setError(err.message || "Couldn't load this report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  if (error || !report) {
    return (
      <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
        {error || "Report not found."}
      </div>
    );
  }

  const isPreparer = report.user.id === user.id;
  const isApprover = report.config.approver.id === user.id;
  const isApproved = report.status === "APPROVED";
  const days = weekDates(report.week.weekStart, report.week.weekEnd);
  const entryByDate = new Map(report.entries.map((e) => [e.date.slice(0, 10), e]));

  async function handleSaveEntry(values) {
    setSavingEntry(true);
    try {
      const updated = await mealTransportReportsApi.upsertEntry(report.id, { date: entryModal.date.toISOString().slice(0, 10), ...values });
      setReport(updated);
      setEntryModal(null);
      toast.success("Entry saved");
    } catch (err) {
      toast.error(err.message || "Couldn't save this entry.");
    } finally {
      setSavingEntry(false);
    }
  }

  async function handleSign({ signatureName, signatureImage }) {
    setSigning(true);
    try {
      const updated =
        signModal === "preparer"
          ? await mealTransportReportsApi.signPreparer(report.id, signatureName, signatureImage)
          : await mealTransportReportsApi.signApprover(report.id, signatureName, signatureImage);
      setReport(updated);
      setSignModal(null);
      toast.success(signModal === "preparer" ? "Signed and submitted for approval" : "Report approved");
    } catch (err) {
      toast.error(err.message || "Couldn't sign this report.");
    } finally {
      setSigning(false);
    }
  }

  async function handleExport(format) {
    setExportMenuOpen(false);
    setExporting(true);
    try {
      const blob = await mealTransportReportsApi.export(report.id, format);
      downloadBlob(blob, `meal-transport-report-${report.week.label}.${format}`.replace(/\s+/g, "-"));
    } catch (err) {
      toast.error(err.message || "Couldn't export this report.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/meal-transport-reports" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }}>
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {report.week.label}
          </h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {new Date(report.week.weekStart).toLocaleDateString()} – {new Date(report.week.weekEnd).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={report.status} />

        <div className="relative">
          <button className="btn-secondary" onClick={() => setExportMenuOpen((o) => !o)} disabled={exporting}>
            <Download size={15} />
            {exporting ? "Preparing…" : "Download"}
            <ChevronDown size={13} />
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 mt-1 rounded-lg shadow-lg z-10" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", minWidth: 150 }}>
              <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm table-row" onClick={() => handleExport("pdf")}>
                <FileText size={14} /> PDF
              </button>
              <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm table-row" onClick={() => handleExport("xlsx")}>
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-6">
        {report.config.title.trim() && (
          <h3 className="text-center font-bold" style={{ color: "var(--text)" }}>
            {report.config.title}
          </h3>
        )}
        <p className="text-center font-semibold -mt-4" style={{ color: "var(--text)" }}>
          {report.config.subtitle}
        </p>

        {/* Table 1 — header info, auto-filled */}
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td className="border px-3 py-2 font-medium" style={{ borderColor: "#000000", width: "35%" }}>Project:</td>
              <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{report.config.program.name}</td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-medium" style={{ borderColor: "#000000" }}>Name of {report.config.submitterRole.name}:</td>
              <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{report.user.name}</td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-medium" style={{ borderColor: "#000000" }}>Week:</td>
              <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>
                From {new Date(report.week.weekStart).toLocaleDateString()} To {new Date(report.week.weekEnd).toLocaleDateString()}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table 2 — daily entries */}
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Date", "Meal (USD)", "Accommodation (USD)", "Transport (USD)", "Total (USD)", ""].map((h) => (
                <th key={h} className="border px-3 py-2 text-left" style={{ borderColor: "#000000", color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const key = d.toISOString().slice(0, 10);
              const e = entryByDate.get(key);
              const rowTotal = e ? e.mealUsd + e.accommodationUsd + e.transportUsd : 0;
              return (
                <tr key={key}>
                  <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</td>
                  <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{e ? money(e.mealUsd) : "—"}</td>
                  <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{e ? money(e.accommodationUsd) : "—"}</td>
                  <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{e ? money(e.transportUsd) : "—"}</td>
                  <td className="border px-3 py-2 font-medium" style={{ borderColor: "#000000" }}>{e ? money(rowTotal) : "—"}</td>
                  <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>
                    {isPreparer && !isApproved && (
                      <button onClick={() => setEntryModal({ date: d, initial: e })} aria-label="Edit day">
                        <Pencil size={14} style={{ color: "var(--violet)" }} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Table 3 — totals, Total Transport stacked under Total Accommodation */}
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td className="border px-3 py-2 font-medium" style={{ borderColor: "#000000", width: "35%" }}>Total Meal</td>
              <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{money(report.totalMeal)}</td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-medium" style={{ borderColor: "#000000" }}>Total Accommodation</td>
              <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{money(report.totalAccommodation)}</td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-medium" style={{ borderColor: "#000000" }}>Total Transport</td>
              <td className="border px-3 py-2" style={{ borderColor: "#000000" }}>{money(report.totalTransport)}</td>
            </tr>
            <tr>
              <td className="border px-3 py-2 font-bold" style={{ borderColor: "#000000", backgroundColor: "var(--surface-2)" }}>Grand Total</td>
              <td className="border px-3 py-2 font-bold" style={{ borderColor: "#000000", backgroundColor: "var(--surface-2)" }}>{money(report.grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Table 4 — signatures */}
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="border px-3 py-2 text-left" style={{ borderColor: "#000000" }}>Prepared by ({report.config.submitterRole.name})</th>
              <th className="border px-3 py-2 text-left" style={{ borderColor: "#000000" }}>Approved by ({report.config.approver.role?.name ?? "Approver"})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-3 py-2 align-top" style={{ borderColor: "#000000" }}>
                <p>Name: {report.user.name}</p>
                <p className="mt-2">Signature:</p>
                {report.preparerSignatureImage ? (
                  <img src={report.preparerSignatureImage} alt="Preparer signature" style={{ height: 40, background: "white", borderRadius: 4 }} />
                ) : report.preparerSignatureName ? (
                  <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 22, color: "var(--text)" }}>
                    {report.preparerSignatureName}
                  </span>
                ) : (
                  <p>—</p>
                )}
                <p className="mt-1">Date: {report.preparerSignedAt ? new Date(report.preparerSignedAt).toLocaleDateString() : "—"}</p>
                {isPreparer && !isApproved && (
                  <button className="btn-secondary mt-3" onClick={() => setSignModal("preparer")}>
                    <PenLine size={14} />
                    {report.preparerSignatureName ? "Re-sign" : "Sign & submit"}
                  </button>
                )}
              </td>
              <td className="border px-3 py-2 align-top" style={{ borderColor: "#000000" }}>
                <p>Name: {report.config.approver.name}</p>
                <p className="mt-2">Signature:</p>
                {report.approverSignatureImage ? (
                  <img src={report.approverSignatureImage} alt="Approver signature" style={{ height: 40, background: "white", borderRadius: 4 }} />
                ) : report.approverSignatureName ? (
                  <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 22, color: "var(--text)" }}>
                    {report.approverSignatureName}
                  </span>
                ) : (
                  <p>—</p>
                )}
                <p className="mt-1">Date: {report.approverSignedAt ? new Date(report.approverSignedAt).toLocaleDateString() : "—"}</p>
                {isApprover && report.status === "PENDING_APPROVAL" && (
                  <button className="btn-primary mt-3" onClick={() => setSignModal("approver")}>
                    <CheckCircle2 size={14} />
                    Approve & sign
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <EntryModal
        open={Boolean(entryModal)}
        date={entryModal?.date}
        initial={entryModal?.initial}
        onSave={handleSaveEntry}
        onClose={() => setEntryModal(null)}
        saving={savingEntry}
      />
      <SignatureModal
        open={Boolean(signModal)}
        defaultName={signModal === "preparer" ? report.user.name : report.config.approver.name}
        roleLabel={signModal === "preparer" ? report.config.submitterRole.name : (report.config.approver.role?.name ?? "Approver")}
        onSign={handleSign}
        onClose={() => setSignModal(null)}
        signing={signing}
      />
    </div>
  );
}
