import React, { useEffect, useState } from "react";
import { ClipboardList, Wand2, Truck, X, Users2 } from "lucide-react";
import { Field, SelectInput } from "../../components/FormField.jsx";
import { programsApi } from "../../api/programs.api.js";
import { programTeamsApi } from "../../api/programTeams.api.js";
import { vehiclesApi } from "../../api/vehicles.api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

export default function CarAssignmentPage() {
  const { can } = usePermissions();
  const toast = useToast();
  const canEdit = can(ACTIONS.TEAMS_EDIT);
  const canDelete = can(ACTIONS.TEAMS_DELETE);

  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [teams, setTeams] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [programLoading, setProgramLoading] = useState(false);
  const [error, setError] = useState("");

  const [vehiclePicks, setVehiclePicks] = useState({});
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    programsApi
      .list()
      .then(setPrograms)
      .catch((err) => setError(err.message || "Couldn't load programs."))
      .finally(() => setLoading(false));
  }, []);

  async function loadProgramData(id) {
    const [teamData, vehicles] = await Promise.all([programTeamsApi.get(id), vehiclesApi.list({ available: true })]);
    setTeams(teamData.teams);
    setAvailableVehicles(vehicles);
  }

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    setProgramLoading(true);
    setError("");
    setResult(null);
    loadProgramData(programId)
      .catch((err) => !cancelled && setError(err.message || "Couldn't load this program."))
      .finally(() => !cancelled && setProgramLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  async function handleAutoAssign() {
    setAutoAssigning(true);
    setError("");
    try {
      const res = await programTeamsApi.autoAssignVehicles(programId);
      setResult(res);
      await loadProgramData(programId);
      toast.success(`Assigned vehicles to ${res.teamsAssigned} group(s), using ${res.vehiclesUsed} vehicle(s)`);
    } catch (err) {
      setError(err.message || "Couldn't auto-assign vehicles.");
    } finally {
      setAutoAssigning(false);
    }
  }

  async function handleAddVehicle(teamId, explicitVehicleId) {
    const vehicleId = explicitVehicleId || vehiclePicks[teamId];
    if (!vehicleId) return;
    setError("");
    try {
      await programTeamsApi.addVehicle(teamId, vehicleId);
      setVehiclePicks((p) => ({ ...p, [teamId]: "" }));
      await loadProgramData(programId);
      toast.success("Vehicle assigned to group");
    } catch (err) {
      toast.error(err.message || "Couldn't assign this vehicle.");
    }
  }

  async function handleRemoveVehicle(teamId, vehicleId) {
    setError("");
    try {
      await programTeamsApi.removeVehicle(teamId, vehicleId);
      await loadProgramData(programId);
    } catch (err) {
      toast.error(err.message || "Couldn't remove this vehicle.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
          Car assignment
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Pick a program, then assign a vehicle to each group sized to fit everyone in it, splitting across more than one vehicle if none alone is big enough.
        </p>
      </div>

      <div className="max-w-sm">
        <Field label="Program">
          <SelectInput icon={ClipboardList} value={programId} onChange={(e) => setProgramId(e.target.value)} disabled={loading}>
            <option value="" className="text-black">
              Select a program…
            </option>
            {programs.map((p) => (
              <option key={p.id} value={p.id} className="text-black">
                {p.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {programId && programLoading && <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}

      {programId && !programLoading && (
        <>
          {teams.length === 0 && (
            <div className="card flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>
              This program has no groups yet run its assignment engine first from Program assignments.
            </div>
          )}

          {teams.length > 0 && canEdit && (
            <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Fills every group that has no vehicle yet, sized to its headcount.
              </p>
              <button type="button" className="btn-primary" onClick={handleAutoAssign} disabled={autoAssigning}>
                <Wand2 size={16} />
                {autoAssigning ? "Assigning…" : "Auto-assign vehicles"}
              </button>
            </div>
          )}

          {result && (
            <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}>
              Assigned {result.vehiclesUsed} vehicle(s) across {result.teamsAssigned} group(s).
              {result.teamsShort > 0 && ` ${result.teamsShort} group(s) still don't have enough seats — add more vehicles or assign manually.`}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {teams.map((team) => {
              const headcount = team.members.length + (team.leader ? 1 : 0);
              const seats = team.vehicles.reduce((n, tv) => n + (tv.vehicle.capacityPerDay ?? 0), 0);
              const takenVehicleIds = new Set(team.vehicles.map((tv) => tv.vehicle.id));
              const remainingGap = headcount - seats;
              const short = team.vehicles.length === 0 || remainingGap > 0;

              // The car this group needs next: the smallest available vehicle
              // that alone covers what's still missing, or — if none is big
              // enough on its own — the largest one available, so adding it
              // makes real progress toward covering everyone.
              let recommendedVehicle = null;
              if (short && remainingGap > 0) {
                const candidates = availableVehicles.filter(
                  (v) => !takenVehicleIds.has(v.id) && v.capacityPerDay != null
                );
                const sufficientAsc = candidates
                  .filter((v) => v.capacityPerDay >= remainingGap)
                  .sort((a, b) => a.capacityPerDay - b.capacityPerDay);
                recommendedVehicle =
                  sufficientAsc[0] ?? [...candidates].sort((a, b) => b.capacityPerDay - a.capacityPerDay)[0] ?? null;
              }

              return (
                <div key={team.id} className="card p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {team.name}
                    </p>
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <Users2 size={13} />
                      {headcount} people
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {team.vehicles.length === 0 && (
                      <span className="badge" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--amber)" }}>
                        No vehicle assigned
                      </span>
                    )}
                    {team.vehicles.map((tv) => (
                      <span key={tv.id} className="badge flex items-center gap-1" style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}>
                        <Truck size={12} color="var(--muted)" />
                        {tv.vehicle.name}
                        {tv.vehicle.capacityPerDay != null && ` (${tv.vehicle.capacityPerDay} seats)`}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVehicle(team.id, tv.vehicle.id)}
                            aria-label={`Remove ${tv.vehicle.name}`}
                            style={{ display: "inline-flex" }}
                          >
                            <X size={12} color="var(--muted)" />
                          </button>
                        )}
                      </span>
                    ))}
                    {team.vehicles.length > 0 && remainingGap > 0 && (
                      <span className="badge" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
                        Short {remainingGap} seat(s)
                      </span>
                    )}
                  </div>

                  {canEdit && recommendedVehicle && (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 flex-wrap"
                      style={{ backgroundColor: "rgba(108,92,231,0.08)" }}
                    >
                      <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--violet)" }}>
                        <Wand2 size={13} />
                        This group is full — recommended next car:{" "}
                        <strong>
                          {recommendedVehicle.name} ({recommendedVehicle.capacityPerDay} seats)
                        </strong>
                      </span>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ height: 28, padding: "0 10px" }}
                        onClick={() => handleAddVehicle(team.id, recommendedVehicle.id)}
                      >
                        Add this car
                      </button>
                    </div>
                  )}

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <SelectInput
                        value={vehiclePicks[team.id] || ""}
                        onChange={(e) => setVehiclePicks((p) => ({ ...p, [team.id]: e.target.value }))}
                        style={{ height: 32 }}
                      >
                        <option value="" className="text-black">Add a specific vehicle…</option>
                        {availableVehicles.map((v) => (
                          <option key={v.id} value={v.id} className="text-black">
                            {v.name}
                            {v.capacityPerDay != null ? ` (${v.capacityPerDay} seats)` : ""}
                          </option>
                        ))}
                      </SelectInput>
                      <button type="button" className="btn-secondary" style={{ height: 32, padding: "0 10px" }} onClick={() => handleAddVehicle(team.id)}>
                        Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
