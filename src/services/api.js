// src/services/api.js
// TulipFleet API Service
// Updated: 12 Ocak 2026 - Token Race Condition Fix v4
// FIXES:
// - KRİTİK A: Auth endpoint'leri için interceptor'sız authClient
// - KRİTİK B: 401 guard (auth endpoint hariç) + spam lock
// - AsyncStorage import kaldırıldı (storage utils kullanılıyor)

import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { clearTokens, clearUserData, getAccessToken } from "../utils/storage";

// ============================================
// IN-MEMORY TOKEN CACHE (Race condition fix)
// ============================================
let inMemoryToken = null;

// 401 event callback (AuthContext tarafından set edilir)
let onUnauthorizedCallback = null;

// KRİTİK B: Spam lock - aynı anda birden fazla 401 için
let unauthorizedHandled = false;

/**
 * Token'ı memory'ye set et (AuthContext'ten çağrılır)
 */
export const setAuthToken = (token) => {
  inMemoryToken = token;
  console.log(
    "🔑 [API] Token set in memory:",
    token ? "***" + token.slice(-6) : null
  );
};

/**
 * Token'ı memory'den temizle
 */
export const clearAuthToken = () => {
  inMemoryToken = null;
  console.log("🔑 [API] Token cleared from memory");
};

/**
 * 401 callback'i set et (AuthContext logout için)
 * Type guard eklendi
 */
export const setOnUnauthorized = (callback) => {
  onUnauthorizedCallback = typeof callback === "function" ? callback : null;
};

/**
 * Token'ı al - önce memory, sonra storage utils
 */
const getToken = async () => {
  // 1. Önce memory'den dene (en hızlı)
  if (inMemoryToken) {
    return inMemoryToken;
  }

  // 2. Memory'de yoksa storage utils'den al
  try {
    const token = await getAccessToken();
    if (token) {
      inMemoryToken = token; // Memory'ye cache'le
    }
    return token;
  } catch (error) {
    console.error("Error getting token from storage:", error);
    return null;
  }
};

// ============================================
// KRİTİK A: Auth endpoint'leri için INTERCEPTOR'SIZ client
// Login/logout/refresh bu client'ı kullanır
// ============================================
const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// Normal API istekleri için interceptor'lü client
// ============================================
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
      const token = await getToken();
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
    const status = error.response?.status;
    const url = error.config?.url || "";

    // KRİTİK B: Auth endpoint'lerinde 401 gelirse cleanup YAPMA
    const isAuthEndpoint =
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/logout") ||
      url.includes("/api/auth/refresh") ||
      url.includes("/api/auth/register");

    // Handle 401 Unauthorized (auth endpoint'leri hariç)
    if (status === 401 && !isAuthEndpoint && !unauthorizedHandled) {
      console.log("🔒 [API] 401 - Token expired or invalid");

      // KRİTİK B: Spam lock - 2 saniye içinde tekrar tetiklenmez
      unauthorizedHandled = true;
      setTimeout(() => {
        unauthorizedHandled = false;
      }, 2000);

      // Memory cache temizle
      clearAuthToken();

      // Storage temizle
      try {
        await clearTokens();
        await clearUserData();
      } catch (e) {
        console.warn("Storage clear error:", e);
      }

      // AuthContext'e bildir (varsa)
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    // Log error details
    if (error.response) {
      console.error("API Error:", {
        status: error.response.status,
        data: error.response.data,
        url: url,
      });
    } else if (error.request) {
      console.error("Network Error:", error.message);
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH ENDPOINTS (interceptor'sız authClient kullanır)
// ============================================

export const authAPI = {
  // Login - interceptor'sız
  login: async (email, password) => {
    const response = await authClient.post("/api/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  // Logout - TOKEN GEREKLİ (api kullan, authClient değil)
  logout: async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch (error) {
      console.warn("Backend logout error (ignored):", error.message);
    }
    // Memory + Storage temizle
    clearAuthToken();
    await clearTokens();
    await clearUserData();
    return { success: true };
  },

  // Register - interceptor'sız
  register: async (email, password, role = "driver") => {
    const response = await authClient.post("/api/auth/register", {
      email,
      password,
      role,
    });
    return response.data;
  },

  // Me - bu token gerektirir, api kullan
  me: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },

  // Change password - token gerektirir
  changePassword: async (data) => {
    const response = await api.put("/api/auth/change-password", data);
    return response.data;
  },

  // Refresh - interceptor'sız (KRİTİK A)
  refresh: async (refreshToken) => {
    const response = await authClient.post("/api/auth/refresh", {
      refreshToken,
    });
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
  getFleetStats: async () => {
    const response = await api.get("/api/admin/fleet-stats"); // ✅ DOĞRU
    return response.data;
  },

  getVehicles: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  getDrivers: async () => {
    const response = await api.get("/api/drivers");
    return response.data;
  },

  getTasks: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

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

  getActivities: async () => {
    const response = await api.get("/api/admin/activities");
    return response.data;
  },
};

// ============================================
// SUPER ADMIN ENDPOINTS
// ============================================

export const superAdminAPI = {
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

  getDevices: async () => {
    const response = await api.get("/api/superadmin/devices");
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get("/api/superadmin/users");
    return response.data;
  },

  getSystemHealth: async () => {
    const response = await api.get("/api/superadmin/system-health");
    return response.data;
  },
};

// ============================================
// DEVICE ENDPOINTS
// ============================================

export const deviceAPI = {
  validateSerial: async (serial) => {
    const response = await api.post("/api/devices/validate-serial", { serial });
    return response.data;
  },

  activate: async (data) => {
    const response = await api.post("/api/devices/activate", data);
    return response.data;
  },

  getInfo: async (deviceId) => {
    const response = await api.get(`/api/devices/${deviceId}`);
    return response.data;
  },

  updateStatus: async (deviceId, status) => {
    const response = await api.put(`/api/devices/${deviceId}/status`, {
      status,
    });
    return response.data;
  },

  updateTaskStatus: async (id, status) => {
    const response = await api.put(`/api/driver/task/${id}/status`, { status });
    return response.data;
  },

  quarantine: async (deviceId, reason) => {
    const response = await api.post(
      `/api/superadmin/devices/${deviceId}/quarantine`,
      { reason }
    );
    return response.data;
  },

  getAuditLog: async (deviceId) => {
    const response = await api.get(`/api/superadmin/devices/${deviceId}/audit`);
    return response.data;
  },
};

// ============================================
// DRIVER ENDPOINTS
// ============================================

export const driverAPI = {
  getAll: async () => {
    const response = await api.get("/api/drivers");
    return response.data;
  },

  getList: async () => {
    const response = await api.get("/api/drivers");
    return response.data;
  },

  createWithUser: async (data) => {
    const response = await api.post("/api/drivers/create-with-user", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/drivers/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/drivers/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get("/api/driver/stats");
    return response.data;
  },

  getTasks: async () => {
    const response = await api.get("/api/driver/tasks");
    return response.data;
  },

  getVehicle: async () => {
    const response = await api.get("/api/driver/vehicle");
    return response.data;
  },

  getAssignedDevice: async () => {
    const response = await api.get("/api/drivers/me/assigned-device");
    return response.data;
  },

  updateVehicleFuel: async (vehicleId, fuelLevel) => {
    const response = await api.put(`/api/driver/vehicle/${vehicleId}/fuel`, {
      fuel_level: fuelLevel,
    });
    return response.data;
  },

  updateVehicleKm: async (vehicleId, odometer) => {
    const response = await api.put(
      `/api/driver/vehicle/${vehicleId}/odometer`,
      { odometer }
    );
    return response.data;
  },
};

// ============================================
// VEHICLE ENDPOINTS
// ============================================

export const vehicleAPI = {
  getAll: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  getList: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/vehicles/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/api/vehicles", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/vehicles/${id}`);
    return response.data;
  },

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

  getLatestLocation: async (vehicleId) => {
    const response = await api.get(`/api/vehicles/${vehicleId}/location`);
    return response.data;
  },
  // Tüm araçların son konumları - FleetMap için
  getAllWithLocations: async () => {
    const response = await api.get("/api/locations/latest");
    return response.data;
  },
};

// ============================================
// TASK ENDPOINTS
// ============================================

export const taskAPI = {
  getAll: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

  getList: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/tasks/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/api/tasks", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/tasks/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/tasks/${id}`);
    return response.data;
  },

  sendOffer: async (taskId, driverId) => {
    const response = await api.post(`/api/tasks/${taskId}/offer`, {
      driver_id: driverId,
    });
    return response.data;
  },

  getDriverTasks: async () => {
    const response = await api.get("/api/driver/tasks");
    return response.data;
  },
};

// ============================================
// TASK OFFERS API
// ============================================

export const taskOffersAPI = {
  getOffers: async (status) => {
    const url = status
      ? `/api/task-offers?status=${status}`
      : "/api/task-offers";
    const response = await api.get(url);
    return response.data;
  },

  getOfferDetail: async (offerId) => {
    const response = await api.get(`/api/task-offers/${offerId}`);
    return response.data;
  },

  acceptOffer: async (offerId) => {
    const response = await api.put(`/api/task-offers/${offerId}/accept`);
    return response.data;
  },

  rejectOffer: async (offerId, reason) => {
    const response = await api.put(`/api/task-offers/${offerId}/reject`, {
      reason,
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

  getCompletedTasks: async () => {
    const response = await api.get("/api/driver/tasks?status=completed");
    return response.data;
  },

  getTaskDetail: async (taskId) => {
    const response = await api.get(`/api/driver/tasks/${taskId}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.put(`/api/driver/task/${id}/status`, { status });
    return response.data;
  },

  acceptTask: async (taskId) => {
    const response = await api.put(`/api/driver/tasks/${taskId}/accept`);
    return response.data;
  },

  rejectTask: async (taskId, reason) => {
    const response = await api.put(`/api/driver/tasks/${taskId}/reject`, {
      reason,
    });
    return response.data;
  },

  startTask: async (taskId) => {
    const response = await api.put(`/api/driver/tasks/${taskId}/start`);
    return response.data;
  },

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
  register: async (pushToken) => {
    const response = await api.post("/api/push/register", { pushToken });
    return response.data;
  },

  sendTest: async () => {
    const response = await api.post("/api/push/test");
    return response.data;
  },
};
// ============================================
// ALERTS API
// ============================================

export const alertsAPI = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.severity) queryParams.append("severity", params.severity);
    const url = `/api/alerts${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await api.get(url);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/alerts/${id}`);
    return response.data;
  },

  resolve: async (id, resolution) => {
    const response = await api.put(`/api/alerts/${id}/resolve`, { resolution });
    return response.data;
  },
};
export const alertAPI = alertsAPI;
export default api;
