import { client } from "./client.js";

export const activityLogsApi = {
  list: (params) => client.get("/activity-logs", { params }),
};
