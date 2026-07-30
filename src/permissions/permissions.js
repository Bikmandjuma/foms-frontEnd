// Real, backend-driven permissions. Every user's role now carries an actual
// `permissions: string[]` array from the API (see /api/meta/permissions for
// the full catalog) — this file no longer guesses access from a role's name.
export const ACTIONS = {
  USERS_VIEW: "users:view",
  USERS_MANAGE: "users:manage",
  ROLES_VIEW: "roles:view",
  ROLES_MANAGE: "roles:manage",
  PROGRAMS_VIEW: "programs:view",
  PROGRAMS_MANAGE: "programs:manage",
  BENEFICIARIES_VIEW: "beneficiaries:view",
  BENEFICIARIES_MANAGE: "beneficiaries:manage",
  ASSIGNMENTS_VIEW: "assignments:view",
  ASSIGNMENTS_MANAGE: "assignments:manage",
  REPLACEMENTS_VIEW: "replacements:view",
  REPLACEMENTS_MANAGE: "replacements:manage",
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

export function can(user, action) {
  return permissionsFor(user).includes(action);
}
