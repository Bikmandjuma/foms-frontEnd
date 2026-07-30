import { client } from "./client.js";

export const programsApi = {
  list: () => client.get("/programs"),
  get: (id) => client.get(`/programs/${id}`),
  create: (payload) => client.post("/programs", payload),
  update: (id, payload) => client.patch(`/programs/${id}`, payload),
  remove: (id) => client.delete(`/programs/${id}`),
};
