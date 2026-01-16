# Copilot Instructions for TulipFleet (React Native)

## Big Picture

- App: Expo React Native mobile client with role-based flows (Admin, Driver, Super Admin).
- Navigation: Single `NavigationContainer` with auth gate; authenticated users render app stack, otherwise auth stack. See [../src/navigation/RootNavigator.js](../src/navigation/RootNavigator.js).
- State/Auth: `AuthContext` owns auth state, token lifecycle, and 401 handling. See [../src/context/AuthContext.js](../src/context/AuthContext.js).
- API: Axios service layer with two clients: `authClient` (no interceptors) for login/register/refresh, and `api` (with interceptors) for all other endpoints. See [../src/services/api.js](../src/services/api.js).
- Realtime: MQTT for telemetry/alerts with wildcard topic matching. See [../src/services/mqttService.js](../src/services/mqttService.js).
- Config: Centralized in [../src/constants/config.js](../src/constants/config.js) (API URL, MQTT, BLE, roles, statuses, map, colors).

## Developer Workflows

- Run (Expo):
  - `npm start` → Expo dev server
  - `npm run android` / `npm run ios` → native run via `expo run:*`
- Environment: `.env` consumed by `react-native-dotenv` for MQTT fields (`MQTT_HOST`, `MQTT_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD`).
- Maps: Google Maps SDK; API key set in config (replace placeholder in `MAP_CONFIG.apiKey`).

## Auth & API Conventions (Important)

- Never import AsyncStorage directly; use storage utils in [../src/utils/storage.js](../src/utils/storage.js). `AuthContext` already persists `token`, `refreshToken`, and `user` using these helpers.
- Token race-condition fix: on login, set memory token first (`setAuthToken()`), then update React state, then persist to storage. Follow the same sequence for any new flows that set tokens. See `login()` in [../src/context/AuthContext.js](../src/context/AuthContext.js).
- 401 handling: `api` response interceptor clears memory+storage and invokes `onUnauthorizedCallback` set by `AuthContext`. Do not override this per-request. If you add new modules, import and use the shared `api` instance from [../src/services/api.js](../src/services/api.js).
- Auth endpoints must use `authClient` (no interceptors). In [src/services/api.js](src/services/api.js), keep all `authAPI.*` calls on `authClient` except `logout` which calls `api` (token required) and then clears tokens.
- Add endpoints by returning `response.data` and keeping URL assembly near the service method. Follow existing patterns (e.g., `vehicleAPI.getById(id)`).

### Example: Adding a new admin endpoint

```js
// In src/services/api.js
export const adminAPI = {
  ...adminAPI,
  getDepots: async () => {
    const response = await api.get("/api/admin/depots");
    return response.data;
  },
};
```

## Navigation Patterns

- Only one `NavigationContainer` at the root; do not create nested containers. See [../src/navigation/RootNavigator.js](../src/navigation/RootNavigator.js).
- Route by role in app stacks (e.g., Super Admin screens under [../src/navigation/SuperAdminNavigator.js](../src/navigation/SuperAdminNavigator.js)). When adding screens, register them in the appropriate navigator.

## Realtime (MQTT)

- Connect via `mqttService.connect({ url, username, password })` or rely on defaults from `config`/env. Subscribe with wildcards, callbacks are stored per-topic. See [../src/services/mqttService.js](../src/services/mqttService.js).
- Default subscriptions: `fleet/+/+/telemetry`, `fleet/+/+/alert`. Add targeted subscriptions for per-device topics to reduce noise.
- Topic matching supports `+` and `#`. Use `mqttService.publish(topic, payload, { qos })` for commands.

### Example: Subscribe to a specific device location

```js
import mqttService from "../services/mqttService";
useEffect(() => {
  const topic = `fleet/company123/device42/location`;
  mqttService.subscribe(topic, (_, msg) => setLocation(msg));
  return () => mqttService.unsubscribe(topic);
}, []);
```

## BLE & Device Setup

- BLE UUIDs, timeouts, and status/result enums live in [../src/constants/config.js](../src/constants/config.js) (`BLE_CONFIG`, `BLE_STATUS`, `BLE_RESULT`, `WIFI_STATUS`). Use these constants, not literals, when implementing setup flows.

## Roles, Statuses, and Endpoints

- Reuse enums from [../src/constants/config.js](../src/constants/config.js): `ROLES`, `TASK_STATUS`, `DEVICE_STATUS`, `ALERT_TYPES`.
- Prefer building URLs via helpers in `ENDPOINTS` where available; otherwise follow service patterns in [../src/services/api.js](../src/services/api.js).

## UI/Theme & Components

- Colors and theme tokens: [../src/constants/config.js](../src/constants/config.js) `COLORS` (aliases included for Argon compatibility).
- Common UI building blocks under [../components/](../components) and [../src/components/](../src/components). Prefer existing components before adding new ones to keep style consistent.

## Push Notifications

- Hook: [../src/hooks/usePushNotifications.js](../src/hooks/usePushNotifications.js); service: [../services/pushNotificationService.js](../services/pushNotificationService.js). Global toggle in `APP_CONFIG.enablePushNotifications` within [../src/constants/config.js](../src/constants/config.js).

## Gotchas

- Do not break the single-root navigation pattern; all navigation must flow through `RootNavigator`.
- Keep token handling centralized: call `setAuthToken()` when setting tokens and never stash tokens in component state.
- Respect `API_BASE_URL` from [src/constants/config.js](src/constants/config.js); avoid hardcoding URLs.
- For MQTT, avoid subscribing before connection is established—`mqttService.subscribe()` queues and retries, but prefer connecting early (e.g., on app mount).

## References

- README and docs: [../README.md](../README.md), [../docs/map](../docs/map)
- Entrypoints: [../index.js](../index.js), [../src/navigation/RootNavigator.js](../src/navigation/RootNavigator.js)
