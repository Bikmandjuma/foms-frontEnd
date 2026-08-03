import { client } from "./client.js";

export const replacementsApi = {
  list: (params) => client.get("/replacement-requests", { params }),
  candidates: (originalRespondentId) =>
    client.get("/replacement-requests/candidates", { params: { originalRespondentId } }),
  create: (payload) => client.post("/replacement-requests", payload),
  decide: (id, payload) => client.post(`/replacement-requests/${id}/decide`, payload),
  remove: (id) => client.delete(`/replacement-requests/${id}`),
};
