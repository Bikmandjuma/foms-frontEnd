import axios from "axios";
const TOKEN_KEY = "huska_token";

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://foms-backend-production.up.railway.app/api",
  // baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:4000/api",
});

export function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = client.defaults.baseURL.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

client.interceptors.response.use(
  function onSuccess(res) {
    // File downloads (Excel exports/templates) come back as a Blob, not the
    // usual { statusCode, message, data } envelope — pass those through as-is.
    if (res.config?.responseType === "blob" || (typeof Blob !== "undefined" && res.data instanceof Blob)) {
      return res.data;
    }
    return res.data.data;
  },
  function onError(err) {
    const message =
      (err.response && err.response.data && err.response.data.message) ||
      err.message ||
      "Something went wrong talking to the server.";
    const status = err.response ? err.response.status : undefined;
    return Promise.reject({ status: status, message: message, raw: err });
  }
);