import { client } from "./client.js";

export const beneficiariesApi = {
  list: (params) => client.get("/beneficiaries", { params }),
  get: (id) => client.get(`/beneficiaries/${id}`),
  create: (payload) => client.post("/beneficiaries", payload),
  update: (id, payload) => client.patch(`/beneficiaries/${id}`, payload),
  remove: (id) => client.delete(`/beneficiaries/${id}`),
  downloadTemplate: () => client.get("/beneficiaries/import/template", { responseType: "blob" }),
  import: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post("/beneficiaries/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
