import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Field, TextInput, SelectInput } from "../../components/FormField.jsx";
import GeoCascadeSelect from "../../components/GeoCascadeSelect.jsx";
import { usersApi } from "../../api/users.api.js";
import { rolesApi } from "../../api/roles.api.js";
import { useToast } from "../../context/ToastContext.jsx";

const EMPTY = {
  email: "",
  telephone: "",
  roleId: "",
  firstName: "",
  lastName: "",
  provinceId: "",
  districtId: "",
  sectorId: "",
  cellId: "",
  villageId: "",
};

// For anyone who isn't a Supervisor or Enumerator — HR, Data Manager, and
// so on. Only District and Province are required; Sector/Cell/Village stay
// optional and can be filled in later. Login is email + this person's own
// phone number as the password (Rwanda's +250 stripped, local 07... form
// restored) — never typed in here.
export default function AddOtherUserPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    rolesApi.list().then(setRoles).catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.districtId || !form.provinceId) {
      setError("District and Province are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      await usersApi.create(payload);
      toast.success("User created — they sign in with their email and phone number as the password.");
      navigate("/users");
    } catch (err) {
      setError(err.message || "Couldn't create this user.");
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
            Add other staff
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            HR, Data Manager, and any role outside Supervisor & Enumerator.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        They'll sign in with this email and their own phone number as the password (e.g. 0788303215) — no password to set here.
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name" required>
            <TextInput required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Jane" />
          </Field>
          <Field label="Last name" required>
            <TextInput required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Uwimana" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" required>
            <TextInput type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@tenant.rw" />
          </Field>
          <Field label="Phone number" required hint="Also becomes their password">
            <TextInput required value={form.telephone} onChange={(e) => update("telephone", e.target.value)} placeholder="+250788000000" />
          </Field>
        </div>

        <Field label="Role" required>
          <SelectInput required value={form.roleId} onChange={(e) => update("roleId", e.target.value)}>
            <option value="">Select a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-medium uppercase tracking-widest mt-4 mb-1" style={{ color: "var(--muted)" }}>
            Address
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            District and Province are required. Sector, Cell, and Village can be filled in later.
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
            {saving ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}
