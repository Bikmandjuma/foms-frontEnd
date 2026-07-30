import { client } from "./client.js";

export const beneficiariesApi = {
  list: () => client.get("/beneficiaries"),
  get: (id) => client.get(`/beneficiaries/${id}`),
  create: (payload) => client.post("/beneficiaries", payload),
  update: (id, payload) => client.patch(`/beneficiaries/${id}`, payload),
  remove: (id) => client.delete(`/beneficiaries/${id}`),
};
