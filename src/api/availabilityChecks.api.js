import { client } from "./client.js";

export const availabilityChecksApi = {
  get: (programId) => client.get("/availability-checks", { params: { programId } }),
  updateConfig: (payload) => client.put("/availability-checks/config", payload),
  assign: (programId) => client.post("/availability-checks/assign", { programId }),
};
