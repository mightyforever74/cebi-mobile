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

// 401 event callback (AuthContext tarafÄ±ndan set edilir)
let onUnauthorizedCallback = null;

// KRÄ°TÄ°K B: Spam lock - aynÄ± anda birden fazla 401 iÃ§in
let unauthorizedHandled = false;

/**
 * Token'Ä± memory'ye set et (AuthContext'ten Ã§aÄŸrÄ±lÄ±r)
 */
export const setAuthToken = (token) => {
  inMemoryToken = token;
  console.log(
    "ðŸ”‘ [API] Token set in memory:",
    token ? "***" + token.slice(-6) : null
  );
};

/**
 * Token'Ä± memory'den temizle
 */
export const clearAuthToken = () => {
  inMemoryToken = null;
  console.log("ðŸ”‘ [API] Token cleared from memory");
};

/**
 * 401 callback'i set et (AuthContext logout iÃ§in)
 * Type guard eklendi
 */
export const setOnUnauthorized = (callback) => {
  onUnauthorizedCallback = typeof callback === "function" ? callback : null;
};

/**
 * Token'Ä± al - Ã¶nce memory, sonra storage utils
 */
const getToken = async () => {
  // 1. Ã–nce memory'den dene (en hÄ±zlÄ±)
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
// KRÄ°TÄ°K A: Auth endpoint'leri iÃ§in INTERCEPTOR'SIZ client
// Login/logout/refresh bu client'Ä± kullanÄ±r
// ============================================
const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// Normal API istekleri iÃ§in interceptor'lÃ¼ client
// ============================================
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// S6: ETag / 304 Cache (network cost reduction)
// AdminDashboard 30s polling → veri degismediyse 304 = bos body
// ============================================
const etagCache = new Map(); // key: url → { etag, data }

// Request interceptor - add token + ETag
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

    // ETag: GET request icin If-None-Match ekle
    if (config.method === "get" && etagCache.has(config.url)) {
      config.headers["If-None-Match"] = etagCache.get(config.url).etag;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors + ETag
api.interceptors.response.use(
  (response) => {
    // ETag varsa cache'le
    const etag = response.headers?.etag;
    if (etag && response.config?.method === "get") {
      etagCache.set(response.config.url, { etag, data: response.data });
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    // S6: 304 Not Modified → cache'den dondur
    if (status === 304 && etagCache.has(url)) {
      return { data: etagCache.get(url).data, status: 304, cached: true };
    }

    // KRÄ°TÄ°K B: Auth endpoint'lerinde 401 gelirse cleanup YAPMA
    const isAuthEndpoint =
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/logout") ||
      url.includes("/api/auth/refresh") ||
      url.includes("/api/auth/register");

    // Handle 401 Unauthorized (auth endpoint'leri hariÃ§)
    if (status === 401 && !isAuthEndpoint && !unauthorizedHandled) {
      console.log("ðŸ”’ [API] 401 - Token expired or invalid");

      // KRÄ°TÄ°K B: Spam lock - 2 saniye iÃ§inde tekrar tetiklenmez
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
// AUTH ENDPOINTS (interceptor'sÄ±z authClient kullanÄ±r)
// ============================================

export const authAPI = {
  // Login - interceptor'sÄ±z
  login: async (email, password) => {
    const response = await authClient.post("/api/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  // Logout - TOKEN GEREKLÄ° (api kullan, authClient deÄŸil)
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

  // Register - interceptor'sÄ±z
  register: async (email, password, role = "driver") => {
    const response = await authClient.post("/api/auth/register", {
      email,
      password,
      role,
    });
    return response.data;
  },

  // Forgot password - interceptor'sÄ±z
  forgotPassword: async (email) => {
    const response = await authClient.post("/api/auth/forgot-password", {
      email,
    });
    return response.data;
  },

  // Reset password - interceptor'sÄ±z
  resetPassword: async (email, code, newPassword) => {
    const response = await authClient.post("/api/auth/reset-password", {
      email,
      code,
      newPassword,
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

  // Refresh - interceptor'sÄ±z (KRÄ°TÄ°K A)
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

  deleteAccount: async (password) => {
    const response = await api.delete("/api/users/me", { data: { password } });
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
  // YENÄ° METOD BURAYA EKLENDÄ° â†“â†“â†“
  addToStockBySerial: async (serial) => {
    const response = await api.post(
      "/api/admin/devices/add-to-stock-by-serial",
      { serial }
    );
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
  // COMPANIES (BirleÅŸik - Åžirket + Abonelik)
  // ============================================

  // Liste + Ã–zet + Acil durumlar
  getCompanies: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(
      `/api/superadmin/companies${query ? "?" + query : ""}`
    );
    return response.data;
  },

  // Åžirket detayÄ± (tÃ¼m tab'lar iÃ§in veri)
  getCompanyDetail: async (id) => {
    const response = await api.get(`/api/superadmin/companies/${id}`);
    return response.data;
  },

  // Åžirket oluÅŸtur (Trial olarak baÅŸlar)
  createCompany: async (data) => {
    const response = await api.post("/api/superadmin/companies", data);
    return response.data;
  },

  // Åžirket gÃ¼ncelle (abonelik dahil)
  updateCompany: async (id, data) => {
    const response = await api.put(`/api/superadmin/companies/${id}`, data);
    return response.data;
  },

  // Åžirket sil
  deleteCompany: async (id) => {
    const response = await api.delete(`/api/superadmin/companies/${id}`);
    return response.data;
  },

  // ============================================
  // ABONELÄ°K Ä°ÅžLEMLERÄ°
  // ============================================

  // Ã–deme kaydet + Otomatik aktifleÅŸtir (TEK BUTON)
  recordPayment: async (companyId, data) => {
    const response = await api.post(
      `/api/superadmin/companies/${companyId}/payment-received`,
      data
    );
    return response.data;
  },

  // Åžirketi askÄ±ya al
  suspendCompany: async (companyId, data) => {
    const response = await api.post(
      `/api/superadmin/companies/${companyId}/suspend`,
      data
    );
    return response.data;
  },

  // Trial sÃ¼resini uzat
  extendTrial: async (companyId, days = 7) => {
    const response = await api.post(
      `/api/superadmin/companies/${companyId}/extend-trial`,
      { days }
    );
    return response.data;
  },

  // Ã–deme geÃ§miÅŸi (detaylÄ±)
  getPaymentHistory: async (companyId) => {
    const response = await api.get(
      `/api/superadmin/companies/${companyId}/payments`
    );
    return response.data;
  },

  // Audit log (deÄŸiÅŸiklik geÃ§miÅŸi)
  getAuditLogs: async (companyId) => {
    const response = await api.get(
      `/api/superadmin/companies/${companyId}/audit-logs`
    );
    return response.data;
  },

  // ============================================
  // CÄ°HAZLAR (Mevcut - DeÄŸiÅŸiklik yok)
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

  getDeviceQRCodes: async (deviceId) => {
    const response = await api.get(
      `/api/superadmin/devices/${deviceId}/qr-codes`
    );
    return response.data;
  },

  deleteDevice: async (deviceId) => {
    const response = await api.delete(`/api/superadmin/devices/${deviceId}`);
    return response.data;
  },

  // ============================================
  // KULLANICILAR & SÄ°STEM
  // ============================================
  getUsers: async () => {
    const response = await api.get("/api/superadmin/users");
    return response.data;
  },

  scanQR: async (token, action, vehicleId, force = false) => {
    const response = await api.post("/api/devices/scan-qr", {
      token,
      action,
      vehicleId,
      force,
    });
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
  // ESKÄ° - ARTIK KULLANILMIYOR (Backend'de endpoint yok)
  // validateClaimToken: async (token) => {
  //   const response = await api.get("/api/device/claim/validate", {
  //     params: { token },
  //   });
  //   return response.data;
  // },

  // claimByToken: async (token, actionOrBody = "add_to_stock") => {
  //   const body =
  //     typeof actionOrBody === "string"
  //       ? { token, action: actionOrBody }
  //       : { token, ...(actionOrBody || {}) };
  //   const response = await api.post("/api/device/claim", body);
  //   return response.data;
  // },

  validateSerial: async (serial) => {
    const response = await api.post("/api/devices/validate-serial", { serial });
    return response.data;
  },

  activate: async (data) => {
    const response = await api.post("/api/devices/activate", data);
    return response.data;
  },

  // âœ… YENÄ°
  provisioningComplete: async (data) => {
    const response = await api.post("/api/devices/provisioning-complete", data);
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

  // KALDIRILDI: updateTaskStatus - bu driverTaskAPI'de olmalÄ±

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
// DRIVER ENDPOINTS (Admin tarafÄ±ndan kullanÄ±lÄ±r)
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

  // Alias'lar - Dashboard uyumluluÄŸu iÃ§in
  getMyVehicle: async () => driverAPI.getVehicle(),
  getMyTasks: async () => driverAPI.getTasks(),
  getMyStats: async () => driverAPI.getStats(),

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
  updateWaypointStatus: async (taskId, waypointId, status) => {
    const response = await api.put(
      `/api/driver/tasks/${taskId}/waypoints/${waypointId}/status`,
      { status }
    );
    return response.data;
  },

  // Task events (progress log)
  getTaskEvents: async (taskId) => {
    const response = await api.get(`/api/driver/tasks/${taskId}/events`);
    return response.data;
  },
  // Drive Conditions - aggregation endpoint
  getDriveConditions: async () => {
    const response = await api.get("/api/driver/drive-conditions");
    return response.data;
  },

  getRouteTraffic: async () => {
    const response = await api.get("/api/driver/route-traffic");
    return response.data;
  },

  getRouteWeather: async () => {
    const response = await api.get("/api/driver/route-weather");
    return response.data;
  },

  sendSOS: async ({ latitude, longitude, accuracy } = {}) => {
    const response = await api.post("/api/driver/sos", {
      lat: latitude ?? null,
      lon: longitude ?? null,
      accuracy: accuracy ?? null,
    });
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
// TASK ENDPOINTS (Admin tarafÄ±ndan kullanÄ±lÄ±r)
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
// DRIVER TASK API (SÃ¼rÃ¼cÃ¼ gÃ¶rev iÅŸlemleri - TEK KAYNAK)
// ============================================

export const driverTaskAPI = {
  // Canonical: SÃ¼rÃ¼cÃ¼nÃ¼n gÃ¶revlerini getir
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

  // KRÄ°TÄ°K FIX: Fonksiyon adÄ± ve URL dÃ¼zeltildi
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

// Standardize on alertsAPI (alias kaldÄ±rÄ±ldÄ±, doÄŸrudan kullan)
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

    // Tip bazlÄ± grupla
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

    // Durum bazlÄ± grupla
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


// ============================================
// GEOFENCE API
// ============================================

export const geofenceAPI = {
  getAll: async () => {
    const response = await api.get("/api/geofences");
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/api/geofences", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/geofences/${id}`, data);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/api/geofences/${id}`);
    return response.data;
  },

  getEvents: async (id) => {
    const response = await api.get(`/api/geofences/${id}/events`);
    return response.data;
  },
};

// ===========================================================
// Driver Provisioning API - Phase 2 (A+B+C Implementation)
// ===========================================================
export const driverProvisionAPI = {
  validateSerial: async (serial) => {
    const response = await api.post("/api/driver/validate-serial", { serial });
    return response.data;
  },

  getAvailableVehicles: async () => {
    const response = await api.get("/api/driver/available-vehicles");
    return response.data;
  },

  assignDevice: async (payload) => {
    const response = await api.post("/api/driver/assign-device", payload);
    return response.data;
  },

  completeSetup: async (payload) => {
    const response = await api.post("/api/driver/complete-setup", payload);
    return response.data;
  },
};

export default api;
