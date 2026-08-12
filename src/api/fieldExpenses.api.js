import { client } from "./client.js";

export const fieldExpensesApi = {
  list: (params) => client.get("/field-expenses", { params }),
  get: (id) => client.get(`/field-expenses/${id}`),
  review: (id, payload) => client.put(`/field-expenses/${id}/review`, payload),
  remove: (id) => client.delete(`/field-expenses/${id}`),
};
