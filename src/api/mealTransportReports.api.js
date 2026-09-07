import { client } from "./client.js";

export const mealTransportReportsApi = {
  listConfigs: () => client.get("/meal-transport-reports/config"),
  upsertConfig: (payload) => client.put("/meal-transport-reports/config", payload),
  removeConfig: (id) => client.delete(`/meal-transport-reports/config/${id}`),
  myConfig: () => client.get("/meal-transport-reports/my-config"),

  // Weeks (the admin-scheduled reporting periods for a program)
  listWeeks: (programId) => client.get("/meal-transport-reports/weeks", { params: { programId } }),
  createWeek: (payload) => client.post("/meal-transport-reports/weeks", payload),
  updateWeek: (id, payload) => client.put(`/meal-transport-reports/weeks/${id}`, payload),
  removeWeek: (id) => client.delete(`/meal-transport-reports/weeks/${id}`),
  myEligibleWeeks: () => client.get("/meal-transport-reports/weeks/mine"),
  weekRoleSummary: (weekId) => client.get(`/meal-transport-reports/weeks/${weekId}/summary`),
  weekReportsForRole: (weekId, roleId) => client.get(`/meal-transport-reports/weeks/${weekId}/reports`, { params: { roleId } }),
  exportWeekRoleZip: (weekId, roleId, format) =>
    client.get(`/meal-transport-reports/weeks/${weekId}/export-zip`, { params: { roleId, format }, responseType: "blob" }),
  makeReportForWeek: (weekId, configId) => client.post(`/meal-transport-reports/weeks/${weekId}/report`, configId ? { configId } : {}),

  myReports: () => client.get("/meal-transport-reports/mine"),
  listAll: (params) => client.get("/meal-transport-reports", { params }),
  get: (id) => client.get(`/meal-transport-reports/${id}`),
  upsertEntry: (id, payload) => client.put(`/meal-transport-reports/${id}/entries`, payload),
  removeEntry: (id, entryId) => client.delete(`/meal-transport-reports/${id}/entries/${entryId}`),
  signPreparer: (id, signatureName, signatureImage) =>
    client.post(`/meal-transport-reports/${id}/sign-preparer`, { signatureName, signatureImage }),
  signApprover: (id, signatureName, signatureImage) =>
    client.post(`/meal-transport-reports/${id}/sign-approver`, { signatureName, signatureImage }),
  export: (id, format) => client.get(`/meal-transport-reports/${id}/export`, { params: { format }, responseType: "blob" }),
};
