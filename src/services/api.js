// src/services/api.js
// TulipFleet API Service - Complete with all endpoints

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_TIMEOUT, API_URL } from "../constants/config";

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    console.log("API Request:", config.method?.toUpperCase(), config.url);
    console.log("🔑 Token:", token ? "EXISTS" : "MISSING");
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("API Error: No response", error.message);
    } else {
      console.error("API Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTHENTICATION
// ============================================

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post("/api/auth/login", { email, password });
    return response.data;
  },

  register: async (email, password, role = "driver") => {
    const response = await api.post("/api/auth/register", {
      email,
      password,
      role,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/api/auth/logout");
    return response.data;
  },
};

// ============================================
// DRIVER ENDPOINTS
// ============================================

export const driverAPI = {
  // Get all drivers
  getAll: async () => {
    const response = await api.get("/api/drivers");
    return response.data;
  },

  // Alias: getList (same as getAll)
  getList: async () => {
    const response = await api.get("/api/drivers");
    return response.data;
  },

  // Create driver with linked user
  createWithUser: async (data) => {
    const response = await api.post("/api/drivers/create-with-user", data);
    return response.data;
  },

  // Update driver
  update: async (id, data) => {
    const response = await api.put(`/api/drivers/${id}`, data);
    return response.data;
  },

  // Delete driver
  delete: async (id) => {
    const response = await api.delete(`/api/drivers/${id}`);
    return response.data;
  },

  // Existing endpoints
  getStats: async () => {
    const response = await api.get("/api/driver/stats");
    return response.data;
  },

  // Get active tasks
  getTasks: async () => {
    const response = await api.get("/api/driver/tasks");
    return response.data;
  },

  // Get assigned vehicle info
  getVehicle: async () => {
    const response = await api.get("/api/driver/vehicle");
    return response.data;
  },

  // Update task status
  updateTaskStatus: async (taskId, status) => {
    const response = await api.put(`/api/driver/task/${taskId}/status`, {
      status,
    });
    return response.data;
  },
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

export const adminAPI = {
  // Get fleet statistics
  getFleetStats: async () => {
    const response = await api.get("/api/admin/fleet-stats");
    return response.data;
  },

  // Get all vehicles with details
  getVehicles: async () => {
    const response = await api.get("/api/admin/vehicles");
    return response.data;
  },

  // Get recent activities
  getActivities: async () => {
    const response = await api.get("/api/admin/activities");
    return response.data;
  },
};

// ============================================
// VEHICLES
// ============================================
export const vehicleAPI = {
  // Get all vehicles
  getAll: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  // Alias: getList (same as getAll)
  getList: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  // Create vehicle
  create: async (data) => {
    const response = await api.post("/api/vehicles", data);
    return response.data;
  },

  // Update vehicle
  update: async (id, data) => {
    const response = await api.put(`/api/vehicles/${id}`, data);
    return response.data;
  },

  // Delete vehicle
  delete: async (id) => {
    const response = await api.delete(`/api/vehicles/${id}`);
    return response.data;
  },
};

// ============================================
// DRIVERS
// ============================================

export const driversAPI = {
  // Get all drivers
  getList: async () => {
    const response = await api.get("/api/drivers");
    return response.data;
  },

  // Create driver
  create: async (driverData) => {
    const response = await api.post("/api/drivers", driverData);
    return response.data;
  },
};

// ============================================
// TASKS
// ============================================
export const taskAPI = {
  // Get all tasks
  getAll: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

  // Alias: getList (same as getAll)
  getList: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

  // Create task
  create: async (data) => {
    const response = await api.post("/api/tasks", data);
    return response.data;
  },

  // Update task
  update: async (id, data) => {
    const response = await api.put(`/api/tasks/${id}`, data);
    return response.data;
  },

  // Delete task
  delete: async (id) => {
    const response = await api.delete(`/api/tasks/${id}`);
    return response.data;
  },
};

// ============================================
// ALERTS
// ============================================
export const alertAPI = {
  getAll: async () => {
    const response = await api.get("/api/alerts");
    return response.data;
  },
  resolve: async (id) => {
    const response = await api.put(`/api/alerts/${id}/resolve`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/alerts/${id}`);
    return response.data;
  },
};

// ============================================
// REPORTS
// ============================================

export const reportAPI = {
  // Get fleet summary report
  getFleetSummary: async (from, to) => {
    const params = new URLSearchParams({ from, to }).toString();
    const response = await api.get(`/api/reports/fleet-summary?${params}`);
    return response.data;
  },
};

// ============================================
// DASHBOARD
// ============================================

export const dashboardAPI = {
  // Get dashboard statistics
  getStats: async () => {
    const response = await api.get("/api/dashboard/stats");
    return response.data;
  },
};

// ============================================
// HEALTH CHECK
// ============================================

export const healthAPI = {
  check: async () => {
    const response = await api.get("/health");
    return response.data;
  },
};

// ============================================
// USER API
// ============================================
export const userAPI = {
  // Profil güncelle
  updateProfile: async (data) => {
    const response = await api.put("/api/users/profile", data);
    return response.data;
  },

  // Şifre değiştir
  changePassword: async (data) => {
    const response = await api.put("/api/users/password", data);
    return response.data;
  },

  // Ayarları güncelle
  updateSettings: async (data) => {
    const response = await api.put("/api/users/settings", data);
    return response.data;
  },

  // Push token kaydet
  registerPushToken: async (token, platform) => {
    const response = await api.post("/api/users/push-token", {
      token,
      platform,
    });
    return response.data;
  },
};

// ============================================
// DRIVER TASK API
// ============================================
export const driverTaskAPI = {
  getMyTasks: async () => {
    const response = await api.get("/api/driver/tasks");
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/api/driver/task/${id}/status`, { status });
    return response.data;
  },
};

export default api;
