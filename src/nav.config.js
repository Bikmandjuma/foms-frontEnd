import {
  Users,
  ShieldCheck,
  ClipboardList,
  Heart,
  Link2,
  Building2,
  LayoutGrid,
  Repeat,
  Radar,
  History,
} from "lucide-react";
import { ACTIONS } from "./permissions/permissions.js";

// The sidebar is built from this single config. Each top-level entry is a
// "main link" — Users, Roles, Programs, etc. — that expands into its own
// sub-actions (View / Add) rather than the sidebar being a flat page list.
export const NAV = [
  { type: "link", key: "dashboard", label: "Dashboard", icon: LayoutGrid, to: "/" },
  {
    type: "group",
    key: "users",
    label: "Users",
    icon: Users,
    requires: ACTIONS.USERS_VIEW,
    children: [
      { label: "View users", to: "/users" },
      { label: "Add user", to: "/users/new", requires: ACTIONS.USERS_MANAGE },
    ],
  },
  {
    type: "group",
    key: "roles",
    label: "Roles",
    icon: ShieldCheck,
    requires: ACTIONS.ROLES_VIEW,
    children: [
      { label: "View roles", to: "/roles" },
      { label: "Add role", to: "/roles/new", requires: ACTIONS.ROLES_MANAGE },
    ],
  },
  {
    type: "group",
    key: "programs",
    label: "Programs",
    icon: ClipboardList,
    requires: ACTIONS.PROGRAMS_VIEW,
    children: [
      { label: "View programs", to: "/programs" },
      { label: "Add program", to: "/programs/new", requires: ACTIONS.PROGRAMS_MANAGE },
    ],
  },
  {
    type: "group",
    key: "beneficiaries",
    label: "Respondents",
    icon: Heart,
    requires: ACTIONS.BENEFICIARIES_VIEW,
    children: [
      { label: "View respondents", to: "/beneficiaries" },
      { label: "Add respondent", to: "/beneficiaries/new", requires: ACTIONS.BENEFICIARIES_MANAGE },
    ],
  },
  {
    type: "group",
    key: "assignments",
    label: "Assignments",
    icon: Link2,
    requires: ACTIONS.ASSIGNMENTS_VIEW,
    children: [
      { label: "Program assignments", to: "/assignments/programs" },
      { label: "Respondent assignments", to: "/assignments/beneficiaries" },
    ],
  },
  {
    type: "link",
    key: "replacements",
    label: "Replacement requests",
    icon: Repeat,
    to: "/replacements",
    requires: ACTIONS.REPLACEMENTS_VIEW,
  },
  {
    type: "link",
    key: "monitoring",
    label: "Field monitoring",
    icon: Radar,
    to: "/monitoring",
    requires: ACTIONS.MONITORING_VIEW,
  },
  {
    type: "link",
    key: "activity",
    label: "Activity logs",
    icon: History,
    to: "/activity-logs",
    requires: ACTIONS.ACTIVITY_VIEW,
  },
  {
    type: "group",
    key: "tenants",
    label: "Tenants",
    icon: Building2,
    requires: ACTIONS.TENANTS_VIEW,
    children: [
      { label: "View tenants", to: "/tenants" },
      { label: "Add tenant", to: "/tenants/new", requires: ACTIONS.TENANTS_MANAGE },
    ],
  },
];
