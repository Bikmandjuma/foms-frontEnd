import { client } from "./client.js";

// Platform-admin only (see requirePlatformAdmin on the backend).
export const tenantsApi = {
  list: () => client.get("/tenants"),
  get: (id) => client.get(`/tenants/${id}`),
  create: (payload) => client.post("/tenants", payload),
  update: (id, payload) => client.patch(`/tenants/${id}`, payload),
  remove: (id) => client.delete(`/tenants/${id}`),
  admins: () => client.get("/tenants/admins"),
  overview: (id) => client.get(`/tenants/${id}/overview`),
};
