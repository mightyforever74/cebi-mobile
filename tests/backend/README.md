# TulipFleet Backend API Test Suite

**28 otomatik test | 10 dosya | 9 kategori**

Production backend'e (api.tulipfleet.com) karşı çalışır.

## Kurulum
```bash
cd tulipfleet-tests
npm install
```

## Çalıştırma
```bash
# Tüm testler
npm test

# Kategori bazlı
npm run test:auth        # Login & Auth (6 test)
npm run test:vehicles    # Vehicles & Devices
npm run test:drivers     # Drivers
npm run test:tasks       # Tasks lifecycle
npm run test:alerts      # Alerts
npm run test:locations   # GPS & Locations
npm run test:security    # Role guard, CORS, TLS, multi-tenant
npm run test:fleet-stats # Fleet stats endpoint
```

## Config
`config.js` içinde API URL ve test hesapları tanımlı.

## Test Kategorileri
1. **Auth** - Login (driver/admin/superadmin), token refresh, unauthorized guard
2. **Vehicles** - Liste, driver vehicle (.vehicle property)
3. **Drivers** - Liste, profil
4. **Tasks** - CRUD, task_no format, status geçişleri
5. **Locations** - GPS veri, fleet stats (totals.* schema)
6. **Alerts** - Liste, severity, resolve
7. **Security** - Role guard, multi-tenant, TLS, CORS
8. **Geofence** - CRUD, events
9. **MQTT** - Broker bağlantı, pub/sub, auth guard
10. **Health** - Health check, endpoint discovery
