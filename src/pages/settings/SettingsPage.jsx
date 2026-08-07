import React, { useRef, useState } from "react";
import { Sun, Moon, Camera, User as UserIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { Field, TextInput, SelectInput } from "../../components/FormField.jsx";
import GeoCascadeSelect from "../../components/GeoCascadeSelect.jsx";
import { usersApi } from "../../api/users.api.js";
import { resolveAssetUrl } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

const GENDERS = ["MALE", "FEMALE", "OTHER"];

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: user?.firstName || (user?.name ? user.name.split(" ")[0] : ""),
    lastName: user?.lastName || (user?.name ? user.name.split(" ").slice(1).join(" ") : ""),
    telephone: user?.telephone || "",
    gender: user?.gender || "",
    province: user?.province || "",
    district: user?.district || "",
    sector: user?.sector || "",
    cell: user?.cell || "",
    village: user?.village || "",
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await usersApi.uploadMyAvatar(file);
      await refresh();
      toast.success("Profile photo updated");
    } catch (err) {
      setError(err.message || "Couldn't upload that image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      await usersApi.update(user.id, payload);
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      setError(err.message || "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = resolveAssetUrl(user?.avatarUrl);
  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Your profile and preferences.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="card p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: "var(--violet)", border: "2px solid var(--border)" }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Your profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-white">{initials || <UserIcon size={28} color="white" />}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
              aria-label="Change profile photo"
              title="Change profile photo"
            >
              <Camera size={14} color="var(--text)" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
              {[form.firstName, form.lastName].filter(Boolean).join(" ") || user?.name || user?.email}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
              {user?.email}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {uploading ? "Uploading…" : "JPG, PNG, WEBP or GIF, up to 4MB"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="pt-4">
            <p style={{ color: "var(--muted)" }}>Role</p>
            <p style={{ color: "var(--text)" }}>{user?.isPlatformAdmin ? "Platform admin" : user?.role?.name || "—"}</p>
          </div>
          <div className="pt-4">
            <p style={{ color: "var(--muted)" }}>Tenant</p>
            <p style={{ color: "var(--text)" }}>{user?.tenant?.name || "—"}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="card p-6 flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Edit profile
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name">
            <TextInput value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
          </Field>
          <Field label="Last name">
            <TextInput value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-medium uppercase tracking-widest mt-4 mb-3" style={{ color: "var(--muted)" }}>
            Address
          </p>
          <GeoCascadeSelect
            value={{ province: form.province, district: form.district, sector: form.sector, cell: form.cell, village: form.village }}
            onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <div className="card p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Appearance
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Defaults to light. Your choice is remembered on this device.
          </p>
        </div>
        <button className="theme-toggle-track" onClick={toggleTheme} aria-label="Toggle dark mode" aria-pressed={isDark}>
          <div className="theme-toggle-thumb">{isDark ? <Moon size={12} color="#8790A3" /> : <Sun size={12} color="#D98A0E" />}</div>
        </button>
      </div>
    </div>
  );
}
