import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("agropay_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("agropay_token");
      localStorage.removeItem("agropay_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authApi = {
  signup: (data) => api.post("/auth/signup", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  linkWallet: (walletAddress) => api.post("/auth/wallet", { walletAddress }),
};

// --- Listings ---
export const listingApi = {
  getAll: (params) => api.get("/listings", { params }),
  getById: (id) => api.get(`/listings/${id}`),
  getMine: () => api.get("/listings/mine"),
  create: (formData) =>
    api.post("/listings", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  setStatus: (id, active) => api.patch(`/listings/${id}/status`, { active }),
};

// --- Orders ---
export const orderApi = {
  create: (data) => api.post("/orders", data),
  getMine: () => api.get("/orders/mine"),
  getById: (id) => api.get(`/orders/${id}`),
  markDelivered: (id, formData) =>
    api.patch(`/orders/${id}/deliver`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  confirm: (id, releaseTxHash) => api.patch(`/orders/${id}/confirm`, { releaseTxHash }),
  dispute: (id, reason) => api.patch(`/orders/${id}/dispute`, { reason }),
};

// --- Feedback ---
export const feedbackApi = {
  submit: (data) => api.post("/feedback", data),
  getAll: () => api.get("/feedback"),
};

// --- Admin ---
export const adminApi = {
  verifyFarmer: (id, verified) => api.patch(`/admin/farmers/${id}/verify`, { verified }),
  getStats: () => api.get("/admin/stats"),
  getEvents: () => api.get("/admin/events"),
  getDisputes: () => api.get("/admin/disputes"),
};
