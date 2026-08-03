import React, { useRef, useState } from "react";
import { UploadCloud, Download, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { downloadBlob } from "../../utils/downloadBlob.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function ImportBeneficiariesModal({ onClose, onImported }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  async function handleTemplateDownload() {
    setDownloadingTemplate(true);
    try {
      const blob = await beneficiariesApi.downloadTemplate();
      downloadBlob(blob, "beneficiaries-import-template.xlsx");
    } catch (err) {
      setError(err.message || "Couldn't download the template.");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const res = await beneficiariesApi.import(file);
      setResult(res);
      toast.success(`Imported ${res.createdCount} of ${res.totalRows} beneficiaries`);
      onImported?.();
    } catch (err) {
      setError(err.message || "Couldn't import that file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(10,12,16,0.45)" }} onClick={onClose}>
      <div className="card w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <p className="display text-base font-semibold" style={{ color: "var(--text)" }}>
            Import beneficiaries from Excel
          </p>
          <button className="btn-secondary" style={{ height: 32, width: 32, padding: 0 }} onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
          Upload an .xlsx file to bulk-create respondents. Not sure of the column layout? Download the template first.
        </p>

        <button
          type="button"
          className="btn-secondary w-full mb-4"
          onClick={handleTemplateDownload}
          disabled={downloadingTemplate}
        >
          <Download size={15} />
          {downloadingTemplate ? "Preparing…" : "Download blank template"}
        </button>

        <label
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors"
          style={{ borderColor: file ? "var(--violet)" : "var(--border)", backgroundColor: "var(--surface-2)" }}
        >
          <UploadCloud size={22} color={file ? "var(--violet)" : "var(--muted)"} />
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {file ? file.name : "Click to choose an .xlsx file"}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {file ? `${(file.size / 1024).toFixed(0)} KB` : "or drag and drop"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              setResult(null);
              setError("");
              setFile(e.target.files?.[0] || null);
            }}
          />
        </label>

        {error && (
          <div className="text-sm rounded-xl px-4 py-3 mt-4" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
            {error}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-3 mt-4">
            <div
              className="flex items-center gap-2 text-sm rounded-xl px-4 py-3"
              style={{ backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}
            >
              <CheckCircle2 size={16} />
              Imported {result.createdCount} of {result.totalRows} row(s).
            </div>
            {result.warnings?.length > 0 && (
              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)" }}>
                <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: "var(--amber)" }}>
                  <AlertTriangle size={13} />
                  {result.warnings.length} warning(s)
                </p>
                <ul className="text-xs flex flex-col gap-1" style={{ color: "var(--muted)" }}>
                  {result.warnings.map((w, i) => (
                    <li key={i}>
                      Row {w.row}: {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.errors?.length > 0 && (
              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)" }}>
                <p className="text-xs font-medium mb-1.5" style={{ color: "var(--status-suspended-fg)" }}>
                  {result.errors.length} row(s) skipped
                </p>
                <ul className="text-xs flex flex-col gap-1" style={{ color: "var(--status-suspended-fg)" }}>
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-5">
          <button className="btn-secondary" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button className="btn-primary" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Importing…" : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
