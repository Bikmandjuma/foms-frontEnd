import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { usePermissions } from "../permissions/usePermissions.js";

export default function ProtectedRoute({ children, requires, allowSelfParam }) {
  const { user, loading } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const params = useParams();

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

  // A route can opt in to letting someone through when the URL is "about
  // them" — e.g. /users/:id for their own id — even without the permission
  // that would otherwise be required to view/edit someone else's record.
  const isSelf = allowSelfParam ? params[allowSelfParam] === user.id : false;

  if (requires && !can(requires) && !isSelf) {
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
