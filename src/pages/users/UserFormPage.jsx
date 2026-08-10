import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Field, TextInput, SelectInput } from "../../components/FormField.jsx";
import GeoCascadeSelect from "../../components/GeoCascadeSelect.jsx";
import { usersApi } from "../../api/users.api.js";
import { rolesApi } from "../../api/roles.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const EDUCATION_LEVELS = ["NONE", "PRIMARY", "SECONDARY", "BACHELORS", "MASTERS", "DOCTORATE"];

const EMPTY = {
  email: "",
  password: "",
  roleId: "",
  firstName: "",
  lastName: "",
  telephone: "",
  provinceId: "",
  districtId: "",
  sectorId: "",
  cellId: "",
  villageId: "",
  gender: "",
  dateOfBirth: "",
  status: "ACTIVE",
  educationLevel: "",
};

export default function UserFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = usePermissions();
  // Creating is always manager-only (route already enforces this). Editing
  // can also mean "editing myself" via the self-service route bypass — in
  // that case role/status must stay read-only; only a manager changes those,
  // on anyone, including themselves.
  const canManage = can(ACTIONS.USERS_EDIT);
  const canEditRoleAndStatus = !isEdit || canManage;

  const [form, setForm] = useState(EMPTY);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const roleList = await rolesApi.list();
        if (cancelled) return;
        setRoles(roleList);

        if (isEdit) {
          const u = await usersApi.get(id);
          if (cancelled) return;
          setForm({
            email: u.email || "",
            password: "",
            roleId: u.roleId || "",
            firstName: u.firstName || (u.name ? u.name.split(" ")[0] : ""),
            lastName: u.lastName || (u.name ? u.name.split(" ").slice(1).join(" ") : ""),
            telephone: u.telephone || "",
            provinceId: u.province?.id || "",
            districtId: u.district?.id || "",
            sectorId: u.sector?.id || "",
            cellId: u.cell?.id || "",
            villageId: u.village?.id || "",
            gender: u.gender || "",
            dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : "",
            status: u.status || "ACTIVE",
            educationLevel: u.educationLevel || "",
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form };
      if (!canEditRoleAndStatus) {
        delete payload.roleId;
        delete payload.status;
      }
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      if (isEdit && !payload.password) delete payload.password;

      if (isEdit) await usersApi.update(id, payload);
      else await usersApi.create(payload);

      toast.success(isEdit ? "User updated" : "User created");
      navigate("/users");
    } catch (err) {
      setError(err.message || "Couldn't save this user.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/users" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to users">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {isEdit ? "Edit user" : "Add user"}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {isEdit ? "Update this user's profile, role, or status." : "Create a new user for this tenant."}
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {isEdit && !canEditRoleAndStatus && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
          You're editing your own profile — only a manager can change your role or status.
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" required>
            <TextInput type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@tenant.rw" />
          </Field>
          <Field label={isEdit ? "New password (leave blank to keep current)" : "Password"} required={!isEdit}>
            <TextInput
              type="password"
              required={!isEdit}
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name">
            <TextInput value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Jane" />
          </Field>
          <Field label="Last name">
            <TextInput value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Uwimana" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Telephone">
            <TextInput value={form.telephone} onChange={(e) => update("telephone", e.target.value)} placeholder="+250…" />
          </Field>
          <Field label="Role" required={canEditRoleAndStatus}>
            {canEditRoleAndStatus ? (
              <SelectInput required value={form.roleId} onChange={(e) => update("roleId", e.target.value)}>
                <option value="" className="text-black">Select a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="text-black">
                    {r.name}
                  </option>
                ))}
              </SelectInput>
            ) : (
              <div className="field" style={{ color: "var(--muted)" }}>
                <ShieldCheck size={16} color="var(--muted)" />
                {roles.find((r) => r.id === form.roleId)?.name || "No role assigned"}
              </div>
            )}
          </Field>
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
          <Field label="Date of birth">
            <TextInput type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
          </Field>
          <Field label="Education level">
            <SelectInput value={form.educationLevel} onChange={(e) => update("educationLevel", e.target.value)}>
              <option value="">—</option>
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl} className="text-black">
                  {lvl}
                </option>
              ))}
            </SelectInput>
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

        <Field label="Status">
          {canEditRoleAndStatus ? (
            <SelectInput value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="text-black">
                  {s}
                </option>
              ))}
            </SelectInput>
          ) : (
            <div className="field" style={{ color: "var(--muted)" }}>
              {form.status}
            </div>
          )}
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/users" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}
