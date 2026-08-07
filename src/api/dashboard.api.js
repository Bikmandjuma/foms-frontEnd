import { client } from "./client.js";

export const dashboardApi = {
  summary: () => client.get("/dashboard/summary"),
  onlineUsers: () => client.get("/dashboard/online-users"),
  chart: (metric, period) => client.get("/dashboard/chart", { params: { metric, period } }),
};
