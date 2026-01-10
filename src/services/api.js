// src/services/api.js
// TulipFleet API Service
// Updated: 06 Ocak 2026 - getCompletedTasks, updateVehicleFuel, updateVehicleKm eklendi

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log("🔒 Token expired or invalid");
      // Clear stored token
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    }

    // Log error details
    if (error.response) {
      console.error("API Error:", {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error("Network Error:", error.message);
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH ENDPOINTS
// ============================================

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post("/api/auth/login", { email, password });
    return response.data;
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      // Ignore logout errors
    }
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("userData");
    return { success: true };
  },

  register: async (data) => {
    const response = await api.post("/api/auth/register", data);
    return response.data;
  },

  me: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.put("/api/auth/change-password", data);
    return response.data;
  },
};

// ============================================
// USER ENDPOINTS
// ============================================

export const userAPI = {
  getProfile: async () => {
    const response = await api.get("/api/user/profile");
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put("/api/user/profile", data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.put("/api/user/change-password", data);
    return response.data;
  },
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

export const adminAPI = {
  // Fleet Stats
  getFleetStats: async () => {
    const response = await api.get("/api/admin/stats");
    return response.data;
  },

  // Vehicles
  getVehicles: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  // Drivers
  getDrivers: async () => {
    const response = await api.get("/api/drivers");
    return response.data;
  },

  // Tasks
  getTasks: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

  // Alerts
  getAlerts: async (status) => {
    const url = status ? `/api/alerts?status=${status}` : "/api/alerts";
    const response = await api.get(url);
    return response.data;
  },

  resolveAlert: async (alertId, resolution) => {
    const response = await api.put(`/api/alerts/${alertId}/resolve`, {
      resolution,
    });
    return response.data;
  },

  // Activities (combined alerts + tasks)
  getActivities: async () => {
    const response = await api.get("/api/admin/activities");
    return response.data;
  },
};

// ============================================
// SUPER ADMIN ENDPOINTS
// ============================================

export const superAdminAPI = {
  // Companies
  getCompanies: async () => {
    const response = await api.get("/api/superadmin/companies");
    return response.data;
  },

  createCompany: async (data) => {
    const response = await api.post("/api/superadmin/companies", data);
    return response.data;
  },

  updateCompany: async (id, data) => {
    const response = await api.put(`/api/superadmin/companies/${id}`, data);
    return response.data;
  },

  deleteCompany: async (id) => {
    const response = await api.delete(`/api/superadmin/companies/${id}`);
    return response.data;
  },

  // Devices
  getDevices: async () => {
    const response = await api.get("/api/superadmin/devices");
    return response.data;
  },

  // Users
  getUsers: async () => {
    const response = await api.get("/api/superadmin/users");
    return response.data;
  },

  // System Health
  getSystemHealth: async () => {
    const response = await api.get("/api/superadmin/system-health");
    return response.data;
  },
};

// ============================================
// DEVICE ENDPOINTS
// ============================================

export const deviceAPI = {
  // Validate serial
  validateSerial: async (serial) => {
    const response = await api.post("/api/devices/validate-serial", { serial });
    return response.data;
  },

  // Activate device
  activate: async (data) => {
    const response = await api.post("/api/devices/activate", data);
    return response.data;
  },

  // Get device info
  getInfo: async (deviceId) => {
    const response = await api.get(`/api/devices/${deviceId}`);
    return response.data;
  },

  // Update device status
  updateStatus: async (deviceId, status) => {
    const response = await api.put(`/api/devices/${deviceId}/status`, {
      status,
    });
    return response.data;
  },

  // Driver task status (eski endpoint)
  updateTaskStatus: async (id, status) => {
    const response = await api.put(`/api/driver/task/${id}/status`, { status });
    return response.data;
  },

  // Quarantine device
  quarantine: async (deviceId, reason) => {
    const response = await api.post(
      `/api/superadmin/devices/${deviceId}/quarantine`,
      {
        reason,
      }
    );
    return response.data;
  },

  // Get audit log
  getAuditLog: async (deviceId) => {
    const response = await api.get(`/api/superadmin/devices/${deviceId}/audit`);
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

  // 🆕 Get assigned device info (MVP Endpoint)
  getAssignedDevice: async () => {
    const response = await api.get("/api/drivers/me/assigned-device");
    return response.data;
  },

  // 🆕 Araç yakıt güncelle (06 Ocak 2026)
  updateVehicleFuel: async (vehicleId, fuelLevel) => {
    const response = await api.put(`/api/driver/vehicle/${vehicleId}/fuel`, {
      fuel_level: fuelLevel,
    });
    return response.data;
  },

  // 🆕 Araç km güncelle (06 Ocak 2026)
  updateVehicleKm: async (vehicleId, odometer) => {
    const response = await api.put(
      `/api/driver/vehicle/${vehicleId}/odometer`,
      {
        odometer: odometer,
      }
    );
    return response.data;
  },
};

// ============================================
// VEHICLE ENDPOINTS
// ============================================

export const vehicleAPI = {
  // Get all vehicles
  getAll: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  // Alias
  getList: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  // Get vehicle by ID
  getById: async (id) => {
    const response = await api.get(`/api/vehicles/${id}`);
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

  // Get vehicle location history
  getLocationHistory: async (vehicleId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.start) queryParams.append("start", params.start);
    if (params.end) queryParams.append("end", params.end);
    if (params.limit) queryParams.append("limit", params.limit);

    const url = `/api/vehicles/${vehicleId}/locations${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await api.get(url);
    return response.data;
  },

  // Get latest location
  getLatestLocation: async (vehicleId) => {
    const response = await api.get(`/api/vehicles/${vehicleId}/location`);
    return response.data;
  },
};

// ============================================
// TASK ENDPOINTS
// ============================================

export const taskAPI = {
  // Get all tasks
  getAll: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

  // Alias
  getList: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

  // Get task by ID
  getById: async (id) => {
    const response = await api.get(`/api/tasks/${id}`);
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

  // Send offer to driver
  sendOffer: async (taskId, driverId) => {
    const response = await api.post(`/api/tasks/${taskId}/offer`, {
      driver_id: driverId,
    });
    return response.data;
  },

  // Driver için görevleri getir (geriye uyumluluk)
  getDriverTasks: async () => {
    const response = await api.get("/api/driver/tasks");
    return response.data;
  },
};

// ============================================
// TASK OFFERS API (Sürücü için görev teklifleri)
// ============================================

export const taskOffersAPI = {
  // Tüm teklifleri getir
  getOffers: async (status) => {
    const url = status
      ? `/api/task-offers?status=${status}`
      : "/api/task-offers";
    const response = await api.get(url);
    return response.data;
  },

  // Teklif detayı
  getOfferDetail: async (offerId) => {
    const response = await api.get(`/api/task-offers/${offerId}`);
    return response.data;
  },

  // Teklifi kabul et
  acceptOffer: async (offerId) => {
    const response = await api.put(`/api/task-offers/${offerId}/accept`);
    return response.data;
  },

  // Teklifi reddet
  rejectOffer: async (offerId, reason) => {
    const response = await api.put(`/api/task-offers/${offerId}/reject`, {
      reason,
    });
    return response.data;
  },
};

// ============================================
// DRIVER TASK API - YENİ GÖREV AKIŞI
// Updated: 06 Ocak 2026 - getCompletedTasks eklendi
// ============================================
export const driverTaskAPI = {
  // Sürücünün aktif görevlerini getir
  getMyTasks: async () => {
    const response = await api.get("/api/driver/tasks");
    return response.data;
  },

  // 🆕 Tamamlanan görevleri getir (son 7 gün)
  getCompletedTasks: async () => {
    const response = await api.get("/api/driver/tasks?status=completed");
    return response.data;
  },

  // Görev detayını getir
  getTaskDetail: async (taskId) => {
    const response = await api.get(`/api/driver/tasks/${taskId}`);
    return response.data;
  },

  // Eski status güncelleme (geriye uyumluluk)
  updateStatus: async (id, status) => {
    const response = await api.put(`/api/driver/task/${id}/status`, { status });
    return response.data;
  },

  // ============================================
  // YENİ GÖREV AKSİYONLARI - 27 Aralık 2025
  // ============================================

  // Görevi kabul et
  acceptTask: async (taskId) => {
    const response = await api.put(`/api/driver/tasks/${taskId}/accept`);
    return response.data;
  },

  // Görevi reddet
  rejectTask: async (taskId, reason) => {
    const response = await api.put(`/api/driver/tasks/${taskId}/reject`, {
      reason,
    });
    return response.data;
  },

  // Göreve başla
  startTask: async (taskId) => {
    const response = await api.put(`/api/driver/tasks/${taskId}/start`);
    return response.data;
  },

  // Görevi tamamla
  completeTask: async (taskId, data = {}) => {
    const response = await api.put(
      `/api/driver/tasks/${taskId}/complete`,
      data
    );
    return response.data;
  },
};

// ============================================
// PUSH NOTIFICATION API
// ============================================
export const pushAPI = {
  // Expo push token register
  register: async (expo_push_token) => {
    const response = await api.post("/api/push/register", { expo_push_token });
    return response.data;
  },

  // Send test notification
  sendTest: async () => {
    const response = await api.post("/api/push/test");
    return response.data;
  },
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default api;
