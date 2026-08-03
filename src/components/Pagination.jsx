import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PAGE_SIZES = [10, 25, 50];

function PageButton({ icon: Icon, onClick, disabled, label }) {
  return (
    <button
      type="button"
      className="btn-secondary"
      style={{ height: 30, width: 30, padding: 0, opacity: disabled ? 0.4 : 1 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}

/**
 * Drop-in pagination footer for any list/table. Caller owns the page/pageSize
 * state (usePagination below computes it) — this component is purely the
 * "Showing X–Y of Z" + page-size + prev/next UI, so every list page looks
 * and behaves identically.
 */
export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Showing <strong style={{ color: "var(--text)" }}>{rangeStart}</strong>–
          <strong style={{ color: "var(--text)" }}>{rangeEnd}</strong> of{" "}
          <strong style={{ color: "var(--text)" }}>{total}</strong>
        </span>
        <select
          className="text-xs font-medium rounded-lg px-2 py-1 border"
          style={{ backgroundColor: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <PageButton icon={ChevronsLeft} onClick={() => onPageChange(1)} disabled={page === 1} label="First page" />
        <PageButton icon={ChevronLeft} onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} label="Previous page" />
        <span className="text-xs font-medium px-2" style={{ color: "var(--text)" }}>
          Page {page} of {totalPages}
        </span>
        <PageButton icon={ChevronRight} onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} label="Next page" />
        <PageButton icon={ChevronsRight} onClick={() => onPageChange(totalPages)} disabled={page === totalPages} label="Last page" />
      </div>
    </div>
  );
}

/**
 * Slices `rows` for the current page and resets to page 1 whenever the
 * underlying row count shrinks below the current page (e.g. after a filter
 * or a delete) so the view never gets stranded on an empty page.
 */
export function usePagedRows(rows, initialPageSize = 10) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  React.useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, pageSize]);

  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    pageRows,
    page: safePage,
    pageSize,
    setPage,
    setPageSize: (n) => {
      setPageSize(n);
      setPage(1);
    },
  };
}
