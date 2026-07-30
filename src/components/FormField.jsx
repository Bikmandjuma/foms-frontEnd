import React from "react";

export function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium" style={{ color: "var(--text)" }}>
          {label}
          {required && <span style={{ color: "var(--rose)" }}> *</span>}
        </label>
      )}
      {children}
      {error && (
        <span className="text-xs" style={{ color: "var(--rose)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function TextInput(props) {
  return (
    <div className="field">
      <input {...props} />
    </div>
  );
}

export function SelectInput({ children, ...props }) {
  return (
    <div className="field">
      <select className="field-select" {...props}>
        {children}
      </select>
    </div>
  );
}

export function TextArea(props) {
  return (
    <div className="field" style={{ height: "auto", padding: "10px 12px" }}>
      <textarea rows={3} {...props} />
    </div>
  );
}
