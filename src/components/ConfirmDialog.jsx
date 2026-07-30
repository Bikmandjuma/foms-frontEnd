import React from "react";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10,12,16,0.45)" }}
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="display text-base font-semibold mb-2" style={{ color: "var(--text)" }}>
          {title}
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={danger ? { backgroundColor: "var(--rose)" } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
