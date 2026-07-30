import { client } from "./client.js";

export const rolesApi = {
  list: () => client.get("/roles"),
  get: (id) => client.get(`/roles/${id}`),
  create: (payload) => client.post("/roles", payload),
  update: (id, payload) => client.patch(`/roles/${id}`, payload),
  remove: (id) => client.delete(`/roles/${id}`),
};
