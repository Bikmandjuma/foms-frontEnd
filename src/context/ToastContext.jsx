import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = {
  success: { bg: "var(--status-active-bg)", fg: "var(--status-active-fg)" },
  error: { bg: "var(--status-suspended-bg)", fg: "var(--status-suspended-fg)" },
  info: { bg: "rgba(108,92,231,0.12)", fg: "var(--violet)" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "success", duration = 4000) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, type }]);
      if (duration) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (message, duration) => push(message, "success", duration),
    error: (message, duration) => push(message, "error", duration ?? 6000),
    info: (message, duration) => push(message, "info", duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end"
        style={{ maxWidth: "min(92vw, 380px)" }}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div
              key={t.id}
              role="status"
              className="w-full flex items-start gap-2.5 rounded-2xl px-4 py-3 shadow-lg"
              style={{
                backgroundColor: "var(--surface)",
                border: `1px solid ${c.fg}33`,
                boxShadow: "0 12px 32px rgba(16,24,40,0.18)",
                animation: "toast-in .18s ease-out",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: c.bg }}
              >
                <Icon size={15} style={{ color: c.fg }} />
              </div>
              <p className="text-sm flex-1 pt-0.5" style={{ color: "var(--text)" }}>
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="flex-shrink-0 mt-0.5"
                style={{ color: "var(--muted)" }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
