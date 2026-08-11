import { client } from "./client.js";

export const fieldTeamReportsApi = {
  list: (params) => client.get("/field-team-reports", { params }),
  export: (params) => client.get("/field-team-reports/export", { params, responseType: "blob" }),
};
