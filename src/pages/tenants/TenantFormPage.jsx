import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Field, TextInput } from "../../components/FormField.jsx";
import { tenantsApi } from "../../api/tenants.api.js";

// Tenant *creation* also creates that tenant's first admin user in the same
// call (see tenantController.createTenant). The backend's updateTenantSchema
// only accepts { name }, so editing an existing tenant here is rename-only.
export default function TenantFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", adminEmail: "", adminPassword: "", adminName: "" });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    tenantsApi
      .get(id)
      .then((t) => !cancelled && setForm((f) => ({ ...f, name: t.name || "" })))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        await tenantsApi.update(id, { name: form.name });
      } else {
        await tenantsApi.create({
          name: form.name,
          admin: { email: form.adminEmail, password: form.adminPassword, name: form.adminName || undefined },
        });
      }
      navigate("/tenants");
    } catch (err) {
      setError(err.message || "Couldn't save this tenant.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <Link to="/tenants" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to tenants">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {isEdit ? "Rename tenant" : "Add tenant"}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {isEdit ? "Only the name can be changed here." : "Creates the workspace and its first admin user together."}
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <Field label="Tenant name" required>
          <TextInput required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Kigali Research Partners" />
        </Field>

        {!isEdit && (
          <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-medium uppercase tracking-widest mt-4 mb-3" style={{ color: "var(--muted)" }}>
              First admin user
            </p>
            <div className="flex flex-col gap-4">
              <Field label="Admin email" required>
                <TextInput
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  placeholder="admin@tenant.rw"
                />
              </Field>
              <Field label="Admin password" required>
                <TextInput
                  type="password"
                  required
                  minLength={8}
                  value={form.adminPassword}
                  onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                  placeholder="Minimum 8 characters"
                />
              </Field>
              <Field label="Admin name">
                <TextInput value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} />
              </Field>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/tenants" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create tenant"}
          </button>
        </div>
      </form>
    </div>
  );
}
