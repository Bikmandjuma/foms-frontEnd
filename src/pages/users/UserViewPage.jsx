import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Cake,
  GraduationCap,
  Clock,
  ShieldCheck,
  Check,
  ClipboardList,
  Users2,
  Crown,
  Truck,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge.jsx";
import { SelectInput } from "../../components/FormField.jsx";
import { usersApi } from "../../api/users.api.js";
import { rolesApi } from "../../api/roles.api.js";
import { programAssignmentsApi } from "../../api/programAssignments.api.js";
import { programTeamsApi } from "../../api/programTeams.api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../permissions/usePermissions.js";
import { ACTIONS } from "../../permissions/permissions.js";

function initials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{ width: 32, height: 32, backgroundColor: "var(--surface-2)" }}
      >
        <Icon size={15} color="var(--muted)" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

export default function UserViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const { can } = usePermissions();
  const manage = can(ACTIONS.USERS_EDIT);
  const isSelf = currentUser?.id === id;
  const canViewAssignments = can(ACTIONS.ASSIGNMENTS_VIEW);
  const canViewTeams = can(ACTIONS.TEAMS_VIEW);

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [roleSaved, setRoleSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [u, roleList, assignmentList, teamList] = await Promise.all([
        usersApi.get(id),
        rolesApi.list(),
        canViewAssignments ? programAssignmentsApi.list({ userId: id }) : Promise.resolve([]),
        canViewTeams ? programTeamsApi.forUser(id) : Promise.resolve([]),
      ]);
      setUser(u);
      setRoles(roleList);
      setAssignments(assignmentList);
      setTeams(teamList);
    } catch (err) {
      setError(err.message || "Couldn't load this user.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRoleChange(roleId) {
    setSavingRole(true);
    setError("");
    try {
      const updated = await usersApi.update(id, { roleId });
      setUser(updated);
      setRoleSaved(true);
      toast.success("Role updated");
      setTimeout(() => setRoleSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Couldn't update this user's role.");
    } finally {
      setSavingRole(false);
    }
  }

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;
  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error || "User not found."}
        </div>
        <Link to="/users" className="btn-secondary w-fit">
          <ArrowLeft size={16} />
          Back to users
        </Link>
      </div>
    );
  }

  const currentRole = roles.find((r) => r.id === user.role?.id) || user.role;
  const rolePermissions = Array.isArray(currentRole?.permissions) ? currentRole.permissions : [];

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to="/users" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }} aria-label="Back to users">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            User profile
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Full details, current role, and effective permissions.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {/* Header card */}
      <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-2xl display font-semibold text-lg shrink-0"
            style={{ width: 56, height: 56, backgroundColor: "rgba(108,92,231,0.14)", color: "var(--violet)" }}
          >
            {initials(user.name, user.email)}
          </div>
          <div>
            <p className="display text-lg font-semibold" style={{ color: "var(--text)" }}>
              {user.name || "Unnamed user"}
            </p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {user.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={user.status} />
              {currentRole?.name && (
                <span className="badge" style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}>
                  {currentRole.name}
                </span>
              )}
            </div>
          </div>
        </div>
        {(manage || isSelf) && (
          <Link to={`/users/${id}/edit`} className="btn-secondary self-start sm:self-center">
            <Pencil size={15} />
            Edit profile
          </Link>
        )}
      </div>

      {/* Profile info */}
      <div className="card p-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
          Profile
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={Phone} label="Telephone" value={user.telephone} />
          <InfoRow
            icon={MapPin}
            label="Location"
            value={[user.province?.name, user.district?.name, user.sector?.name, user.cell?.name, user.village?.name]
              .filter(Boolean)
              .join(" / ")}
          />
          <InfoRow icon={Cake} label="Date of birth" value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : null} />
          <InfoRow icon={GraduationCap} label="Education level" value={user.educationLevel?.replaceAll("_", " ")} />
          <InfoRow
            icon={Clock}
            label="Last seen"
            value={user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : "Never"}
          />
        </div>
      </div>

      {/* Programs & groups — every program this user is assigned to, and every
          group (team) they're on or lead, across all programs. */}
      {(canViewAssignments || canViewTeams) && (
        <div className="card p-6 flex flex-col gap-6">
          {canViewAssignments && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--muted)" }}>
                <ClipboardList size={14} />
                Programs
              </p>
              {assignments.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Not assigned to any program.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {assignments.map((a) => (
                    <span key={a.id} className="badge flex items-center gap-2" style={{ backgroundColor: "var(--surface-2)", color: "var(--text)" }}>
                      {a.program?.name}
                      <StatusBadge status={a.status} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {canViewTeams && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "var(--muted)" }}>
                <Users2 size={14} />
                Groups
              </p>
              {teams.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Not part of any group.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {teams.map((t) => {
                    const isLeader = t.leader?.id === id;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 flex-wrap rounded-xl px-4 py-3"
                        style={{ backgroundColor: "var(--surface-2)" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isLeader && <Crown size={14} color="var(--amber)" />}
                          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                            {t.program?.name}
                          </span>
                          <span className="text-sm" style={{ color: "var(--muted)" }}>
                            · {t.name}
                          </span>
                          <span className="badge" style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}>
                            {isLeader ? "Leader" : "Member"}
                          </span>
                        </div>
                        {t.vehicles?.length > 0 && (
                          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
                            <Truck size={13} />
                            {t.vehicles.map((v) => v.vehicle.name).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Role & permissions — set the role here rather than a column of per-user checkboxes;
          permissions always come from the assigned role, never from the user directly. */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Role &amp; permissions
          </p>
          {roleSaved && (
            <span className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--teal)" }}>
              <Check size={13} />
              Saved
            </span>
          )}
        </div>

        {manage ? (
          <div className="max-w-xs mb-4">
            <SelectInput
              icon={ShieldCheck}
              value={user.role?.id || ""}
              disabled={savingRole}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="">No role assigned</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : (
          <p className="text-sm mb-4" style={{ color: "var(--text)" }}>
            {currentRole?.name || "No role assigned"}
          </p>
        )}

        {currentRole?.description && (
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            {currentRole.description}
          </p>
        )}

        <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
          Effective permissions from this role
        </p>
        <div className="flex flex-wrap gap-2">
          {rolePermissions.length === 0 && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              This role has no permissions configured yet.
            </span>
          )}
          {rolePermissions.map((perm) => (
            <span
              key={perm}
              className="badge"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)", textTransform: "capitalize" }}
            >
              {perm.split(":")[1]} · {perm.split(":")[0]}
            </span>
          ))}
        </div>
        {manage && currentRole && (
          <Link to={`/roles/${currentRole.id}/edit`} className="text-xs font-medium mt-4 inline-block" style={{ color: "var(--violet)" }}>
            Edit this role's permissions →
          </Link>
        )}
      </div>

      <div className="flex justify-end">
        <button className="btn-secondary" onClick={() => navigate("/users")}>
          Back to list
        </button>
      </div>
    </div>
  );
}
