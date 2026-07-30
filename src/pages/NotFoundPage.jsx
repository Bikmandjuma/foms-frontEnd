import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="display text-3xl font-semibold" style={{ color: "var(--text)" }}>
        404
      </p>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        This page doesn't exist.
      </p>
      <Link to="/" className="btn-primary mt-2">
        Back to dashboard
      </Link>
    </div>
  );
}
