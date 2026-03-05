# TulipFleet Backend API Endpoint Haritası
**Son güncelleme:** 05.03.2026  
**Backend:** `/opt/fleet/backend/server.js` + `/opt/fleet/backend/routes/`  
**Base URL:** `https://api.tulipfleet.com`

---

## 📁 server.js Endpoint'leri

### 🔐 Auth
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| POST | `/api/auth/login` | 414 | Giriş → `{token, user}` döner |
| POST | `/api/auth/register` | 483 | Kayıt |
| POST | `/api/auth/logout` | 517 | Çıkış |
| POST | `/api/auth/forgot-password` | 701 | Şifre sıfırlama kodu gönder |
| POST | `/api/auth/reset-password` | 803 | Şifre sıfırla |
| POST | `/api/auth/refresh` | 3628 | Token yenile |
| DELETE | `/api/auth/cleanup-tokens` | 907 | Eski token'ları temizle |

> ⚠️ Login yanıtı `token` döner, `accessToken` değil. api.js grep pattern'ına dikkat.

---

### 👤 Kullanıcı
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/users/profile` | 927 | Profil getir |
| PUT | `/api/users/profile` | 927 | Profil güncelle |
| PUT | `/api/users/password` | 953 | Şifre değiştir → `{currentPassword, newPassword}` |
| GET | `/api/user/profile` | 1000 | Alias → `/api/users/profile` |
| PUT | `/api/user/profile` | 1000 | Alias → `/api/users/profile` |
| PUT | `/api/user/password` | 1027 | Alias → `/api/users/password` |

> ✅ api.js'te `changePassword` için doğru URL: `/api/users/password`

---

### 🚗 Sürücü (Driver)
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/driver/tasks` | 1065 | Görevleri getir. `?status=completed` desteklenir |
| GET | `/api/driver/tasks/:id` | 5288 | Görev detayı |
| PUT | `/api/driver/tasks/:id/accept` | 3779 | Görevi kabul et |
| PUT | `/api/driver/tasks/:id/reject` | 3807 | Görevi reddet |
| PUT | `/api/driver/tasks/:id/start` | 4144 | Görevi başlat |
| PUT | `/api/driver/tasks/:id/complete` | 4173 | Görevi tamamla |
| PUT | `/api/driver/tasks/:taskId/withdraw` | 3836 | Görevi geri çek |
| PUT | `/api/driver/task/:id/status` | 1252 | Görev durumu güncelle (generic) |
| PUT | `/api/driver/tasks/:taskId/waypoints/:waypointId/status` | 4021 | Waypoint durumu |
| PUT | `/api/driver/tasks/:taskId/waypoints/:waypointId/complete` | 4081 | Waypoint tamamla |
| GET | `/api/driver/stats` | 1123 | Sürücü istatistikleri |
| GET | `/api/driver/vehicle` | 1166 | Sürücünün aracı |
| PUT | `/api/driver/vehicle/:id/fuel` | 1334 | Yakıt seviyesi güncelle |
| PUT | `/api/driver/vehicle/:id/odometer` | 1370 | Kilometre güncelle |
| PUT | `/api/driver/vehicle/:id/settings` | 1409 | Araç ayarları güncelle |
| GET | `/api/driver/devices/search` | 4202 | Cihaz ara (serial ile) |
| POST | `/api/driver/devices/assign` | 4245 | Cihaz ata |
| GET | `/api/driver/devices/assignable` | 4323 | Atanabilir cihazlar |

---

### 🚌 Araçlar (Vehicles)
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/vehicles` | 1777 | Tüm araçlar |
| POST | `/api/vehicles` | 1828 | Araç oluştur |
| GET | `/api/vehicles/:id` | 1878 | Araç detayı |
| PUT | `/api/vehicles/:id` | 1924 | Araç güncelle |
| GET | `/api/vehicles/:id/location` | 1971 | Son konum |
| GET | `/api/vehicles/:id/locations` | 1995 | Konum geçmişi |
| GET | `/api/admin/vehicles` | 1653 | Admin araç listesi |

---

### 📋 Görevler (Tasks)
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/tasks` | 2481 | Tüm görevler |
| POST | `/api/tasks` | 2652 | Görev oluştur |
| GET | `/api/tasks/:id` | 2575 | Görev detayı |
| PUT | `/api/tasks/:id` | 2766 | Görev güncelle |
| DELETE | `/api/tasks/:id` | 2901 | Görev sil |
| POST | `/api/tasks/:id/offer` | 2835 | Sürücüye teklif gönder |
| GET | `/api/tasks/:id/events` | 2524 | Görev olayları |
| GET | `/api/tasks/:id/public-link` | 4356 | Paylaşım linki |
| GET | `/api/task-offers` | 5330 | Görev teklifleri |

---

### 🔔 Uyarılar (Alerts)
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/alerts` | 2147 | Tüm uyarılar |
| DELETE | `/api/alerts` | 2215 | Tüm uyarıları sil |
| GET | `/api/alerts/:id` | 2234 | Uyarı detayı |
| PUT | `/api/alerts/:id/resolve` | 2174 | Uyarıyı çöz |

---

### 👥 Sürücüler (Drivers - Admin)
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/drivers` | 2264 | Tüm sürücüler |
| POST | `/api/drivers` | 2293 | Sürücü oluştur |
| POST | `/api/drivers/create-with-user` | 2319 | Sürücü + kullanıcı oluştur |
| PUT | `/api/drivers/:id` | 2374 | Sürücü güncelle |
| DELETE | `/api/drivers/:id` | 2427 | Sürücü sil |
| GET | `/api/drivers/me/assigned-device` | 2960 | Sürücünün cihazı |

---

### 📱 Cihazlar (Devices - Admin)
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/admin/devices` | 3085 | Şirketin cihazları (company_id zorunlu) |
| GET | `/api/admin/devices/search` | 3187 | **YENİ** Serial ile ara `?serial=TF-...` |
| POST | `/api/admin/devices/add-to-stock-by-serial` | 3234 | Serial ile stoka ekle |
| PUT | `/api/admin/devices/:id/reprovision` | 3398 | Cihazı yeniden kur |
| GET | `/api/devices` | 3515 | Tüm cihazlar (superadmin) |
| GET | `/api/devices/:id` | 3569 | Cihaz detayı |
| PUT | `/api/devices/:id/command` | 2038 | Cihaza komut gönder |
| GET | `/api/devices/serial/:serial/check` | 3735 | Serial kontrol |

---

### 📊 Raporlar & Diğer
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/reports/vehicles` | 2078 | Araç raporu |
| GET | `/api/reports/drivers` | 2111 | Sürücü raporu |
| GET | `/api/admin/activities` | 1698 | Admin aktiviteleri |
| POST | `/api/push/register` | 3695 | Push token kayıt |
| POST | `/api/contact` | 5374 | İletişim formu |
| POST | `/api/auth/refresh` | 3628 | Token yenile |

---

## 📁 routes/ Klasörü Endpoint'leri

### routes/fuel.js → prefix: `/api/fuel`
| Method | Relative URL | Satır | Tam URL |
|--------|-------------|-------|---------|
| POST | `/records` | 20 | `/api/fuel/records` |
| GET | `/last-record/:vehicleId` | 134 | `/api/fuel/last-record/:vehicleId` |
| GET | `/company/records` | 169 | `/api/fuel/company/records` |
| GET | `/company/analytics` | 252 | `/api/fuel/company/analytics` |
| GET | `/company/savings` | 356 | `/api/fuel/company/savings` |
| GET | `/vehicle/:id` | 491 | `/api/fuel/vehicle/:id` |
| GET | `/alerts` | 623 | `/api/fuel/alerts` |

### routes/adminFuel.js → prefix: `/api/admin`
| Method | Relative URL | Satır | Tam URL |
|--------|-------------|-------|---------|
| GET | `/fuel/stats` | 32 | `/api/admin/fuel/stats` |
| GET | `/fuel/trends` | 120 | `/api/admin/fuel/trends` |
| GET | `/fuel/vehicles` | 173 | `/api/admin/fuel/vehicles` |
| GET | `/fuel/costs` | 239 | `/api/admin/fuel/costs` |
| GET | `/fuel/records` | 317 | `/api/admin/fuel/records` |
| GET | `/carbon/stats` | 406 | `/api/admin/carbon/stats` |
| GET | `/carbon/trends` | 523 | `/api/admin/carbon/trends` |
| GET | `/carbon/vehicles` | 599 | `/api/admin/carbon/vehicles` |

### routes/driver.js → prefix: `/api/driver`
| Method | Relative URL | Satır | Tam URL |
|--------|-------------|-------|---------|
| POST | `/validate-serial` | 10 | `/api/driver/validate-serial` |
| GET | `/available-vehicles` | 123 | `/api/driver/available-vehicles` |
| POST | `/assign-device` | 187 | `/api/driver/assign-device` |
| POST | `/complete-setup` | 289 | `/api/driver/complete-setup` |

### routes/devices.js
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| POST | `/api/devices/scan-qr` | 14 | QR tara |
| POST | `/api/devices/provisioning-complete` | 417 | Kurulum tamamla |
| POST | `/api/devices/activate` | 498 | Cihaz aktifleştir |
| POST | `/api/devices/validate-token` | 587 | Token doğrula |

### routes/superadmin.companies.js
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/superadmin/companies` | 3 | Şirket listesi |
| GET | `/api/superadmin/companies/:id` | 142 | Şirket detayı |
| POST | `/api/superadmin/companies/:id/payment-received` | 240 | Ödeme kaydet |
| POST | `/api/superadmin/companies/:id/suspend` | 315 | Askıya al |
| POST | `/api/superadmin/companies/:id/extend-trial` | 366 | Trial uzat |
| GET | `/api/superadmin/companies/:id/payments` | 409 | Ödeme geçmişi |
| GET | `/api/superadmin/companies/:id/audit-logs` | 437 | Audit log |
| DELETE | `/api/superadmin/companies/:id` | — | Şirket sil |

### routes/superadmin.devices.js
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| POST | `/api/superadmin/devices/:deviceId/qr` | 13 | QR oluştur |
| GET | `/api/superadmin/devices/:deviceId/qr-codes` | 96 | QR kodları |
| DELETE | `/api/superadmin/devices/:deviceId` | 149 | Cihaz sil |
| GET | `/api/superadmin/devices` | server.js:4922 | Tüm cihazlar |
| GET | `/api/superadmin/devices/:id` | server.js:4982 | Cihaz detayı |
| POST | `/api/superadmin/devices/:id/assign` | server.js:5023 | Şirkete ata |
| POST | `/api/superadmin/devices/:id/unassign` | server.js:5046 | Atamayı kaldır |
| PUT | `/api/superadmin/devices/:id` | server.js:5067 | Cihaz güncelle |

### routes/superadmin (server.js içinde)
| Method | URL | Satır | Açıklama |
|--------|-----|-------|----------|
| GET | `/api/superadmin/users` | 5186 | Tüm kullanıcılar |
| GET | `/api/locations/latest` | 5207 | Tüm araçların son konumu |

---

## ⚠️ api.js'te Olan Ama Backend'de OLMAYAN Endpoint'ler
| URL | api.js Fonksiyonu | Durum |
|-----|------------------|-------|
| `/api/auth/me` | `authAPI.me()` | ❌ Hiçbir ekranda kullanılmıyor |
| `/api/push/test` | `pushAPI.sendTest()` | ❌ Hiçbir ekranda kullanılmıyor |
| `/api/superadmin/system-health` | `superAdminAPI.getSystemHealth()` | ❌ Hiçbir ekranda kullanılmıyor |
| `/api/device/claim` | Yorum satırında | ✅ Zaten devre dışı |
| `/api/device/claim/validate` | Yorum satırında | ✅ Zaten devre dışı |

---

## 🔧 Önemli Notlar
1. **Login token field:** `token` (accessToken değil)
2. **changePassword URL:** `/api/users/password` — body: `{currentPassword, newPassword}`
3. **Yanlış şifrede 401** döner (400 değil) — backend tasarım kararı
4. **`/api/admin/devices/search`** — 05.03.2026 tarihinde eklendi (server.js satır 3187)
5. **`/api/driver/tasks?status=completed`** — backend destekliyor, `completed+rejected+cancelled` döner
6. **Fuel endpoints** — `routes/fuel.js` prefix `/api/fuel`, `routes/adminFuel.js` prefix `/api/admin`
7. **Driver provision endpoints** — `routes/driver.js` prefix `/api/driver`
