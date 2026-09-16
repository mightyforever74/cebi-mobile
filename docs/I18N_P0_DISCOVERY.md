# TulipFleet Mobile — P0 KEŞİF (i18n + Sözleşme Senkronu + Build/Store)

## Kimlik kanıtı

Komutlar (`C:\argon`, PowerShell):

```
git rev-parse --show-toplevel
git remote -v
git branch --show-current
Test-Path C:\dispatcher\package.json
```

Çıktı:

- `git rev-parse --show-toplevel` → `C:/argon`
- `git remote -v` → `origin  https://github.com/mightyforever74/tulipfleet.git` (fetch/push); ek remote: `qa  https://github.com/mightyforever74/tulipfleet-qa.git`
- `git branch --show-current` → `main`
- `Test-Path C:\dispatcher\package.json` → `True`

Bu oturum salt-okunur keşif. Tek yazılan dosya bu rapor. Geçici analiz script’leri `C:\Users\might\AppData\Local\Temp\i18n-p0\` altında çalıştı; `C:\argon` ağacına yazılmadı.

---

## 1. Özet

1. **A5 OTA:** E — `runtimeVersion` sabit `"2.0.0"` (`app.json:14`); `package.json` 844d7c2..HEAD arasında 0 satır değişmiş. JS/i18n OTA mevcut native runtime’a bağlanır.
2. **A5 Store build:** E — native Maps API anahtarı döndü (`AndroidManifest` + `app.json`); `android/app/build.gradle` `versionCode 29` / `versionName "2.0.7"` iken `app.json` hâlâ `versionCode 28` / `version "2.0.6"`. SDK/target API zaten 35; native modül eklenmemiş. i18n tek başına store build gerektirmez.
3. **B kritik-1:** Kodda `t("...")` kullanılan **133 key `tr.json`’da yok** (wifi/register/changePassword/offerDetail/deviceSetup…). i18next key’i veya 2. argümanı basar.
4. **B kritik-2:** `en.json` referansa göre **20 eksik** (`common.back/yes/no/retry…`, `units.*`, `roles.companyAdmin`). `fallbackLng: "tr"` → İngilizce UI’da Türkçe sızıntı.
5. **B kritik-3:** `ku.json:1068` settings footer © **üç kat mojibake**; `DriverProfile.js:442` `Â©` (`c3 82 c2 a9`). `tr.json` CO2 ASCII vs CO₂ subscript karışık.
6. **B kritik-4:** Dinamik kökler `adminTasks.status.*` / `adminDrivers.status.*` / `adminVehicles.status|fuelTypes|categories.*` sözlükte **yok**; API enum’u ham basılır.
7. **B kritik-5:** `src/utils/helpers.js` `formatDate` **hiç import edilmiyor**; ekranlar çıplak `toLocaleString` / yerel `formatDate`. Helper’da ku→tr-TR yok (yalnızca sabit `tr-TR`).
8. **C2 render-riski:** **bugün 37 kanıtlı değer + 3 açık küme** (`api.tulipfleet.com` endpoint’leriyle ulaşılır). **Cutover-sonrası +6 exception tipi** (`enterprise-api` `/api/dispatcher/exceptions`; mobil bugün bu URL’yi çağırmıyor).

---

## 2. Eksen A — Build & Store hazırlığı

### A1. `package.json` / `app.json`

Dosya: `package.json` (kök). `app.config.*` yok (`Get-ChildItem` / glob: 0 dosya).

| Paket         | package.json satır | Değer                                                                                                                            |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| expo          | 41                 | `^54.0.23` (node_modules: 54.0.33, doctor beklenen ~54.0.37)                                                                     |
| react-native  | 66                 | `0.81.5`                                                                                                                         |
| expo-updates  | 58                 | `~29.0.15` (node_modules: 29.0.16, doctor beklenen ~29.0.20)                                                                     |
| react         | 64                 | `19.1.0`                                                                                                                         |
| hermes paketi | —                  | **yok**. Hermes native: `android/gradle.properties:42` `hermesEnabled=true`; `android/app/build.gradle:118-119` `hermes-android` |

`app.json`:

| Alan                 | Satır          | Değer                                                                                                                                                                                                 | Kanıt                                                                    |
| -------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| version              | 5              | `"2.0.6"`                                                                                                                                                                                             | sabit string                                                             |
| ios.buildNumber      | 18             | `"30"`                                                                                                                                                                                                |                                                                          |
| android.versionCode  | 35             | `28`                                                                                                                                                                                                  | gradle ile **çelişir** (aşağı A6)                                        |
| runtimeVersion       | 14             | `"2.0.0"`                                                                                                                                                                                             | **policy değil**, düz string. `git show 844d7c2:app.json` aynı `"2.0.0"` |
| updates.url          | 11             | `https://u.expo.dev/7c0ea9e5-7cc1-4723-ad38-3fbe23256d50`                                                                                                                                             |                                                                          |
| updates.channel      | —              | **app.json’da yok**                                                                                                                                                                                   | kanal yalnızca `eas.json` profillerinde                                  |
| updates.enabled      | 9              | `true`                                                                                                                                                                                                |                                                                          |
| plugins              | 51–96          | expo-asset, expo-font, expo-camera, react-native-ble-plx, expo-notifications, expo-build-properties, `./plugins/withFirebaseFix`, @react-native-firebase/app, datetimepicker, react-native-bootsplash | `expo-updates` plugin listesinde yok                                     |
| android permissions  | 41–49          | BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_CONNECT, BLUETOOTH_SCAN, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, CAMERA                                                                                   |                                                                          |
| ios infoPlist        | 23–29          | NSBluetoothAlways/Peripheral, NSCamera, NSLocationWhenInUse, ITSAppUsesNonExemptEncryption=false, UIBackgroundModes fetch+remote-notification                                                         |                                                                          |
| compileSdk/targetSdk | 77–79 (plugin) | **35 / 35**, buildTools `35.0.0`                                                                                                                                                                      | `android/gradle.properties:67-69` aynı 35                                |
| jsEngine             | —              | **app.json’da yok**                                                                                                                                                                                   | Hermes gradle flag ile                                                   |

### A2. `eas.json`

`cli.appVersionSource`: `"remote"` (`eas.json:4`).

| Profil      | channel      | autoIncrement | environment | distribution         | API env                                                     |
| ----------- | ------------ | ------------- | ----------- | -------------------- | ----------------------------------------------------------- |
| development | yok          | yok           | yok         | internal, dev client | `API_URL=http://46.224.1.192:3000` (**EXPO*PUBLIC* değil**) |
| staging     | `staging`    | `true`        | `"preview"` | internal APK         | `EXPO_PUBLIC_API_URL=https://staging-api.tulipfleet.com`    |
| preview     | `preview`    | `true`        | yok         | internal APK         | `EXPO_PUBLIC_API_URL=https://api.tulipfleet.com`            |
| production  | `production` | `true`        | yok         | store AAB            | `EXPO_PUBLIC_API_URL=https://api.tulipfleet.com`            |

production `node`: `"20.19.4"`. submit.production android track: `internal`; keystore **EAS remote credentials**. Workflow ayrı: `.github/workflows/android-build.yml`.

### A3. 17 Nisan 2026 store referansı

Komut: `git log -1 --format="%H %ci %s" 844d7c2`

```
844d7c27ef319d69d9940fc08583fef9ebe85eb5 2026-04-16 19:22:43 +0200 release: v2.0.6 — build 30 (iOS) / 28 (Android)
```

17 Nisan günü store-release commit’i yok; 17 Nisan 22:38–22:57’de JS-only: `1a5760c` (DE+FR i18n), `da6d336` (TTS). Son **açık store release** = **844d7c2 (16 Nisan)**.

`git tag`: `v2.0.0-stable` (2026-01-06), `v3.0.0-S6` (2026-02-21), `v3.0.0` (2026-02-28). **v2.0.6/v2.0.7 tag’i yok.**

`git log --since=2026-04-17 --oneline`: 21 commit (i18n, reports, eas env rename, maps key rotate, android versionName 2.0.7, FuelGauge, BUG-3a/3b, …).

`git diff 844d7c2..HEAD -- package.json app.json eas.json`:

- `package.json`: **boş diff** (0 satır). Native bağımlılık ekle/çıkar/sürüm **yok**.
- `app.json`: yalnızca Google Maps API key rotate (ios+android).
- `eas.json`: `API_URL` → `EXPO_PUBLIC_API_URL`; staging/preview `autoIncrement: true`; staging `environment: "preview"`. Native değil.

`git diff 844d7c2..HEAD --stat -- android ios plugins app.json package.json`:

```
 android/app/build.gradle                 | 4 ++--
 android/app/google-services.json         | 2 +-
 android/app/src/main/AndroidManifest.xml | 2 +-
 app.json                                 | 4 ++--
```

`plugins/` ve `ios/` bu aralıkta değişmemiş. `package.json` değişmemiş.

`android/app/build.gradle` diff (özet): `versionCode 1`/`versionName "2.0.1"` → `versionCode 29`/`versionName "2.0.7"` (commit `0db662a`). Store’daki 2.0.6 binary’si hâlâ 28/2.0.6 olabilir; **2.0.7’nin Play/App Store’a çıktığı bu repodan doğrulanamadı.**

AndroidManifest + google-services.json: Maps/API key `AIzaSyCAen…` → `AIzaSyCiMe…` (rotate). Bu native config; OTA ile cihazdaki Maps SDK anahtarı değişmez.

### A4. expo-doctor / expo install --check

Komut: `npx expo-doctor` (yükleme yok; npx `expo-doctor@1.20.4` çekti, `C:\argon` ağacına yazmadı). Exit 1.

```
Running 18 checks on your project...
16/18 checks passed. 2 checks failed.

✖ Check for app config fields that may not be synced in a non-CNG project
This project contains native project folders but also has native configuration
properties in app.json ... EAS Build will not sync: orientation, icon, ios, android, plugins.

✖ Check that packages match versions required by installed Expo SDK

❗ Major version mismatches
package                  expected  found
react-native-pager-view  6.9.1     8.0.0

🔧 Patch version mismatches
expo                     ~54.0.37  54.0.33
expo-asset               ~12.0.13  12.0.12
expo-constants           ~18.0.14  18.0.13
expo-dev-client          ~6.0.21   6.0.20
expo-font                ~14.0.12  14.0.11
expo-notifications       ~0.32.17  0.32.16
expo-updates             ~29.0.20  29.0.16
8 packages out of date.
```

Komut: `npx expo install --check` (install yok). Exit 1. Aynı 8 paket listesi.

`package.json` 844d7c2’den beri değişmediği için pager-view 8.0.0 **son store binary’de de vardı**; yeni bir native sapma değil, önceden var olan SDK sapması.

### A5. VERDICT

- **Mevcut runtimeVersion'a OTA güvenli mi?** **E.** `runtimeVersion` hâlâ sabit `"2.0.0"`; native modül / SDK major `package.json`’da değişmemiş. JS bundle (i18n) OTA ile bu runtime’a biner. **Sınır:** Maps native anahtarı ve gradle versionName OTA ile gitmez.
- **Yeni store build gerekli mi?** **E** (Maps key rotate + versionCode/versionName drift 28/2.0.6 vs 29/2.0.7 + non-CNG app.json sync uyarısı). **Hayır** yalnızca i18n JS için. targetSdk zaten 35; Expo SDK 54 major’ı aynı.

### A6. Android yayın bilgileri (kod)

| Alan                   | Değer                                                                                      | Kanıt                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| applicationId          | `com.tulipfleet.app`                                                                       | `android/app/build.gradle:40`; `app.json:34` `package` |
| versionCode (gradle)   | **29**                                                                                     | `android/app/build.gradle:43`                          |
| versionName (gradle)   | **"2.0.7"**                                                                                | `android/app/build.gradle:44`                          |
| versionCode (app.json) | **28**                                                                                     | `app.json:35`                                          |
| version (app.json)     | **2.0.6**                                                                                  | `app.json:5`                                           |
| namespace              | `com.tulipfleet.app`                                                                       | `build.gradle:38`                                      |
| release keystore yolu  | `System.getenv("KEYSTORE_FILE") ?: "tulipfleet-upload-new.keystore"` (app dizinine göreli) | `build.gradle:56`                                      |
| CI decode yolu         | `android/app/tulipfleet-upload-new.keystore`                                               | `.github/workflows/android-build.yml:57,73`            |
| debug keystore         | `debug.keystore`                                                                           | `build.gradle:50`                                      |
| workflow varsayılan    | version_code `29`, version_name `2.0.7`                                                    | `android-build.yml:8-13`                               |

Keystore **içeriği yazılmadı.** Şifre/alias env’den; varsayılan alias `"upload"` (`build.gradle:58`).

---

## 3. Eksen B — i18n envanteri

**Not:** İstenen yol `src/i18n/i18n.js` **yok**. Gerçek: `src/locales/i18n.js` + 9 sözlük `src/locales/{tr,en,nl,de,fr,es,it,bg,ku}.json`.

### B1. `src/locales/i18n.js`

| Davranış                             | Değer                                                                                 | Satır |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ----- |
| fallbackLng                          | `"tr"`                                                                                | 66    |
| Algılama                             | AsyncStorage `tulipfleet_language`; yoksa **`"tr"`**. Cihaz locale **kullanılmıyor.** | 31–40 |
| keySeparator                         | **set edilmemiş** → i18next varsayılan `"."` (nested JSON bu yüzden çalışıyor)        | 53–70 |
| returnNull / returnEmptyString       | **set edilmemiş**                                                                     | —     |
| parseMissingKeyHandler / saveMissing | **yok**                                                                               | —     |
| compatibilityJSON                    | `"v3"`                                                                                | 54    |
| interpolation.escapeValue            | `false`                                                                               | 67–69 |

Eksik key: i18next key string’ini döner; `t(key, defaultValue)` varsa 2. argüman (çoğu dinamik kökte ham enum). Diğer dillerde eksik → `fallbackLng: "tr"` (Türkçe sızıntı).

Paket: `i18next ^25.7.4`, `react-i18next ^16.5.3` (`package.json:60,65`).

### B2. Simetri matrisi (referans `tr.json`, 1757 flat key)

Komut: `node C:\Users\might\AppData\Local\Temp\i18n-p0\analyze-i18n.mjs` (kaynak: `src/locales/*.json`).

| Dil | key sayısı | tr’ye göre eksik | fazla | `adminAlerts.mapButton`              |
| --- | ---------- | ---------------- | ----- | ------------------------------------ |
| tr  | 1757       | —                | —     | `"Haritada Göster"` (`tr.json:1694`) |
| en  | 1744       | **20**           | 7     | `"Map"`                              |
| nl  | 1875       | **0**            | 118   | `"Kaart"`                            |
| de  | 1785       | 0                | 28    | `"Auf Karte anzeigen"`               |
| fr  | 1785       | 0                | 28    | `"Afficher sur la carte"`            |
| es  | 1826       | 0                | 69    | `"Mostrar en mapa"`                  |
| it  | 1806       | 0                | 49    | `"Mappa"`                            |
| bg  | 1756       | **3**            | 2     | `"Карта"`                            |
| ku  | 1893       | 0                | 136   | `"Li nexşeyê nîşan bide"`            |

**en eksik 20 (tamamı):** `auth.logoutConfirm`, `common.all`, `common.back`, `common.next`, `common.no`, `common.none`, `common.refresh`, `common.retry`, `common.search`, `common.warning`, `common.yes`, `nav.final_destination`, `nav.nextStop`, `profile.title`, `roles.companyAdmin`, `units.h`, `units.km`, `units.m`, `units.min`, `units.sec`.

**bg eksik 3:** `auth.logoutConfirm`, `nav.final_destination`, `nav.nextStop`.

**en fazla (7):** `routeMap.odometerPrompt`, `fuel.error.distSource.*` (5 alt). `routeMap.odometerPrompt` kodda kullanılıyor ama **tr’de yok** (B3).

Fazla key’ler (nl 118, ku 136, es 69…): çoğunlukla başka namespace’e kaymış kopyalar (`profile.error.distSource` vs `fuel.error.distSource`, `auth.back` vs `common.back`). **Silme kararı Cem’in.**

### B3. Kod `t("...")` vs `tr.json`

Statik `t('...')` / `t("...")` / `i18n.t(...)`: **1224 unique key**.

**Kodda var, `tr.json`’da yok: 133.** Tam liste analiz çıktısında; gruplar:

- `about.*` (19) — About ekranı
- `changePassword.*` (15)
- `register.*` / `register.errors.*` (24)
- `wifi.*` (21) — DeviceSetup-BLE
- `editProfile.*` (10)
- `offerDetail.*` (8: contactAdmin, goToMap, goToTasks, noVehicleAssigned, taskAccepted, trackOnMap, vehicleNotAssigned)
- `deviceSetup.connecting`, `deviceSetup.connectionError`
- `tasks.noVehicleAssigned`, `tasks.contactAdmin`
- `routeMap.odometerPrompt`
- `sos.callSubText`, `sos.sending`, `sos.warningText`
- `common.info/optional/vehicle/cannotOpenLink/invalidHour`
- `reportExport.*`, `vehicleTrack.tripDetail.title`, `dashboard.trafficClear`, `dashboard.activeVehicles`, …

**Ölü (tr’de var, statik t() yok): 666.** Örnek: `admin.fleetSummary`, `admin.inUse`, `admin.noActivities`… Dinamik kökler (`tasks.statuses.*`) bu sayaca **ölü yazılmaz** (t() template ayrı). **Silme kararı Cem’in.**

### B4. Dinamik key kökleri (C2 girdisi)

| Kök                                                    | Dosya:satır                       | Değişken kaynağı                                                                                                                     | tr.json alt-key                                                                                                                                                                           |
| ------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `driveAssist.incident.${inc.type}`                     | `DriverDashboard.js:809`          | `inc.type` ← `GET /api/driver/route-traffic` (incidents[0]); `inc.text` varsa **API metni öncelikli**                                | accident, road_closed, construction, congestion, disabled_vehicle, incident                                                                                                               |
| `task.statuses.${task.status}`                         | `DriverDashboard.js:1113`         | `task.status` ← `GET /api/driver/tasks`                                                                                              | pending, assigned, in_progress, completed, cancelled, pending_review, accepted, rejected — **withdrawn YOK**                                                                              |
| `tasks.statuses.${statusKey}`                          | `DriverTasks.js:564`              | aynı görev status                                                                                                                    | yukarıdakiler + **withdrawn VAR**                                                                                                                                                         |
| `taskDetail.statuses.${statusKey}`                     | `DriverTaskDetail.js:462`         | `GET /api/driver/tasks/${taskId}`                                                                                                    | withdrawn **YOK**                                                                                                                                                                         |
| `taskDetail.waypoints.${wpStatus}`                     | `DriverTaskDetail.js:984`         | waypoint status alanı                                                                                                                | title, stop, arrived, departed, complete                                                                                                                                                  |
| `taskDetail.events.${ev.type}`                         | `DriverTaskDetail.js:1053`        | `GET /api/driver/tasks/${taskId}/events`                                                                                             | **yalnızca `title`**. Kod enum: TASK_COMPLETED, TASK_STARTED, TASK_ACCEPTED, TASK_REJECTED, TASK_WITHDRAWN, STOP_ARRIVED, STOP_DEPARTED, WAYPOINT_COMPLETED (`DriverTaskDetail.js:28-37`) |
| `adminTasks.status.${s}`                               | `AdminTasks.js:145`               | `GET /api/tasks` → `status`                                                                                                          | **kök yok** (`adminTasks` `tr.json:1663-1691`, status objesi yok)                                                                                                                         |
| `adminTasks.priority.${p}`                             | `AdminTasks.js:146`               | `priority`; kod renkleri low/normal/high/urgent (`AdminTasks.js:139-143`)                                                            | **kök yok**                                                                                                                                                                               |
| `adminDrivers.status.${s}`                             | `AdminDrivers.js:229`             | `GET /api/drivers`; yorum `AdminDrivers.js:5`: available, on_task, task_pending, on_leave, offline                                   | **kök yok**                                                                                                                                                                               |
| `adminVehicles.status.${s}`                            | `AdminVehicles.js:297`            | `GET /api/vehicles`; kod renkleri available/in_use/maintenance/retired (`:287-293`)                                                  | **kök yok**                                                                                                                                                                               |
| `adminVehicles.fuelTypes.${vehicle.fuel_type}`         | `AdminVehicles.js:489-491`        | vehicles.fuel_type; form enum `CreateVehicleScreen.js:35-41`: diesel, gasoline, electric, hybrid, lpg                                | **kök yok**                                                                                                                                                                               |
| `adminVehicles.categories.${vehicle.vehicle_category}` | `AdminVehicles.js:562-564`        | vehicles.vehicle_category; benchmark adayları `AdminFuelDashboard.js:109-129`: heavy_truck, medium_truck, light_commercial, van, car | **kök yok**                                                                                                                                                                               |
| `geofence.categories.${cat}`                           | `AdminGeofenceScreen.js:1834`     | form/API kategori                                                                                                                    | general, depot, city_center, emission_zone, border, sensitive_area                                                                                                                        |
| `reports.placeholder.${tabKey}.{title,desc}`           | `AdminReportsScreen.js:1317,1320` | TAB_KEYS operations/fuel/driving/fleet/sustainability (`:34`)                                                                        | fuel, driving, fleet, sustainability (**operations placeholder yok** — operations aktif sekme)                                                                                            |
| `reports.filter.${r.key}`                              | `:1529`                           | 7d/30d/90d (`:28-32`)                                                                                                                | 7d, 30d, 90d                                                                                                                                                                              |
| `reports.tabs.${key}`                                  | `:1613`                           | aynı TAB_KEYS                                                                                                                        | operations, fuel, driving, fleet, sustainability                                                                                                                                          |

### B5. Hardcoded string (otomatik tarama, gürültü dahil)

Komut: `node .../analyze-hardcoded.mjs`. Eşleşme: `<Text>literal</Text>`, `Alert.alert` t() **olmadan**, placeholder, title:, Speech.speak.

| Grup                   | Text-literal | Alert.alert (t’siz) | Örnek dosya:satır                                                                                                                                                                                                                                                          |
| ---------------------- | ------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Driver                 | 35           | 2                   | `VehiclePickerScreen.js:201` `"Hata"/"Araçlar yüklenemedi"`; `:305` `"Araç Seçin"`; `DriverProfile.js:441-442` version + `Â©`; `DriverSettings.js:726-727` `"TulipFleet v2.1.0"` / `"© 2026 TulipFleet"`; `FuelEntryScreen.js:963` `"🛣️ KM"` **TR**                        |
| Admin                  | 54           | 23                  | `AdminDeviceInventory.js` **tamamen EN** (`:58` Failed to fetch, `:278` Device Inventory, `:223` Vehicle:) — **TR/EN karışık yüzey** (diğer admin ekranları TR i18n). `CreateVehicleScreen.js:49-57` `"Hata"/"Plaka zorunludur"` TR. `AdminDashboard.js:924` `"Error"` EN. |
| DeviceSetup-BLE-Yardım | 10           | 5                   | `WiFiPasswordScreen.js:39-50,94,219,304-405` neredeyse tüm UI TR hardcoded. `WIFI_ERROR_MESSAGES` `src/constants/config.js:127-133` TR sabit.                                                                                                                              |
| Superadmin             | 143          | 64                  | kapsam: Driver→Admin→DeviceSetup sonrası (P2 sırası)                                                                                                                                                                                                                       |
| Shared/Auth/Nav        | 17           | 1                   | `MainNavigator.js:170` `"Çıkış Yap"` TR                                                                                                                                                                                                                                    |

`Speech.speak`: `DriverDashboard.js:828`, `DriverRouteMapScreen.js:1866` (metin kısmen t(), kısmen API).

Toast kütüphanesi taraması: anlamlı `Toast.show` yok.

Placeholder (t’siz) 55; örnek: `AdminDeviceInventory.js:418` EN `"Enter serial number..."`, `EditTaskScreen.js:323` TR-ASCII `"Gorev basligi"`, `LoginScreen.js:132` `"ornek@tulipfleet.com"`.

### B6. String birleştirme → interpolasyon adayları

67 aday (script; bir kısmı key/id gürültüsü). Anlamlı cümle kuranlar:

- `WiFiPasswordScreen.js:219` `"Bağlantı hatası: " + error.message`
- `usePushNotifications.js:102` `"Push token alınamadı: " + err.message`
- `AdminSettings.js:1023` `(t("settings.version") \|\| "Versiyon") + " " + APP_VERSION`
- `AdminDeviceInventory.js:200,204` `` `Online (${n})` `` / `` `Offline (${n})` ``
- `FuelEntryScreen.js:569,629` template + `toLocaleString("tr-TR")` karışık cümle
- `helpers.js:25-39` `getTimeAgo` tamamen TR `"X yıl önce"` (i18n yok)
- `config.js:127-133` WIFI_ERROR_MESSAGES TR

### B7. Encoding bozuklukları (byte kanıt)

Komut: satırın UTF-8 byte dump’ı (`[System.Text.Encoding]::UTF8.GetBytes`).

| Konum                                            | Sorun                             | UTF-8 hex (kesit)                                                              |
| ------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------ |
| `src/locales/ku.json:1068` settings `footer`     | © üç kat mojibake `ÃâÃÂ©`         | `c3 83 c2 83 c3 a2 c2 80 c2 9a c3 83 c2 82 c3 82 c2 a9` — beklenen tek `c2 a9` |
| `src/locales/tr.json:1241` settings `footer`     | **sağlam** ©                      | `c2 a9 20 32 30 32 35`                                                         |
| `src/screens/driver/DriverProfile.js:442`        | hardcoded `Â©`                    | `c3 82 c2 a9` (C2 A9’un Latin-1 olarak yeniden kodlanması)                     |
| `src/locales/tr.json:1366` `quarterlyCarbonDesc` | ASCII `CO2`                       | `43 4f 32`                                                                     |
| `src/locales/tr.json:1558` `co2Emission`         | subscript `CO₂`                   | `43 4f e2 82 82`                                                               |
| `src/screens/driver/DriverTasks.js:2` (yorum)    | `Sürücü` double-encoded           | `53 c3 83 c2 bc 72 c3 83 c2 bc 63 c3 83 c2 bc`                                 |
| `ku.json:271-300` (devices bloğu)                | `RÃÆÃÂªveberiya…` yaygın mojibake | encodingHits: 29 satır (çoğu ku)                                               |

`DriverSettings.js:727` © karakteri görünürde doğru; Profile footer bozuk. ku settings footer kullanıcıya bozuk glyph basar.

### B8. İnterpolasyon tutarsızlığı (16 key)

Hepsi `{{param}}` tr’de var, **ku’da 0 param** (14 key) veya **de+fr’de 0** (1 key):

| Key                                                                     | tr params       | sapma          |
| ----------------------------------------------------------------------- | --------------- | -------------- |
| `deviceSetup.activeWarning.message`                                     | serial, vehicle | ku: []         |
| `deviceSetup.ble.devicesFound`                                          | count           | ku: []         |
| `deviceSetup.deviceActiveMessage`                                       | plate, serial   | ku: []         |
| `deviceSetup.wifi.lastUsed` / `.network`                                | ssid            | ku: []         |
| `geofence.deleteConfirm`                                                | name            | **de, fr: []** |
| `offerDetail.hoursMinutesRemaining`                                     | hours, minutes  | ku: []         |
| `offerDetail.minutesRemaining`                                          | count           | ku: []         |
| `taskOffers.connectionIssue`                                            | current, max    | ku: []         |
| `taskOffers.timeRemaining.hours/.minutes`                               | hours / minutes | ku: []         |
| `tasks.acceptTaskConfirm` / `rejectTaskConfirm` / `withdrawTaskConfirm` | title           | ku: []         |
| `tasks.newOffersWaiting` / `tasks.tasksWaitingApproval`                 | count           | ku: []         |

ku’da `{{name}}` yoksa i18next ham `{{name}}` basar veya param’ı düşürür → sürücü/cihaz kurulumu cümleleri kırık.

### B9. Locale formatlama

`src/utils/helpers.js:2-12` `formatDate` / `formatDateTime` **sabit `"tr-TR"`**. ku→tr-TR **bu helper’da yok.**

Import taraması: `from ".../utils/helpers"` yalnızca `AuthContext.js:18` → **`getErrorMessage`**. `formatDate` **hiç kullanılmıyor.**

Ekranlar kendi `formatDate` veya çıplak `toLocale*`:

| Kullanım         | Dosya:satır                        | Locale                                                    | ku fallback          | NL DD-MM / virgül                                                                                      |
| ---------------- | ---------------------------------- | --------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| yerel formatDate | `AdminReportsScreen.js:48-68`      | localeMap, **ku: `"tr-TR"`**                              | **var**              | `nl-NL` + day/month/year 2-digit → NL’de DD-MM-YYYY **evet** (Hermes Intl’e bağlı)                     |
| yerel            | `TaskOffers.js:27-35,437-440`      | ku: `"ku"` (tr-TR değil)                                  | **yok** (ham `"ku"`) | nl-NL var                                                                                              |
| yerel            | `TaskOfferDetail.js:28-31,519-522` | ku: `"ku"`                                                | yok                  |                                                                                                        |
| yerel            | `DriverTaskDetail.js:466-481`      | ku: `"ku"`                                                | yok                  |                                                                                                        |
| yerel            | `AdminTasks.js:188-189`            | ku: `"ku"`                                                | yok                  | nl-NL 2-digit                                                                                          |
| yerel            | `CreateTaskScreen.js:650`          | `isEn ? en-GB : tr-TR` — **nl yok**, NL kullanıcıya tr-TR | yok                  | **NL uyumsuz**                                                                                         |
| helpers          | `helpers.js:5,11,17,45,50`         | daima tr-TR                                               | yok                  | yok                                                                                                    |
| çıplak           | `FuelEntryScreen.js:485+`          | **`"tr-TR"` hardcoded** (sayıda virgül)                   | yok                  | NL’de yanlışlıkla TR virgül — aslında NL virgül ile **tesadüfen uyumlu**; EN kullanıcı TR format görür |
| çıplak           | `DriverDashboard.js:522`           | `toLocaleString()` argsuz                                 | cihaz/Hermes         | belirsiz                                                                                               |
| çıplak           | `VehicleInfoSheet.js:95-97`        | `"tr-TR"`                                                 | yok                  |                                                                                                        |
| çıplak           | Superadmin birden fazla            | `"tr-TR"`                                                 | —                    |                                                                                                        |

Hermes riski: `Intl.NumberFormat` `helpers.js:50`; `ku` locale birçok Hermes build’de **eksik** → `TaskOffers`/`DriverTaskDetail` `localeMap.ku = "ku"` **çalışma anı fallback/bozuk tarih** riski. AdminReports ku→tr-TR daha güvenli.

---

## 4. Eksen C — Sözleşme / terminoloji senkronu

### C1. Mobil endpoint envanteri + bağlı backend

**Base URL:** `src/constants/config.js:9-28`. `API_URL = process.env.EXPO_PUBLIC_API_URL` yoksa **`https://api.tulipfleet.com`**. `API_BASE_URL` aynı (`:29`). `api.js:6,74,84` bu base’i kullanır.

**Mobil hangi backend?** Kanıt: production/preview `eas.json` `EXPO_PUBLIC_API_URL=https://api.tulipfleet.com`. Kodda `enterprise-api` **geçmiyor** (argon grep: 0). `services/pushNotificationService.js:6` ayrıca **hardcoded** `https://api.tulipfleet.com`.

Dispatcher (`C:\dispatcher\src\config\api.ts:9-11`) üç backend tutar: AUTH `api.tulipfleet.com`, ENTERPRISE `enterprise-api.tulipfleet.com`, SUPERVISOR `staging-api.tulipfleet.com`. **Mobil yalnız ana fleet API.**

Kök `constants/config.js` (argon) legacy (`https://your-vps-ip`); Metro `src/` resolve ettiği sürece runtime’da `src/constants/config.js` kazanır. Superadmin bazı ekranlar `API_URL` import eder — aynı src config.

**authClient (interceptor’sız)** `api.js:197-260`: `/api/auth/login`, `/register`, `/forgot-password`, `/reset-password`, `/refresh`; plus `/api/driver/vehicle/${id}/settings` (`:631`).

**api client — unique path’ler (script + elle ek):**

Auth/user: `/api/auth/me`, `/api/auth/logout`, `/api/auth/change-password`, `/api/user/profile`, `/api/user/change-password`, `/api/users/me`

Driver: `/api/driver/stats`, `/vehicle`, `/vehicle/${id}/fuel`, `/vehicle/${id}/odometer`, `/vehicle/${id}/settings`, `/tasks`, `/tasks/${id}`, `/accept|reject|start|status|events`, `/drive-conditions?lang=`, `/route-traffic`, `/route-weather?lang=`, `/sos`, `/devices/assignable|search|assign`, `/available-vehicles`, `/assign-device`, `/complete-setup`, `/validate-serial`

Admin: `/api/admin/fleet-stats`, `/admin/devices`, `/admin/devices/search|claim`, `/admin/activities`, `/api/drivers`, `/drivers/create-with-user`, `/api/vehicles`, `/api/tasks`, `/tasks/${id}/offer`, `/api/alerts`, `/api/geofences`, `/api/fuel/*`, `/api/reports/operations|drivers|vehicles`, `/api/locations/latest`

Offers: `/api/task-offers/${id}`, `/accept`, `/reject`

Push: `/api/push/register`, `/api/push/test`

Devices: `/api/devices/activate`, `/validate-serial`, `/scan-qr`, `/provisioning-complete`, …

Superadmin: `/api/superadmin/companies|devices|users|system-health`

Export: `reportExport.js` `${API_BASE_URL}/api/vehicles/${id}/trips/export`

Yorum satırı (ölü): `/api/device/claim`, `/api/device/claim/validate`.

### C2. Dinamik kök diff (sözlük × mobil enum × dispatcher)

Kaynak (iii): `C:\dispatcher` (`Test-Path package.json` True). Dispatcher görev listesi **enterprise-api** `GET ${ENTERPRISE_API_URL}/api/dispatcher/tasks` (`useTasks.ts:31`). Mobil aynı kavramı **api.tulipfleet.com** `/api/tasks` ve `/api/driver/tasks` ile alır. Dispatcher yorumu: “9 statünün tamamı (canlı public.tasks CHECK constraint)” (`tasks/index.tsx:55-78`) — **paylaşılan DB varsayımı kanıtı, iki ayrı HTTP host**. Bugün mobilin görebileceği değer = ana API’nin yazdığı `public.tasks` satırı. Aynı CHECK ise withdrawn **bugün** gelebilir.

#### Görev status

| Değer          | Mobil sözlük `task.statuses` | `tasks.statuses` | `taskDetail.statuses` | `adminTasks.status` | Mobil enum `TASK_STATUS` `config.js:308-314` | Dispatcher `tasks/index.tsx:58-75` | Bugün gelebilir mi?                                  |
| -------------- | ---------------------------- | ---------------- | --------------------- | ------------------- | -------------------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| pending        | var                          | var              | var                   | **kök yok**         | var                                          | var                                | E — `/api/tasks`, `/api/driver/tasks`                |
| pending_review | var                          | var              | var                   | kök yok             | **yok**                                      | var                                | E                                                    |
| accepted       | var                          | var              | var                   | kök yok             | yok                                          | var                                | E                                                    |
| assigned       | var                          | var              | var                   | kök yok             | var                                          | var                                | E                                                    |
| in_progress    | var                          | var              | var                   | kök yok             | var                                          | var                                | E                                                    |
| completed      | var                          | var              | var                   | kök yok             | var                                          | var                                | E                                                    |
| rejected       | var                          | var              | var                   | kök yok             | yok                                          | var                                | E                                                    |
| cancelled      | var                          | var              | var                   | kök yok             | var                                          | var                                | E                                                    |
| withdrawn      | **YOK**                      | var              | **YOK**               | kök yok             | yok                                          | var                                | E — DriverDashboard + TaskDetail **ham `withdrawn`** |

**Render riski (bugün):** 9 admin status (kök yok) + DriverDashboard/TaskDetail `withdrawn` (2 yüzey) = **11**.

#### Görev priority

Mobil kod: low, normal, high, urgent (`AdminTasks.js:139-143`). Sözlük `adminTasks.priority` **yok**. Dispatcher `priorityColor`: high/low/default normal (`tasks/index.tsx:81-88`). **Bugün 4 değer ham.** Endpoint: `GET /api/tasks`.

#### Sürücü status

Mobil yorum+filtre (`AdminDrivers.js:5,31-46`): available, on_task, task_pending, on_leave, offline. Sözlük `adminDrivers.status` **yok**. Dispatcher `DriverRow.status` **aynı 5** (`dispatcher.ts:40`). Endpoint `GET /api/drivers` (api.tulipfleet.com). **Bugün 5 değer ham.**

#### Araç status

Mobil `AdminVehicles.js:287-293` + `EditVehicleScreen.js:45-50`: available, in_use, maintenance, retired. Sözlük `adminVehicles.status` **yok**. Dispatcher `VehicleRow.status` **aynı 4** (`dispatcher.ts:21`). Endpoint `GET /api/vehicles`. **Bugün 4 değer ham.**

#### Yakıt tipi / kategori

Form: diesel, gasoline, electric, hybrid, lpg (`CreateVehicleScreen.js:35-41`). `adminVehicles.fuelTypes` **yok** → **5 ham**. Dispatcher `fuel_type?: string` (serbest).

`vehicle_category`: sözlük kökü yok; kod API string’ini basar. Benchmark aday kümesi 5 (`heavy_truck`…). Dispatcher `vehicle_category: string`. **Açık küme — bugün her API değeri risk.**

#### Drive Assist incident

Sözlük 6 tip. API `inc.type` + `inc.text` (`DriverDashboard.js:807-809`). `inc.text` doluysa **backend cümlesi** (C3). Bilinmeyen `type` + boş text → key string. Endpoint: `/api/driver/route-traffic` (bugün). **Açık küme.**

#### Task events

Kod 8 tip; sözlükte yalnızca `title`. Endpoint `/api/driver/tasks/${id}/events` (bugün). **8 ham** (`TASK_COMPLETED` → `"TASK COMPLETED"` replace).

#### Geofence categories

Sözlük 6 key. Dispatcher’da ayrı kategori enum’u **bulunamadı** (erişemedim listesine). Extra API cat → ham. Endpoint `/api/geofences`.

#### Alert tipleri (AdminAlerts vs dispatcher vs config)

`AdminAlerts.js:41-114` i18n map: HARD_BRAKE, HARD_ACCEL, HARD_TURN, SHARP_TURN, IMPACT, OVERSPEED, speed, geofence, geofence_entry, geofence_exit, fuel, maintenance, battery, idle, sos, default — sözlük `adminAlerts.types.*` **var**.

`src/constants/config.js:335-344` `ALERT_TYPES`: HARD_BRAKE, HARD_ACCEL, HARD_TURN, IMPACT, **speeding**, **idle_too_long**, **geofence_enter**, geofence_exit — AdminAlerts map ile **isim sapması**. `speeding` / `idle_too_long` / `geofence_enter` map’te yok → `default`.

Dispatcher `DashboardNavbar.tsx:74-90`: HARD_BRAKE, HARD_ACCEL, HARD_TURN, SHARP_TURN, IMPACT, OVERSPEED, speed, geofence, geofence_entry, geofence_exit, fuel, maintenance, battery, idle, sos — AdminAlerts ile **aynı**. Alert listesi dispatcher’da `useAlerts.ts` yorumu: **api.tulipfleet.com** (enterprise değil). **Bugün default’a düşen 3 isim sapması** (config.js eski). Sözlük eksikliği değil, eşleme riski.

Offer status: `offerDetail.statuses` accepted/rejected/expired. Dispatcher task-offer status enum’u **ayrı dosyada bulunamadı** (erişemedim).

#### Exception tipleri — cutover

`C:\dispatcher\src\layouts\dispatcher\exceptions\index.tsx:38-45` `TYPE_LABEL`: eta_delay, driver_offline, driver_location_mismatch, compliance_zone_breach, traffic_impact, dock_conflict. Hook: `ENTERPRISE_API_URL/api/dispatcher/exceptions` (`useExceptions.ts:32`). **Mobil sözlükte yok, mobil endpoint yok.** Cutover’da mobil bu tipleri basarsa 6 ham + TR-only dispatcher label.

#### C2 sayım

| Zaman               | Kanıtlı eksik değer (ham render) | Açık küme                                     | Kaynak host                                                                                                                                      |
| ------------------- | -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bugün**           | 9+4+5+4+5+2+8 = **37**           | vehicle_category, incident.type, geofence cat | `api.tulipfleet.com` (`/api/tasks`, `/drivers`, `/vehicles`, `/driver/tasks`, `/driver/tasks/:id/events`, `/driver/route-traffic`, `/geofences`) |
| **Cutover sonrası** | **+6** exception_type            | enterprise’ın genişleteceği status/alert      | `enterprise-api.tulipfleet.com` `/api/dispatcher/exceptions` (+ görev hattı cutover’da aynı CHECK ise withdrawn zaten bugün)                     |

### C3. Backend-kaynaklı çevrilmemiş metinler (kapsam dışı)

| Ne                                               | Kanıt                                                                                                                                                                                                                               | Neden backend         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Driving Quality `data.limitations[]` olduğu gibi | `AdminReportsScreen.js:292-296,1289-1291` yorum: “Backend hala TR string olarak gönderiyor (bu sprint scope dışı).” Endpoint `/api/reports/operations` + driving tab data                                                           | TR sabit cümle        |
| Drive Assist `inc.text`                          | `DriverDashboard.js:809` `inc.text \|\| t(...)`                                                                                                                                                                                     | trafik API açıklaması |
| Drive Assist `weather.alert`                     | `DriverDashboard.js:813-814` `alerts.push(driveAssist.weather.alert)` — t() yok. `GET /api/driver/route-weather?lang=` lang gönderir; body.alert hâlâ sunucu metni                                                                  | hava açıklaması       |
| Push title/body                                  | `pushNotificationService.js:71-73` `remoteMessage.notification?.title \|\| "Bildirim"`; fallback TR `"Bildirim"`. Payload FCM/backend. Kodda `"Yeni Görev Atandı"` **literal yok** — o string backend/FCM şablonunda ise bu listede | push                  |
| `error.response.data.message` / `.error`         | birden fazla Alert (FEAT-010 409 catch `791c97f`)                                                                                                                                                                                   | sunucu mesajı         |
| `WIFI_ERROR_MESSAGES`                            | `config.js:127-133` — bu **mobil sabit**, backend değil; P2’ye ait                                                                                                                                                                  |

### C4. Glossary hizası TR/EN/NL (karar yok)

Landing: `C:\tulipfleet-landing\src\i18n\{nl,tr,en}.ts` (brief’te path yoktu; dizin mevcut, okundu). Dispatcher: `C:\dispatcher\src\i18n\{nl,tr,en}.ts`. Mobil: `src/locales/{nl,tr,en}.json`.

| Kavram                   | Landing NL                                                                               | Landing TR                                    | Dispatcher NL                                                                | Dispatcher TR                                           | Mobil NL                                                          | Mobil TR                                                                 | Fark (gözlem)                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| görev / taak             | `hero.mockupJobs` `"Taken"`; `mobileBridge.steps[0]` `"Taak toewijzen"` (`nl.ts:32,102`) | `"Görevler"` / `"Görev"` (`tr.ts` jobs/steps) | `crumb.optimize` `"Nieuwe taak"` (`nl.ts:24`); `tasks` ekranı taak           | `"Yeni görev"` (`tr.ts:24`)                             | `"Nieuwe taak"` (`nl.json:333`); `"taak"` (`:1386`)               | `"görev"` / `"Yeni görev atamaları"` (`tr.json:373,1392`)                | Landing “Taken” (çoğul) vs mobil/dispatcher “taak”. TR “görev” hizalı.                                                       |
| sürücü / chauffeur       | `mobileBridge.subtitle` chauffeur (`nl.ts:94`)                                           | `"sürücü"`                                    | `"Selecteer chauffeur…"` (`nl.ts:58`); nav `"Chauffeursbeheer"` (`:13`)      | `"Sürücü Yönetimi"` (`tr.ts:13`)                        | `"chauffeur"` (`nl.json:1062`); nav `"Chauffeurspaneel"` (`:873`) | `"sürücü"`                                                               | NL chauffeur tutarlı.                                                                                                        |
| araç / voertuig          | —                                                                                        | —                                             | `"Geen voertuigen gevonden."` (`nl.ts:72`); `"Toegewezen voertuig"` (`:189`) | `"Eşleşen araç yok."` / `"Atanan araç"`                 | yaygın `"voertuig"` değil, çoğu `"Vloot"` bağlamı                 | `"araç"`                                                                 | Mobil NL’de voertuig seyrek; “Vloot” tercih.                                                                                 |
| filo / vloot / wagenpark | meta.title `"Wagenparkbeheer"` (`nl.ts:6`); about `"Vlootbeheersysteem"` mobil           | `"filo yönetimi"` (`landing tr.ts:6`)         | nav `"Live wagenpark"` (`nl.ts:6,64`)                                        | `"Canlı Fleet İzleme"` (**Fleet İngilizce**, `tr.ts:6`) | `"Vlootbeheersysteem"` (`nl.json:147`); `"Vlootkaart"`            | `"Filo Yönetim Sistemi"` (`tr.json:1611`); `"Filo"`                      | Dispatcher TR “Fleet” bırakmış; landing/mobil “filo”. NL wagenpark vs vloot karışık.                                         |
| panel / paneel           | `mobileBridge.body` `"paneel"` (`nl.ts:95`)                                              | kastedilen ofis paneli                        | `"Detailpaneel sluiten"` (`nl.ts:73`); `"Paneel inklappen"` (`:56`)          | “pano/panel” karışık (`crumb.dashboards` `"Panolar"`)   | `"Beheerderspaneel"` / `"Chauffeurspaneel"` (`nl.json:863,873`)   | `"Dashboard"` birçok key’de İngilizce bırakılmış (`tr.json` FAQ `:1221`) | “paneel” NL’de var; TR “panel/dashboard/pano” üçlü.                                                                          |
| CSRD / naleving          | stats/compliance bağlamı landing                                                         | `"EU CSRD Uyumluluk"` mobil `tr.json:1570`    | — (dispatcher i18n’de CSRD key **görülmedi**)                                | —                                                       | `"EU CSRD Naleving"` (`nl.json:1564`)                             | `"EU CSRD Uyumluluk"`; `"CSRD Takibi"` (`:1948`)                         | NL naleving vs TR uyumluluk (anlam yakın, kök farklı). Landing meta “zero-emissie” / “zero-emission” — mobil `euTitle` CSRD. |
| istisna / uitzondering   | —                                                                                        | —                                             | nav `"Uitzonderingsbeheer (Meldingen)"` (`nl.ts:8`)                          | `"İstisna Yönetimi (İkaz)"` (`tr.ts:8`)                 | mobil nav’da **exceptions yok** (sürücü/admin alerts)             | `"Uyarı"` (`adminAlerts`)                                                | Dispatcher “istisna/ikaz” vs mobil “uyarı/alert”.                                                                            |

Karar verilmedi.

---

## 5. Aksiyon kovaları

Sıra gerekçesi: önce sürücünün **bugün** gördüğü kırık string + bugün API’den gelen ham enum; sonra simetriyi ölçülebilir kılan script; sonra hardcoded göç (kullanıcı sayısına göre Driver→Admin→DeviceSetup); glossary ayrı; store native hattı i18n P1 ile paralel (JS OTA’yı bloklamaz); backend metinleri ayrı oturum.

### P0-fix — Sürücünün bugün gördüğü hata + bugün ulaşılır render riskleri — efor **M**

1. `tr.json`’a kodda kullanılan 133 eksik key (öncelik: `wifi.*`, `offerDetail.*`, `tasks.noVehicleAssigned`, `routeMap.odometerPrompt`, `sos.*`, `deviceSetup.connecting`). Kanıt: B3. Sürücü/BLE yüzeyleri key basıyor.
2. `en.json` 20 eksik (`common.*`, `units.*`) — EN sürücü TR görüyor (fallbackLng).
3. `adminTasks.status|priority`, `adminDrivers.status`, `adminVehicles.status|fuelTypes|categories` nested objeleri — 37 ham değer `/api/tasks|drivers|vehicles` ile bugün geliyor (C2).
4. `task.statuses.withdrawn` + `taskDetail.statuses.withdrawn` + `taskDetail.events.{8 tip}`.
5. Encoding: `ku.json:1068` footer; `ku.json` devices bloğu; `DriverProfile.js:442` `Â©`.
6. ku interpolasyon 14 key (B8) — DeviceSetup + görev onay cümleleri.

### P1 — Simetri script’i — efor **S**

Mevcut `scripts/verify-i18n.mjs` yalnızca 7 dil + 3 bölüm. 9 dil, tr referans, fazla/eksik, `{{param}}` diff, dinamik kök alt-key kümesi. CI’da exit ≠ 0. `adminAlerts.mapButton` regression assert.

### P2 — Hardcoded göç Driver → Admin → DeviceSetup — efor **L**

B5 sayaçları. Superadmin sona. `WIFI_ERROR_MESSAGES`, `getTimeAgo`, `VehiclePickerScreen`, `WiFiPasswordScreen`, `AdminDeviceInventory` (EN ada), `CreateVehicleScreen` Alert’leri. `helpers.formatDate` tek helper + localeMap (ku→tr-TR, nl-NL DD-MM).

### P3 — Glossary — efor **S**

C4 tablosu: Fleet vs filo (dispatcher TR), paneel/dashboard/pano, alert vs istisna, wagenpark vs vloot, Taken vs taak. Karar Cem; sonra 9 dile yay.

### BUILD&STORE — native/SDK, P1 ile paralel — efor **M**

Store build: Maps key native’e işlesin; `app.json` version/versionCode’u gradle 2.0.7/29 ile hizala (veya bilinçli 2.0.6’da kal). expo-doctor pager-view 8 vs 6.9.1 **bilinçli pin veya hizalama** (native). non-CNG app.json sync uyarısı. **i18n OTA’yı bekletmez.** Patch bump (`expo-updates` 29.0.16→29.0.20) native olabilir — ayrı karar.

### BACKEND — kapsam dışı mini-oturum — efor **M**

`limitations[]` key’e çevir (`AdminReportsScreen.js:292-294`). `route-weather.alert` / `incidents[].text` lang+key. FCM title/body şablonları (aday: “Yeni Görev Atandı” — mobil kaynakta literal yok). 409 `message` zaten mobil yakalıyor (`791c97f`); çeviri backend locale veya error code.

---

## 6. Bilmiyorum / erişemedim

- 2.0.7 AAB/IPA’nın Play Console / App Store Connect’e **yüklenip yüklenmediği** (repoda tag yok; gradle 29/2.0.7, app.json 28/2.0.6).
- EAS `production` son build numarası / store listing (eas CLI / store API bu oturumda çağrılmadı).
- `public.tasks` CHECK constraint’inin **gerçek SQL’i** (dispatcher yorumu var, DB dump yok). withdrawn’ın prod’da yazılıp yazılmadığı.
- `vehicle_category` ve `driveAssist.incident.type` **kapalı enum listesi** (backend repo bu workspace’te yok).
- Dispatcher task-offer status kümesi (offerDetail.statuses ile diff tamamlanamadı).
- Dispatcher geofence kategori enum’u.
- Landing path brief’te yoktu; `C:\tulipfleet-landing` bulundu ve okundu. Başka bir landing kopyası varsa karşılaştırılmadı.
- iOS `ios/` native diff 844d7c2..HEAD **boş** göründü; Info.plist Maps key’inin prebuild ile senkron olup olmadığı non-CNG uyarısı yüzünden **belirsiz**.
- Hermes’in bu binary’de `ku` / `nl-NL` Intl desteği (cihaz testi yok).
- `npx expo-doctor` 16/18 geçti; **hangi 16 check** verbose olmadan listelenmedi (`--verbose` çalıştırılmadı).
- Kök `constants/config.js` (legacy) runtime’da kullanılıyor mu — Metro alias net değil; `src/constants/config.js` API için kanıtlı.
- FCM şablon metni “Yeni Görev Atandı” backend’de doğrulanamadı (mobil literal yok).

---

## 7. `git status --short`

Rapor yazılmadan önce (keşif): boş.

Rapor yazıldıktan sonra beklenen:

```
?? docs/I18N_P0_DISCOVERY.md
```

(Doğrulama bir sonraki komutta.)
