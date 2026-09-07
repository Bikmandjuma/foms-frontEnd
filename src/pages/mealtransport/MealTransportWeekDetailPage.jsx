import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users2, ChevronDown, Download, FileText, FileSpreadsheet, ChevronRight } from "lucide-react";
import StatusBadge from "../../components/StatusBadge.jsx";
import { mealTransportReportsApi } from "../../api/mealTransportReports.api.js";
import { downloadBlob } from "../../utils/downloadBlob.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function MealTransportWeekDetailPage() {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedRoleId, setExpandedRoleId] = useState(null);
  const [roleReports, setRoleReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [downloadMenuFor, setDownloadMenuFor] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    mealTransportReportsApi
      .weekRoleSummary(weekId)
      .then(setSummary)
      .catch((err) => setError(err.message || "Couldn't load this week."))
      .finally(() => setLoading(false));
  }, [weekId]);

  async function toggleRole(roleId) {
    if (expandedRoleId === roleId) {
      setExpandedRoleId(null);
      return;
    }
    setExpandedRoleId(roleId);
    setReportsLoading(true);
    try {
      const reports = await mealTransportReportsApi.weekReportsForRole(weekId, roleId);
      setRoleReports(reports);
    } catch (err) {
      toast.error(err.message || "Couldn't load reports for this role.");
    } finally {
      setReportsLoading(false);
    }
  }

  async function handleDownload(roleId, format) {
    setDownloadMenuFor(null);
    setDownloading(true);
    try {
      const blob = await mealTransportReportsApi.exportWeekRoleZip(weekId, roleId, format);
      downloadBlob(blob, `week-reports-${format}.zip`);
    } catch (err) {
      toast.error(err.message || "Couldn't download these reports.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  if (error || !summary) {
    return (
      <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
        {error || "Week not found."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/meal-transport-reports" className="btn-secondary" style={{ height: 36, width: 36, padding: 0 }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="display text-xl font-semibold" style={{ color: "var(--text)" }}>
            {summary.week.label}
          </h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {new Date(summary.week.weekStart).toLocaleDateString()} to {new Date(summary.week.weekEnd).toLocaleDateString()},{" "}
            {summary.week.enabled ? "visible to eligible users" : "hidden"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {summary.roles.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No roles are configured for this program yet.
          </p>
        )}
        {summary.roles.map((role) => (
          <div key={role.configId} className="card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users2 size={16} style={{ color: "var(--violet)" }} />
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  {role.roleName}
                </p>
                <span
                  className="mono text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}
                >
                  {role.totalUsers} people
                </span>
              </div>
              <div className="relative">
                <button className="btn-secondary" onClick={() => setDownloadMenuFor(downloadMenuFor === role.configId ? null : role.configId)} disabled={downloading || role.madeCount === 0}>
                  <Download size={14} />
                  Download all
                  <ChevronDown size={13} />
                </button>
                {downloadMenuFor === role.configId && (
                  <div className="absolute right-0 mt-1 rounded-lg shadow-lg z-10" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", minWidth: 150 }}>
                    <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm table-row" onClick={() => handleDownload(role.roleId, "pdf")}>
                      <FileText size={14} /> PDF, zipped
                    </button>
                    <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm table-row" onClick={() => handleDownload(role.roleId, "xlsx")}>
                      <FileSpreadsheet size={14} /> Excel, zipped
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs">
              <span style={{ color: "var(--status-active-fg)" }}>
                <strong>{role.madeCount}</strong> made
              </span>
              <span style={{ color: "var(--muted)" }}>
                <strong>{role.notMadeCount}</strong> not made yet
              </span>
              {role.pendingCount > 0 && <span style={{ color: "var(--amber)" }}>{role.pendingCount} awaiting approval</span>}
              {role.approvedCount > 0 && <span style={{ color: "var(--status-active-fg)" }}>{role.approvedCount} approved</span>}
            </div>

            <button className="text-sm flex items-center gap-1 self-start" style={{ color: "var(--violet)" }} onClick={() => toggleRole(role.roleId)}>
              {expandedRoleId === role.roleId ? "Hide" : "Show"} who made a report
              <ChevronRight size={14} style={{ transform: expandedRoleId === role.roleId ? "rotate(90deg)" : "none" }} />
            </button>

            {expandedRoleId === role.roleId && (
              <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                {reportsLoading && <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}
                {!reportsLoading && roleReports.length === 0 && (
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Nobody with this role has made a report for this week yet.
                  </p>
                )}
                {roleReports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/meal-transport-reports/${r.id}`)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-left table-row"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <span className="text-sm" style={{ color: "var(--text)" }}>
                      {r.user.name}
                    </span>
                    <StatusBadge status={r.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
