import React from "react";

const MAP = {
  ACTIVE: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)" },
  INACTIVE: { bg: "var(--status-inactive-bg)", fg: "var(--status-inactive-fg)" },
  SUSPENDED: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)" },
  ENDED: { bg: "var(--status-inactive-bg)", fg: "var(--status-inactive-fg)" },
  // Project lifecycle
  PLANNING: { bg: "var(--status-inactive-bg)", fg: "var(--status-inactive-fg)" },
  FIELDWORK: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)" },
  DATA_CLEANING: { bg: "var(--status-suspended-bg)", fg: "var(--amber)" },
  REPORTING: { bg: "var(--status-suspended-bg)", fg: "var(--amber)" },
  COMPLETED: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)" },
  // Respondent outcomes
  PENDING: { bg: "var(--status-inactive-bg)", fg: "var(--status-inactive-fg)" },
  REFUSED: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)" },
  NOT_FOUND: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)" },
  RELOCATED: { bg: "var(--status-suspended-bg)", fg: "var(--amber)" },
  DECEASED: { bg: "var(--status-inactive-bg)", fg: "var(--status-inactive-fg)" },
  REPLACED: { bg: "rgba(108,92,231,0.12)", fg: "var(--violet)" },
  // Replacement request lifecycle
  APPROVED: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)" },
  REJECTED: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)" },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || MAP.INACTIVE;
  return (
    <span className="badge" style={{ backgroundColor: s.bg, color: s.fg }}>
      {status}
    </span>
  );
}
