import { client } from "./client.js";

export const metaApi = {
  permissionCatalog: () => client.get("/meta/permissions"),
};
