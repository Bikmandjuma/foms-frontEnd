import { client } from "./client.js";

export const authApi = {
  login: (email, password) => client.post("/auth/login", { email, password }),
  logout: () => client.post("/auth/logout"),
  me: () => client.get("/auth/me"),
  forgotPassword: (email) => client.post("/auth/forgot-password", { email }),
  verifyResetCode: (email, code) => client.post("/auth/verify-reset-code", { email, code }),
  resetPassword: (resetToken, newPassword) => client.post("/auth/reset-password", { resetToken, newPassword }),
};
