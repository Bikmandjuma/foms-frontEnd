import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { PresenceProvider } from "./context/PresenceContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import { ACTIONS } from "./permissions/permissions.js";

import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import VerifyResetCodePage from "./pages/VerifyResetCodePage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import UsersListPage from "./pages/users/UsersListPage.jsx";
import UserViewPage from "./pages/users/UserViewPage.jsx";
import UserFormPage from "./pages/users/UserFormPage.jsx";
import AddOtherUserPage from "./pages/users/AddOtherUserPage.jsx";
import AddSupervisorEnumeratorPage from "./pages/users/AddSupervisorEnumeratorPage.jsx";
import RolesListPage from "./pages/roles/RolesListPage.jsx";
import RoleFormPage from "./pages/roles/RoleFormPage.jsx";
import ProgramsListPage from "./pages/programs/ProgramsListPage.jsx";
import ProgramFormPage from "./pages/programs/ProgramFormPage.jsx";
import ProgramDetailsPage from "./pages/programs/ProgramDetailsPage.jsx";
import BeneficiariesListPage from "./pages/beneficiaries/BeneficiariesListPage.jsx";
import BeneficiaryFormPage from "./pages/beneficiaries/BeneficiaryFormPage.jsx";
import ProgramAssignmentsPage from "./pages/assignments/ProgramAssignmentsPage.jsx";
import CarAssignmentPage from "./pages/assignments/CarAssignmentPage.jsx";
import ConfirmAvailabilityPage from "./pages/assignments/ConfirmAvailabilityPage.jsx";
import VehiclesListPage from "./pages/vehicles/VehiclesListPage.jsx";
import VehicleFormPage from "./pages/vehicles/VehicleFormPage.jsx";
import ReplacementRequestsPage from "./pages/replacements/ReplacementRequestsPage.jsx";
import FieldMonitoringPage from "./pages/monitoring/FieldMonitoringPage.jsx";
import LiveFieldMapPage from "./pages/map/LiveFieldMapPage.jsx";
import FieldTeamReportPage from "./pages/reports/FieldTeamReportPage.jsx";
import ExpensesListPage from "./pages/expenses/ExpensesListPage.jsx";
import AssignGroupsPage from "./pages/groups/AssignGroupsPage.jsx";
import DailyFieldOperationsPage from "./pages/dailyops/DailyFieldOperationsPage.jsx";
import MealTransportReportsPage from "./pages/mealtransport/MealTransportReportsPage.jsx";
import MealTransportReportDetailPage from "./pages/mealtransport/MealTransportReportDetailPage.jsx";
import MealTransportWeekDetailPage from "./pages/mealtransport/MealTransportWeekDetailPage.jsx";
import ActivityLogsPage from "./pages/activity/ActivityLogsPage.jsx";
import TenantsListPage from "./pages/tenants/TenantsListPage.jsx";
import TenantFormPage from "./pages/tenants/TenantFormPage.jsx";
import TenantAdminsPage from "./pages/tenants/TenantAdminsPage.jsx";
import TenantOverviewPage from "./pages/tenants/TenantOverviewPage.jsx";
import SettingsPage from "./pages/settings/SettingsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
        <SocketProvider>
          <PresenceProvider>
            <NotificationProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/verify-reset-code" element={<VerifyResetCodePage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardPage />} />

                    <Route path="users" element={<ProtectedRoute requires={ACTIONS.USERS_VIEW}><UsersListPage /></ProtectedRoute>} />
                    <Route path="users/new" element={<ProtectedRoute requires={ACTIONS.USERS_CREATE}><UserFormPage /></ProtectedRoute>} />
                    <Route path="users/new/other" element={<ProtectedRoute requires={ACTIONS.USERS_CREATE}><AddOtherUserPage /></ProtectedRoute>} />
                    <Route path="users/new/supervisor-enumerator" element={<ProtectedRoute requires={ACTIONS.USERS_CREATE}><AddSupervisorEnumeratorPage /></ProtectedRoute>} />
                    <Route path="users/:id" element={<ProtectedRoute requires={ACTIONS.USERS_VIEW} allowSelfParam="id"><UserViewPage /></ProtectedRoute>} />
                    <Route path="users/:id/edit" element={<ProtectedRoute requires={ACTIONS.USERS_EDIT} allowSelfParam="id"><UserFormPage /></ProtectedRoute>} />

                    <Route path="roles" element={<ProtectedRoute requires={ACTIONS.ROLES_VIEW}><RolesListPage /></ProtectedRoute>} />
                    <Route path="roles/new" element={<ProtectedRoute requires={ACTIONS.ROLES_CREATE}><RoleFormPage /></ProtectedRoute>} />
                    <Route path="roles/:id/edit" element={<ProtectedRoute requires={ACTIONS.ROLES_EDIT}><RoleFormPage /></ProtectedRoute>} />

                    <Route path="programs" element={<ProtectedRoute requires={ACTIONS.PROGRAMS_VIEW}><ProgramsListPage /></ProtectedRoute>} />
                    <Route path="programs/new" element={<ProtectedRoute requires={ACTIONS.PROGRAMS_CREATE}><ProgramFormPage /></ProtectedRoute>} />
                    <Route path="programs/:id" element={<ProtectedRoute requires={ACTIONS.PROGRAMS_VIEW}><ProgramDetailsPage /></ProtectedRoute>} />
                    <Route path="programs/:id/edit" element={<ProtectedRoute requires={ACTIONS.PROGRAMS_EDIT}><ProgramFormPage /></ProtectedRoute>} />

                    <Route path="beneficiaries" element={<ProtectedRoute requires={ACTIONS.BENEFICIARIES_VIEW}><BeneficiariesListPage /></ProtectedRoute>} />
                    <Route path="beneficiaries/new" element={<ProtectedRoute requires={ACTIONS.BENEFICIARIES_CREATE}><BeneficiaryFormPage /></ProtectedRoute>} />
                    <Route path="beneficiaries/:id/edit" element={<ProtectedRoute requires={ACTIONS.BENEFICIARIES_EDIT}><BeneficiaryFormPage /></ProtectedRoute>} />

                    <Route path="assignments/programs" element={<ProtectedRoute requires={ACTIONS.ASSIGNMENTS_VIEW}><ProgramAssignmentsPage /></ProtectedRoute>} />
                    <Route path="assignments/vehicles" element={<ProtectedRoute requires={ACTIONS.TEAMS_VIEW}><CarAssignmentPage /></ProtectedRoute>} />
                    <Route path="assignments/availability" element={<ProtectedRoute requires={ACTIONS.ASSIGNMENTS_VIEW}><ConfirmAvailabilityPage /></ProtectedRoute>} />

                    <Route path="vehicles" element={<ProtectedRoute requires={ACTIONS.VEHICLES_VIEW}><VehiclesListPage /></ProtectedRoute>} />
                    <Route path="vehicles/new" element={<ProtectedRoute requires={ACTIONS.VEHICLES_CREATE}><VehicleFormPage /></ProtectedRoute>} />
                    <Route path="vehicles/:id/edit" element={<ProtectedRoute requires={ACTIONS.VEHICLES_EDIT}><VehicleFormPage /></ProtectedRoute>} />

                    <Route path="replacements" element={<ProtectedRoute requires={ACTIONS.REPLACEMENTS_VIEW}><ReplacementRequestsPage /></ProtectedRoute>} />

                    <Route path="monitoring" element={<ProtectedRoute requires={ACTIONS.MONITORING_VIEW}><FieldMonitoringPage /></ProtectedRoute>} />

                    <Route path="live-map" element={<ProtectedRoute requires={ACTIONS.MONITORING_VIEW}><LiveFieldMapPage /></ProtectedRoute>} />

                    <Route path="reports/field-teams" element={<ProtectedRoute requires={ACTIONS.FIELD_TEAM_REPORTS_VIEW}><FieldTeamReportPage /></ProtectedRoute>} />
                    <Route path="field-expenses" element={<ProtectedRoute requires={ACTIONS.EXPENSES_VIEW}><ExpensesListPage /></ProtectedRoute>} />
                    <Route path="assign-groups" element={<ProtectedRoute requires={ACTIONS.TEAMS_VIEW}><AssignGroupsPage /></ProtectedRoute>} />
                    <Route path="daily-operations" element={<ProtectedRoute requires={ACTIONS.MONITORING_VIEW}><DailyFieldOperationsPage /></ProtectedRoute>} />
                    <Route path="meal-transport-reports" element={<ProtectedRoute><MealTransportReportsPage /></ProtectedRoute>} />
                    <Route path="meal-transport-reports/weeks/:weekId" element={<ProtectedRoute requires={ACTIONS.MEAL_TRANSPORT_REPORTS_MANAGE}><MealTransportWeekDetailPage /></ProtectedRoute>} />
                    <Route path="meal-transport-reports/:id" element={<ProtectedRoute><MealTransportReportDetailPage /></ProtectedRoute>} />

                    <Route path="activity-logs" element={<ProtectedRoute><ActivityLogsPage /></ProtectedRoute>} />

                    <Route path="tenants" element={<ProtectedRoute requires={ACTIONS.TENANTS_VIEW}><TenantsListPage /></ProtectedRoute>} />
                    <Route path="tenants/new" element={<ProtectedRoute requires={ACTIONS.TENANTS_MANAGE}><TenantFormPage /></ProtectedRoute>} />
                    <Route path="tenants/:id/edit" element={<ProtectedRoute requires={ACTIONS.TENANTS_MANAGE}><TenantFormPage /></ProtectedRoute>} />
                    <Route path="tenant-admins" element={<ProtectedRoute requires={ACTIONS.TENANTS_VIEW}><TenantAdminsPage /></ProtectedRoute>} />
                    <Route path="tenants/:id/overview" element={<ProtectedRoute requires={ACTIONS.TENANTS_VIEW}><TenantOverviewPage /></ProtectedRoute>} />

                    <Route path="settings" element={<SettingsPage />} />

                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </NotificationProvider>
          </PresenceProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
    </ToastProvider>
  );
}
