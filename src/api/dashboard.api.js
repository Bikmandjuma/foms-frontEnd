import { client } from "./client.js";

export const dashboardApi = {
  summary: () => client.get("/dashboard/summary"),
};
