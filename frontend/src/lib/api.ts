import axios from "axios";

// Single axios instance for the whole app. baseURL points at the backend's /api.
// withCredentials lets the browser send/receive the httpOnly auth cookie too.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Attach the JWT (kept in localStorage) to every request as a Bearer token.
// The backend accepts either this header or the cookie — belt and suspenders.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap the API's { success, message, data } envelope so callers get `data`.
// On error, surface the backend's message so the UI can show something useful.
export async function apiGet<T>(url: string): Promise<T> {
  const res = await api.get(url);
  return res.data.data as T;
}

export async function apiPost<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await api.post(url, body, { headers });
  return res.data.data as T;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch(url, body);
  return res.data.data as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete(url);
  return res.data.data as T;
}
