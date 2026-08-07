import React from "react";

const METRICS = [
  { value: "checkins", label: "Check-ins" },
  { value: "online-users", label: "Online users" },
  { value: "beneficiary-attendance", label: "Beneficiary attendance" },
];

const PERIODS = [
  { value: "week", label: "Per week" },
  { value: "month", label: "Per month" },
  { value: "year", label: "Per year" },
  { value: "lifetime", label: "Lifetime" },
];

export default function MetricPeriodSelector({ metric, period, onMetricChange, onPeriodChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={metric}
        onChange={(e) => onMetricChange(e.target.value)}
        className="text-xs font-medium rounded-lg px-2 py-1.5 border"
        style={{ backgroundColor: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
      >
        {METRICS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="text-xs font-medium rounded-lg px-2 py-1.5 border"
        style={{ backgroundColor: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
