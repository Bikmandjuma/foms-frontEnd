import React from "react";

export function Field({ label, required, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium" style={{ color: "var(--text)" }}>
          {label}
          {required && <span style={{ color: "var(--rose)" }}> *</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {hint}
        </span>
      )}
      {error && (
        <span className="text-xs" style={{ color: "var(--rose)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

// Every field on the login page is: rounded pill container, a muted leading
// icon, transparent input. `icon` here is optional so existing call sites
// (that don't pass one) keep rendering exactly as before.
export function TextInput({ icon: Icon, ...props }) {
  if (!Icon) {
    return (
      <div className="field">
        <input {...props} />
      </div>
    );
  }
  return (
    <div className="field">
      <Icon size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
      <input {...props} />
    </div>
  );
}

export function SelectInput({ icon: Icon, children, ...props }) {
  if (!Icon) {
    return (
      <div className="field">
        <select className="field-select" {...props}>
          {children}
        </select>
      </div>
    );
  }
  return (
    <div className="field">
      <Icon size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
      <select className="field-select" {...props}>
        {children}
      </select>
    </div>
  );
}

export function TextArea({ icon: Icon, ...props }) {
  return (
    <div className="field" style={{ height: "auto", padding: "10px 12px", alignItems: "flex-start" }}>
      {Icon && <Icon size={16} color="var(--muted)" style={{ flexShrink: 0, marginTop: 2 }} />}
      <textarea rows={3} {...props} />
    </div>
  );
}
