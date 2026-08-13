import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Calendar,
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Clock3,
  Users2,
} from "lucide-react";
import DataTable from "../../components/DataTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Pagination, { usePagedRows } from "../../components/Pagination.jsx";
import SearchInput, { useSearchedRows } from "../../components/SearchInput.jsx";
import {
  Field,
  SelectInput,
  TextInput,
} from "../../components/FormField.jsx";
import { fieldTeamReportsApi } from "../../api/fieldTeamReports.api.js";
import { programsApi } from "../../api/programs.api.js";
import { programTeamsApi } from "../../api/programTeams.api.js";
import { downloadBlob } from "../../utils/downloadBlob.js";
import { useToast } from "../../context/ToastContext.jsx";

const SEARCH_FIELDS = [
  "teamName",
  "district",
  "supervisorName",
  "staffName",
  "staffRole",
  "respondentName",
  "sector",
  "cell",
];

const REPORT_PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "lifetime", label: "Lifetime" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REFUSED", label: "Refused" },
  { value: "NOT_FOUND", label: "Not found" },
  { value: "RELOCATED", label: "Relocated" },
  { value: "DECEASED", label: "Deceased" },
  { value: "REPLACED", label: "Replaced" },
  { value: "NOT_ASSIGNED", label: "Not assigned" },
];

export default function FieldTeamReportPage() {
  const toast = useToast();

  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [groups, setGroups] = useState([]);
  const [teamId, setTeamId] = useState("");

  // New report period
  const [period, setPeriod] = useState("daily");
  const [status, setStatus] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // ============================================================
  // LOAD GROUPS FOR THE SELECTED PROGRAM
  // ============================================================

  useEffect(() => {
    setTeamId("");
    if (!programId) {
      setGroups([]);
      return;
    }
    programTeamsApi
      .listGroups(programId)
      .then((list) => setGroups(list.filter((g) => g.adopted)))
      .catch(() => setGroups([]));
  }, [programId]);

  // ============================================================
  // LOAD PROGRAMS
  // ============================================================

  useEffect(() => {
    programsApi
      .list()
      .then((list) => {
        setPrograms(list);

        if (list.length > 0) {
          setProgramId((prev) => prev || list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // ============================================================
  // DATE VALIDATION
  // ============================================================

  const dateRangeError =
    startDate &&
    endDate &&
    endDate < startDate
      ? "End date can't be before the start date."
      : "";

  // ============================================================
  // CLOSE EXPORT MENU WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {
    function onClickOutside(e) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target)
      ) {
        setExportMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  // ============================================================
  // LOAD REPORT
  // ============================================================

  async function loadReport() {
    if (!programId || dateRangeError) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fieldTeamReportsApi.list({
        programId,
        teamId: teamId || undefined,

        // "Lifetime" means no date restriction at all — don't send period
        // in that case so the backend doesn't apply any window.
        period: period === "lifetime" ? undefined : period,
        status: status || undefined,

        startDate: startDate || undefined,
        endDate: endDate || undefined,

        pageSize: 1000,
      });

      setRows(res.rows || []);
    } catch (err) {
      setError(
        err.message || "Couldn't load the field team report."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // RELOAD WHEN FILTERS CHANGE
  // ============================================================

  useEffect(() => {
    loadReport();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, teamId, period, status, startDate, endDate]);

  // ============================================================
  // SEARCH + PAGINATION
  // ============================================================

  const {
    filtered,
    query,
    setQuery,
  } = useSearchedRows(rows, SEARCH_FIELDS);

  const {
    pageRows,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = usePagedRows(filtered, 10);

  // ============================================================
  // EXPORT
  // ============================================================

  async function handleExport(format) {
    setExportMenuOpen(false);

    if (!programId || dateRangeError) {
      return;
    }

    setExporting(true);

    try {
      const blob = await fieldTeamReportsApi.export({
        programId,
        teamId: teamId || undefined,

        // Send selected period to backend ("lifetime" = no date window)
        period: period === "lifetime" ? undefined : period,
        status: status || undefined,

        startDate: startDate || undefined,
        endDate: endDate || undefined,

        // Export current search results
        search: query || undefined,

        format,
      });

      const dateSuffix = new Date()
        .toISOString()
        .slice(0, 10);

      downloadBlob(
        blob,
        `field-team-report-${period}-${dateSuffix}.${format}`
      );

      toast.success(
        `Field team ${period} report downloaded as ${format.toUpperCase()}`
      );
    } catch (err) {
      toast.error(
        err.message || "Couldn't export the report."
      );
    } finally {
      setExporting(false);
    }
  }

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const columns = useMemo(
    () => [
      {
        key: "teamName",
        label: "Team",
      },

      {
        key: "supervisor",
        label: "Supervisor",
        render: (r) => (
          <div>
            <div>{r.supervisorName || "—"}</div>

            {r.supervisorPhone && (
              <div
                className="text-xs"
                style={{ color: "var(--muted)" }}
              >
                {r.supervisorPhone}
              </div>
            )}
          </div>
        ),
      },

      {
        key: "staff",
        label: "Field Staff (Role)",
        render: (r) => (
          <div>
            <div>{r.staffName || "—"}</div>

            <div
              className="text-xs"
              style={{ color: "var(--muted)" }}
            >
              {r.staffRole || "—"}
              {r.staffPhone
                ? ` · ${r.staffPhone}`
                : ""}
            </div>
          </div>
        ),
      },

      {
        key: "respondent",
        label: "Respondent Assigned",
        render: (r) => (
          <div>
            <div>{r.respondentName || "—"}</div>

            {r.respondentPhone && (
              <div
                className="text-xs"
                style={{ color: "var(--muted)" }}
              >
                {r.respondentPhone}
              </div>
            )}
          </div>
        ),
      },

      {
        key: "district",
        label: "District",
        render: (r) => r.district || "—",
      },

      {
        key: "sector",
        label: "Sector",
        render: (r) => r.sector || "—",
      },

      {
        key: "cell",
        label: "Cell",
        render: (r) => r.cell || "—",
      },

      {
        key: "status",
        label: "Status",
        render: (r) => <StatusBadge status={r.status} label={r.statusLabel} />,
      },

      {
        key: "challengesObservations",
        label: "Notes",
        render: (r) => (
          <span style={{ whiteSpace: "pre-wrap" }}>
            {r.notes || (r.status !== r.statusLabel ? <span style={{ color: "var(--muted)" }}>{r.statusLabel}</span> : "—")}
          </span>
        ),
      },
    ],
    []
  );

  const selectedPeriodLabel =
    REPORT_PERIODS.find(
      (item) => item.value === period
    )?.label || "Daily";

  return (
    <div className="flex flex-col gap-5">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--text)" }}
          >
            Field Team Report
          </h1>

          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted)" }}
          >
            Per-team field staff, their assigned respondents,
            and reported challenges & observations.
          </p>
        </div>

        {/* ====================================================
            EXPORT
        ==================================================== */}

        <div
          className="relative"
          ref={exportMenuRef}
        >
          <button
            className="btn-secondary"
            onClick={() =>
              setExportMenuOpen((o) => !o)
            }
            disabled={
              exporting ||
              !programId ||
              Boolean(dateRangeError)
            }
          >
            <Download size={16} />

            {exporting
              ? "Preparing…"
              : "Export"}

            <ChevronDown size={14} />
          </button>

          {exportMenuOpen && (
            <div
              className="absolute right-0 mt-1 rounded-lg shadow-lg z-10"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                minWidth: 180,
              }}
            >
              <button
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm"
                onClick={() =>
                  handleExport("pdf")
                }
              >
                <FileText size={15} />&nbsp;Export as PDF
              </button>
                <hr className="border-t border-gray-200" />
              <button
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm"
                onClick={() =>
                  handleExport("csv")
                }
              >
                <FileSpreadsheet size={15} />
                Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================
          FILTER CARD
      ====================================================== */}

      <div className="card p-4 flex flex-col gap-4">

        <div className="flex items-end gap-3 flex-wrap">

          {/* PROGRAM */}

          <Field
            label="Program"
            required
          >
            <SelectInput
              icon={ClipboardList}
              value={programId}
              onChange={(e) =>
                setProgramId(e.target.value)
              }
              style={{
                minWidth: 220,
              }}
            >
              {programs.length === 0 && (
                <option value="">
                  No programs yet
                </option>
              )}

              {programs.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          {/* ==================================================
              GROUP
          ================================================== */}

          <Field label="Group">
            <SelectInput
              icon={Users2}
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={groups.length === 0}
              style={{ minWidth: 200 }}
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.teamId} value={g.teamId}>
                  {g.groupName || g.groupCode}
                </option>
              ))}
            </SelectInput>
          </Field>

          {/* ==================================================
              REPORT PERIOD
          ================================================== */}

          <Field label="Report Period">
            <SelectInput
              icon={Clock3}
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value)
              }
              style={{
                minWidth: 160,
              }}
            >
              {REPORT_PERIODS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          {/* FROM */}

          <Field label="From">
            <TextInput
              icon={Calendar}
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) =>
                setStartDate(e.target.value)
              }
            />
          </Field>

          {/* TO */}

          <Field
            label="To"
            error={dateRangeError}
          >
            <TextInput
              icon={Calendar}
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) =>
                setEndDate(e.target.value)
              }
            />
          </Field>

          {/* STATUS */}

          <Field label="Status">
            <SelectInput
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ minWidth: 160 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          {/* SEARCH */}

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search team, staff, respondent…"
          />
        </div>

        {/* ====================================================
            ACTIVE PERIOD
        ==================================================== */}

        <div
          className="flex items-center justify-between gap-3 flex-wrap rounded-lg px-3 py-2"
          style={{
            backgroundColor: "var(--surface-muted, rgba(127,127,127,0.06))",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Clock3
              size={16}
              style={{ color: "var(--primary)" }}
            />

            <span
              className="text-sm"
              style={{ color: "var(--muted)" }}
            >
              Report period:
            </span>

            <strong
              className="text-sm"
              style={{ color: "var(--text)" }}
            >
              {selectedPeriodLabel}
            </strong>
          </div>

          <span
            className="text-xs"
            style={{ color: "var(--muted)" }}
          >
            {filtered.length} record
            {filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* ERROR */}

        {error && (
          <div
            className="text-sm px-3 py-2 rounded-lg"
            style={{
              backgroundColor:
                "var(--status-suspended-bg)",
              color:
                "var(--status-suspended-fg)",
            }}
          >
            {error}
          </div>
        )}

        {/* TABLE */}

        <DataTable
          columns={columns}
          rows={pageRows}
          loading={loading}
          emptyLabel={`No field team data for the selected ${selectedPeriodLabel.toLowerCase()} period.`}
        />

        {/* PAGINATION */}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
