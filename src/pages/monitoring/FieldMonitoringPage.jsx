import React, { useEffect, useState } from "react";
import { LogIn, LogOut, MapPin } from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import { fieldCheckInsApi } from "../../api/fieldCheckIns.api.js";
import { programsApi } from "../../api/programs.api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function FieldMonitoringPage() {
  const { user } = useAuth();
  const { can } = usePermissions();

  const [rows, setRows] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [form, setForm] = useState({ projectId: "", note: "" });

  const myActiveCheckIn = rows.find((r) => r.userId === user?.id && !r.checkOutAt);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [checkIns, programList] = await Promise.all([
        fieldCheckInsApi.list(onlyActive ? { active: "true" } : {}),
        programsApi.list(),
      ]);
      setRows(checkIns);
      setPrograms(programList);
    } catch (err) {
      setError(err.message || "Couldn't load field monitoring data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive]);

  async function handleCheckIn(e) {
    e.preventDefault();
    setCheckingIn(true);
    setError("");
    try {
      await fieldCheckInsApi.checkIn({ projectId: form.projectId || undefined, note: form.note || undefined });
      setForm({ projectId: "", note: "" });
      loadAll();
    } catch (err) {
      setError(err.message || "Couldn't check in.");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut(id) {
    try {
      await fieldCheckInsApi.checkOut(id);
      loadAll();
    } catch (err) {
      setError(err.message || "Couldn't check out.");
    }
  }

  const columns = [
    { key: "user", label: "Field staff", render: (r) => r.user?.name || r.user?.email },
    { key: "project", label: "Program", render: (r) => r.project?.name || "—" },
    { key: "checkInAt", label: "Checked in", render: (r) => new Date(r.checkInAt).toLocaleString() },
    {
      key: "status",
      label: "Status",
      render: (r) =>
        r.checkOutAt ? (
          <span className="badge" style={{ backgroundColor: "var(--status-inactive-bg)", color: "var(--status-inactive-fg)" }}>
            Checked out
          </span>
        ) : (
          <span className="badge" style={{ backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}>
            In the field
          </span>
        ),
    },
    { key: "gps", label: "GPS", render: (r) => (r.gpsLat && r.gpsLng ? <span className="mono flex items-center gap-1"><MapPin size={12} />{r.gpsLat.toFixed(3)}, {r.gpsLng.toFixed(3)}</span> : "—") },
    { key: "note", label: "Note", render: (r) => r.note || "—" },
    {
      key: "actions",
      label: "",
      render: (r) =>
        !r.checkOutAt && (r.userId === user?.id || can(ACTIONS.MONITORING_MANAGE)) ? (
          <button className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => handleCheckOut(r.id)}>
            <LogOut size={14} />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Field monitoring
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Duty-of-care: who's currently in the field, and where they checked in.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {!myActiveCheckIn ? (
        <form onSubmit={handleCheckIn} className="card p-5 flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <Field label="Program (optional)">
              <SelectInput value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                <option value="">No specific program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Note (optional)">
              <TextInput value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. heading to Nyamirambo sector" />
            </Field>
          </div>
          <button type="submit" className="btn-primary" disabled={checkingIn} style={{ height: 44 }}>
            <LogIn size={16} />
            Check in
          </button>
        </form>
      ) : (
        <div className="card p-5 flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--text)" }}>
            You're currently checked in{myActiveCheckIn.project ? ` for ${myActiveCheckIn.project.name}` : ""}.
          </p>
          <button className="btn-secondary" onClick={() => handleCheckOut(myActiveCheckIn.id)}>
            <LogOut size={16} />
            Check out
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => setOnlyActive(true)} className={onlyActive ? "range-btn active" : "range-btn"}>
          Active now
        </button>
        <button onClick={() => setOnlyActive(false)} className={!onlyActive ? "range-btn active" : "range-btn"}>
          All history
        </button>
      </div>

      <div className="card">
        <DataTable columns={columns} rows={rows} loading={loading} emptyLabel="No one has checked in yet." />
      </div>
    </div>
  );
}
