import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Field, TextInput, SelectInput } from "../../components/FormField.jsx";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { programsApi } from "../../api/programs.api.js";
import { useToast } from "../../context/ToastContext.jsx";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const OUTCOMES = ["PENDING", "COMPLETED", "REFUSED", "NOT_FOUND", "RELOCATED", "DECEASED", "REPLACED"];

const EMPTY = {
  name: "",
  telephone: "",
  province: "",
  district: "",
  sector: "",
  cell: "",
  village: "",
  gender: "",
  dateOfBirth: "",
  status: "ACTIVE",
  nationalId: "",
  householdSize: "",
  programIds: [],
  consentGiven: false,
  outcome: "PENDING",
};

export default function BeneficiaryFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const programList = await programsApi.list();
        if (cancelled) return;
        setPrograms(programList);

        if (isEdit) {
          const b = await beneficiariesApi.get(id);
          if (cancelled) return;
          setCode(b.code);
          setForm({
            name: b.name || "",
            telephone: b.telephone || "",
            province: b.province || "",
            district: b.district || "",
            sector: b.sector || "",
            cell: b.cell || "",
            village: b.village || "",
            gender: b.gender || "",
            dateOfBirth: b.dateOfBirth ? b.dateOfBirth.slice(0, 10) : "",
            status: b.status || "ACTIVE",
            nationalId: b.nationalId || "",
            householdSize: b.householdSize ?? "",
            programIds: b.programs?.map((p) => p.id) || [],
            consentGiven: !!b.consentGiven,
            outcome: b.outcome || "PENDING",
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Couldn't load form data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleProgram(programId) {
    setForm((f) => ({
      ...f,
      programIds: f.programIds.includes(programId) ? f.programIds.filter((pid) => pid !== programId) : [...f.programIds, programId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        householdSize: form.householdSize === "" ? undefined : Number(form.householdSize),
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === undefined) delete payload[k];
      });
      if (!payload.programIds) payload.programIds = [];

      if (isEdit) await beneficiariesApi.update(id, payload);
      else await beneficiariesApi.create(payload);

      toast.success(isEdit ? "Beneficiary updated" : "Beneficiary created");
      navigate("/beneficiaries");
    } catch (err) {
      setError(err.message || "Couldn't save this beneficiary.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/beneficiaries" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to beneficiaries">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {isEdit ? "Edit beneficiary" : "Add beneficiary"}
          </h2>
          {code && (
            <p className="text-sm mt-1 mono" style={{ color: "var(--muted)" }}>
              {code}
            </p>
          )}
          {!isEdit && (
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              A code is generated automatically on save.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <TextInput required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Telephone">
            <TextInput value={form.telephone} onChange={(e) => update("telephone", e.target.value)} placeholder="+250…" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Province">
            <TextInput value={form.province} onChange={(e) => update("province", e.target.value)} />
          </Field>
          <Field label="District">
            <TextInput value={form.district} onChange={(e) => update("district", e.target.value)} />
          </Field>
          <Field label="Sector">
            <TextInput value={form.sector} onChange={(e) => update("sector", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Cell">
            <TextInput value={form.cell} onChange={(e) => update("cell", e.target.value)} />
          </Field>
          <Field label="Village" hint="Cell and village power the replacement-matching engine , the more precise, the better the suggested replacements.">
            <TextInput value={form.village} onChange={(e) => update("village", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Gender">
            <SelectInput value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="">—</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date of birth">
            <TextInput type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="National ID">
            <TextInput value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} />
          </Field>
          <Field label="Household size">
            <TextInput type="number" min="0" value={form.householdSize} onChange={(e) => update("householdSize", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Fieldwork outcome">
            <SelectInput value={form.outcome} onChange={(e) => update("outcome", e.target.value)}>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o.replaceAll("_", " ")}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Consent">
            <label className="field cursor-pointer" style={{ gap: 10 }}>
              <input type="checkbox" checked={form.consentGiven} onChange={(e) => update("consentGiven", e.target.checked)} style={{ width: "auto" }} />
              <span className="text-sm" style={{ color: "var(--text)" }}>
                {form.consentGiven ? "Consent obtained" : "Consent not yet obtained"}
              </span>
            </label>
          </Field>
        </div>

        <Field label="Enrolled programs">
          <div className="flex flex-wrap gap-2">
            {programs.length === 0 && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                No programs created yet.
              </span>
            )}
            {programs.map((p) => {
              const active = form.programIds.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleProgram(p.id)}
                  className="badge"
                  style={{
                    cursor: "pointer",
                    border: `1px solid ${active ? "var(--violet)" : "var(--border)"}`,
                    backgroundColor: active ? "rgba(108,92,231,0.12)" : "var(--surface-2)",
                    color: active ? "var(--violet)" : "var(--muted)",
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/beneficiaries" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create beneficiary"}
          </button>
        </div>
      </form>
    </div>
  );
}
