import { client } from "./client.js";

// Each level returns [{ id, name }] scoped to its parent's id. The backend
// now backs these with the real provinces/districts/sectors/cells/villages
// tables (normalized FKs), not free-text names, so ids are what you submit
// back as provinceId/districtId/sectorId/cellId/villageId.
export const geoApi = {
  provinces: () => client.get("/geo/provinces"),
  districts: (provinceId) => client.get("/geo/districts", { params: { provinceId } }),
  sectors: (districtId) => client.get("/geo/sectors", { params: { districtId } }),
  cells: (sectorId) => client.get("/geo/cells", { params: { sectorId } }),
  villages: (cellId) => client.get("/geo/villages", { params: { cellId } }),
};
