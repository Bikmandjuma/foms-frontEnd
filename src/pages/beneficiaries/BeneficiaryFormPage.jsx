import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Field, TextInput, SelectInput } from "../../components/FormField.jsx";
import GeoCascadeSelect from "../../components/GeoCascadeSelect.jsx";
import { beneficiariesApi } from "../../api/beneficiaries.api.js";
import { programsApi } from "../../api/programs.api.js";
import { useToast } from "../../context/ToastContext.jsx";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const OUTCOMES = ["PENDING", "COMPLETED", "REFUSED", "NOT_FOUND", "RELOCATED", "DECEASED", "REPLACED"];

const EMPTY = {
  name: "",
  telephone: "",
  provinceId: "",
  districtId: "",
  sectorId: "",
  cellId: "",
  villageId: "",
  gender: "",
  ageRange: "",
  status: "ACTIVE",
  ipName: "",
  category: "",
  personalId: "",
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
            provinceId: b.province?.id || "",
            districtId: b.district?.id || "",
            sectorId: b.sector?.id || "",
            cellId: b.cell?.id || "",
            villageId: b.village?.id || "",
            gender: b.gender || "",
            ageRange: b.ageRange || "",
            status: b.status || "ACTIVE",
            ipName: b.ipName || "",
            category: b.category || "",
            personalId: b.personalId || "",
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
      const payload = { ...form };
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

        <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-medium uppercase tracking-widest mt-4 mb-1" style={{ color: "var(--muted)" }}>
            Address
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            Cell and village power the replacement-matching engine the more precise, the better the suggested replacements.
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Gender">
            <SelectInput value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="" className="text-black">—</option>
              {GENDERS.map((g) => (
                <option key={g} value={g} className="text-black">
                  {g}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Age" hint="Range like 18-20">
            <TextInput value={form.ageRange} onChange={(e) => update("ageRange", e.target.value)} placeholder="18-20" />
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="IP name">
            <TextInput value={form.ipName} onChange={(e) => update("ipName", e.target.value)} />
          </Field>
          <Field label="Category">
            <TextInput value={form.category} onChange={(e) => update("category", e.target.value)} />
          </Field>
          <Field label="Personal ID">
            <TextInput value={form.personalId} onChange={(e) => update("personalId", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Fieldwork outcome">
            <SelectInput value={form.outcome} onChange={(e) => update("outcome", e.target.value)}>
              {OUTCOMES.map((o) => (
                <option key={o} value={o} className="text-black">
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
