import { client } from "./client.js";

export const fieldCheckInsApi = {
  list: (params) => client.get("/field-checkins", { params }),
  checkIn: (payload) => client.post("/field-checkins", payload),
  checkOut: (id) => client.post(`/field-checkins/${id}/end`),
};
