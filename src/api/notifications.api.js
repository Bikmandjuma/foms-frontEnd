import { client } from "./client.js";

export const notificationsApi = {
  list: () => client.get("/notifications"),
  markRead: (id) => client.post(`/notifications/${id}/read`),
  markAllRead: () => client.post("/notifications/read-all"),
};
