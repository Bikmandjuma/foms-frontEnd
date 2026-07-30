import { client } from "./client.js";

export const usersApi = {
  list: () => client.get("/users"),
  get: (id) => client.get(`/users/${id}`),
  create: (payload) => client.post("/users", payload),
  update: (id, payload) => client.patch(`/users/${id}`, payload),
  remove: (id) => client.delete(`/users/${id}`),
};
