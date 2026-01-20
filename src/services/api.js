// src/services/api.js
// TulipFleet API Service
// Updated: 20 Ocak 2026

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
  // Fleet stats - tek kaynak
  getFleetStats: async () => {
    const response = await api.get("/api/admin/fleet-stats");
    return response.data;
  },

  // Admin Devices inventory
  getDevices: async (assigned) => {
    const params = {};
    if (assigned !== undefined) params.assigned = assigned;
    const response = await api.get("/api/admin/devices", { params });
    return response.data;
  },

  searchDevices: async (serial) => {
    const response = await api.get("/api/admin/devices/search", {
      params: { serial },
    });
    return response.data;
  },

  claimDevice: async (data) => {
    const body = typeof data === "string" ? { deviceId: data } : data;
    const response = await api.post("/api/admin/devices/claim", body);
    return response.data;
  },

  // Delegate to canonical APIs
  getVehicles: async () => vehicleAPI.getList(),
  getDrivers: async () => driverAPI.getList(),
  getTasks: async () => taskAPI.getList(),

  getAlerts: async (status) => alertsAPI.getAll({ status }),

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
  // ============================================
  // COMPANIES (Birleşik - Şirket + Abonelik)
  // ============================================

  // Liste + Özet + Acil durumlar
  getCompanies: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(
      `/api/superadmin/companies${query ? "?" + query : ""}`
    );
    return response.data;
  },

  // Şirket detayı (tüm tab'lar için veri)
  getCompanyDetail: async (id) => {
    const response = await api.get(`/api/superadmin/companies/${id}`);
    return response.data;
  },

  // Şirket oluştur (Trial olarak başlar)
  createCompany: async (data) => {
    const response = await api.post("/api/superadmin/companies", data);
    return response.data;
  },

  // Şirket güncelle (abonelik dahil)
  updateCompany: async (id, data) => {
    const response = await api.put(`/api/superadmin/companies/${id}`, data);
    return response.data;
  },

  // Şirket sil
  deleteCompany: async (id) => {
    const response = await api.delete(`/api/superadmin/companies/${id}`);
    return response.data;
  },

  // ============================================
  // ABONELİK İŞLEMLERİ
  // ============================================

  // Ödeme kaydet + Otomatik aktifleştir (TEK BUTON)
  recordPayment: async (companyId, data) => {
    const response = await api.post(
      `/api/superadmin/companies/${companyId}/payment-received`,
      data
    );
    return response.data;
  },

  // Şirketi askıya al
  suspendCompany: async (companyId, data) => {
    const response = await api.post(
      `/api/superadmin/companies/${companyId}/suspend`,
      data
    );
    return response.data;
  },

  // Trial süresini uzat
  extendTrial: async (companyId, days = 7) => {
    const response = await api.post(
      `/api/superadmin/companies/${companyId}/extend-trial`,
      { days }
    );
    return response.data;
  },

  // Ödeme geçmişi (detaylı)
  getPaymentHistory: async (companyId) => {
    const response = await api.get(
      `/api/superadmin/companies/${companyId}/payments`
    );
    return response.data;
  },

  // Audit log (değişiklik geçmişi)
  getAuditLogs: async (companyId) => {
    const response = await api.get(
      `/api/superadmin/companies/${companyId}/audit-logs`
    );
    return response.data;
  },

  // ============================================
  // CİHAZLAR (Mevcut - Değişiklik yok)
  // ============================================
  getDevices: async () => {
    const response = await api.get("/api/superadmin/devices");
    return response.data;
  },

  getDeviceQR: async (deviceId) => {
    const response = await api.get(`/api/superadmin/devices/${deviceId}/qr`);
    return response.data;
  },

  generateDeviceQR: async (deviceId) => {
    const response = await api.post(`/api/superadmin/devices/${deviceId}/qr`);
    return response.data;
  },

  // ============================================
  // KULLANICILAR & SİSTEM
  // ============================================
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
  validateClaimToken: async (token) => {
    const response = await api.get("/api/device/claim/validate", {
      params: { token },
    });
    return response.data;
  },

  claimByToken: async (token, actionOrBody = "add_to_stock") => {
    const body =
      typeof actionOrBody === "string"
        ? { token, action: actionOrBody }
        : { token, ...(actionOrBody || {}) };

    const response = await api.post("/api/device/claim", body);
    return response.data;
  },

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

  // KALDIRILDI: updateTaskStatus - bu driverTaskAPI'de olmalı

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
// DRIVER ENDPOINTS (Admin tarafından kullanılır)
// ============================================

export const driverAPI = {
  // Canonical list endpoint
  getList: async () => {
    const response = await api.get("/api/drivers");
    return response.data;
  },

  // Alias for backward compatibility
  getAll: async () => driverAPI.getList(),

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

  // Driver's own endpoints
  getStats: async () => {
    const response = await api.get("/api/driver/stats");
    return response.data;
  },

  getTasks: async () => driverTaskAPI.getMyTasks(),

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

  // Update vehicle settings (uses authClient per request)
  updateVehicleSettings: async (vehicleId, data) => {
    const response = await authClient.put(
      `/api/driver/vehicle/${vehicleId}/settings`,
      data
    );
    return response.data;
  },

  getAssignableDevices: async () => {
    const response = await api.get("/api/driver/devices/assignable");
    return response.data;
  },

  searchDevices: async (serial) => {
    const response = await api.get("/api/driver/devices/search", {
      params: { serial },
    });
    return response.data;
  },

  assignDevice: async (arg1, arg2) => {
    const data =
      typeof arg1 === "object" && arg1 !== null
        ? arg1
        : { deviceId: arg1, vehicleId: arg2 };

    const response = await api.post("/api/driver/devices/assign", data);
    return response.data;
  },

  // Waypoint tamamla
  completeWaypoint: async (taskId, waypointId) => {
    const response = await api.put(
      `/api/driver/tasks/${taskId}/waypoints/${waypointId}/complete`
    );
    return response.data;
  },
};

// ============================================
// VEHICLE ENDPOINTS
// ============================================

export const vehicleAPI = {
  // Canonical list endpoint
  getList: async () => {
    const response = await api.get("/api/vehicles");
    return response.data;
  },

  // Alias for backward compatibility
  getAll: async () => vehicleAPI.getList(),

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

  getTrack: async (vehicleId, from, to) => {
    const params = new URLSearchParams();
    if (from) params.append("start", from);
    if (to) params.append("end", to);
    const url = `/api/vehicles/${vehicleId}/locations${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await api.get(url);
    return response.data;
  },

  getLatestLocation: async (vehicleId) => {
    const response = await api.get(`/api/vehicles/${vehicleId}/location`);
    return response.data;
  },

  getAllWithLocations: async () => {
    const response = await api.get("/api/locations/latest");
    return response.data;
  },
};

// ============================================
// TASK ENDPOINTS (Admin tarafından kullanılır)
// ============================================

export const taskAPI = {
  // Canonical list endpoint
  getList: async () => {
    const response = await api.get("/api/tasks");
    return response.data;
  },

  // Alias for backward compatibility
  getAll: async () => taskAPI.getList(),

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

  // Delegate to driverTaskAPI
  getDriverTasks: async () => driverTaskAPI.getMyTasks(),
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
// DRIVER TASK API (Sürücü görev işlemleri - TEK KAYNAK)
// ============================================

export const driverTaskAPI = {
  // Canonical: Sürücünün görevlerini getir
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

  // KRİTİK FIX: Fonksiyon adı ve URL düzeltildi
  updateTaskStatus: async (taskId, status) => {
    const response = await api.put(`/api/driver/tasks/${taskId}/status`, {
      status,
    });
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

  withdrawTask: async (taskId, data = {}) => {
    const response = await api.put(
      `/api/driver/tasks/${taskId}/withdraw`,
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
// ALERTS API (TEK KAYNAK)
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

  delete: async (id) => {
    const response = await api.delete(`/api/alerts/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete("/api/alerts");
    return response.data;
  },
};

// Standardize on alertsAPI (alias kaldırıldı, doğrudan kullan)
export const alertAPI = alertsAPI;

// ============================================
// REPORTS API
// ============================================

export const reportAPI = {
  // Delegate to adminAPI
  getSummary: async (from, to) => adminAPI.getFleetStats(),

  getVehicles: async () => {
    const response = await api.get("/api/reports/vehicles");
    return response.data;
  },

  getDrivers: async () => {
    const response = await api.get("/api/reports/drivers");
    return response.data;
  },

  getAlerts: async (from, to) => {
    const data = await alertsAPI.getAll();
    const alerts = data.alerts || [];

    // Tip bazlı grupla
    const byType = {};
    alerts.forEach((a) => {
      const type = a.alert_type || "OTHER";
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      total: alerts.length,
      byType,
      alerts,
    };
  },

  getTasks: async (from, to) => {
    const data = await taskAPI.getList();
    const tasks = data.tasks || data || [];

    // Durum bazlı grupla
    const byStatus = {};
    tasks.forEach((t) => {
      const status = t.status || "unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return {
      total: tasks.length,
      byStatus,
      tasks,
    };
  },
};

// ============================================
// FUEL API
// ============================================

export const fuelAPI = {
  // Driver endpoints
  addRecord: async (data) => {
    const response = await api.post("/api/fuel/records", data);
    return response.data;
  },

  getLastRecord: async (vehicleId) => {
    const response = await api.get(`/api/fuel/last-record/${vehicleId}`);
    return response.data;
  },

  // Admin endpoints
  getCompanyRecords: async (params = {}) => {
    const response = await api.get("/api/fuel/company/records", { params });
    return response.data;
  },

  getCompanyAnalytics: async () => {
    const response = await api.get("/api/fuel/company/analytics");
    return response.data;
  },

  getCompanySavings: async () => {
    const response = await api.get("/api/fuel/company/savings");
    return response.data;
  },

  getVehicleAnalysis: async (vehicleId) => {
    const response = await api.get(`/api/fuel/vehicle/${vehicleId}`);
    return response.data;
  },

  getAlerts: async () => {
    const response = await api.get("/api/fuel/alerts");
    return response.data;
  },
};

export default api;
