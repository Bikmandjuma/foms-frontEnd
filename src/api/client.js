// import axios from "axios";

// const TOKEN_KEY = "huska_token";

// export const client = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
// });

// // The backend accepts auth either via an httpOnly cookie (same-origin) or a
// // Bearer token. This frontend runs on its own dev origin, so we store the JWT
// // the login endpoint returns and attach it to every request instead of
// // relying on cross-origin cookies.
// export function getToken() {
//   return localStorage.getItem(TOKEN_KEY);
// }
// export function setToken(token) {
//   if (token) localStorage.setItem(TOKEN_KEY, token);
//   else localStorage.removeItem(TOKEN_KEY);
// }

// client.interceptors.request.use((config) => {
//   const token = getToken();
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// // The API always responds { statusCode, message, data }. Unwrap it so callers
// // just get `data` back, and normalize errors to a plain message string.
// client.interceptors.response.use(
//   (res) => res.data?.data,
//   (err) => {
//     const message =
//       err.response?.data?.message ||
//       err.message ||
//       "Something went wrong talking to the server.";
//     const status = err.response?.status;
//     return Promise.reject({ status, message, raw: err });
//   }
// );


import axios from "axios";
const TOKEN_KEY = "huska_token";

export const client = axios.create({
  // baseURL: import.meta.env.VITE_API_URL || "https://foms-backend-production.up.railway.app/api",
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:4000/api",
});

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