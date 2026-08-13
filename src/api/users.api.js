import { client } from "./client.js";

export const usersApi = {
  list: (params) => client.get("/users", { params }),
  get: (id) => client.get(`/users/${id}`),
  create: (payload) => client.post("/users", payload),
  update: (id, payload) => client.patch(`/users/${id}`, payload),
  remove: (id) => client.delete(`/users/${id}`),
  uploadMyAvatar: (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return client.post("/users/me/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
  changeMyPassword: (payload) => client.post("/users/me/change-password", payload),
  downloadGroupsTemplate: () => client.get("/users/import-groups/template", { responseType: "blob" }),
  importGroups: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post("/users/import-groups", formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
};
