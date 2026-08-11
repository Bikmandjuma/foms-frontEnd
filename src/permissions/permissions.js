// Real, backend-driven permissions. Every user's role now carries an actual
// `permissions: string[]` array from the API (see /api/meta/permissions for
// the full catalog) — this file no longer guesses access from a role's name.
//
// Most resources expose granular actions (view/create/edit/delete) instead
// of one "manage" catch-all. Field monitoring and Tenants don't map cleanly
// onto CRUD, so they keep the simpler view/manage shape.
export const ACTIONS = {
  USERS_VIEW: "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT: "users:edit",
  USERS_DELETE: "users:delete",
  ROLES_VIEW: "roles:view",
  ROLES_CREATE: "roles:create",
  ROLES_EDIT: "roles:edit",
  ROLES_DELETE: "roles:delete",
  PROGRAMS_VIEW: "programs:view",
  PROGRAMS_CREATE: "programs:create",
  PROGRAMS_EDIT: "programs:edit",
  PROGRAMS_DELETE: "programs:delete",
  BENEFICIARIES_VIEW: "beneficiaries:view",
  BENEFICIARIES_CREATE: "beneficiaries:create",
  BENEFICIARIES_EDIT: "beneficiaries:edit",
  BENEFICIARIES_DELETE: "beneficiaries:delete",
  ASSIGNMENTS_VIEW: "assignments:view",
  ASSIGNMENTS_CREATE: "assignments:create",
  ASSIGNMENTS_EDIT: "assignments:edit",
  ASSIGNMENTS_DELETE: "assignments:delete",
  TEAMS_VIEW: "teams:view",
  TEAMS_CREATE: "teams:create",
  TEAMS_EDIT: "teams:edit",
  TEAMS_DELETE: "teams:delete",
  REPLACEMENTS_VIEW: "replacements:view",
  REPLACEMENTS_CREATE: "replacements:create",
  REPLACEMENTS_EDIT: "replacements:edit",
  REPLACEMENTS_DELETE: "replacements:delete",
  VEHICLES_VIEW: "vehicles:view",
  VEHICLES_CREATE: "vehicles:create",
  VEHICLES_EDIT: "vehicles:edit",
  VEHICLES_DELETE: "vehicles:delete",
  EXPENSES_VIEW: "expenses:view",
  EXPENSES_CREATE: "expenses:create",
  EXPENSES_EDIT: "expenses:edit",
  EXPENSES_DELETE: "expenses:delete",
  MONITORING_VIEW: "monitoring:view",
  MONITORING_MANAGE: "monitoring:manage",
  ACTIVITY_VIEW: "activity:view",
  TENANTS_VIEW: "tenants:view",
  TENANTS_MANAGE: "tenants:manage",
};

const PLATFORM_ADMIN_PERMISSIONS = [ACTIONS.TENANTS_VIEW, ACTIONS.TENANTS_MANAGE];

export function permissionsFor(user) {
  if (!user) return [];
  if (user.isPlatformAdmin) return PLATFORM_ADMIN_PERMISSIONS;
  return Array.isArray(user.role?.permissions) ? user.role.permissions : [];
}

/**
 * Mirrors the backend's hasAction() exactly: a role satisfies a granular
 * check either by holding that exact permission, or by still carrying the
 * legacy "resource:manage" superset from before granular permissions
 * existed — so a role nobody's re-saved yet doesn't lose access in the UI
 * while the backend would actually still allow it.
 */
export function can(user, action) {
  const permissions = permissionsFor(user);
  if (permissions.includes(action)) return true;
  const [resource, verb] = action.split(":");
  if (["view", "create", "edit", "delete"].includes(verb) && permissions.includes(`${resource}:manage`)) {
    return true;
  }
  return false;
}
