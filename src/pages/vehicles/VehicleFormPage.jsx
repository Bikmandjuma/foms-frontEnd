import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Truck, User2, Gauge } from "lucide-react";
import { Field, TextInput, SelectInput } from "../../components/FormField.jsx";
import { vehiclesApi } from "../../api/vehicles.api.js";
import { useToast } from "../../context/ToastContext.jsx";

const EMPTY = { name: "", type: "VEHICLE", driverName: "", capacityPerDay: "", active: true };

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    vehiclesApi
      .get(id)
      .then(
        (v) =>
          !cancelled &&
          setForm({
            name: v.name || "",
            type: v.type || "VEHICLE",
            driverName: v.driverName || "",
            capacityPerDay: v.capacityPerDay ?? "",
            active: v.active,
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
    setSaving(true);
    try {
      const payload = {
        ...form,
        driverName: form.driverName || undefined,
        capacityPerDay: form.capacityPerDay === "" ? undefined : Number(form.capacityPerDay),
      };
      if (isEdit) await vehiclesApi.update(id, payload);
      else await vehiclesApi.create(payload);
      toast.success(isEdit ? "Vehicle updated" : "Vehicle added");
      navigate("/vehicles");
    } catch (err) {
      setError(err.message || "Couldn't save this vehicle.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/vehicles" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to vehicles">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {isEdit ? "Edit vehicle" : "Add vehicle"}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            A name/plate, driver, and optional daily capacity that's all the engine needs.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <Field label="Name or plate number" required>
          <TextInput icon={Truck} required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. RAB 123 A" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => update("type", e.target.value)}>
              <option value="VEHICLE">Vehicle</option>
              <option value="MOTORCYCLE">Motorcycle</option>
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={form.active ? "true" : "false"} onChange={(e) => update("active", e.target.value === "true")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </SelectInput>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Driver">
            <TextInput icon={User2} value={form.driverName} onChange={(e) => update("driverName", e.target.value)} placeholder="e.g. Eric Mugisha" />
          </Field>
          <Field label="Capacity per day" hint="Leave blank for no cap.">
            <TextInput icon={Gauge} type="number" min="1" value={form.capacityPerDay} onChange={(e) => update("capacityPerDay", e.target.value)} placeholder="e.g. 20" />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/vehicles" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add vehicle"}
          </button>
        </div>
      </form>
    </div>
  );
}
