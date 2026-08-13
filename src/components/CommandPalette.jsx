import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Command } from "lucide-react";
import { NAV } from "../nav.config.js";
import { usePermissions } from "../permissions/usePermissions.js";

/** Flattens nav.config.js (which mixes flat links and grouped links with
 * children) into one searchable list of destinations, filtered to only
 * what this person can actually see — same permission check the sidebar
 * itself uses, so the palette never offers a page that would just 403. */
function useNavEntries() {
  const { can } = usePermissions();
  return useMemo(() => {
    const entries = [];
    for (const item of NAV) {
      if (item.type === "link") {
        if (item.requires && !can(item.requires)) continue;
        entries.push({ label: item.label, to: item.to, icon: item.icon });
      } else if (item.type === "group") {
        for (const child of item.children ?? []) {
          if (child.requires && !can(child.requires)) continue;
          entries.push({ label: `${item.label} · ${child.label}`, to: child.to, icon: item.icon });
        }
      }
    }
    return entries;
  }, [can]);
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const entries = useNavEntries();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 8);
    return entries.filter((e) => e.label.toLowerCase().includes(q)).slice(0, 8);
  }, [entries, query]);

  // ⌘K / Ctrl+K opens it from anywhere in the app; Escape closes it. The
  // Topbar's visible search button opens it the same way, via this custom
  // event, so there's no need to lift "open" state up just for that.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onCustomOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(entry) {
    if (!entry) return;
    navigate(entry.to);
    setOpen(false);
  }

  function onInputKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ backgroundColor: "rgba(10,12,16,0.5)" }}
      onClick={() => setOpen(false)}
    >
      <div className="card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ animation: "toast-in 0.15s ease-out" }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Search size={16} style={{ color: "var(--muted)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a page…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text)" }}
          />
          <kbd
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "var(--surface-2)", color: "var(--muted)" }}
          >
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && (
            <p className="text-sm px-4 py-6 text-center" style={{ color: "var(--muted)" }}>
              Nothing matches "{query}"
            </p>
          )}
          {results.map((entry, i) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.to}
                onClick={() => go(entry)}
                onMouseEnter={() => setActiveIndex(i)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left"
                style={{ backgroundColor: i === activeIndex ? "var(--surface-2)" : "transparent", color: "var(--text)" }}
              >
                {Icon && <Icon size={15} style={{ color: "var(--muted)" }} />}
                <span className="flex-1 truncate">{entry.label}</span>
                {i === activeIndex && <CornerDownLeft size={13} style={{ color: "var(--muted)" }} />}
              </button>
            );
          })}
        </div>

        <div
          className="flex items-center gap-1.5 px-4 py-2 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <Command size={11} />K to open · ↑↓ to move · Enter to go
        </div>
      </div>
    </div>
  );
}
