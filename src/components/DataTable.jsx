import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Generic table used by every list page.
 * columns: [{ key, label, render?(row) }]
 * rows: array of records
 * emptyLabel: shown when rows.length === 0
 */
export default function DataTable({ columns, rows, loading, emptyLabel = "No records yet.", getRowId = (r) => r.id }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16" style={{ color: "var(--muted)" }}>
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left font-medium py-3 px-4 whitespace-nowrap"
                style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)} className="table-row" style={{ borderBottom: "1px solid var(--border)" }}>
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 align-middle" style={{ color: "var(--text)" }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
