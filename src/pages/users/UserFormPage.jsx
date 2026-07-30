import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Field, TextInput, SelectInput } from "../../components/FormField.jsx";
import { usersApi } from "../../api/users.api.js";
import { rolesApi } from "../../api/roles.api.js";

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const EDUCATION_LEVELS = ["NONE", "PRIMARY", "SECONDARY", "BACHELORS", "MASTERS", "DOCTORATE"];

const EMPTY = {
  email: "",
  password: "",
  roleId: "",
  name: "",
  telephone: "",
  province: "",
  district: "",
  sector: "",
  gender: "",
  dateOfBirth: "",
  status: "ACTIVE",
  educationLevel: "",
};

export default function UserFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

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
            name: u.name || "",
            telephone: u.telephone || "",
            province: u.province || "",
            district: u.district || "",
            sector: u.sector || "",
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
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      if (isEdit && !payload.password) delete payload.password;

      if (isEdit) await usersApi.update(id, payload);
      else await usersApi.create(payload);

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
    <div className="flex flex-col gap-5 max-w-2xl">
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
          <Field label="Full name">
            <TextInput value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Uwimana" />
          </Field>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Telephone">
            <TextInput value={form.telephone} onChange={(e) => update("telephone", e.target.value)} placeholder="+250…" />
          </Field>
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
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => update("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Education level">
            <SelectInput value={form.educationLevel} onChange={(e) => update("educationLevel", e.target.value)}>
              <option value="">—</option>
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

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
