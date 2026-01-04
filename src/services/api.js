// src/services/api.js
// TulipFleet API Service - With Refresh Token Support
// Updated: 01 Ocak 2026 - FAZ 4 BLE Device Activation

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_TIMEOUT, API_URL } from "../constants/config";

// 🔐 Refresh durumu takibi
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
    console.log("🌐 API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors & Auto refresh on 401
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 hatası ve daha önce retry edilmemişse
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Refresh veya login endpoint'i ise direkt hata dön
      if (
        originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/login")
      ) {
        return Promise.reject(error);
      }

      // Zaten refresh yapılıyorsa kuyruğa ekle
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");

        if (!refreshToken) {
          console.log("❌ No refresh token, need to login again");
          isRefreshing = false;
          return Promise.reject(error);
        }

        console.log("🔄 Auto-refreshing token...");

        // Refresh token endpoint'ini çağır
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { token: newAccessToken } = response.data;

        if (newAccessToken) {
          console.log("✅ Token auto-refreshed successfully");

          // Yeni token'ı kaydet
          await AsyncStorage.setItem("accessToken", newAccessToken);

          // Bekleyen istekleri işle
          processQueue(null, newAccessToken);

          // Orijinal isteği yeni token ile tekrarla
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError.message);
        processQueue(refreshError, null);
        // Token'ları temizle - kullanıcı tekrar login olmalı
        await AsyncStorage.multiRemove([
          "accessToken",
          "refreshToken",
          "userData",
        ]);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Diğer hatalar
    if (error.response) {
      console.error(
        "❌ API Error:",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error("❌ API Error: No response", error.message);
    } else {
      console.error("❌ API Error:", error.message);
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

  // 🔐 Refresh Token
  refresh: async (refreshToken) => {
    const response = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken,
    });
    return response.data;
  },

  // Logout - refreshToken parametresi eklendi
  logout: async (refreshToken = null) => {
    const response = await api.post("/api/auth/logout", { refreshToken });
    return response.data;
  },

  // 🔐 Tüm cihazlardan çıkış
  logoutAll: async () => {
    const response = await api.post("/api/auth/logout-all");
    return response.data;
  },
};

// ============================================
// DEVICE API - FAZ 4 BLE ACTIVATION
// ============================================

export const deviceAPI = {
  // Get all devices (SuperAdmin)
  getAll: async () => {
    const response = await api.get("/api/superadmin/devices");
    return response.data;
  },

  // Get device by ID
  getById: async (id) => {
    const response = await api.get(`/api/superadmin/devices/${id}`);
    return response.data;
  },

  // Get device by serial
  getBySerial: async (serial) => {
    const response = await api.get(`/api/devices/serial/${serial}`);
    return response.data;
  },

  // Validate serial (opsiyonel - endpoint varsa kullan)
  validateSerial: async (serial) => {
    try {
      const response = await api.get(`/api/devices/serial/${serial}/check`);
      return {
        valid: true,
        device: response.data,
      };
    } catch (error) {
      // Endpoint yoksa (404) bile devam et
      if (error.response?.status === 404) {
        // Endpoint yok, validation skip
        return { valid: true, skipValidation: true };
      }
      return {
        valid: false,
        error: error.response?.data?.error || "VALIDATION_ERROR",
        message: error.response?.data?.message || "Doğrulama hatası",
      };
    }
  },

  // 🔵 ACTIVATE DEVICE (Mobil JWT ile)
  activate: async (serial, espChipId = null) => {
    try {
      const body = { serial };
      if (espChipId) body.esp_chip_id = espChipId;

      const response = await api.post("/api/devices/activate", body);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const data = error.response?.data || {};
      return {
        success: false,
        error: data.error || "UNKNOWN_ERROR",
        message: data.message || "Aktivasyon başarısız",
        statusCode: error.response?.status,
      };
    }
  },

  // Generate serials (batch)
  generateSerials: async (count, createdBy) => {
    const response = await api.post(
      "/api/superadmin/devices/generate-serials",
      {
        count,
        created_by: createdBy,
      }
    );
    return response.data;
  },

  // Assign device to vehicle
  assignToVehicle: async (deviceId, vehicleId) => {
    const response = await api.post(
      `/api/superadmin/devices/${deviceId}/assign`,
      {
        vehicle_id: vehicleId,
      }
    );
    return response.data;
  },

  // Unassign device from vehicle
  unassign: async (deviceId) => {
    const response = await api.post(
      `/api/superadmin/devices/${deviceId}/unassign`
    );
    return response.data;
  },

  // Update device status
  updateStatus: async (deviceId, status) => {
    const response = await api.put(
      `/api/superadmin/devices/${deviceId}/status`,
      {
        status,
      }
    );
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

  // Get vehicle telemetry
  getTelemetry: async (id) => {
    const response = await api.get(`/api/vehicles/${id}/telemetry`);
    return response.data;
  },

  // Get vehicle track (history)
  getTrack: async (id, from, to) => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const response = await api.get(
      `/api/vehicles/${id}/track?${params.toString()}`
    );
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
  deleteAll: async () => {
    const response = await api.delete("/api/alerts/all");
    return response.data;
  },
};

// ============================================
// REPORTS
// ============================================

export const reportAPI = {
  // Eski: Filo özeti raporu (geriye uyumluluk)
  getFleetSummary: async (from, to) => {
    const params = new URLSearchParams({ from, to }).toString();
    const response = await api.get(`/api/reports/fleet-summary?${params}`);
    return response.data;
  },

  // Yeni: Genel özet
  getSummary: async (from, to) => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const response = await api.get(`/api/reports/summary?${params.toString()}`);
    return response.data;
  },

  // Araç raporları
  getVehicles: async () => {
    const response = await api.get("/api/reports/vehicles");
    return response.data;
  },

  // Sürücü raporları
  getDrivers: async () => {
    const response = await api.get("/api/reports/drivers");
    return response.data;
  },

  // Uyarı raporları
  getAlerts: async (from, to) => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const response = await api.get(`/api/reports/alerts?${params.toString()}`);
    return response.data;
  },

  // Görev raporları
  getTasks: async (from, to) => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const response = await api.get(`/api/reports/tasks?${params.toString()}`);
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
// DRIVER TASK API - YENİ GÖREV AKIŞI
// Updated: 27 Aralık 2025
// ============================================
export const driverTaskAPI = {
  // Sürücünün görevlerini getir
  getMyTasks: async () => {
    const response = await api.get("/api/driver/tasks");
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

  // Unregister push token
  unregister: async () => {
    const response = await api.delete("/api/push/unregister");
    return response.data;
  },

  // Enable/disable push notifications
  toggle: async (enabled) => {
    const response = await api.put("/api/push/toggle", { enabled });
    return response.data;
  },

  // Get push status
  getStatus: async () => {
    const response = await api.get("/api/push/status");
    return response.data;
  },
};

// ============================================
// TASK OFFERS (Driver Inbox)
// ============================================
export const taskOffersAPI = {
  // Tüm teklifleri getir (inbox)
  getOffers: async (status = null) => {
    const params = status ? `?status=${status}` : "";
    const response = await api.get(`/api/task-offers${params}`);
    return response.data;
  },

  // Teklif detayı
  getOfferDetail: async (offerId) => {
    const response = await api.get(`/api/task-offers/${offerId}`);
    return response.data;
  },

  // Teklifi kabul et
  accept: async (offerId) => {
    const response = await api.post(`/api/task-offers/${offerId}/respond`, {
      response: "accepted",
    });
    return response.data;
  },

  // Teklifi reddet
  reject: async (offerId, reason = null) => {
    const response = await api.post(`/api/task-offers/${offerId}/respond`, {
      response: "rejected",
      reason,
    });
    return response.data;
  },
};

// ============================================
// ADMIN DEVICE API (Company Admin için)
// ============================================
export const adminDeviceAPI = {
  getDevices: async () => {
    const response = await api.get("/api/admin/devices");
    return response.data;
  },
  setReprovision: async (deviceId, reason) => {
    const response = await api.put(
      `/api/admin/devices/${deviceId}/reprovision`,
      { reason }
    );
    return response.data;
  },
  clearReprovision: async (deviceId) => {
    const response = await api.put(
      `/api/admin/devices/${deviceId}/reprovision`,
      { clear: true }
    );
    return response.data;
  },
};

export default api;
