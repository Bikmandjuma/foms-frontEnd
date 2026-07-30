import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Field, TextInput, TextArea } from "../../components/FormField.jsx";
import { rolesApi } from "../../api/roles.api.js";
import { metaApi } from "../../api/meta.api.js";

export default function RoleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", description: "" });
  const [permissions, setPermissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const catalog = await metaApi.permissionCatalog();
        if (!cancelled) setGroups(catalog);

        if (isEdit) {
          const r = await rolesApi.get(id);
          if (cancelled) return;
          setForm({ name: r.name || "", description: r.description || "" });
          setPermissions(Array.isArray(r.permissions) ? r.permissions : []);
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

  function togglePermission(perm) {
    setPermissions((p) => (p.includes(perm) ? p.filter((x) => x !== perm) : [...p, perm]));
  }

  function toggleGroup(groupPerms, allSelected) {
    setPermissions((p) => {
      if (allSelected) return p.filter((x) => !groupPerms.includes(x));
      const next = new Set(p);
      groupPerms.forEach((x) => next.add(x));
      return Array.from(next);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { name: form.name, description: form.description || undefined, permissions };
      if (isEdit) await rolesApi.update(id, payload);
      else await rolesApi.create(payload);
      navigate("/roles");
    } catch (err) {
      setError(err.message || "Couldn't save this role.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/roles" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to roles">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {isEdit ? "Edit role" : "Add role"}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Real, per-role permissions — everything a user with this role can and can't do.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required>
            <TextInput required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. field supervisor" />
          </Field>
          <Field label="Description">
            <TextArea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this role do?" />
          </Field>
        </div>

        <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-medium uppercase tracking-widest mt-4 mb-3" style={{ color: "var(--muted)" }}>
            Permissions
          </p>
          <div className="flex flex-col gap-3">
            {groups.map((group) => {
              const allSelected = group.permissions.every((p) => permissions.includes(p));
              return (
                <div
                  key={group.label}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                      {group.label}
                    </p>
                    <button
                      type="button"
                      className="text-xs font-medium"
                      style={{ color: "var(--violet)" }}
                      onClick={() => toggleGroup(group.permissions, allSelected)}
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.permissions.map((perm) => {
                      const active = permissions.includes(perm);
                      const label = perm.split(":")[1];
                      return (
                        <button
                          type="button"
                          key={perm}
                          onClick={() => togglePermission(perm)}
                          className="badge"
                          style={{
                            cursor: "pointer",
                            border: `1px solid ${active ? "var(--violet)" : "var(--border)"}`,
                            backgroundColor: active ? "rgba(108,92,231,0.12)" : "var(--surface)",
                            color: active ? "var(--violet)" : "var(--muted)",
                            textTransform: "capitalize",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link to="/roles" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create role"}
          </button>
        </div>
      </form>
    </div>
  );
}
