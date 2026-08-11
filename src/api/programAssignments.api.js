import { client } from "./client.js";

export const programAssignmentsApi = {
  list: (params) => client.get("/program-assignments", { params }),
};
