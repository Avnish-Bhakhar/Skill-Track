import axios from "axios";

const baseURL = `${(import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "")}/api`;
const TOKEN_KEY = "outcome-desk-token";

export const session = {
  get() {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

export const api = axios.create({ baseURL, timeout: 65000 });

api.interceptors.request.use((config) => {
  const token = session.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    if (error.response?.status === 401 && !url.startsWith("/auth/login")) {
      session.clear();
      window.location.assign("/");
    }
    return Promise.reject(error);
  },
);

export function errorText(error) {
  const data = error?.response?.data;
  if (data?.error) return data.error;
  if (data instanceof Blob) return "That download didn't work. Try again.";
  if (error?.request) return "The server didn't answer. Check it is running and VITE_API_URL is right.";
  return "Something went wrong. Try again.";
}

export async function downloadFile(url, params, filename) {
  try {
    const response = await api.get(url, { params, responseType: "blob" });
    saveBlob(response.data, filename);
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      const body = await error.response.data.text();
      try {
        error.response.data = JSON.parse(body);
      } catch {
        error.response.data = { error: "That download didn't work. Try again." };
      }
    }
    throw error;
  }
}

export function saveBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
