import { client } from "./client.js";

export const fieldCheckInsApi = {
  list: (params) => client.get("/field-checkins", { params }),
  roster: (params) => client.get("/field-checkins/roster", { params }),
  exportDaily: (params) => client.get("/field-checkins/export", { params, responseType: "blob" }),
  checkIn: (payload) => client.post("/field-checkins", payload),
  checkOut: (id, payload) => client.post(`/field-checkins/${id}/end`, payload),
  updateGps: (id, payload) => client.post(`/field-checkins/${id}/gps`, payload),
  todayRespondents: (id) => client.get(`/field-checkins/${id}/respondents`),
  recordOutcome: (id, beneficiaryId, payload) =>
    client.put(`/field-checkins/${id}/respondents/${beneficiaryId}`, payload),
  listNotes: (id) => client.get(`/field-checkins/${id}/notes`),
  addNote: (id, note) => client.post(`/field-checkins/${id}/notes`, { note }),
};
