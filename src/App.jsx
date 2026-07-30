import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { PresenceProvider } from "./context/PresenceContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import { ACTIONS } from "./permissions/permissions.js";

import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import UsersListPage from "./pages/users/UsersListPage.jsx";
import UserFormPage from "./pages/users/UserFormPage.jsx";
import RolesListPage from "./pages/roles/RolesListPage.jsx";
import RoleFormPage from "./pages/roles/RoleFormPage.jsx";
import ProgramsListPage from "./pages/programs/ProgramsListPage.jsx";
import ProgramFormPage from "./pages/programs/ProgramFormPage.jsx";
import BeneficiariesListPage from "./pages/beneficiaries/BeneficiariesListPage.jsx";
import BeneficiaryFormPage from "./pages/beneficiaries/BeneficiaryFormPage.jsx";
import ProgramAssignmentsPage from "./pages/assignments/ProgramAssignmentsPage.jsx";
import BeneficiaryAssignmentsPage from "./pages/assignments/BeneficiaryAssignmentsPage.jsx";
import ReplacementRequestsPage from "./pages/replacements/ReplacementRequestsPage.jsx";
import FieldMonitoringPage from "./pages/monitoring/FieldMonitoringPage.jsx";
import ActivityLogsPage from "./pages/activity/ActivityLogsPage.jsx";
import TenantsListPage from "./pages/tenants/TenantsListPage.jsx";
import TenantFormPage from "./pages/tenants/TenantFormPage.jsx";
import SettingsPage from "./pages/settings/SettingsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <PresenceProvider>
            <NotificationProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />

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
                    <Route path="users/new" element={<ProtectedRoute requires={ACTIONS.USERS_MANAGE}><UserFormPage /></ProtectedRoute>} />
                    <Route path="users/:id/edit" element={<ProtectedRoute requires={ACTIONS.USERS_MANAGE}><UserFormPage /></ProtectedRoute>} />

                    <Route path="roles" element={<ProtectedRoute requires={ACTIONS.ROLES_VIEW}><RolesListPage /></ProtectedRoute>} />
                    <Route path="roles/new" element={<ProtectedRoute requires={ACTIONS.ROLES_MANAGE}><RoleFormPage /></ProtectedRoute>} />
                    <Route path="roles/:id/edit" element={<ProtectedRoute requires={ACTIONS.ROLES_MANAGE}><RoleFormPage /></ProtectedRoute>} />

                    <Route path="programs" element={<ProtectedRoute requires={ACTIONS.PROGRAMS_VIEW}><ProgramsListPage /></ProtectedRoute>} />
                    <Route path="programs/new" element={<ProtectedRoute requires={ACTIONS.PROGRAMS_MANAGE}><ProgramFormPage /></ProtectedRoute>} />
                    <Route path="programs/:id/edit" element={<ProtectedRoute requires={ACTIONS.PROGRAMS_MANAGE}><ProgramFormPage /></ProtectedRoute>} />

                    <Route path="beneficiaries" element={<ProtectedRoute requires={ACTIONS.BENEFICIARIES_VIEW}><BeneficiariesListPage /></ProtectedRoute>} />
                    <Route path="beneficiaries/new" element={<ProtectedRoute requires={ACTIONS.BENEFICIARIES_MANAGE}><BeneficiaryFormPage /></ProtectedRoute>} />
                    <Route path="beneficiaries/:id/edit" element={<ProtectedRoute requires={ACTIONS.BENEFICIARIES_MANAGE}><BeneficiaryFormPage /></ProtectedRoute>} />

                    <Route path="assignments/programs" element={<ProtectedRoute requires={ACTIONS.ASSIGNMENTS_VIEW}><ProgramAssignmentsPage /></ProtectedRoute>} />
                    <Route path="assignments/beneficiaries" element={<ProtectedRoute requires={ACTIONS.ASSIGNMENTS_VIEW}><BeneficiaryAssignmentsPage /></ProtectedRoute>} />

                    <Route path="replacements" element={<ProtectedRoute requires={ACTIONS.REPLACEMENTS_VIEW}><ReplacementRequestsPage /></ProtectedRoute>} />

                    <Route path="monitoring" element={<ProtectedRoute requires={ACTIONS.MONITORING_VIEW}><FieldMonitoringPage /></ProtectedRoute>} />

                    <Route path="activity-logs" element={<ProtectedRoute requires={ACTIONS.ACTIVITY_VIEW}><ActivityLogsPage /></ProtectedRoute>} />

                    <Route path="tenants" element={<ProtectedRoute requires={ACTIONS.TENANTS_VIEW}><TenantsListPage /></ProtectedRoute>} />
                    <Route path="tenants/new" element={<ProtectedRoute requires={ACTIONS.TENANTS_MANAGE}><TenantFormPage /></ProtectedRoute>} />
                    <Route path="tenants/:id/edit" element={<ProtectedRoute requires={ACTIONS.TENANTS_MANAGE}><TenantFormPage /></ProtectedRoute>} />

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
  );
}
