import { client } from "./client.js";

export const geoApi = {
  provinces: () => client.get("/geo/provinces"),
  districts: (province) => client.get("/geo/districts", { params: { province } }),
  sectors: (district, province) => client.get("/geo/sectors", { params: { district, province } }),
  cells: (sector, district) => client.get("/geo/cells", { params: { sector, district } }),
  villages: (cell, sector) => client.get("/geo/villages", { params: { cell, sector } }),
};
