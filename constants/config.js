//C:\argon\constants\config.js
import {
  API_URL as ENV_API_URL,
  MQTT_HOST,
  MQTT_PASSWORD,
  MQTT_PORT,
  MQTT_USERNAME,
} from "@env";
export const API_URL =
  ENV_API_URL ||
  (__DEV__ ? "http://10.0.2.2:3000" : "https://your-vps-ip:3000");

export const API_TIMEOUT = 30000;

// MQTT Configuration
export const MQTT_CONFIG = {
  host: MQTT_HOST || "your-vps-ip",
  port: parseInt(MQTT_PORT) || 8883,
  useSSL: true,
  clientId: `fleet360_mobile_${Date.now()}`,
  username: MQTT_USERNAME || "fleet_client",
  password: MQTT_PASSWORD || "your_mqtt_password",
  keepAlive: 60,
  clean: true,
  reconnectPeriod: 5000,
};

// MQTT Topics
export const MQTT_TOPICS = {
  TELEMETRY: "fleet/telemetry/+", // + = wildcard for device ID
  LOCATION: "fleet/location/+",
  ALERTS: "fleet/alerts/+",
  COMMANDS: "fleet/commands/+",
};

// WebSocket Configuration
export const WS_URL = __DEV__ ? "ws://10.0.2.2:3000" : "wss://your-vps-ip:3000";

// WebSocket Client Config
export const WS_CONFIG = {
  url: WS_URL,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
};

// App Configuration
export const APP_CONFIG = {
  name: "Fleet 360",
  version: "1.0.0",
  enableBLE: true,
  enablePushNotifications: false,
  debugMode: __DEV__,
};

// API Client Config
export const API_CONFIG = {
  baseURL: API_URL,
  timeout: API_TIMEOUT,
};

// Map Configuration
export const MAP_CONFIG = {
  initialRegion: {
    latitude: 41.0082, // Istanbul
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  apiKey: "YOUR_GOOGLE_MAPS_API_KEY", // Android için gerekli
};

// Theme Colors (Argon theme)
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
  BACKGROUND: "#F7FAFC",
};

// API Endpoints
export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    PROFILE: "/auth/profile",
  },
  VEHICLES: {
    LIST: "/vehicles",
    DETAIL: (id) => `/vehicles/${id}`,
    TELEMETRY: (id) => `/vehicles/${id}/telemetry`,
  },
  TASKS: {
    LIST: "/tasks",
    DETAIL: (id) => `/tasks/${id}`,
    UPDATE_STATUS: (id) => `/tasks/${id}/status`,
  },
  REPORTS: {
    DASHBOARD: "/reports/dashboard",
    VEHICLE_STATS: (id) => `/reports/vehicles/${id}`,
    DRIVER_STATS: (id) => `/reports/drivers/${id}`,
  },
};

// User Roles
export const ROLES = {
  ADMIN: "admin",
  DRIVER: "driver",
  MANAGER: "manager",
};

// Task Status
export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// Alert Types
export const ALERT_TYPES = {
  HARSH_BRAKE: "harsh_brake",
  HARSH_ACCEL: "harsh_acceleration",
  SPEEDING: "speeding",
  IDLE: "idle_too_long",
  LOW_FUEL: "low_fuel",
  MAINTENANCE: "maintenance_due",
};
