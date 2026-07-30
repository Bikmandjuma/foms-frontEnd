import { client } from "./client.js";

export const programAssignmentsApi = {
  list: (params) => client.get("/program-assignments", { params }),
  create: (payload) => client.post("/program-assignments", payload),
  end: (id) => client.post(`/program-assignments/${id}/end`),
  remove: (id) => client.delete(`/program-assignments/${id}`),
};
