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
import { resolveAssetUrl } from "../api/client.js";
import OnlineUsersModal from "../components/OnlineUsersModal.jsx";
import MetricPeriodSelector from "../components/MetricPeriodSelector.jsx";
import LiveOnlineUsersBarChart from "../components/LiveOnlineUsersBarChart.jsx";

const ACCENTS_LIGHT = { violet: "#6C5CE7", teal: "#12B5A6", amber: "#D98A0E", rose: "#E1495C" };
const ACCENTS_DARK = { violet: "#6C5CE7", teal: "#2DD4BF", amber: "#FFB020", rose: "#FB7185" };
const CHART_COLORS = (accents) => [accents.violet, accents.teal, accents.amber, accents.rose, "#8B92A5", "#3A4155", "#C6CAD6"];

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
  const CHART_PALETTE = CHART_COLORS(accents);

  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineModalOpen, setOnlineModalOpen] = useState(false);

  // The configurable bar/circle chart pair — one metric+period selection
  // drives both, per spec ("even on circle graph").
  const [metric, setMetric] = useState("checkins");
  const [period, setPeriod] = useState("week");
  const [chart, setChart] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);

  // "Who's online" needs actual names, not raw ids — fetched once and
  // refreshed whenever presence changes, so it stays in sync live.
  const [onlineUsers, setOnlineUsers] = useState([]);

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

  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    dashboardApi
      .chart(metric, period)
      .then((data) => !cancelled && setChart(data))
      .catch(() => !cancelled && setChart(null))
      .finally(() => !cancelled && setChartLoading(false));
    return () => {
      cancelled = true;
    };
  }, [metric, period]);

  useEffect(() => {
    let cancelled = false;
    dashboardApi
      .onlineUsers()
      .then((data) => !cancelled && setOnlineUsers(data))
      .catch(() => !cancelled && setOnlineUsers([]));
    return () => {
      cancelled = true;
    };
    // Refresh the name list whenever the live count changes (someone joined/left).
  }, [onlineCount]);

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
  const statusData = (summary?.programsByStatus || []).map((s) => ({
    status: s.status.replaceAll("_", " "),
    count: s.count,
  }));
  const chartSeries = chart?.series || [];

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
        <button
          onClick={() => setOnlineModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}
        >
          <span className="live-presence-dot" />
          <Wifi size={14} color="var(--muted)" />
          <span className="text-sm mono" style={{ color: "var(--text)" }}>
            {onlineCount}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            online now
          </span>
        </button>
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

      {/* Configurable chart row — one metric+period selection drives both */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {chart?.title || "Loading…"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {chart?.subtitle || ""}
              </p>
            </div>
            <MetricPeriodSelector metric={metric} period={period} onMetricChange={setMetric} onPeriodChange={setPeriod} />
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSeries} margin={{ left: -20, right: 10, top: 16 }}>
                <defs>
                  <linearGradient id="mainChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accents.violet} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accents.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke={accents.violet} strokeWidth={2.5} fill="url(#mainChartGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {chartLoading && (
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          )}
        </div>

        <div className="card p-5 flex flex-col">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
            {chart?.title || "Loading…"}
          </p>
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
            Same selection, by share
          </p>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartSeries} dataKey="count" nameKey="label" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
                  {chartSeries.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-2 overflow-y-auto" style={{ maxHeight: 90 }}>
            {chartSeries.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}>
                  <span className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                  {s.label}
                </div>
                <span className="mono" style={{ color: "var(--text)" }}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live online-users strip chart */}
      {/* <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Online users, live
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              A new reading every few seconds , bars scroll left as time passes
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="live-presence-dot" />
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              Live
            </span>
          </div>
        </div>
        <LiveOnlineUsersBarChart />
      </div> */}

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
          {statusData.length === 0 && (
            <p className="text-xs text-center mt-2" style={{ color: "var(--muted)" }}>
              No programs yet.
            </p>
          )}
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
                Nothing yet ,actions across the tenant will appear here instantly.
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

        {/* <button
          onClick={() => setOnlineModalOpen(true)}
          className="card p-5 text-left"
          style={{ cursor: "pointer" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Who's online
            </p>
            <span className="mono text-xs" style={{ color: "var(--muted)" }}>
              {onlineCount} connected
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {onlineUsers.length === 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Just you, so far.
              </p>
            )}
            {onlineUsers.slice(0, 6).map((u) => {
              const avatarSrc = resolveAssetUrl(u.avatarUrl);
              return (
                <div key={u.id} className="flex items-center gap-2 text-xs">
                  <span className="live-presence-dot flex-shrink-0" />
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-semibold flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: "var(--violet)", color: "white" }}
                  >
                    {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : (u.name || u.email || "?")[0]?.toUpperCase()}
                  </div>
                  <span className="truncate" style={{ color: "var(--text)" }}>
                    {u.id === user?.id ? "You" : u.name || u.email}
                  </span>
                </div>
              );
            })}
            {onlineUsers.length > 6 && (
              <p className="text-xs mt-1" style={{ color: "var(--violet)" }}>
                +{onlineUsers.length - 6} more — click to see everyone
              </p>
            )}
          </div>
        </button> */}

        
        <div className="card p-5" onClick={() => setOnlineModalOpen(true)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Who's online</p>
            <span className="mono text-xs" style={{ color: "var(--muted)" }}>{onlineCount} connected</span>
          </div>
          <div className="flex flex-col gap-2">
            {onlineUsers.length === 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>Just you, so far.</p>
            )}
            {onlineUsers.slice(0, 6).map((u) => {
              const avatarSrc = resolveAssetUrl(u.avatarUrl);
              return (
                <div key={u.id} className="flex items-center gap-2 text-xs">
                  <span className="live-presence-dot flex-shrink-0" />
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: "var(--violet)", color: "#fff" }}
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (u.name || u.email || "?")[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="truncate" style={{ color: "var(--text)" }}>
                    {u.id === user?.id ? "You" : u.name || u.email}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {loading && !summary && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Loading dashboard…
        </p>
      )}

      <OnlineUsersModal open={onlineModalOpen} onClose={() => setOnlineModalOpen(false)} />
    </div>
  );
}
