# TulipFleet Mobile — P2-d rapor (Superadmin hardcoded göç + P2 kapanışı)

Branch: `i18n-mobile-p2d-superadmin` (main `17e6e54` üstünden).
Kapsam: `src/screens/superadmin/**` (11 ekran), `src/navigation/SuperAdminNavigator.js` (başlık/etiket), `src/navigation/MainNavigator.js` (Çıkış Yap + drawer/stack title), `src/navigation/DrawerContent.js` (sürüm literal), canlı yüzey `src/navigation/AppNavigator.js` placeholder/sürüm, `src/navigation/AuthNavigator.js` stack title.
Yeni bağımlılık yok. `package.json` dokunulmadı. OTA/EAS yok. Sözlük yazımı yalnız `scripts/i18n-add-keys.mjs` + `scripts/i18n-patches/p2d-*.json`. Push yok.
Driver / Admin / DeviceSetup **dokunulmadı**.

Canlı SuperAdmin `RootNavigator` → `AppNavigator` (drawer title’lar zaten `t()`). `SuperAdminNavigator.js` / `MainNavigator.js` yine göç edildi (ölü/legacy ama kapsamda).

## Commit'ler

| # | hash | konu |
|---|---|---|
| 1 | `7e62266` | patch dosyaları + 8 sözlük (KU yok) |
| 2 | `227a1fa` | 11 superadmin ekranı `t()` / helpers + leftover key’ler |
| 3 | `ccd602c` | navigation başlık / logout / placeholder / sürüm |
| 4 | (bu commit) | `docs/I18N_P2D_REPORT.md` |

```
7e62266 fix(i18n): add P2-d Superadmin and navigation keys
227a1fa fix(i18n): migrate Superadmin screens to t()
ccd602c fix(i18n): migrate navigation titles and logout copy to t()
```

## Adım 0 — envanter (önce / sonra)

Tarama: `Alert.alert` t’siz, `<Text>` literal, placeholder, title, concat, `toLocaleDateString/toLocaleString("tr-TR")`.

P0 §B5: Superadmin 143 literal + 64 Alert. Bu pakette ek nav + form/label seti.

### Önce (göç edilecek — kullanıcıya görünen, özet)

| dosya | örnek | dil | önerilen key |
|---|---|---|---|
| CompaniesScreen.js | Askıya Al / Trial Uzat / Sil / Aylık Gelir / `toLocaleDateString("tr-TR")` / `toLocaleString()` gelir | TR | `superadmin.companies.*` + `helpers.formatDate/formatNumber` |
| SuperAdminCompaniesScreen.js | Yeni Şirket Oluştur / Sil / `toLocaleDateString("tr-TR")` | TR | `superadmin.companies.*` / `superadmin.create.*` + `formatDate` |
| CreateCompanyScreen.js | wizard Adım 1–3, validasyon Alert | TR | `superadmin.create.*` |
| CompanyEditScreen.js | Şirket adı zorunlu / güncellendi | TR | `superadmin.edit.*` |
| DevicesScreen.js | Device Code zorunlu / Yeni Cihaz / `getTimeDifference` TR | TR | `superadmin.devices.*` + `getTimeAgo` |
| DeviceDetailScreen.js | Ata / Unassign / komut / `toLocale*` | TR | `superadmin.device.*` + `formatDate/formatDateTime` |
| DeviceQRManagement.js | Failed to fetch / Generate / Used at | EN ada | `superadmin.qr.*` + `formatDateTime` |
| PlatformUsersScreen.js | session long / `toLocaleDateString("tr-TR")` | TR | `superadmin.users.*` + `sessionExpiredLong` |
| SuperAdminDashboard.js | Hoş Geldiniz / Hızlı İşlemler | TR | `superadmin.dashboard.*` |
| SystemHealthScreen.js | API sunucusu çalışıyor / `toLocaleTimeString("tr-TR")` | TR | `superadmin.health.*` + `formatTime` |
| PlatformSettingsScreen.js | Platform Ayarları | TR | `superadmin.settings.*` |
| SuperAdminNavigator.js | 🏢 Şirketler / 📦 Cihazlar | TR | `navigation.*` / `superadmin.nav.*` |
| MainNavigator.js:170 | Çıkış Yap + drawerLabel + stack title | TR | `auth.logout` / `navigation.*` / `createTask.navTitle` |
| DrawerContent.js | `TulipFleet v2.1.0` | — | `settings.version` `{{version}}` |
| AppNavigator.js | placeholder mojibake + `TulipFleet v2.0.0` | TR/bozuk | `navigator.placeholder.*` |
| AuthNavigator.js | Giriş / Şifremi Unuttum / Bize Ulaşın | TR | `auth.loginTitle` (reuse) |

### Kapsam dışı (kullanıcıya görünmeyen / skip)

| aday | gerekçe |
|---|---|
| MAC / slug / e-posta / `+90` / `YYYY-MM-DD` / `0.00` / `INV-2026-001` / `FLEET-009` placeholder | format/örnek |
| Basic / Pro / Enterprise / Starter / Professional / Custom / ESP32 SKU | ürün/donanım adı |
| `TulipFleet` marka (logo, DriverHome header) | marka |
| `reason: "payment_overdue"`, `notes: "Manuel askıya alma"` | API gövde |
| `data.error` / `data.details` / `data.message` / `errorData.error` / `log.message` / `error.response?.data?.message` | **BACKEND** |
| `console.*`, route name, icon name, status enum (`active`/`online`) | görünmez |
| Driver `toLocale*` (FuelEntry, Dashboard, Vehicle, Tasks) | P2-a follow-up; Driver dokunulmaz |

### Sonra (kapsam içi göç seti)

Superadmin + listelenen nav dosyaları kullanıcıya görünen göç seti = **0**.
Kalan: BACKEND fallback, skip placeholder, marka, API `notes`.

`toLocale*` Superadmin = **0**.

## Adım 1 — key tasarımı

### Reuse (yeni key açılmadı)

| key | gerekçe |
|---|---|
| `common.error/success/cancel/delete/save/close/ok/loading/info/all/unknown/user` | Alert + buton |
| `auth.logout` / `auth.logoutConfirm` / `auth.email` / `auth.loginTitle` / `auth.forgotPasswordTitle` | çıkış + e-posta + auth title |
| `roles.superAdmin` / `roles.companyAdmin` / `roles.driver` | rol rozeti |
| `navigation.*` / `navigator.superAdmin.*` / `navigator.placeholder.*` / `navigator.driver.profile` | drawer/stack |
| `settings.version` `{{version}}` | footer |
| `taskDetail.title` / `taskOffers.title` / `editTask.title` | MainNavigator stack |
| `createDriver.passwordPlaceholder` / `device.unassigned` / `device.online` | form / cihaz |

### Yeni namespace

- `superadmin.connectionError` / `sessionExpired` / `sessionExpiredLong`
- `superadmin.companies.*` (liste, modal, ödeme, audit action)
- `superadmin.create.*` (wizard)
- `superadmin.edit.*`
- `superadmin.devices.*` / `superadmin.device.*` / `superadmin.qr.*`
- `superadmin.users.*` / `dashboard.*` / `health.*` / `settings.*` / `nav.*`
- Nav ek: `offerDetail.navTitle`, `createVehicle.navTitle`, `editVehicle.title`, `vehicleTrack.followTitle/historyTitle`, `createDriver.title`, `editDriver.title`, `createTask.navTitle`, `navigation.allVehicles/allDrivers/allTasks/systemAlerts/map`, `auth.contactTitle`

Tarih/sayı: `helpers.formatDate/formatDateTime/formatTime/formatNumber/getTimeAgo`. Ekranda `toLocale*` kopyası yok.
Nav: `useTranslation` navigator bileşeninde; `options={{ title: t(...) }}` / `getScreenOptions(t(...), color)()`. AppNavigator SuperAdmin zaten `screenOptions` fonksiyonu + `t()`.

## Adım 2 — patch sayaçları + idempotency

| patch | 1. koşu | 2. koşu |
|---|---|---|
| `p2d-superadmin.json` (351 key) | added=2808 skipped_lang=351 files=8 | identical=2808 **0 değişiklik** |
| leftover round-trip (→378 key) | added=88+56+72 | identical=3024 **0 değişiklik** |
| `p2d-nav.json` (16 key) | added=112 skipped_exists=13 identical=3 skipped_lang=16 files=8 | 0 değişiklik |

378×8 = 3024 superadmin yazımı. KU yok (`skipped_lang` = key×1).

UNION +392 (378 superadmin + 14 yeni nav; 2 nav key TR’de zaten vardı).

TR/EN/NL: Cursor. DE/FR/ES/IT/BG: EN kopya + **SUSPECT**.

### SUSPECT

DE/FR/ES/IT/BG tüm 378 `superadmin.*` + 14 yeni nav key.

### KU_OMITTED (378 + 14 nav)

`ku.json` bu pakette değişmedi. P2-d yeni key’lerin tamamı KU_OMITTED (tr fallback). Silinmedi.

## Adım 3 — kod

- 11 superadmin ekranı: `useTranslation`. Alert/Text/placeholder → `t()`. Concat → `{{name}}/{{email}}/{{count}}/{{status}}/{{detail}}`.
- SystemHealth: state’te `messageKey` (+ `messageParams`); çeviri render’da.
- Device list/detail: yerel `getTimeDifference` → `getTimeAgo` / `neverSeen` / `common.unknown`.
- JSX/`makeStyles` aritmetik yok.
- Navigation: logout `auth.logout`; sürüm `settings.version`; placeholder `navigator.placeholder.*`.

## Adım 4 — doğrulama

### verify BEFORE / AFTER

BEFORE = main `17e6e54` / P2-c AFTER. AFTER = P2-d commit 3 (`ccd602c`).

Beş kapı: code-not-in-union, code-missing-in-tr, manifest-missing, interp, encoding.

| | BEFORE (`17e6e54`) | AFTER (commit 3) |
|---|---|---|
| UNION | 2387 | **2779** (+392) |
| intersection | 1809 | **1809** (KU yeni key yok) |
| code keys not in union | **0** | **0** |
| code keys missing in tr | **0** | **0** |
| manifest subkey missing | **0** | **0** |
| interp mismatches | **0** | **0** |
| encoding mojibake | **0** | **0** |
| errors / warnings | 2632 / 2570 | 3024 / 5706 |
| KU missing vs union | 444 | **836** (+392 KU_OMITTED) |

Dil tablosu AFTER:

```
lang  keys  missing  extra
tr    2473      306    664
en    2479      300    670
nl    2581      198    772
de    2498      281    689
fr    2498      281    689
es    2530      249    721
it    2512      267    703
bg    2473      306    664
ku    1943      836    134
```

`missing_key` (dil vs UNION) hâlâ hata sayılır — P2-a ile aynı politika; P2-d **beş kapı 0**.

### Yeniden tarama (`src/screens/**` + `src/navigation/**`)

Kapsam içi Superadmin + nav göç seti = **0**.
P2 toplam: Superadmin/nav kullanıcıya görünen TR/EN literal kapanır. Driver `toLocale*` ve FuelEntry concat **P2 follow-up** (Driver dokunulmaz). AdminGeofence `t(key, "Lütfen bir araç seçin")` defaultValue artığı P2-b follow-up.

### toLocale taraması

`toLocale(Date)?String(|new Intl.` Superadmin + nav = **0**.
`src/utils/helpers.js`: `toLocaleDateString` / `toLocaleString` / `toLocaleTimeString` / `Intl.NumberFormat` — beklenen.
Driver (dokunulmadı): FuelEntry, DriverDashboard, DriverVehicle, DriverTasks — P2-a raporu follow-up.

### expo export

```
npx expo export --platform ios --output-dir C:\Users\might\AppData\Local\Temp\p2d-ios-export
```

Exit 0. `iOS Bundled 14619ms index.js (2087 modules)`. Çıktı: `_expo/static/js/ios/index-81c296a22c79b1994f0871e47f851af5.hbc` (7.95 MB). Repo ağacına yazılmadı.

### `git diff --stat` (`17e6e54...HEAD`, rapor commit’inden önce)

```
 scripts/i18n-patches/p2d-nav.json                  |  162 +
 scripts/i18n-patches/p2d-superadmin.json           | 3782 ++++++++++++++++++++
 src/locales/{bg,de,en,es,fr,it,nl,tr}.json         |  434 ++- (×8)
 src/navigation/AppNavigator.js                     |   14 +-
 src/navigation/AuthNavigator.js                    |    9 +-
 src/navigation/DrawerContent.js                    |    4 +-
 src/navigation/MainNavigator.js                    |  161 +-
 src/navigation/SuperAdminNavigator.js              |   24 +-
 src/screens/superadmin/*.js                        | 11 dosya
 26 files changed, 8521 insertions(+), 735 deletions(-)
```

İzinli yollar: `src/screens/superadmin/**`, `src/navigation/**` (listelenen), `src/locales/*.json` (ku yok), `scripts/i18n-patches/p2d-*`, `docs/`. `package.json` yok.

## Adım 5 — `--strict` / P2-e temizlik adayı (SİLME YOK)

`node scripts/verify-i18n.mjs --strict`: extra_key uyarıdan hataya döner. Karar Cem’in; bu pakette silinmedi.

UNION’da olup **tr’de olmayan** 306 key. Bunlardan **270** tanesi nl ve/veya ku ve/veya es kopyası (nl=108, ku=134, es=57; kesişimli). 36 key yalnız en/de/fr/it/bg’de.

P2-e adayı (tr’de yok; nl/ku/es’te var) — silme yok:

| key | nl | ku | es |
|---|---|---|---|
| adminAlerts.adminAlerts.mapButton |  | ku |  |
| assignment.assign | nl |  |  |
| assignment.assignment | nl |  |  |
| assignment.driver | nl |  |  |
| assignment.reassign | nl |  |  |
| assignment.select_driver | nl |  |  |
| assignment.select_vehicle | nl |  |  |
| assignment.unassigned | nl |  |  |
| assignment.vehicle | nl |  |  |
| auth.alerts |  |  | es |
| auth.all |  |  | es |
| auth.back |  |  | es |
| auth.companies |  |  | es |
| auth.continue |  |  | es |
| auth.deviceSetup |  |  | es |
| auth.devices |  |  | es |
| auth.drivers |  |  | es |
| auth.fleetMap |  |  | es |
| auth.fuelEntry |  |  | es |
| auth.myTasks |  |  | es |
| auth.myVehicle |  |  | es |
| auth.next |  |  | es |
| auth.none |  |  | es |
| auth.profile |  |  | es |
| auth.qrManagement |  |  | es |
| auth.refresh |  |  | es |
| auth.reports |  |  | es |
| auth.retry |  |  | es |
| auth.search |  |  | es |
| auth.settings |  |  | es |
| auth.taskHistory |  |  | es |
| auth.tasks |  |  | es |
| auth.warning |  |  | es |
| changePassword.error | nl |  | es |
| changePassword.save | nl |  | es |
| changePassword.success | nl |  | es |
| changePassword.title | nl |  | es |
| deviceSetup.activate |  | ku |  |
| deviceSetup.activateSubtitle |  | ku |  |
| deviceSetup.activateTitle |  | ku |  |
| deviceSetup.activated |  | ku |  |
| deviceSetup.activating |  | ku |  |
| deviceSetup.activationFailed |  | ku |  |
| deviceSetup.activeWarning.desc |  | ku |  |
| deviceSetup.availableDevices |  | ku |  |
| deviceSetup.back |  | ku |  |
| deviceSetup.bleNotEnabled |  | ku |  |
| deviceSetup.bleNotSupported |  | ku |  |
| deviceSetup.buttons.back | nl |  |  |
| deviceSetup.buttons.done | nl |  |  |
| deviceSetup.buttons.next | nl |  |  |
| deviceSetup.buttons.retry | nl |  |  |
| deviceSetup.cameraPermissionDenied |  | ku |  |
| deviceSetup.cameraPermissionRequired |  | ku |  |
| deviceSetup.cancel |  | ku |  |
| deviceSetup.close |  | ku |  |
| deviceSetup.complete |  | ku |  |
| deviceSetup.complete.done | nl |  |  |
| deviceSetup.complete.message | nl |  |  |
| deviceSetup.complete.title | nl |  |  |
| deviceSetup.configure |  | ku |  |
| deviceSetup.configureSubtitle |  | ku |  |
| deviceSetup.connect |  | ku |  |
| deviceSetup.connectSubtitle |  | ku |  |
| deviceSetup.connectTitle |  | ku |  |
| deviceSetup.connected |  | ku | es |
| deviceSetup.connectionFailed |  | ku |  |
| deviceSetup.deviceAlreadyAssigned |  | ku |  |
| deviceSetup.deviceNotFound |  | ku |  |
| deviceSetup.deviceReady |  | ku |  |
| deviceSetup.enableCameraPermission |  | ku |  |
| deviceSetup.enableLocation |  | ku |  |
| deviceSetup.enterSerial |  |  | es |
| deviceSetup.error |  | ku |  |
| deviceSetup.failed |  |  | es |
| deviceSetup.hint |  | ku |  |
| deviceSetup.invalidQR |  | ku |  |
| deviceSetup.list |  | ku |  |
| deviceSetup.locationRequired |  | ku |  |
| deviceSetup.next |  | ku |  |
| deviceSetup.noDevicesAvailable |  | ku |  |
| deviceSetup.noDevicesFound |  | ku |  |
| deviceSetup.noResultsYet |  | ku |  |
| deviceSetup.openSettings |  | ku |  |
| deviceSetup.password |  | ku |  |
| deviceSetup.qrInstructions |  | ku |  |
| deviceSetup.requestingCamera |  | ku |  |
| deviceSetup.retry |  | ku | es |
| deviceSetup.scan |  | ku |  |
| deviceSetup.scan.found | nl |  |  |
| deviceSetup.scan.notFound | nl |  |  |
| deviceSetup.scan.notFoundMessage | nl |  |  |
| deviceSetup.scan.rescan | nl |  |  |
| deviceSetup.scan.scanning | nl |  |  |
| deviceSetup.scanQR |  |  | es |
| deviceSetup.scanSubtitle |  | ku |  |
| deviceSetup.scanTitle |  | ku |  |
| deviceSetup.search |  | ku |  |
| deviceSetup.searchBySerial |  | ku |  |
| deviceSetup.searching |  | ku |  |
| deviceSetup.selectNetwork |  | ku |  |
| deviceSetup.serialPlaceholder |  | ku |  |
| deviceSetup.steps.activateDevice |  | ku |  |
| deviceSetup.steps.activateDeviceDesc |  | ku |  |
| deviceSetup.steps.configureWiFi |  | ku |  |
| deviceSetup.steps.configureWiFiDesc |  | ku |  |
| deviceSetup.steps.connectDevice |  | ku |  |
| deviceSetup.steps.connectDeviceDesc |  | ku |  |
| deviceSetup.steps.scanQR |  | ku |  |
| deviceSetup.steps.scanQRDesc |  | ku |  |
| deviceSetup.steps.selectVehicle |  | ku |  |
| deviceSetup.steps.selectVehicleDesc |  | ku |  |
| deviceSetup.success |  | ku |  |
| deviceSetup.tapToConnect |  | ku |  |
| deviceSetup.turnOnBluetooth |  | ku |  |
| deviceSetup.wifi.failed | nl |  |  |
| deviceSetup.wifi.failedMessage | nl |  |  |
| deviceSetup.wifi.success | nl |  |  |
| deviceSetup.wifiConnected |  | ku |  |
| deviceSetup.wifiConnecting |  | ku |  |
| deviceSetup.wifiFailed |  | ku |  |
| deviceSetup.wifiTitle |  | ku |  |
| driverTasks.accept |  | ku |  |
| driverTasks.acceptConfirmMessage |  | ku |  |
| driverTasks.acceptConfirmTitle |  | ku |  |
| driverTasks.activeTab |  | ku |  |
| driverTasks.cancel |  | ku |  |
| driverTasks.complete |  | ku |  |
| driverTasks.completeConfirmMessage |  | ku |  |
| driverTasks.completeConfirmTitle |  | ku |  |
| driverTasks.completedTab |  | ku |  |
| driverTasks.confirm |  | ku |  |
| driverTasks.emptyActive |  | ku |  |
| driverTasks.emptyActiveDesc |  | ku |  |
| driverTasks.emptyCompleted |  | ku |  |
| driverTasks.emptyCompletedDesc |  | ku |  |
| driverTasks.emptyPending |  | ku |  |
| driverTasks.emptyPendingDesc |  | ku |  |
| driverTasks.errorLoading |  | ku |  |
| driverTasks.loading |  | ku |  |
| driverTasks.navigate |  | ku |  |
| driverTasks.pendingTab |  | ku |  |
| driverTasks.reject |  | ku |  |
| driverTasks.rejectConfirmMessage |  | ku |  |
| driverTasks.rejectConfirmTitle |  | ku |  |
| driverTasks.retry |  | ku |  |
| driverTasks.start |  | ku |  |
| driverTasks.startConfirmMessage |  | ku |  |
| driverTasks.startConfirmTitle |  | ku |  |
| driverTasks.statusMessages.accepted |  | ku |  |
| driverTasks.statusMessages.cancelled |  | ku |  |
| driverTasks.statusMessages.completed |  | ku |  |
| driverTasks.statusMessages.in_progress |  | ku |  |
| driverTasks.statusMessages.pending_review |  | ku |  |
| driverTasks.statusMessages.rejected |  | ku |  |
| driverTasks.success |  | ku |  |
| driverTasks.taskAcceptFailed |  | ku |  |
| driverTasks.taskAccepted |  | ku |  |
| driverTasks.taskCompleteFailed |  | ku |  |
| driverTasks.taskCompleted |  | ku |  |
| driverTasks.taskRejectFailed |  | ku |  |
| driverTasks.taskRejected |  | ku |  |
| driverTasks.taskStartFailed |  | ku |  |
| driverTasks.taskStarted |  | ku |  |
| driverTasks.title |  | ku |  |
| editProfile.error | nl |  | es |
| editProfile.save | nl |  | es |
| editProfile.success | nl |  | es |
| editProfile.title | nl |  | es |
| map.arrived | nl |  |  |
| map.completeConfirm | nl |  |  |
| map.completeTask | nl |  |  |
| map.couldNotComplete | nl |  |  |
| map.distance | nl |  |  |
| map.eta | nl |  |  |
| map.follow | nl |  |  |
| map.loadingRoute | nl |  |  |
| map.myLocation | nl |  |  |
| map.recenter | nl |  |  |
| map.routeNotFound | nl |  |  |
| map.satellite | nl |  |  |
| map.taskCompleted | nl |  |  |
| map.title | nl |  |  |
| map.traffic | nl |  |  |
| profile.error.distSource.gps | nl |  | es |
| profile.error.distSource.manual | nl |  | es |
| profile.error.distSource.route | nl |  | es |
| profile.error.distSource.tasks | nl |  | es |
| profile.error.distSource.title | nl |  | es |
| profile.error.distSource.unknown | nl |  | es |
| profile.error.loadFailed | nl |  | es |
| profile.error.noVehicle | nl |  | es |
| profile.error.saveFailed | nl |  | es |
| profile.error.title | nl |  | es |
| profile.error.vehicleUpdateFailed | nl |  | es |
| profile.fuelTypes.diesel | nl |  | es |
| profile.fuelTypes.electric | nl |  | es |
| profile.fuelTypes.gasoline | nl |  | es |
| profile.fuelTypes.lpg | nl |  | es |
| profile.message | nl |  |  |
| profile.notFullTankWarning.cancel | nl |  | es |
| profile.notFullTankWarning.message | nl |  | es |
| profile.notFullTankWarning.saveAnyway | nl |  | es |
| profile.notFullTankWarning.title | nl |  | es |
| route.destination | nl |  |  |
| route.distance | nl |  |  |
| route.end_location | nl |  |  |
| route.enter_destination | nl |  |  |
| route.enter_destination_address | nl |  |  |
| route.enter_start_address | nl |  |  |
| route.enter_start_location | nl |  |  |
| route.estimated_time | nl |  |  |
| route.route | nl |  |  |
| route.start_location | nl |  |  |
| route.via | nl |  |  |
| schedule.actual_end | nl |  |  |
| schedule.actual_start | nl |  |  |
| schedule.date | nl |  |  |
| schedule.duration | nl |  |  |
| schedule.end | nl |  |  |
| schedule.end_after_start | nl |  |  |
| schedule.end_time_before_start | nl |  |  |
| schedule.hours | nl |  |  |
| schedule.hours_short | nl |  |  |
| schedule.minutes | nl |  |  |
| schedule.minutes_short | nl |  |  |
| schedule.schedule | nl |  |  |
| schedule.scheduled_end | nl |  |  |
| schedule.scheduled_start | nl |  |  |
| schedule.select_end_date | nl |  |  |
| schedule.select_end_time | nl |  |  |
| schedule.select_start_date | nl |  |  |
| schedule.select_start_time | nl |  |  |
| schedule.start | nl |  |  |
| schedule.time | nl |  |  |
| settings.clearCacheConfirm |  | ku |  |
| settings.languageChanged |  | ku |  |
| tasks.taskRejectedMessage |  |  | es |
| time.h | nl |  |  |
| time.hours | nl |  |  |
| time.min | nl |  |  |
| time.minutes | nl |  |  |
| time.seconds | nl |  |  |
| validation.invalid_date | nl |  |  |
| validation.invalid_location | nl |  |  |
| validation.invalid_time | nl |  |  |
| validation.max_length | nl |  |  |
| validation.min_length | nl |  |  |
| validation.required_field | nl |  |  |
| vehicle.addVehicle |  | ku |  |
| vehicle.colorOptions.beige |  | ku |  |
| vehicle.colorOptions.black |  | ku |  |
| vehicle.colorOptions.blue |  | ku |  |
| vehicle.colorOptions.brown |  | ku |  |
| vehicle.colorOptions.gray |  | ku |  |
| vehicle.colorOptions.green |  | ku |  |
| vehicle.colorOptions.navy |  | ku |  |
| vehicle.colorOptions.orange |  | ku |  |
| vehicle.colorOptions.red |  | ku |  |
| vehicle.colorOptions.silver |  | ku |  |
| vehicle.colorOptions.white |  | ku |  |
| vehicle.colorOptions.yellow |  | ku |  |
| vehicle.driver |  | ku |  |
| vehicle.editVehicle |  | ku |  |
| vehicle.editVehicleSettings |  | ku |  |
| vehicle.fuel |  | ku |  |
| vehicle.noVehicle |  | ku |  |
| vehicle.odometer |  | ku |  |
| vehicle.updateError |  | ku |  |
| vehicle.updateSuccess |  | ku |  |

Örnek kopya aileleri: `deviceSetup.*` (ku’da ölü/eski ağaç, tr’de P2-c namespace farklı), `driverTasks.*` (ku), `assignment.*`/`map.*`/`route.*`/`schedule.*` (nl), `auth.*` drawer kopyası (es). Silinirse tr fallback kaybolmaz; nl/ku/es extra azalır.

## P2 toplam özeti

| paket | UNION Δ | göç literal (yaklaşık) | not |
|---|---|---|---|
| P2-a Driver | +59 | VehiclePicker / WiFiPassword / Profile / Settings / FuelEntry UI / Task* tarih | helpers `getTimeAgo/formatDate*` |
| P2-b Admin | +72 | Admin ekran + inventory + fuel kart | `data.limitations[]` BACKEND |
| P2-c DeviceSetup/BLE | +10 | DeviceSetup concat + WaypointsPanel + WIFI kod | bleService kod döner |
| P2-d Superadmin/nav | +392 | 143+64 P0 Superadmin + nav title/logout/placeholder | 378 `superadmin.*` + 14 nav |
| **P2 toplam** | **+533** (2246→2779) | Superadmin/nav kapanır | KU_OMITTED birikimli 836 |

### Kalan BACKEND

| yer | kanıt | kova |
|---|---|---|
| Superadmin `data.error` / `data.details` / `data.message` / `errorData.error` | Alert fallback | **BACKEND** |
| Superadmin `error.response?.data?.message` | SuperAdminCompanies create | **BACKEND** |
| DeviceDetail `log.message` | olay geçmişi | **BACKEND** |
| `notes: "Manuel askıya alma"` | suspend POST body | API, görünmez |
| DeviceSetup `activationResult.message` / `validateSerial` | P2-c | **BACKEND** |
| Admin `data.limitations[]` | P2-b | **BACKEND** |

### P2 follow-up (bu pakette yasak)

| yer | kanıt |
|---|---|
| FuelEntry / DriverDashboard / DriverVehicle / DriverTasks `toLocale*` | P2-a/c raporu |
| AdminGeofence `t(..., "Lütfen bir araç seçin")` defaultValue | P2-b artığı |
| `formatCurrency` helpers hâlâ `tr-TR` | P2-a |
| P2-e extra key silme | Cem kararı |

## Fiziksel test (`superadmin@tulipfleet.com` × TR/EN/NL)

Sonuç sütunu boş — cihaz doğrulaması bu oturumda yok.

| ekran | TR | EN | NL |
|---|---|---|---|
| Companies (liste, acil, askıya al, trial, ödeme modal, detay tab) | | | |
| Devices / DeviceDetail (filtre, kayıt modal, ata, komut, tarih) | | | |
| PlatformUsers (filtre, arama, kayıt tarihi) | | | |
| System Health (servis kart, uptime, 30s yenileme) | | | |
| Drawer / nav başlıkları (AppNavigator SuperAdmin) | | | |
| Çıkış (drawer Alert) | | | |

KU: key yok → tr fallback; ayrı satır yok.
