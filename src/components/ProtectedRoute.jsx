import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { usePermissions } from "../permissions/usePermissions.js";

export default function ProtectedRoute({ children, requires }) {
  const { user, loading } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ color: "var(--muted)" }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requires && !can(requires)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="display text-lg font-semibold" style={{ color: "var(--text)" }}>
          Access restricted
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Your role doesn't have permission to view this page.
        </p>
      </div>
    );
  }

  return children;
}
