# TulipFleet Mobile — P2-b rapor (Admin hardcoded göç)

Branch: `i18n-mobile-p2b-admin` (main `a82c33c` üstünden).
Kapsam: `src/screens/admin/**`, Admin’in kullandığı `src/components/**` (`RecentFuelRecords`, `VehicleInfoSheet`, `Fuel*`/`Carbon*` chart, `WaypointEditor`), `src/utils/helpers.js` (`formatDate` / `formatDateTime` / `formatNumber` localeMap).
Yeni bağımlılık yok. `package.json` dokunulmadı. OTA/EAS yok. Sözlük yazımı yalnız `scripts/i18n-add-keys.mjs` + `scripts/i18n-patches/p2b-*.json`. Push yok.
Driver / DeviceSetup / bleService / Superadmin / navigation **dokunulmadı**.

## Commit'ler

| # | hash | konu |
|---|---|---|
| 1 | `07e0fb2` | patch dosyaları + 9 sözlük (`settings.version` KU dahil; diğer yeni key’lerde KU yok) |
| 2 | `b2685f6` | Admin ekranları + fuel/map bileşenleri `t()` + tarih/sayı helper |
| 3 | `f57f330` | helpers `formatNumber` + 2-digit tarih seçenekleri |
| 4 | (bu commit) | `docs/I18N_P2B_REPORT.md` |

```
07e0fb2 fix(i18n): add P2-b admin keys for inventory, vehicle forms, and shared copy
b2685f6 fix(i18n): migrate admin screens and fuel/map components off hardcoded copy
f57f330 fix(i18n): format dates and numbers with shared localeMap via Intl
```

## Adım 0 — envanter (önce / sonra)

Tarama: `<Text>` literal, `Alert.alert` (t’siz), `placeholder=`, `title:`, `accessibilityLabel`, string birleştirme, `toLocaleDateString` / `toLocaleString` / `Intl`.
Ham tarama BEFORE = **323** satır (çoğu `t()` şablonu, id, HTML interpolasyon). Göç seti = aşağıdaki kullanıcıya görünen ada.

### Önce (göç edilecek — kullanıcıya görünen)

| dosya:satır | mevcut metin | dil | önerilen key | grup |
|---|---|---|---|---|
| AdminDeviceInventory.js:58 | `Error` / `Failed to fetch devices` | EN | `common.error` / `deviceInventory.fetchFailed` | reuse + screen |
| AdminDeviceInventory.js:89–98 | `Invalid Serial`; QR mesajı; `Add to Stock`; `Serial: … Add this device…`; `Cancel` | EN | `deviceInventory.invalidSerial*` / `addToStock*` / `common.cancel` | screen + common |
| AdminDeviceInventory.js:105 | `Failed to scan QR code` | EN | `deviceInventory.scanFailed` | screen |
| AdminDeviceInventory.js:122–126 | `Success` / `Device ${serial} added…` / `Failed to add device` | EN | `common.success` / `deviceInventory.addedToStock` / `addFailed` | reuse + screen |
| AdminDeviceInventory.js:141–182 | `Enter a serial number`; `Not Found`; `Device not found`; stok ekleme Alert’leri | EN | `deviceInventory.enterSerial/notFound*/serialNotFound/addedToStockSimple` | screen |
| AdminDeviceInventory.js:200/204 | `Online (${n})` / `Offline (${n})` | EN | `deviceInventory.online/offline` `{{count}}` (plural yok) | screen |
| AdminDeviceInventory.js:223–235 | `Vehicle:` / `Driver:` / `QR Status:` | EN | `deviceInventory.vehicle/driver/qrStatus` + `qrUsed/qrActive/qrNone` | screen |
| AdminDeviceInventory.js:259–330 | `Add to Stock`; `Device Inventory`; `All Devices`; `Assigned`; `Unassigned`; `Scan QR`; `Search` | EN | `deviceInventory.*` / `common.search` | screen + common |
| AdminDeviceInventory.js:347–432 | `No devices found`; kamera izni; `Request Permission`; `Close`; `Search Device by Serial`; placeholder `Enter serial…` | EN | `deviceInventory.empty` / `camera.*` / `common.close` / `serialPlaceholder` | reuse + screen |
| CreateVehicleScreen.js:49–57 | `Plaka zorunludur` … `Model zorunludur` | TR | `createVehicle.plateRequired` vb. + `common.error` | screen |
| CreateVehicleScreen.js (form) | Plaka/Cihaz/Marka/Model/Yıl/Yakıt/Durum + `Araç Ekle` | TR | `createVehicle.*`; yakıt `adminVehicles.fuelTypes.*` | screen + reuse |
| EditVehicleScreen.js | aynı form + `Güncelle` / güncelleme Alert | TR | `createVehicle.update*` | screen |
| EditTaskScreen.js:323 | placeholder `Gorev basligi` | TR-ASCII | `editTask.titlePlaceholder` | screen |
| EditTaskScreen.js | `Gorev Kodu` / `Baslik` / `Oncelik` / `Yukleniyor...` / catch `Hata` | TR-ASCII | `editTask.*` / `adminTasks.status\|priority` / `common.error` | reuse + screen |
| EditDriverScreen.js | catch `Hata`; durum `Bosta/Aktif`; label `Email` | TR / EN | `common.error`; `createDriver.status*`; `createDriver.email` | reuse |
| AdminDashboard.js:924,2082 | Alert `Error`; CSV başlığı | EN | `common.error` / `common.csv` + `admin.csvCopied` | reuse |
| AdminSettings.js:1023 | `(t("settings.version") \|\| "Versiyon") + " " + APP_VERSION` | TR | `settings.version` `{{version}}` | overwrite |
| AdminSettings.js footer | `© ${year} TulipFleet` | — | `common.copyright` `{{year}}` (P2-a) | reuse |
| AdminTasks.js:186 | yerel `toLocaleString` | — | `helpers.formatDateTime` | helper |
| AdminReportsScreen.js:48–68 | yerel `localeMap` (ku→tr-TR) + `toLocaleDateString` | — | `helpers.formatDate` | helper |
| VehicleTrackScreen.js:325 | yerel `localeMap` + `toLocaleTimeString` | — | `helpers.formatTime` | helper |
| RecentFuelRecords.js:28 | `toLocaleDateString("tr-TR")` | TR sabit | `helpers.formatDate` | helper |
| CreateTaskScreen.js:650/659 | `isEn ? en-GB : tr-TR` (NL kullanıcıya tr-TR) | bug | `helpers.formatDate` / `formatTime` | helper |
| VehicleInfoSheet.js:95–97 | `toLocaleTimeString`; `History Route`; status EN | EN | `helpers.formatTime`; `vehicleInfo.historyRoute`; `adminVehicles.status.*` | helper + screen |
| WaypointEditor.js | `toLocaleString` tarih | — | `helpers.formatDateTime` | helper |
| AdminVehicles.js / AdminDrivers.js / AdminFuelDashboard.js / FuelSummaryCards / CarbonSummaryCards / CostAnalysisChart | `toLocaleString("tr-TR")` sayılar | TR sabit | `helpers.formatNumber`; yakıt tipi `adminVehicles.fuelTypes.*` | helper + reuse |
| FleetMapScreen.js | `toLocaleTimeString` lastUpdate | — | `helpers.formatTime` | helper |
| AdminAlerts.js:385 | `toLocaleDateString()` fallback | — | `helpers.formatDate` | helper |

### Sonra (Admin grubu — kullanıcıya görünen göç seti)

Kapsam içi göç seti = **0**. Ham tarama hâlâ ~209 “visible-ish” satır üretir; hepsi ya zaten `t()`/`getText`, ya id/URL/HTML interpolasyon, ya aşağıdaki kapsam dışı liste.

`Select-String -Path src\screens\admin\*.js, src\screens\admin\fuel\*.js, src\components\admin\*.js, src\components\admin\fuel\*.js, src\components\map\*.js -Pattern 'toLocale(Date)?String\(|new Intl\.'` → **0 eşleşme**. `helpers.js` hariç (beklenen).

## Adım 1 — key tasarımı

### Reuse (yeni key açılmadı)

| key | gerekçe |
|---|---|
| `common.error/success/cancel/search/close` | Device inventory Alert/buton + Dashboard Error |
| `common.csv` | **yeni** (CSV Alert başlığı; ortak) |
| `admin.csvCopied` | Dashboard CSV kopyalandı |
| `adminVehicles.fuelTypes.*` / `adminVehicles.status.*` | Create/Edit vehicle, CostAnalysisChart, VehicleInfoSheet |
| `adminTasks.status.*` / `adminTasks.priority.*` | EditTask |
| `editTask.*` (mevcut load/select/save) | EditTask Alert’ler |
| `createDriver.*` (mevcut lisans/email) | EditDriver |
| `camera.permission*` / `camera.requestPermission` | Device inventory kamera |
| `settings.version` | AdminSettings; P2-a `driverSettings.version` deseni; **overwrite** `"Versiyon"` → `"TulipFleet v{{version}}"` |
| `common.copyright` | footer (P2-a) |
| `waypointEditor.*` | WaypointEditor zaten t() |

### Yeni namespace

- `deviceInventory.*` — 34 key. `online` = `"Çevrimiçi ({{count}})"`; **i18next plural yok**.
- `createVehicle.*` — plaka/cihaz/marka/model validasyon + form etiket + add/update.
- `editTask.titlePlaceholder/titleLabel/taskCode/descPlaceholder/loading/priority/driver/vehicle/route/description`
- `createDriver.updated/updateFailed/updateButton/statusIdle/statusActive/statusPaused/statusLabel`
- `vehicleInfo.historyRoute`
- `common.csv`

`settings.version` interpolation `Constants.expoConfig.version` (`app.json`); sözlüğe sürüm yazılmaz.

### Tarih / sayı

Tüm Admin tarih/sayı kopyaları `helpers.formatDate` / `formatDateTime` / `formatTime` / `formatNumber`.
`AdminReportsScreen` yerel `localeMap` silindi; wrapper `formatDate(iso)` helper’ı çağırır (`language` arg unused, imza korunur).
`CreateTaskScreen` `isEn` tarih dallanması kaldırıldı → helper (NL artık `nl-NL`).
`formatNumber`: `Intl.NumberFormat(getDateLocale())`. `formatCurrency` hâlâ `tr-TR` (bu paket para birimi göçü değil).

### HTML rapor + limitations

`buildOpsHtml` / `buildDrivingHtml` zaten `t` parametreli; gövde metinleri `t("reports.*")` → **dokunulmadı**.
Kalan birim `" km"` HTML hücrelerinde (cümle değil).
`limitations[]` backend TR string — **DOKUNULMADI**, BACKEND kova.

## Adım 2 — patch sayaçları + idempotency

Komut: `node scripts/i18n-add-keys.mjs scripts/i18n-patches/<file>.json`

| patch | 1. koşu | 2. koşu |
|---|---|---|
| `p2b-admin-common.json` | added=16 overwritten=8 skipped_lang=3 files=8 | identical **0 değişiklik** |
| `p2b-admin-screens.json` | added=288 skipped_lang=36 files=8 | identical **0 değişiklik** |
| `p2b-device-inventory.json` | added=272 skipped_lang=34 files=8 | identical **0 değişiklik** |

16+8+288+272 = 584 yazım (8 dil). 72 yeni key × 8 + `settings.version` overwrite × 8.

`settings.version` KU’da `{{version}}` yokken interp kapısı 1 oluyordu. Marka dizesi dil-nötr olduğu için patch’e `ku` eklendi, `--force`: overwritten=1 skipped_lang=2; ikinci koşu **0 değişiklik**. Diğer 72 key KU_OMITTED.

TR/EN/NL: Cursor. DE/FR/ES/IT/BG: Cursor + **SUSPECT**. Device inventory TR baz metin Cursor; **SUSPECT değil** (TR ana dil).

### SUSPECT

DE/FR/ES/IT/BG tüm 73 key (72 yeni + `settings.version` overwrite). Native review yok.

### KU_OMITTED (72)

`ku.json` yalnız `settings.version` değişti (interp). Liste: `common.csv`, `vehicleInfo.historyRoute`, 36 `p2b-admin-screens`, 34 `p2b-device-inventory`.

## Adım 3 — kod

- Desen: dosyanın kendi `useTranslation` / mevcut `t`. DeviceInventory, Create/Edit Vehicle, EditTask, EditDriver, VehicleInfoSheet’e hook eklendi veya kullanıldı.
- JSX / stil / `makeStyles` aritmetik yok.
- AdminDeviceInventory EN ada → `deviceInventory.*`.
- CreateTask `getText` / `isEn` Alert ve form kopyası **bırakıldı** (yalnız tarih helper’a alındı) — aşağıdaki kapsam dışı.
- `CostAnalysisChart` `FUEL_LABELS` silindi → `adminVehicles.fuelTypes.${id}`.

## Adım 4 — doğrulama

### verify BEFORE / AFTER

BEFORE = main `a82c33c` / P2-a AFTER. AFTER = P2-b commit 3.

Beş kapı: code-not-in-union, code-missing-in-tr, manifest-missing, interp, encoding.

| | BEFORE (`a82c33c`) | AFTER (commit 3) |
|---|---|---|
| UNION | 2305 | **2377** (+72) |
| intersection | 1809 | **1809** (KU yeni key yok → kesişim aynı) |
| code keys not in union | **0** | **0** |
| code keys missing in tr | **0** | **0** |
| manifest subkey missing | **0** | **0** |
| interp mismatches | **0** | **0** |
| encoding mojibake | **0** | **0** |
| errors / warnings | 2550 / 1914 | 2622 / 2490 |
| KU missing vs union | 362 | **434** (+72 KU_OMITTED) |

Dil tablosu AFTER:

```
lang  keys  missing  extra
tr    2071      306    262
en    2077      300    268
nl    2179      198    370
de    2096      281    287
fr    2096      281    287
es    2128      249    319
it    2110      267    301
bg    2071      306    262
ku    1943      434    134
```

`missing_key` (dil vs UNION) hâlâ hata sayılır — P2-a ile aynı politika; P2-b beş kapı 0.

### Yeniden tarama

Admin kullanıcıya görünen göç seti = 0. Kalanlar “kapsam dışı” listesiyle eşleşir.

### toLocale taraması

Admin ekranları + Admin bileşenleri: **0**.
`src/utils/helpers.js`: `toLocaleDateString` / `toLocaleString` / `Intl.NumberFormat(getDateLocale())` — beklenen. `formatCurrency` hâlâ `tr-TR`.

### expo export

```
npx expo export --platform ios --output-dir C:\Users\might\AppData\Local\Temp\p2b-ios-export
```

Exit 0. `iOS Bundled 6636ms index.js (2087 modules)`. Çıktı: `_expo/static/js/ios/index-6041ee3ccea3261c31e7842f161236f6.hbc` (7.91 MB). Repo ağacına yazılmadı.

### `git diff --stat` (`a82c33c...HEAD`, rapor commit’inden önce)

```
 scripts/i18n-patches/p2b-admin-common.json      |  33 +++
 scripts/i18n-patches/p2b-admin-screens.json     | 362 ++++++++++++++++++++++++
 scripts/i18n-patches/p2b-device-inventory.json  | 342 ++++++++++++++++++++++
 src/components/admin/WaypointEditor.js          |  15 +-
 src/components/admin/fuel/CarbonSummaryCards.js |   3 +-
 src/components/admin/fuel/CostAnalysisChart.js  |  17 +-
 src/components/admin/fuel/FuelSummaryCards.js   |   7 +-
 src/components/admin/fuel/RecentFuelRecords.js  |  21 +-
 src/components/map/VehicleInfoSheet.js          |  20 +-
 src/locales/bg.json                             |  86 +++++-
 src/locales/de.json                             |  86 +++++-
 src/locales/en.json                             |  86 +++++-
 src/locales/es.json                             |  86 +++++-
 src/locales/fr.json                             |  86 +++++-
 src/locales/it.json                             |  86 +++++-
 src/locales/ku.json                             |   2 +-
 src/locales/nl.json                             |  86 +++++-
 src/locales/tr.json                             |  86 +++++-
 src/screens/admin/AdminAlerts.js                |   3 +-
 src/screens/admin/AdminDashboard.js             |  24 +-
 src/screens/admin/AdminDeviceInventory.js       | 145 ++++++----
 src/screens/admin/AdminDrivers.js               |   3 +-
 src/screens/admin/AdminReportsScreen.js         |  23 +-
 src/screens/admin/AdminSettings.js              |  10 +-
 src/screens/admin/AdminTasks.js                 |   9 +-
 src/screens/admin/AdminVehicles.js              |   5 +-
 src/screens/admin/CreateTaskScreen.js           |  17 +-
 src/screens/admin/CreateVehicleScreen.js        |  53 ++--
 src/screens/admin/EditDriverScreen.js           |  58 ++--
 src/screens/admin/EditTaskScreen.js             |  84 +++---
 src/screens/admin/EditVehicleScreen.js          |  79 ++++--
 src/screens/admin/FleetMapScreen.js             |  11 +-
 src/screens/admin/VehicleTrackScreen.js         |  25 +-
 src/screens/admin/fuel/AdminFuelDashboard.js    |   3 +-
 src/utils/helpers.js                            |  16 +-
 35 files changed, 1743 insertions(+), 335 deletions(-)
```

İzinli yollar: `src/screens/admin/**`, `src/components/**`, `src/utils/helpers.js`, `src/locales/*.json`, `scripts/i18n-patches/p2b-*`, `docs/`. `package.json`, Driver / DeviceSetup / bleService / Superadmin / navigation yok. `ku.json` yalnız `settings.version`.

## Kapsam dışı bulgular (P2-c / P2-d / BACKEND / follow-up)

| aday | kanıt | kova |
|---|---|---|
| `CreateTaskScreen.js` `getText`/`isEn` Alert+form (tarih hariç) | TR-ASCII + EN ikili; NL hâlâ TR fallback | P2 follow-up (bu paket yalnız `:650` tarih bug) |
| `AdminReportsScreen` HTML `" km"` birim | `buildOpsHtml`/:80, UI `:923` | birim; cümle değil |
| `data.limitations[]` | backend TR; ekran ve HTML olduğu gibi basıyor | **BACKEND** |
| `AdminSettings.js:592` destek mailto gövdesi | `Kullanıcı` / `Versiyon: 1.0.0` | e-posta şablonu; P2 follow-up |
| `AdminSettings` gizlilik EN gövdesi | yasal metin | P2 follow-up |
| `AdminSettings.js:1195` `placeholder="05XX XXX XX XX"` | telefon maskesi | tanımlayıcı |
| `AdminVehicles.js:435` `ESP32` | donanım etiketi | dokunma |
| `AdminGeofenceScreen.js:2126` `CSRD` | regülasyon kısaltması | dokunma |
| `CarbonVehicleChart.js:66` `EU: {n} g/km` | birim/kısaltma | P2 sayı/locale |
| `CostAnalysisChart` `₺` öneki | para simgesi | `formatCurrency` hâlâ tr-TR |
| `helpers.formatCurrency` / `formatDistance` / `formatSpeed` | tr-TR / `km` / `km/h` | helper follow-up |
| `src/components/driver/WaypointsPanel.js:89` | `toLocaleTimeString(isEn ? en-GB : tr-TR)` | **P2-c** (driver; dokunulmadı) |
| `src/screens/driver/FuelEntryScreen.js` `toLocaleString("tr-TR")` + tarih | P2-a sayı/tarih artığı | P2 follow-up |
| `src/screens/driver/DriverDashboard.js:522,1145` | `toLocaleString` / `toLocaleDateString` | P2-c / follow-up |
| `src/screens/driver/DriverVehicle.js` / `DriverTasks.js` | tarih/sayı yerel | P2-c |
| Superadmin `toLocaleDateString("tr-TR")` | Companies, DeviceDetail, PlatformUsers, SuperAdminCompanies; DeviceQR `toLocaleString()` | **P2-d** |
| `src/screens/driver/DeviceSetupScreen.js` concat Alert | P2-a raporu | **P2-c** |
| `src/services/bleService.js` WIFI TR kopyası | P2-a raporu | **P2-c** |
| `constants/config.js` (kök) `ALERT_TYPES` | P2-a raporu | P2-d temizlik |
| AdminGeofence `Alert.alert("", t(...))` | zaten t() | dokunulmadı |
| t() `\|\| "TR fallback"` (Settings vb.) | ölü yol; key var | dokunulmadı |
| HTML rapor `TulipFleet` marka / tulipfleet.com | marka | dokunulmadı |

## Fiziksel test (Admin × TR/EN/NL)

Sonuç sütunu boş — cihaz doğrulaması bu oturumda yok.

| ekran | TR | EN | NL |
|---|---|---|---|
| DeviceInventory (liste, Online/Offline count, QR/stok Alert, serial placeholder) | | | |
| Vehicles / CreateVehicle (validasyon Alert, form etiket, yakıt tipi) | | | |
| Tasks / CreateTask tarih satırları (NL `nl-NL`, EN `en-GB`) | | | |
| Reports tarih + sayı (localeMap helper; limitations backend TR) | | | |
| Fuel dashboard (özet kart, RecentFuelRecords tarih, CostAnalysis yakıt tipi) | | | |
| Settings sürüm (`TulipFleet v{{version}}`, yıl sistem) | | | |

KU: yeni key yok → tr fallback; `settings.version` KU’da `TulipFleet v{{version}}`.

## `git status --short`

Rapor commit’inden sonra boş beklenir (yalnız `docs/I18N_P2B_REPORT.md` bu commit’te).
