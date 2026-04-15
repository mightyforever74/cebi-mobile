# TulipFleet — SESSION NOTES

> Her oturumun BAŞINDA bu dosya okunur, sonunda güncellenir ve push edilir.

Son güncelleme: 15 Nisan 2026 — Kapanış oturumu

---

## ORTAM BİLGİLERİ

| | Production | Staging |
|--|-----------|---------|
| Sunucu | fleet-prod-01 / 46.224.1.192 | Aynı sunucu |
| Backend | Docker (fleet-backend) | PM2 (fleet-staging) |
| Path | `/opt/fleet/backend/server.js` | `/opt/fleet/backend-staging/server.js` |
| Port | 3000 | 3001 |
| API | https://api.tulipfleet.com | https://staging-api.tulipfleet.com |
| DB | fleet_tracking | fleet_tracking_staging |
| Restart | `docker rm -f fleet-backend && docker compose up -d --no-deps backend` | `pm2 restart fleet-staging --update-env` |

### Test Hesapları

| Rol | Email | Şifre |
|-----|-------|-------|
| Driver | test@tulipfleet.com | test123 |
| Admin | admin@fleet.com | test123 |
| SuperAdmin | superadmin@tulipfleet.com | test123 |
| Demo | demo@tulipfleet.com | Demo123! |

> ⚠️ test@tulipfleet.com hesabı bu oturumda DELETE /api/users/me ile silindi (soft delete test). Gerekirse yeniden oluşturulmalı.

### DB Test Verisi

| | |
|--|--|
| Driver ID (Tulip) | b2c3d4e5-f6a7-8901-bcde-f12345678901 |
| Demo Company | Dobbe Transport — efbaa346-cde9-489a-b3e9-6fd61df0c121 |
| Tulip Lojistik | 00000000-0000-0000-0000-000000000001 |

### Cihaz → Araç Ataması

| Serial | Araç | Şirket |
|--------|------|--------|
| TF-2026-00002-A | GV-082-B (Mercedes Sprinter) | Tulip Lojistik |
| TF-2026-00003-A | BX-TR-42 (Volvo FH16) | Dobbe Transport |

### Demo Lokasyon Verisi (Dobbe Transport)

| device_id | Araç | Koordinat |
|-----------|------|-----------|
| DEMO-ESP-002 | BX-TR-42 | 52.3702, 4.8952 |
| DEMO-ESP-003 | RD-NL-78 | 52.3521, 4.9176 |
| DEMO-ESP-004 | AH-05-KL | 52.3880, 4.8400 |
| DEMO-ESP-005 | NL-92-VB | 52.3448, 4.9412 |

> ⚠️ TimescaleDB 7 günlük retention — kayıtlar periyodik yenilenmelidir.

---

## 15 NİSAN 2026 — TAMAMLANAN İŞLER

| Değişiklik | Dosya | Detay |
|------------|-------|-------|
| FleetMapScreen | FleetMapScreen.js | Amsterdam; Vehicles butonu kaldırıldı; Zones-only |
| AdminGeofenceScreen | AdminGeofenceScreen.js | Full-screen harita; native pin marker; Nominatim search; Amsterdam |
| AdminReportsScreen | AdminReportsScreen.js | buildOpsHtml + buildDrivingHtml; expo-file-system/legacy |
| AdminSettings | AdminSettings.js | 148 bozuk karakter düzeltildi; versiyon dinamik; Hesabı Sil |
| DriverSettings | DriverSettings.js | Hesabı Sil (Apple 5.1.1); şifre onaylı modal |
| api.js | api.js | userAPI.deleteAccount() |
| Backend DELETE /api/users/me | server.js | Soft delete + PII anonim + refresh_tokens temizle |
| i18n vehicleTrack | 7 dil | 22 key |
| i18n deleteAccount | 7 dil | 7 key |
| i18n mapButton | 7 dil | adminAlerts.mapButton |
| Sprint A1 | fleet_tracking_staging | distance_source kolonu |
| QA Repo kapanışı | docs/driver/ | 4 dosya — commit e299af9 |

---

## SPRINT DURUMU

| Alan | Durum | Not |
|------|-------|-----|
| Admin 1–10 testleri | ✅ Tamamlandı | |
| UI Guide v3 fix | ✅ 88/89 ihlal | commit 0918199 |
| SOS Mobil + Backend | ✅ Tamamlandı | |
| planned_start/end fix | ✅ Production | 14 Nisan |
| actual_distance_km fix | ✅ Production | 14 Nisan |
| Operations Summary PDF | ✅ Tamamlandı | |
| Driver Performance PDF | ✅ Tamamlandı | |
| DELETE /api/users/me | ✅ Production | Soft delete |
| AdminGeofenceScreen | ✅ Full-screen map | Native pin, Nominatim, Amsterdam |
| FleetMapScreen | ✅ Amsterdam + Zones | |
| AdminSettings encoding | ✅ Düzeltildi | |
| adminAlerts.mapButton i18n | ✅ 7 dil | |
| vehicleTrack i18n | ✅ 7 dil | 22 key |
| deleteAccount i18n | ✅ 7 dil | |
| Driver Navigation dark mode | ✅ Zaten mevcuttu | |
| Sprint A1 distance_source | ✅ Staging | Production bekliyor |
| QA Repo kapanışı | ✅ commit e299af9 | |

---

## BEKLEYEN İŞLER (öncelik sırasıyla)

### 1. Sprint A — distance_source Production
- [ ] A1 production: `ALTER TABLE tasks ADD COLUMN distance_source VARCHAR(10) NOT NULL DEFAULT 'manual'`
- [ ] A2: Task complete GPS mesafe (Haversine)
- [ ] A3: GPS yetersizse route_json fallback
- [ ] A4: Mevcut completed backfill → distance_source = 'manual'
- [ ] A5: /api/reports/operations distance_source dağılımı

### 2. Küçük Fixes
- [ ] Firmware: MQTT IP → mqtt.tulipfleet.com
- [ ] HERE_API_KEY → her iki ortamın .env
- [ ] OPENWEATHER_API_KEY → her iki ortamın .env
- [ ] Demo lokasyon verisi — cron job ile periyodik yenileme
- [ ] test@tulipfleet.com yeniden oluştur

### 3. Waypoint Geofence — Faz 1 Backend
- [ ] geofence_entry → waypoint güncelle
- [ ] Görev tamamlama bypass kontrolü
- [ ] GET /api/tasks/:id/waypoint-summary
- [ ] bkz. WAYPOINT_GEOFENCE_SPEC.md

### 4. DevOps
- [ ] fleet-dev-01, fleet-tst-01, fleet-acc-01, fleet-nexus-01
- [ ] Nexus image registry
- [ ] CI/CD pipeline

---

## KRİTİK TEKNİK KURALLAR

| Kural | Açıklama |
|-------|----------|
| **UI Guide v3** | 0 hex, 0 rgba, COLORS token, withAlpha(colorUtils) |
| **TYPOGRAPHY token** | COLORS.FONT_SIZE yok → COLORS.TYPOGRAPHY.sizes.* |
| **COLORS.DANGER yok** | → COLORS.ERROR kullan |
| **gap yasak** | gap: yerine marginRight/marginBottom |
| **SPACING.xs/2 yasak** | makeStyles içinde matematiksel işlem crash |
| **fontWeight string yasak** | "700" değil → COLORS.TYPOGRAPHY.weights.bold |
| **Staging DB = temiz** | Production clone değil |
| **alert_type kolonu** | alerts tablosunda type yok → alert_type |
| **alerts response key** | /api/alerts → { alerts: [] } |
| **zone_key NOT NULL** | Geofence INSERT'te zorunlu |
| **SOS rate-limit** | 60 sn → 429 |
| **expo-print yasak** | Expo Go crash → expo-file-system/legacy |
| **Nominatim** | format=jsonv2, 1 req/sec, User-Agent zorunlu, autocomplete yasak |
| **locations.device_id** | esp32_device_id ile join |
| **Staging önce** | Staging → test → production |

---

## ALTIN KURALLAR

1. **Staging önce, production sonra**
2. **Dosya okumadan tahminde bulunma**
3. **Bir işi yaparken başka işi bozma**
4. **PowerShell: Set-Content kullan, Add-Content yasak**
5. **Claude dosya yolunu asla varsayım yapmaz**
6. **makeStyles içinde matematiksel işlem yapma**
7. **Öncelik tek kaynaktan — SESSION_NOTES**
