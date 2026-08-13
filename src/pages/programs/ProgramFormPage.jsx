import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Field, TextInput, TextArea, SelectInput } from "../../components/FormField.jsx";
import { programsApi } from "../../api/programs.api.js";
import { useToast } from "../../context/ToastContext.jsx";

const SCENARIO_TYPES = ["BASELINE_SURVEY", "ENDLINE_SURVEY", "TRACER_STUDY", "PROGRAM_OUTCOME_ASSESSMENT", "QUALITATIVE_STUDY", "OTHER"];
const PROJECT_STATUSES = ["PLANNING", "FIELDWORK", "DATA_CLEANING", "REPORTING", "COMPLETED", "OTHER"];

export default function ProgramFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    description: "",
    scenarioType: "",
    scenarioTypeOther: "",
    status: "PLANNING",
    statusOther: "",
    targetSampleSize: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    programsApi
      .get(id)
      .then(
        (p) =>
          !cancelled &&
          setForm({
            name: p.name || "",
            description: p.description || "",
            scenarioType: p.scenarioType || "",
            scenarioTypeOther: p.scenarioTypeOther || "",
            status: p.status || "PLANNING",
            statusOther: p.statusOther || "",
            targetSampleSize: p.targetSampleSize ?? "",
            startDate: p.startDate ? p.startDate.slice(0, 10) : "",
            endDate: p.endDate ? p.endDate.slice(0, 10) : "",
          })
      )
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.scenarioType === "OTHER" && !form.scenarioTypeOther.trim()) {
      setError("Describe the study scenario when selecting 'Other'.");
      return;
    }
    if (form.status === "OTHER" && !form.statusOther.trim()) {
      setError("Describe the status when selecting 'Other'.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description || undefined,
        scenarioType: form.scenarioType || undefined,
        scenarioTypeOther: form.scenarioType === "OTHER" ? form.scenarioTypeOther : undefined,
        statusOther: form.status === "OTHER" ? form.statusOther : undefined,
        targetSampleSize: form.targetSampleSize === "" ? undefined : Number(form.targetSampleSize),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };
      if (isEdit) await programsApi.update(id, payload);
      else await programsApi.create(payload);
      toast.success(isEdit ? "Program updated" : "Program created");
      navigate("/programs");
    } catch (err) {
      setError(err.message || "Couldn't save this program.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/programs" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to programs">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {isEdit ? "Edit program" : "Add program"}
          </h2>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <Field label="Name" required>
          <TextInput required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Nutrition Support Q3" />
        </Field>
        <Field label="Description">
          <TextArea value={form.description} onChange={(e) => update("description", e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Field label="Study scenario">
              <SelectInput value={form.scenarioType} onChange={(e) => update("scenarioType", e.target.value)}>
                <option value="" className="text-black">—</option>
                {SCENARIO_TYPES.map((s) => (
                  <option key={s} value={s} className="text-black">
                    {s === "OTHER" ? "Other…" : s.replaceAll("_", " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            {form.scenarioType === "OTHER" && (
              <TextInput
                required
                value={form.scenarioTypeOther}
                onChange={(e) => update("scenarioTypeOther", e.target.value)}
                placeholder="Describe the study scenario"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => update("status", e.target.value)}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s} className="text-black">
                    {s === "OTHER" ? "Other…" : s.replaceAll("_", " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            {form.status === "OTHER" && (
              <TextInput required value={form.statusOther} onChange={(e) => update("statusOther", e.target.value)} placeholder="Describe the status" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Target sample size">
            <TextInput type="number" min="0" value={form.targetSampleSize} onChange={(e) => update("targetSampleSize", e.target.value)} />
          </Field>
          <Field label="Start date">
            <TextInput type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
          </Field>
          <Field label="End date">
            <TextInput type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/programs" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create program"}
          </button>
        </div>
      </form>
    </div>
  );
}
