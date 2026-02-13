import axios from "axios";

/**
 * Shared configuration for the Python RAG backend (FastAPI on port 8000).
 * Used by ragService.ts and caseService.ts for all AI/RAG-related endpoints.
 */

export const RAG_API_URL =
  import.meta.env.VITE_RAG_API_URL || "http://localhost:8000";

/**
 * Build auth headers from localStorage for the Python backend.
 * The Python backend expects the same JWT token as the Node backend.
 */
export const getAuthHeaders = (): Record<string, string> => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.token) {
        return { Authorization: `Bearer ${user.token}` };
      }
    } catch (e) {
      console.error("Error parsing user from localStorage", e);
    }
  }
  return {};
};

/**
 * Pre-configured axios instance for RAG API calls.
 * Automatically attaches auth headers on each request.
 */
export const ragAxios = axios.create({
  baseURL: RAG_API_URL,
});

ragAxios.interceptors.request.use(
  (config) => {
    const headers = getAuthHeaders();
    if (headers.Authorization) {
      config.headers.Authorization = headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error),
);
