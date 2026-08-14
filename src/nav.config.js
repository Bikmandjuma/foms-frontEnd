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
  Truck,
  FileBarChart,
  Radio,
  Wallet,
  Users2,
  Clock,
} from "lucide-react";
import { ACTIONS } from "./permissions/permissions.js";

// The sidebar is built from this single config. Each top-level entry is a
// "main link" — Users, Roles, Programs, etc. — that expands into its own
// sub-actions (View / Add) rather than the sidebar being a flat page list.
export const NAV = [
  { type: "link", key: "dashboard", label: "Dashboard", icon: LayoutGrid, to: "/" },
  {
    type: "group",
    key: "programs",
    label: "Programs",
    icon: ClipboardList,
    requires: ACTIONS.PROGRAMS_VIEW,
    children: [
      { label: "Add program", to: "/programs/new", requires: ACTIONS.PROGRAMS_CREATE },
      { label: "View programs", to: "/programs" },
    ],
  },

  {
    type: "group",
    key: "roles",
    label: "Roles",
    icon: ShieldCheck,
    requires: ACTIONS.ROLES_VIEW,
    children: [
      { label: "Add role", to: "/roles/new", requires: ACTIONS.ROLES_CREATE },
      { label: "View roles", to: "/roles" },
      
    ],
  },

  {
    type: "group",
    key: "users",
    label: "Users",
    icon: Users,
    requires: ACTIONS.USERS_VIEW,
    children: [
      { label: "Add user", to: "/users/new", requires: ACTIONS.USERS_CREATE },
      { label: "View users", to: "/users" },
    ],
  },
  
  
  {
    type: "group",
    key: "beneficiaries",
    label: "Participants",
    icon: Heart,
    requires: ACTIONS.BENEFICIARIES_VIEW,
    children: [
      { label: "Add participant", to: "/beneficiaries/new", requires: ACTIONS.BENEFICIARIES_CREATE },
      { label: "View participants", to: "/beneficiaries" },
    ],
  },
  {
    type: "group",
    key: "vehicles",
    label: "Vehicles",
    icon: Truck,
    requires: ACTIONS.VEHICLES_VIEW,
    children: [
      { label: "Add vehicle", to: "/vehicles/new", requires: ACTIONS.VEHICLES_CREATE },
      { label: "View vehicles", to: "/vehicles" },
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
      { label: "Car assignment", to: "/assignments/vehicles", requires: ACTIONS.TEAMS_VIEW },
      { label: "Tracing", to: "/assignments/availability" },
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
    key: "assign-groups",
    label: "Assign groups",
    icon: Users2,
    to: "/assign-groups",
    requires: ACTIONS.TEAMS_VIEW,
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
    key: "live-map",
    label: "Live field map",
    icon: Radio,
    to: "/live-map",
    requires: ACTIONS.MONITORING_VIEW,
  },
  {
    type: "link",
    key: "daily-ops",
    label: "Daily field operations",
    icon: Clock,
    to: "/daily-operations",
    requires: ACTIONS.MONITORING_VIEW,
  },
  {
    type: "link",
    key: "field-team-reports",
    label: "Field team reports",
    icon: FileBarChart,
    to: "/reports/field-teams",
    requires: ACTIONS.FIELD_TEAM_REPORTS_VIEW,
  },
  {
    type: "link",
    key: "field-expenses",
    label: "Field expenses",
    icon: Wallet,
    to: "/field-expenses",
    requires: ACTIONS.EXPENSES_VIEW,
  },
  {
    type: "link",
    key: "activity",
    label: "Activity logs",
    icon: History,
    to: "/activity-logs",
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
      { label: "Tenant administrators", to: "/tenant-admins" },
    ],
  },
];
