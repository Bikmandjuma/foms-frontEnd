import { client } from "./client.js";

export const authApi = {
  login: (email, password) => client.post("/auth/login", { email, password }),
  logout: () => client.post("/auth/logout"),
  me: () => client.get("/auth/me"),
};
