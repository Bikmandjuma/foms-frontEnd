import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Info } from "lucide-react";
import { Field, TextInput, SelectInput } from "../../components/FormField.jsx";
import GeoCascadeSelect from "../../components/GeoCascadeSelect.jsx";
import { usersApi } from "../../api/users.api.js";
import { rolesApi } from "../../api/roles.api.js";
import { downloadBlob } from "../../utils/downloadBlob.js";
import { useToast } from "../../context/ToastContext.jsx";

const EMPTY_MANUAL = {
  groupCode: "",
  groupName: "",
  operationalArea: "",
  roleId: "",
  firstName: "",
  lastName: "",
  email: "",
  telephone: "",
  provinceId: "",
  districtId: "",
  sectorId: "",
  cellId: "",
  villageId: "",
};

export default function AddSupervisorEnumeratorPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState("import"); // "import" | "manual"
  const [roles, setRoles] = useState([]);

  // Import tab state
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");

  // Manual tab state
  const [form, setForm] = useState(EMPTY_MANUAL);
  const [saving, setSaving] = useState(false);
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    rolesApi.list().then(setRoles).catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleDownloadTemplate() {
    try {
      const blob = await usersApi.downloadGroupsTemplate();
      downloadBlob(blob, "supervisor-enumerator-groups-template.xlsx");
    } catch (err) {
      toast.error(err.message || "Couldn't download the template.");
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!file) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);
    try {
      const result = await usersApi.importGroups(file);
      setImportResult(result);
      if (result.createdCount > 0) {
        toast.success(`Imported ${result.createdCount} of ${result.createdCount + result.duplicateCount + result.errorCount} rows`);
      }
    } catch (err) {
      setImportError(err.message || "Couldn't import that file.");
    } finally {
      setImporting(false);
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setManualError("");
    if (!form.districtId || !form.provinceId) {
      setManualError("District and Province are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      await usersApi.create(payload);
      toast.success("Added — they sign in with their email and phone number as the password.");
      navigate("/users");
    } catch (err) {
      setManualError(err.message || "Couldn't create this user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/users" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to users">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            Add Supervisor & Enumerator
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Bring in a whole group at once from a spreadsheet, or add one person by hand.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button className={tab === "import" ? "range-btn active" : "range-btn"} onClick={() => setTab("import")} type="button">
          Import Excel file
        </button>
        <button className={tab === "manual" ? "range-btn active" : "range-btn"} onClick={() => setTab("manual")} type="button">
          Add manually
        </button>
      </div>

      {tab === "import" && (
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex items-start gap-2 text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            One row per person Group, Group name, Operational area, Role (Supervisor/Enumerator), Name, Phone number, Email, District,
            Region. Any number of groups, any number of enumerators per group. Everyone signs in with their email and their own phone
            number as the password.
          </div>

          <button type="button" className="btn-secondary self-start" onClick={handleDownloadTemplate}>
            <Download size={15} />
            Download template
          </button>

          <form onSubmit={handleImport} className="flex flex-col gap-4">
            <div
              className="rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
              style={{ border: "2px dashed var(--border)", backgroundColor: "var(--surface-2)" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet size={28} style={{ color: "var(--violet)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {file ? file.name : "Click to choose a .xlsx file"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {importError && (
              <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
                {importError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="submit" className="btn-primary" disabled={!file || importing}>
                <Upload size={15} />
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          </form>

          {importResult && (
            <div className="flex flex-col gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5" style={{ color: "var(--status-active-fg)" }}>
                  <CheckCircle2 size={15} /> {importResult.createdCount} created
                </span>
                {importResult.duplicateCount > 0 && (
                  <span style={{ color: "var(--muted)" }}>{importResult.duplicateCount} already existed</span>
                )}
                {importResult.errorCount > 0 && (
                  <span className="flex items-center gap-1.5" style={{ color: "var(--status-suspended-fg)" }}>
                    <XCircle size={15} /> {importResult.errorCount} rows had errors
                  </span>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-xs flex flex-col gap-1" style={{ color: "var(--status-suspended-fg)" }}>
                  {importResult.errors.map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
              {importResult.createdCount > 0 && (
                <button type="button" className="btn-secondary self-start" onClick={() => navigate("/users")}>
                  Go to users list
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "manual" && (
        <form onSubmit={handleManualSubmit} className="card p-6 flex flex-col gap-4">
          <div className="flex items-start gap-2 text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            They'll sign in with this email and their own phone number as the password — no password to set here.
          </div>

          {manualError && (
            <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
              {manualError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Group name">
              <TextInput value={form.groupName} onChange={(e) => update("groupName", e.target.value)} placeholder="Gasabo Cluster A" />
            </Field>
            <Field label="Group code">
              <TextInput value={form.groupCode} onChange={(e) => update("groupCode", e.target.value)} placeholder="Group 01" />
            </Field>
          </div>

          <Field label="Operational area">
            <TextInput value={form.operationalArea} onChange={(e) => update("operationalArea", e.target.value)} placeholder="Gasabo District" />
          </Field>

          <Field label="Role" required>
            <SelectInput required value={form.roleId} onChange={(e) => update("roleId", e.target.value)}>
              <option value="">Select Supervisor or Enumerator…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" required>
              <TextInput required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Kanyarukiga" />
            </Field>
            <Field label="Last name" required>
              <TextInput required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Meshack" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" required>
              <TextInput type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@tenant.rw" />
            </Field>
            <Field label="Phone number" required hint="Also becomes their password">
              <TextInput required value={form.telephone} onChange={(e) => update("telephone", e.target.value)} placeholder="+250788303215" />
            </Field>
          </div>

          <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-medium uppercase tracking-widest mt-4 mb-3" style={{ color: "var(--muted)" }}>
              Address
            </p>
            <GeoCascadeSelect
              value={{
                provinceId: form.provinceId,
                districtId: form.districtId,
                sectorId: form.sectorId,
                cellId: form.cellId,
                villageId: form.villageId,
              }}
              onChange={(next) => setForm((f) => ({ ...f, ...next }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/users" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Adding…" : "Add person"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
