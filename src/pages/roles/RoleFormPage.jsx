import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  ClipboardList,
  Heart,
  Link2,
  Repeat,
  Radar,
  History,
  Building2,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  Check,
} from "lucide-react";
import { Field, TextInput, TextArea } from "../../components/FormField.jsx";
import { rolesApi } from "../../api/roles.api.js";
import { metaApi } from "../../api/meta.api.js";
import { useToast } from "../../context/ToastContext.jsx";

// Same icon-per-resource mapping as the sidebar (nav.config.js) so a role's
// permissions read as an extension of the same visual language, not a
// separate mini-language of their own.
const GROUP_ICON = {
  Users,
  Roles: ShieldCheck,
  Programs: ClipboardList,
  Beneficiaries: Heart,
  Assignments: Link2,
  "Replacement requests": Repeat,
  "Field monitoring": Radar,
  "Activity logs": History,
  Tenants: Building2,
};

// Plain-English sentence for each action, instead of the raw
// "resource:action" string. Most groups now use view/create/edit/delete;
// Field monitoring keeps the simpler view/manage shape since it doesn't map
// onto CRUD (there's nothing to "create" about overriding a checkout).
function actionCopy(groupLabel, action) {
  const noun = groupLabel.toLowerCase();
  if (action === "view") return `See ${noun}`;
  if (action === "create") return `Add new ${noun}`;
  if (action === "edit") return `Edit existing ${noun}`;
  if (action === "delete") return `Delete ${noun}`;
  if (action === "manage") return `Create, edit, and delete ${noun}`;
  return action;
}

// A role saved before granular permissions existed may still carry
// "resource:manage" instead of the create/edit/delete trio. Expand it so
// the checkboxes show the right thing pre-checked; saving the role from
// here on writes the granular set, quietly completing the migration.
function expandLegacyManage(storedPermissions, groups) {
  const expanded = new Set(storedPermissions);
  for (const perm of storedPermissions) {
    if (!perm.endsWith(":manage")) continue;
    const resource = perm.split(":")[0];
    const group = groups.find((g) => g.permissions.some((p) => p.startsWith(`${resource}:`)));
    if (!group) continue;
    for (const groupPerm of group.permissions) {
      if (groupPerm.startsWith(`${resource}:`) && groupPerm !== `${resource}:manage`) {
        expanded.add(groupPerm);
      }
    }
  }
  return Array.from(expanded);
}

function Toggle({ checked, onChange, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        padding: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        backgroundColor: checked ? "var(--violet)" : "var(--surface)",
        border: `1px solid ${checked ? "var(--violet)" : "var(--border)"}`,
        cursor: "pointer",
        transition: "background-color .15s ease, justify-content .15s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          backgroundColor: checked ? "white" : "var(--muted)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          transition: "background-color .15s ease",
        }}
      />
    </button>
  );
}

export default function RoleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();
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
          const stored = Array.isArray(r.permissions) ? r.permissions : [];
          setPermissions(expandLegacyManage(stored, catalog));
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
      // Resources that used to have a single "manage" permission now have
      // granular create/edit/delete instead — drop the stray legacy string
      // once its granular equivalents are present, so a re-saved role is
      // fully migrated rather than carrying redundant leftovers. Field
      // monitoring's "manage" is current, not legacy — leave it alone.
      const crudResources = new Set(
        groups.filter((g) => g.permissions.some((p) => p.endsWith(":create"))).flatMap((g) => g.permissions.map((p) => p.split(":")[0]))
      );
      const cleanedPermissions = permissions.filter((p) => !(p.endsWith(":manage") && crudResources.has(p.split(":")[0])));

      const payload = { name: form.name, description: form.description || undefined, permissions: cleanedPermissions };
      if (isEdit) await rolesApi.update(id, payload);
      else await rolesApi.create(payload);
      toast.success(isEdit ? "Role updated" : "Role created");
      navigate("/roles");
    } catch (err) {
      setError(err.message || "Couldn't save this role.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/roles" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to roles">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {isEdit ? "Edit role" : "Add role"}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Real, per-role permissions — exactly what a user with this role can and can't do.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required>
            <TextInput required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. field supervisor" />
          </Field>
          <Field label="Description">
            <TextArea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this role do?" />
          </Field>
        </div>

        <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-medium uppercase tracking-widest mt-5 mb-4" style={{ color: "var(--muted)" }}>
            Permissions
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => {
              const grantedCount = group.permissions.filter((p) => permissions.includes(p)).length;
              const allSelected = grantedCount === group.permissions.length;

              return (
                <div
                  key={group.label}
                  className="rounded-2xl p-4 flex flex-col"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: `1px solid ${grantedCount > 0 ? "rgba(108,92,231,0.3)" : "var(--border)"}`,
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: grantedCount > 0 ? "rgba(108,92,231,0.14)" : "var(--surface)" }}
                    >
                      {React.createElement(GROUP_ICON[group.label] || ShieldCheck, {
                        size: 16,
                        color: grantedCount > 0 ? "var(--violet)" : "var(--muted)",
                      })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                        {group.label}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {grantedCount} of {group.permissions.length} granted
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium shrink-0 flex items-center gap-1"
                      style={{ color: "var(--violet)" }}
                      onClick={() => toggleGroup(group.permissions, allSelected)}
                    >
                      {allSelected ? "Clear" : "Select all"}
                    </button>
                  </div>

                  {/* Underneath: one row per permission (View, Manage, …) */}
                  <div className="flex flex-col mt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    {group.permissions.map((perm) => {
                      const action = perm.split(":")[1];
                      const active = permissions.includes(perm);
                      const ROW_ICONS = { view: Eye, create: Plus, edit: Pencil, delete: Trash2, manage: Wrench };
                      const RowIcon = ROW_ICONS[action] || Wrench;
                      return (
                        <label
                          key={perm}
                          htmlFor={perm}
                          className="flex items-center gap-3 py-2.5 cursor-pointer"
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <RowIcon size={14} color="var(--muted)" className="shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium capitalize" style={{ color: "var(--text)" }}>
                              {action}
                            </p>
                            <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                              {actionCopy(group.label, action)}
                            </p>
                          </div>
                          <Toggle id={perm} checked={active} onChange={() => togglePermission(perm)} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <Check size={13} color="var(--teal)" />
            {permissions.length} permission{permissions.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-3">
            <Link to="/roles" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create role"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
