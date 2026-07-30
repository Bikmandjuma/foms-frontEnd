import { useAuth } from "../context/AuthContext.jsx";
import { can, permissionsFor } from "./permissions.js";

export function usePermissions() {
  const { user } = useAuth();
  return {
    can: (action) => can(user, action),
    all: permissionsFor(user),
    isPlatformAdmin: !!user?.isPlatformAdmin,
  };
}
