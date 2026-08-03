import React, { useEffect, useState, useCallback } from "react";
import {
  Users, ClipboardList, Heart, ShieldCheck, Building2, Repeat, Radar, Wifi,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from "recharts";
import { useAuth } from "../context/AuthContext.jsx";
import { usePresence } from "../context/PresenceContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { usePermissions } from "../permissions/usePermissions.js";
import { ACTIONS } from "../permissions/permissions.js";
import { dashboardApi } from "../api/dashboard.api.js";

const ACCENTS_LIGHT = { violet: "#6C5CE7", teal: "#12B5A6", amber: "#D98A0E", rose: "#E1495C" };
const ACCENTS_DARK = { violet: "#6C5CE7", teal: "#2DD4BF", amber: "#FFB020", rose: "#FB7185" };

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}1A` }}>
        <Icon size={19} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          {label}
        </p>
        <p className="mono text-2xl mt-0.5" style={{ color: "var(--text)" }}>
          {value === null || value === undefined ? "—" : value}
        </p>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

const ACTIVITY_COLOR = {
  created: "teal",
  assigned: "violet",
  approved: "teal",
  rejected: "rose",
  deleted: "rose",
  updated: "amber",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { onlineCount, onlineUserIds } = usePresence();
  const { socket } = useSocket();
  const { isDark } = useTheme();
  const accents = isDark ? ACCENTS_DARK : ACCENTS_LIGHT;

  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await dashboardApi.summary();
      setSummary(data);
    } catch (err) {
      setError(err.message || "Couldn't load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live activity feed — the exact same event the Activity Logs page listens
  // to, so this dashboard widget updates the instant anything happens
  // anywhere in the tenant (an assignment, an approval, a new user...).
  useEffect(() => {
    if (!socket) return undefined;
    function handler(entry) {
      setActivity((a) => [entry, ...a].slice(0, 12));
    }
    socket.on("activity:new", handler);
    return () => socket.off("activity:new", handler);
  }, [socket]);

  const counts = summary?.counts || {};
  const checkInSeries = summary?.checkInSeries || [];
  const outcomeData = (summary?.beneficiariesByOutcome || []).map((o) => ({
    name: o.outcome.replaceAll("_", " "),
    value: o.count,
  }));
  const statusData = (summary?.programsByStatus || []).map((s) => ({
    status: s.status.replaceAll("_", " "),
    count: s.count,
  }));

  const OUTCOME_COLORS = [accents.teal, accents.violet, accents.amber, accents.rose, "#8B92A5", "#3A4155", "#C6CAD6"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {user?.isPlatformAdmin
              ? "Platform admin overview across all tenants."
              : `${user?.tenant?.name || "Your tenant"} workspace overview.`}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="live-presence-dot" />
          <Wifi size={14} color="var(--muted)" />
          <span className="text-sm mono" style={{ color: "var(--text)" }}>
            {onlineCount}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            online now
          </span>
        </div>
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {user?.isPlatformAdmin && <StatCard icon={Building2} label="Tenants" value={counts.tenants} accent={accents.violet} />}
        {can(ACTIONS.USERS_VIEW) && <StatCard icon={Users} label="Users" value={counts.users} accent={accents.teal} />}
        {can(ACTIONS.PROGRAMS_VIEW) && <StatCard icon={ClipboardList} label="Programs" value={counts.programs} accent={accents.violet} />}
        {can(ACTIONS.BENEFICIARIES_VIEW) && <StatCard icon={Heart} label="Respondents" value={counts.beneficiaries} accent={accents.rose} />}
        {can(ACTIONS.REPLACEMENTS_VIEW) && <StatCard icon={Repeat} label="Pending replacements" value={counts.pendingReplacements} accent={accents.amber} />}
        {can(ACTIONS.MONITORING_VIEW) && <StatCard icon={Radar} label="Active in the field" value={counts.activeCheckIns} accent={accents.teal} />}
        {can(ACTIONS.ROLES_VIEW) && <StatCard icon={ShieldCheck} label="Roles" value={counts.roles} accent={accents.amber} />}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card p-5">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Field check-ins, last 7 days
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Duty-of-care activity across the whole tenant
          </p>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={checkInSeries} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="checkinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accents.violet} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accents.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="checkIns" stroke={accents.violet} strokeWidth={2.5} fill="url(#checkinGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 flex flex-col">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            Respondent outcomes
          </p>
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
            {counts.beneficiaries ?? 0} respondents tracked
          </p>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={outcomeData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
                  {outcomeData.map((_, i) => (
                    <Cell key={i} fill={OUTCOME_COLORS[i % OUTCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-2 overflow-y-auto" style={{ maxHeight: 90 }}>
            {outcomeData.map((o, i) => (
              <div key={o.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}>
                  <span className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: OUTCOME_COLORS[i % OUTCOME_COLORS.length] }} />
                  {o.name}
                </div>
                <span className="mono" style={{ color: "var(--text)" }}>
                  {o.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
            Programs by status
          </p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="status" width={100} stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill={accents.violet} radius={[0, 6, 6, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Live activity
            </p>
            <div className="flex items-center gap-1.5">
              <span className="live-presence-dot" />
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                Live
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 240 }}>
            {activity.length === 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Nothing yet , actions across the tenant will appear here instantly.
              </p>
            )}
            {activity.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: accents[ACTIVITY_COLOR[a.action]] || "var(--muted)" }}
                />
                <div className="min-w-0">
                  <p className="text-xs leading-snug" style={{ color: "var(--text)" }}>
                    <strong>{a.user?.name || a.user?.email || "System"}</strong> {a.action} {a.entityType.toLowerCase()}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                    {timeAgo(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Who's online
            </p>
            <span className="mono text-xs" style={{ color: "var(--muted)" }}>
              {onlineCount} connected
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {onlineUserIds.length === 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Just you, so far.
              </p>
            )}
            {onlineUserIds.slice(0, 8).map((id) => (
              <div key={id} className="flex items-center gap-2 text-xs">
                <span className="live-presence-dot" />
                <span className="mono" style={{ color: "var(--text)" }}>
                  {id === user?.id ? "You" : `User ${id.slice(0, 8)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && !summary && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Loading dashboard…
        </p>
      )}
    </div>
  );
}
