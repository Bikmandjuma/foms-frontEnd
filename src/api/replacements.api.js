import { client } from "./client.js";

export const replacementsApi = {
  list: (params) => client.get("/replacement-requests", { params }),
  create: (payload) => client.post("/replacement-requests", payload),
  decide: (id, payload) => client.post(`/replacement-requests/${id}/decide`, payload),
  remove: (id) => client.delete(`/replacement-requests/${id}`),
};
