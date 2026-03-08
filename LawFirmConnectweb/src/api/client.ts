import axios from "axios";
import toast from "react-hot-toast";
import { handleRateLimitError } from "../utils/rateLimitHandler";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000", // Backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the token if it exists
api.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem("user");
    const token = userStr ? JSON.parse(userStr).token : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle session expiration (single-device enforcement)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      handleRateLimitError(error.config?.url || "");
      return Promise.reject(error);
    }
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "SESSION_EXPIRED"
    ) {
      toast.error(
        "You've been logged out because your account was signed in on another device.",
      );
      localStorage.removeItem("user");
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  },
);

export default api;
