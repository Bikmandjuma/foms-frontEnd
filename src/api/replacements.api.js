import { client } from "./client.js";

export const replacementsApi = {
  list: (params) => client.get("/replacement-requests", { params }),
  create: (payload) => client.post("/replacement-requests", payload),
  // Only reachable for the rare "nothing was available yet" case — re-runs
  // the same automatic geographic search, not a manual approval.
  retry: (id) => client.post(`/replacement-requests/${id}/retry`),
  remove: (id) => client.delete(`/replacement-requests/${id}`),
};
