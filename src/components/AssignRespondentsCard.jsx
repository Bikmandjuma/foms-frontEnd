import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Field, TextInput } from "./FormField.jsx";
import { programTeamsApi } from "../api/programTeams.api.js";
import { beneficiariesApi } from "../api/beneficiaries.api.js";
import { useToast } from "../context/ToastContext.jsx";

/**
 * How respondents get enrolled onto a program: all eligible active
 * respondents, a hand-picked list of them, or a random subset. Reused
 * wherever a program needs respondents assigned to it — the Program
 * Assignments page (when tracing isn't required) and the Tracing page
 * (when it is, since tracing can only work on respondents already
 * enrolled on the program).
 */
export default function AssignRespondentsCard({ programId, canAssign, onAssigned }) {
  const toast = useToast();
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [eligibleRespondents, setEligibleRespondents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignMode, setAssignMode] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [randomCount, setRandomCount] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  async function loadPool() {
    setLoading(true);
    try {
      const [{ respondents }, enrolled] = await Promise.all([
        programTeamsApi.eligibleRespondents(programId),
        beneficiariesApi.list({ programId }),
      ]);
      setEligibleRespondents(respondents);
      setEnrolledCount(enrolled.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!programId) return;
    setAssignMode("ALL");
    setSelectedIds(new Set());
    setSearch("");
    setRandomCount("");
    setError("");
    loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = eligibleRespondents.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (r.telephone || "").toLowerCase().includes(q);
  });

  async function handleAssign() {
    setAssigning(true);
    setError("");
    try {
      const payload = { programId, mode: assignMode };
      if (assignMode === "SPECIFIC") payload.beneficiaryIds = Array.from(selectedIds);
      if (assignMode === "RANDOM") payload.count = Number(randomCount);
      const res = await programTeamsApi.enrollRespondents(payload);
      toast.success(`Assigned ${res.assignedCount} respondent(s) to the program`);
      setSelectedIds(new Set());
      setRandomCount("");
      await loadPool();
      onAssigned?.();
    } catch (err) {
      setError(err.message || "Couldn't assign respondents to this program.");
    } finally {
      setAssigning(false);
    }
  }

  if (!canAssign) return null;

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users size={16} color="var(--violet)" />
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Assign respondents
        </p>
      </div>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {enrolledCount} respondent(s) enrolled on this program · {eligibleRespondents.length} active respondent(s) available to assign.
      </p>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
          <input type="radio" name={`assignMode-${programId}`} checked={assignMode === "ALL"} onChange={() => setAssignMode("ALL")} />
          Assign all available ({eligibleRespondents.length})
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
          <input type="radio" name={`assignMode-${programId}`} checked={assignMode === "SPECIFIC"} onChange={() => setAssignMode("SPECIFIC")} />
          Choose specific respondents
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
          <input type="radio" name={`assignMode-${programId}`} checked={assignMode === "RANDOM"} onChange={() => setAssignMode("RANDOM")} />
          Assign a random number
        </label>
      </div>

      {assignMode === "SPECIFIC" && (
        <div className="flex flex-col gap-2">
          <TextInput placeholder="Search by name, code, or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-col gap-1 rounded-xl p-2" style={{ backgroundColor: "var(--surface-2)", maxHeight: 240, overflowY: "auto" }}>
            {loading && <span className="text-xs px-2 py-1" style={{ color: "var(--muted)" }}>Loading…</span>}
            {!loading && filtered.length === 0 && (
              <span className="text-xs px-2 py-1" style={{ color: "var(--muted)" }}>No matching respondents.</span>
            )}
            {filtered.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg" style={{ color: "var(--text)" }}>
                <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggle(r.id)} />
                <span className="truncate">
                  {r.name} <span style={{ color: "var(--muted)" }}>· {r.code}</span>
                </span>
              </label>
            ))}
          </div>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{selectedIds.size} selected</span>
        </div>
      )}

      {assignMode === "RANDOM" && (
        <div className="max-w-xs">
          <Field label="Number to assign" hint={`Must be ${eligibleRespondents.length} or fewer.`}>
            <TextInput type="number" min="1" max={eligibleRespondents.length} value={randomCount} onChange={(e) => setRandomCount(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary"
          onClick={handleAssign}
          disabled={
            assigning ||
            eligibleRespondents.length === 0 ||
            (assignMode === "SPECIFIC" && selectedIds.size === 0) ||
            (assignMode === "RANDOM" && (!randomCount || Number(randomCount) < 1 || Number(randomCount) > eligibleRespondents.length))
          }
        >
          {assigning ? "Assigning…" : "Assign respondents"}
        </button>
      </div>
    </div>
  );
}
