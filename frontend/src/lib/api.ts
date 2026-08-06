import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
