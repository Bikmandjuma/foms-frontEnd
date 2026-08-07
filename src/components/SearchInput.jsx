import React from "react";
import { Search, X } from "lucide-react";

/**
 * Drop-in search box for any list page. Purely controlled — the caller owns
 * the query string and does the filtering (see useSearchedRows below), so
 * every list searches consistently without each page reinventing it.
 */
export default function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="field" style={{ width: 260, flexShrink: 0 }}>
      <Search size={15} color="var(--muted)" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" style={{ display: "flex", background: "transparent", border: "none", cursor: "pointer" }}>
          <X size={14} color="var(--muted)" />
        </button>
      )}
    </div>
  );
}

/**
 * Filters `rows` to those where any of `fields` (dot-paths supported, e.g.
 * "role.name") contains the query, case-insensitively. Returns the filtered
 * rows plus the query state to wire into <SearchInput>.
 */
export function useSearchedRows(rows, fields) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) =>
      fields.some((path) => {
        const value = path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), row);
        return typeof value === "string" && value.toLowerCase().includes(q);
      })
    );
  }, [rows, fields, query]);

  return { filtered, query, setQuery };
}
