import { client } from "./client.js";

export const beneficiaryAssignmentsApi = {
  list: (params) => client.get("/beneficiary-assignments", { params }),
  create: (payload) => client.post("/beneficiary-assignments", payload),
  autoAssign: (payload) => client.post("/beneficiary-assignments/auto-assign", payload),
  end: (id) => client.post(`/beneficiary-assignments/${id}/end`),
  remove: (id) => client.delete(`/beneficiary-assignments/${id}`),
};
