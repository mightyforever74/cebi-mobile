import { MQTT_HOST, MQTT_PASSWORD, MQTT_PORT, MQTT_USERNAME } from "@env";

// ═══════════════════════════════════════════════════════════════════
// API URL CONFIGURATION
// Priority: ENV_API_URL > Production default
// ═══════════════════════════════════════════════════════════════════

// Production URLs
const PRODUCTION_API_URL = "https://api.tulipfleet.com";
const STAGING_API_URL = "https://staging-api.tulipfleet.com";
const DEV_API_URL = "http://46.224.1.192:3000";

// Determine API URL based on environment
// Build profile'ın eas.json env bloğundan gelir (EXPO_PUBLIC_ öneki şart:
// yalnızca bu önekli env'ler JS bundle'a gömülür). Eksikse sessizce
// production'a düşmek yerine önce log basar (BUILD.md §14.2).
const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl) {
    console.error(
      "[Config] EXPO_PUBLIC_API_URL missing — falling back to production!"
    );
    return PRODUCTION_API_URL;
  }
  return envUrl;
};

export const API_URL = getApiUrl();
export const API_BASE_URL = API_URL;

// Log current API URL for debugging
console.log("🌐 API URL:", API_URL, __DEV__ ? "(DEV)" : "(PROD)");

export const API_TIMEOUT = 30000;

// ═══════════════════════════════════════════════════════════════════
// BLE CONFIGURATION (FAZ 4 - Device Activation)
// ═══════════════════════════════════════════════════════════════════

export const BLE_CONFIG = {
  // Service & Characteristics (ESP32 FAZ3 ile AYNI!)
  SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",

  CHARACTERISTICS: {
    SERIAL: "beb5483e-36e1-4688-b7f5-ea07361b26a8", // WRITE
    STATUS: "beb5483e-36e1-4688-b7f5-ea07361b26a9", // READ + NOTIFY
    RESULT: "beb5483e-36e1-4688-b7f5-ea07361b26aa", // READ + NOTIFY
    // 🆕 WiFi Provisioning
    WIFI_CREDENTIALS: "beb5483e-36e1-4688-b7f5-ea07361b26ab", // WRITE - JSON {ssid, password}
    WIFI_STATUS: "beb5483e-36e1-4688-b7f5-ea07361b26ac", // READ + NOTIFY
    WIFI_SCAN: "beb5483e-36e1-4688-b7f5-ea07361b26ad", // READ + WRITE + WRITE_NR + NOTIFY
    AUTH_TOKEN: "beb5483e-36e1-4688-b7f5-ea07361b26ae", // WRITE
    FACTORY_RESET: "beb5483e-36e1-4688-b7f5-ea07361b26af", // WRITE (v4.9.0)
  },

  // Device discovery (iOS cache için esnek prefix)
  DEVICE_NAME_PREFIXES: [
    "TulipFleet",
    "TulipFleet-",
    "TF-",
    "TF-DEVICE-",
    "TF-NEW-",
    "FleetTracker",
    "FleetTracker-",
  ],

  // Timeouts (ms)
  TIMEOUTS: {
    SCAN: 12000,
    SCAN_UNFILTERED: 3000,
    CONNECT: 15000,
    WRITE: 5000,
    RESPONSE: 30000,
    WIFI_CONNECT: 30000, // 🆕 WiFi bağlantı timeout (30 saniye)
  },

  // Retry
  MAX_RETRIES: 2,
  RETRY_DELAY: 2000,
};

// BLE Status Values (ESP32 → Mobile)
export const BLE_STATUS = {
  WAITING_SERIAL: "WAITING_SERIAL",
  SERIAL_RECEIVED: "SERIAL_RECEIVED",
  ACTIVATING: "ACTIVATING",
  WIFI_CONNECTING: "WIFI_CONNECTING",
  WIFI_CONNECTED: "WIFI_CONNECTED",
  CALLING_API: "CALLING_API",
  API_SUCCESS: "API_SUCCESS",
  API_FAILED: "API_FAILED",
  SAVING_NVS: "SAVING_NVS",
  COMPLETE: "COMPLETE",
  // 🆕 WiFi Provisioning Status
  WIFI_CRED_RECEIVED: "WIFI_CRED_RECEIVED",
  WIFI_PROVISION_OK: "WIFI_PROVISION_OK",
  WIFI_PROVISION_FAIL: "WIFI_PROVISION_FAIL",
};

// BLE Result Values (ESP32 → Mobile)
export const BLE_RESULT = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  INVALID_SERIAL: "INVALID_SERIAL",
  ALREADY_ACTIVATED: "ALREADY_ACTIVATED",
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
};

// ═══════════════════════════════════════════════════════════════════
// WiFi Provisioning Status & Errors
// ═══════════════════════════════════════════════════════════════════

// 🆕 WiFi Provisioning Status Values (ESP32 → Mobile via WIFI_STATUS characteristic)
export const WIFI_STATUS = {
  IDLE: "IDLE",
  CONNECTING: "CONNECTING",
  OK: "OK",
  ERR_AUTH: "ERR_AUTH",
  ERR_TIMEOUT: "ERR_TIMEOUT",
  ERR_NOT_FOUND: "ERR_NOT_FOUND",
  ERR_UNKNOWN: "ERR_UNKNOWN",
};

// WiFi error keys (UI copy lives in locales: deviceSetup.wifi.errors.*)
export const WIFI_ERROR_MESSAGES = {
  ERR_AUTH: "deviceSetup.wifi.errors.ERR_AUTH",
  ERR_TIMEOUT: "deviceSetup.wifi.errors.ERR_TIMEOUT",
  ERR_NOT_FOUND: "deviceSetup.wifi.errors.ERR_NOT_FOUND",
  ERR_UNKNOWN: "deviceSetup.wifi.errors.ERR_UNKNOWN",
  WIFI_TIMEOUT: "deviceSetup.wifi.errors.WIFI_TIMEOUT",
};

// ═══════════════════════════════════════════════════════════════════
// MQTT Configuration
// ═══════════════════════════════════════════════════════════════════

export const MQTT_CONFIG = {
  host: MQTT_HOST,
  port: parseInt(MQTT_PORT) || 8883,
  useSSL: true,
  clientId: `tulipfleet_mobile_${Date.now()}`,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  keepAlive: 60,
  clean: true,
  reconnectPeriod: 5000,
};

// MQTT Topics
export const MQTT_TOPICS = {
  TELEMETRY: "fleet/device/+/telemetry",
  LOCATION: "fleet/device/+/location",
  ALERTS: "fleet/device/+/alerts",
  HEARTBEAT: "fleet/device/+/heartbeat",
  COMMANDS: "fleet/device/+/commands",
};

// ═══════════════════════════════════════════════════════════════════
// WebSocket Configuration
// ═══════════════════════════════════════════════════════════════════

export const WS_URL = __DEV__
  ? "ws://46.224.1.192:3000"
  : "wss://46.224.1.192:3000";

// ═══════════════════════════════════════════════════════════════════
// App Configuration
// ═══════════════════════════════════════════════════════════════════

export const APP_CONFIG = {
  name: "TulipFleet",
  version: "2.0.0",
  enableBLE: true,
  enablePushNotifications: false, // Firebase/FCM kurulumu yapılana kadar kapalı
  debugMode: __DEV__,
};

// ═══════════════════════════════════════════════════════════════════
// Map Configuration
// ═══════════════════════════════════════════════════════════════════

export const MAP_CONFIG = {
  initialRegion: {
    latitude: 41.0082, // Istanbul
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  apiKey: "YOUR_GOOGLE_MAPS_API_KEY",
};

// ═══════════════════════════════════════════════════════════════════
// Theme Colors (Argon theme)
// ═══════════════════════════════════════════════════════════════════

export const COLORS = {
  // Küçük harfli (yeni stil)
  primary: "#5E72E4",
  secondary: "#F7FAFC",
  success: "#2DCE89",
  warning: "#FB6340",
  danger: "#F5365C",
  info: "#11CDEF",
  text: "#32325D",
  textSecondary: "#8898AA",
  background: "#F7FAFC",
  white: "#FFFFFF",
  black: "#000000",
  gray: "#8898AA",
  muted: "#8898AA",
  border: "#E7E7E7",
  // Argon common light grey
  grey: "#E9ECEF",

  // Büyük harfli aliaslar (Argon uyumu)
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  PRIMARY: "#5E72E4",
  SECONDARY: "#F7FAFC",
  SUCCESS: "#2DCE89",
  WARNING: "#FB6340",
  DANGER: "#F5365C",
  INFO: "#11CDEF",
  MUTED: "#8898AA",
  TEXT: "#32325D",
  GRAY: "#8898AA",
  GREY: "#E9ECEF",
  BORDER: "#E7E7E7",
  BACKGROUND: "#F7FAFC",
};

// ═══════════════════════════════════════════════════════════════════
// Theme Sizes (Argon theme)
// ═══════════════════════════════════════════════════════════════════

export const SIZES = {
  BASE: 16,
  FONT: 14,
  RADIUS: 8,
  PADDING: 16,
  MARGIN: 16,
  OPACITY: 0.8,
};

// ═══════════════════════════════════════════════════════════════════
// API Endpoints
// ═══════════════════════════════════════════════════════════════════

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
    REFRESH: "/api/auth/refresh",
    PROFILE: "/api/auth/profile",
  },
  DEVICES: {
    LIST: "/api/devices",
    DETAIL: (id) => `/api/devices/${id}`,
    ACTIVATE: "/api/devices/activate",
    VALIDATE_SERIAL: (serial) => `/api/devices/serial/${serial}/check`,
    BY_SERIAL: (serial) => `/api/devices/serial/${serial}`,
  },
  VEHICLES: {
    LIST: "/api/vehicles",
    DETAIL: (id) => `/api/vehicles/${id}`,
    TELEMETRY: (id) => `/api/vehicles/${id}/telemetry`,
  },
  TASKS: {
    LIST: "/api/tasks",
    DETAIL: (id) => `/api/tasks/${id}`,
    UPDATE_STATUS: (id) => `/api/tasks/${id}/status`,
  },
  DRIVERS: {
    LIST: "/api/drivers",
    DETAIL: (id) => `/api/drivers/${id}`,
    STATS: "/api/driver/stats",
    TASKS: "/api/driver/tasks",
    VEHICLE: "/api/driver/vehicle",
  },
  ALERTS: {
    LIST: "/api/alerts",
    RESOLVE: (id) => `/api/alerts/${id}/resolve`,
  },
  REPORTS: {
    DASHBOARD: "/api/reports/dashboard",
    VEHICLE_STATS: (id) => `/api/reports/vehicles/${id}`,
    DRIVER_STATS: (id) => `/api/reports/drivers/${id}`,
  },
};

// ═══════════════════════════════════════════════════════════════════
// User Roles
// ═══════════════════════════════════════════════════════════════════

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  COMPANY_ADMIN: "company_admin",
  DRIVER: "driver",
};

// ═══════════════════════════════════════════════════════════════════
// Task Status
// ═══════════════════════════════════════════════════════════════════

export const TASK_STATUS = {
  PENDING: "pending",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// ═══════════════════════════════════════════════════════════════════
// Device Status
// ═══════════════════════════════════════════════════════════════════

export const DEVICE_STATUS = {
  CREATED: "CREATED",
  PRINTED: "PRINTED",
  IN_STOCK: "IN_STOCK",
  ASSIGNED: "ASSIGNED",
  ACTIVATED: "ACTIVATED",
  SUSPENDED: "SUSPENDED",
  RETIRED: "RETIRED",
  LOST: "LOST",
};

// ═══════════════════════════════════════════════════════════════════
// AsyncStorage Keys (Device Setup cache)
// ═══════════════════════════════════════════════════════════════════
export const STORAGE_KEYS = {
  PROVISIONED_SERIAL: "tulipfleet_provisioned_serial",
  PROVISIONED_DRIVER: "tulipfleet_provisioned_driver",
  PROVISIONED_VEHICLE: "tulipfleet_provisioned_vehicle",
  PROVISIONED_AT: "tulipfleet_provisioned_at",
  LAST_WIFI_SSID: "tulipfleet_last_wifi_ssid",
};
