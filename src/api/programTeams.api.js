import { client } from "./client.js";

export const programTeamsApi = {
  get: (programId) => client.get("/program-teams", { params: { programId } }),
  updateConfig: (payload) => client.put("/program-teams/config", payload),
  setLeader: (teamId, userId) => client.post(`/program-teams/${teamId}/leader`, { userId }),
  clearLeader: (teamId) => client.delete(`/program-teams/${teamId}/leader`),
  runAssignment: (programId) => client.post("/program-teams/run", { programId }),
  addMember: (teamId, userId) => client.post(`/program-teams/${teamId}/members`, { userId }),
  removeMember: (teamId, userId) => client.delete(`/program-teams/${teamId}/members/${userId}`),
  addVehicle: (teamId, vehicleId) => client.post(`/program-teams/${teamId}/vehicles`, { vehicleId }),
  removeVehicle: (teamId, vehicleId) => client.delete(`/program-teams/${teamId}/vehicles/${vehicleId}`),
  autoAssignVehicles: (programId) => client.post("/program-teams/auto-assign-vehicles", { programId }),
  listGroups: (programId) => client.get("/program-teams/groups", { params: { programId } }),
  adoptGroup: (programId, groupCode) => client.post("/program-teams/groups/adopt", { programId, groupCode }),
  assignRandom: (teamId, userId) => client.post(`/program-teams/${teamId}/members/${userId}/assign-random`),
};
