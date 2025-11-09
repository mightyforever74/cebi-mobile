import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Environment variables'ı okumak için
import { API_TIMEOUT, API_URL } from "../constants/config";

// Axios instance oluştur
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Token ekle
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log("API Request:", config.method.toUpperCase(), config.url);
      return config;
    } catch (error) {
      console.error("Request interceptor error:", error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Token yenileme
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          await AsyncStorage.setItem("accessToken", accessToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Token refresh failed - Logout
        await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
        console.error("Token refresh failed:", refreshError);
        // Navigate to login screen
        return Promise.reject(refreshError);
      }
    }

    console.error("API Error:", error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (data) => api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
  refreshToken: (refreshToken) => api.post("/auth/refresh", { refreshToken }),
  getProfile: () => api.get("/auth/profile"),
};

// Vehicles API
export const vehiclesAPI = {
  getAll: () => api.get("/vehicles"),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post("/vehicles", data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getTelemetry: (id) => api.get(`/vehicles/${id}/telemetry`),
};

// Tasks API
export const tasksAPI = {
  getAll: (driverId) => api.get("/tasks", { params: { driverId } }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Reports API
export const reportsAPI = {
  getDashboard: () => api.get("/reports/dashboard"),
  getVehicleStats: (vehicleId, startDate, endDate) =>
    api.get(`/reports/vehicles/${vehicleId}`, {
      params: { startDate, endDate },
    }),
  getDriverStats: (driverId, startDate, endDate) =>
    api.get(`/reports/drivers/${driverId}`, {
      params: { startDate, endDate },
    }),
};

export default api;
