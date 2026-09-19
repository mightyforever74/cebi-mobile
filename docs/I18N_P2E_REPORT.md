# TulipFleet Mobile — P2-e rapor (ölü key temizliği + `--strict` kapısı)

Branch: `i18n-mobile-p2e-prune` (main `85b4bfd` üstünden).
Kapsam: `scripts/`, `src/locales/*.json`, `src/screens/driver/FuelEntryScreen.js`, `docs/`.
Yeni bağımlılık yok. `package.json` dokunulmadı. OTA/EAS yok. Push yok.
DriverDashboard / DriverTasks / DriverVehicle **dokunulmadı** (P2-e kod kapsamı dışı).

Karar (Cem, 19 Eyl): tr’de olmayan, kodda statik `t()` olmayan, manifest allowlist’te olmayan extra key’ler silindi.

## Commit'ler

| # | hash | konu |
|---|---|---|
| 1 | `6f2d44d` | `scripts/i18n-prune-keys.mjs` |
| 1b | `3895fcc` | JSDoc `*/` parse düzeltmesi |
| 1c | `e41ce15` | manifest allowlist sibling; dokunulmayan dil dosyası yazılmaz |
| 2 | `cc56543` | 7 sözlük `--apply` (306 key) |
| 2b | `23a704a` | `verify-i18n.mjs`: extra vs tr; KU_OMITTED uyarı; `--strict` opt-in |
| 3 | `54a2388` | FuelEntry `toLocale*` → `helpers.formatNumber` / `formatDate` |
| 4 | (bu commit) | `docs/I18N_P2E_REPORT.md` |

```
6f2d44d feat(i18n): add idempotent unused-key prune script
3895fcc fix(i18n): close prune-keys JSDoc without glob star-slash
e41ce15 fix(i18n): prune extra siblings under dynamic roots, skip untouched locales
cc56543 fix(i18n): prune unused extra keys from 7 locale files
23a704a fix(i18n): score extra vs tr and treat KU_OMITTED as warnings
54a2388 fix(i18n): format FuelEntry numbers and dates via helpers
```

## Adım 1 — `scripts/i18n-prune-keys.mjs`

Girdi: 9 sözlük + verify ile aynı flatten / `t("key")` taraması + `scripts/i18n-dynamic-roots.json`.

Silme (üçü birden): (a) `tr.json`’da yok; (b) statik `t("key")` / `i18n.t("key")` yok; (c) manifest **allowlist alt-key** değil.
(c) kök prefix’i yetmez: `reports.tabs.alerts` gibi eski kardeşler allowlist’te (`operations/fuel/driving/fleet/sustainability`) olmadığı için silindi. Prefix-only koruma 5 İtalyan artığını yanlışlıkla tutuyordu; 1c bunu düzeltti.

Korunan: tr’de var / kodda var / manifest allowlist. Aday kümesi yalnız tr-missing extra’lar (306); tr’nin tamamı listeye yazılmaz.

`--dry-run` varsayılan. `--apply` yazar. JSON: 2 boşluk, key sırası, BOM yok. Boş ebeveyn objeler kalkar. 0 silinen dil dosyası yeniden yazılmaz (`tr`/`bg`).

İkinci `--apply`: **0 değişiklik**.

## Adım 2 — dry-run + apply

### Dry-run (apply öncesi, 1c sonrası)

```
TulipFleet i18n prune-keys
mode=dry-run
union=2785  tr=2479  candidates(tr-missing)=306  delete=306  protected=0  files=7

lang  before  delete  after
----  ------  ------  -----
tr      2479       0   2479
en      2485       6   2479
nl      2587     108   2479
de      2504      25   2479
fr      2504      25   2479
es      2536      57   2479
it      2518      39   2479
bg      2479       0   2479
ku      1943     134   1809
```

Silinen 306’nın tamamı: aşağıda **Appendix A** (dil sütunları). `tr`/`bg` bu 306’dan hiçbirini taşımıyordu.

### Korunan listesi

**(none)** — 306 adayın hepsi silindi. Kodda statik `t()` yok (P2-d `code keys missing in tr = 0`). Allowlist alt-key yok.

### `--apply`

7 dosya yazıldı: `en nl de fr es it ku`. `tr.json` / `bg.json` değişmedi.
İkinci `--apply`: `union=2479 tr=2479 candidates=0 delete=0 files=0` → **0 değişiklik**.

### `verify-i18n.mjs --strict` (opt-in, varsayılan değil)

P2-d UNION extra = intersection dışı (KU_OMITTED 670 × 8 dil) `--strict`’i sonsuza kadar kırıyordu. P2-e:

- referans = **tr.json**
- extra = dilde olup tr’de olmayan (ölü kopya)
- missing = tr’de olup dilde olmayan
- `ku` missing → `omitted_key` / **KU_OMITTED uyarı** (hata değil)
- `--strict` extra_key’i hataya çevirir; **varsayılan davranış değil**
- `package.json` script eklenmedi (P4 alias)

Beş kapı 0. Union = tr = 2479. Extra her dilde 0.

```
TulipFleet i18n verify
reference=tr (2479 keys)  union=2479  intersection=1809  strict=true

lang  keys  missing  extra
----  ----  -------  -----
tr    2479        0      0
en    2479        0      0
nl    2479        0      0
de    2479        0      0
fr    2479        0      0
es    2479        0      0
it    2479        0      0
bg    2479        0      0
ku    1809      670      0

interp mismatches: 0
code static keys not in union: 0
code static keys missing in tr (fallbackLng): 0
manifest subkey missing: 0
encoding mojibake: 0

PASS  errors=0  warnings=670
```

Exit **0**. 670 uyarı = KU_OMITTED (tr’de olup ku’da yok; fallbackLng tr). Silinmedi.

`--strict` olmadan da `PASS  errors=0  warnings=670` (exit 0).

### FuelEntry

`toLocaleString("tr-TR")` → `formatNumber`; `toLocaleDateString` → `formatDate`. JSX/`makeStyles` değişmedi.

```
Select-String -Path src\**\*.js -Pattern 'toLocale(Date)?String\(|new Intl\.'
```

Yalnız `src/utils/helpers.js` (satır 24, 34, 82, 87).

`rg` hâlâ `DriverDashboard.js` / `DriverTasks.js` / `DriverVehicle.js` `toLocale*` görür — P2-e kod kapsamı dışı, dokunulmadı.

## Adım 3 — doğrulama

### Key sayısı BEFORE / AFTER

| lang | BEFORE | AFTER | Δ |
|---|---|---|---|
| tr | 2479 | 2479 | 0 |
| en | 2485 | 2479 | −6 |
| nl | 2587 | 2479 | −108 |
| de | 2504 | 2479 | −25 |
| fr | 2504 | 2479 | −25 |
| es | 2536 | 2479 | −57 |
| it | 2518 | 2479 | −39 |
| bg | 2479 | 2479 | 0 |
| ku | 1943 | 1809 | −134 |
| **UNION** | **2785** | **2479** (= tr) | **−306** |
| intersection | 1809 | 1809 | 0 |
| extra vs tr | (306 dağılmış) | **0** (9 dil) | |

### expo export

```
npx expo export --platform ios --output-dir C:\Users\might\AppData\Local\Temp\p2e-ios-export
```

Exit 0. `iOS Bundled 6940ms index.js (2087 modules)`. Çıktı: `_expo/static/js/ios/index-e72190d0e6786dae09bb9a90fb5e6613.hbc` (7.94 MB). Repo ağacına yazılmadı.

### `git diff --stat` (`85b4bfd...HEAD`, rapor commit’inden önce)

```
 scripts/i18n-prune-keys.mjs           | 242 ++++++++++++++++++++++++++++++++++
 scripts/verify-i18n.mjs               |  31 +++--
 src/locales/de.json                   |  27 ----
 src/locales/en.json                   |   8 --
 src/locales/es.json                   |  65 ---------
 src/locales/fr.json                   |  27 ----
 src/locales/it.json                   |  49 +------
 src/locales/ku.json                   | 142 --------------------
 src/locales/nl.json                   | 130 ------------------
 src/screens/driver/FuelEntryScreen.js |  43 +++---
 10 files changed, 285 insertions(+), 479 deletions(-)
```

İzinli yollar: `scripts/`, `src/locales/`, `FuelEntryScreen.js`, `docs/`. `package.json` yok. `tr.json` / `bg.json` yok.

## Fiziksel / OTA

Kullanılmayan key silindi; çeviri regression beklenmez. Bu oturumda staging OTA yok (paket yasağı). Driver dashboard / Admin vehicles / Superadmin companies cihaz açılışı yapılmadı.

Production OTA sonrası geri alma hedefi: **ec2e3a8a**.

## Appendix A — silinen 306 key (dil sütunları)

Aday = UNION − tr (P2-d Adım 5 listesi). İşaret = o dilde silindi.

| key | en | nl | de | fr | es | it | bg | ku |
|---|---|---|---|---|---|---|---|---|
| `adminAlerts.adminAlerts.mapButton` |  |  |  |  |  |  |  | ku |
| `assignment.assign` |  | nl |  |  |  |  |  |  |
| `assignment.assignment` |  | nl |  |  |  |  |  |  |
| `assignment.driver` |  | nl |  |  |  |  |  |  |
| `assignment.reassign` |  | nl |  |  |  |  |  |  |
| `assignment.select_driver` |  | nl |  |  |  |  |  |  |
| `assignment.select_vehicle` |  | nl |  |  |  |  |  |  |
| `assignment.unassigned` |  | nl |  |  |  |  |  |  |
| `assignment.vehicle` |  | nl |  |  |  |  |  |  |
| `auth.alerts` |  |  |  |  | es |  |  |  |
| `auth.all` |  |  |  |  | es |  |  |  |
| `auth.back` |  |  |  |  | es |  |  |  |
| `auth.companies` |  |  |  |  | es |  |  |  |
| `auth.continue` |  |  |  |  | es |  |  |  |
| `auth.deviceSetup` |  |  |  |  | es |  |  |  |
| `auth.devices` |  |  |  |  | es |  |  |  |
| `auth.drivers` |  |  |  |  | es |  |  |  |
| `auth.fleetMap` |  |  |  |  | es |  |  |  |
| `auth.fuelEntry` |  |  |  |  | es |  |  |  |
| `auth.myTasks` |  |  |  |  | es |  |  |  |
| `auth.myVehicle` |  |  |  |  | es |  |  |  |
| `auth.next` |  |  |  |  | es |  |  |  |
| `auth.none` |  |  |  |  | es |  |  |  |
| `auth.profile` |  |  |  |  | es |  |  |  |
| `auth.qrManagement` |  |  |  |  | es |  |  |  |
| `auth.refresh` |  |  |  |  | es |  |  |  |
| `auth.reports` |  |  |  |  | es |  |  |  |
| `auth.retry` |  |  |  |  | es |  |  |  |
| `auth.search` |  |  |  |  | es |  |  |  |
| `auth.settings` |  |  |  |  | es |  |  |  |
| `auth.taskHistory` |  |  |  |  | es |  |  |  |
| `auth.tasks` |  |  |  |  | es |  |  |  |
| `auth.warning` |  |  |  |  | es |  |  |  |
| `changePassword.error` |  | nl |  |  | es | it |  |  |
| `changePassword.save` |  | nl |  |  | es | it |  |  |
| `changePassword.success` |  | nl |  |  | es | it |  |  |
| `changePassword.title` |  | nl |  |  | es | it |  |  |
| `dashboard.activeTask` |  |  | de | fr |  |  |  |  |
| `dashboard.noActiveTask` |  |  | de | fr |  |  |  |  |
| `deviceSetup.activate` |  |  |  |  |  |  |  | ku |
| `deviceSetup.activateSubtitle` |  |  |  |  |  |  |  | ku |
| `deviceSetup.activateTitle` |  |  |  |  |  |  |  | ku |
| `deviceSetup.activated` |  |  |  |  |  |  |  | ku |
| `deviceSetup.activating` |  |  |  |  |  |  |  | ku |
| `deviceSetup.activationFailed` |  |  |  |  |  |  |  | ku |
| `deviceSetup.activeWarning.desc` |  |  |  |  |  |  |  | ku |
| `deviceSetup.availableDevices` |  |  |  |  |  |  |  | ku |
| `deviceSetup.back` |  |  |  |  |  |  |  | ku |
| `deviceSetup.bleNotEnabled` |  |  |  |  |  |  |  | ku |
| `deviceSetup.bleNotSupported` |  |  |  |  |  |  |  | ku |
| `deviceSetup.buttons.back` |  | nl |  |  |  |  |  |  |
| `deviceSetup.buttons.done` |  | nl |  |  |  |  |  |  |
| `deviceSetup.buttons.next` |  | nl |  |  |  |  |  |  |
| `deviceSetup.buttons.retry` |  | nl |  |  |  |  |  |  |
| `deviceSetup.cameraPermissionDenied` |  |  |  |  |  |  |  | ku |
| `deviceSetup.cameraPermissionRequired` |  |  |  |  |  |  |  | ku |
| `deviceSetup.cancel` |  |  |  |  |  |  |  | ku |
| `deviceSetup.close` |  |  |  |  |  |  |  | ku |
| `deviceSetup.complete` |  |  |  |  |  |  |  | ku |
| `deviceSetup.complete.done` |  | nl |  |  |  |  |  |  |
| `deviceSetup.complete.message` |  | nl |  |  |  |  |  |  |
| `deviceSetup.complete.title` |  | nl |  |  |  |  |  |  |
| `deviceSetup.configure` |  |  |  |  |  |  |  | ku |
| `deviceSetup.configureSubtitle` |  |  |  |  |  |  |  | ku |
| `deviceSetup.connect` |  |  |  |  |  |  |  | ku |
| `deviceSetup.connectSubtitle` |  |  |  |  |  |  |  | ku |
| `deviceSetup.connectTitle` |  |  |  |  |  |  |  | ku |
| `deviceSetup.connected` |  |  |  |  | es | it |  | ku |
| `deviceSetup.connectionFailed` |  |  |  |  |  |  |  | ku |
| `deviceSetup.deviceAlreadyAssigned` |  |  |  |  |  |  |  | ku |
| `deviceSetup.deviceNotFound` |  |  |  |  |  |  |  | ku |
| `deviceSetup.deviceReady` |  |  |  |  |  |  |  | ku |
| `deviceSetup.enableCameraPermission` |  |  |  |  |  |  |  | ku |
| `deviceSetup.enableLocation` |  |  |  |  |  |  |  | ku |
| `deviceSetup.enterSerial` |  |  |  |  | es | it |  |  |
| `deviceSetup.error` |  |  |  |  |  |  |  | ku |
| `deviceSetup.failed` |  |  |  |  | es | it |  |  |
| `deviceSetup.hint` |  |  |  |  |  |  |  | ku |
| `deviceSetup.invalidQR` |  |  |  |  |  |  |  | ku |
| `deviceSetup.list` |  |  |  |  |  |  |  | ku |
| `deviceSetup.locationRequired` |  |  |  |  |  |  |  | ku |
| `deviceSetup.next` |  |  |  |  |  |  |  | ku |
| `deviceSetup.noDevicesAvailable` |  |  |  |  |  |  |  | ku |
| `deviceSetup.noDevicesFound` |  |  |  |  |  |  |  | ku |
| `deviceSetup.noResultsYet` |  |  |  |  |  |  |  | ku |
| `deviceSetup.openSettings` |  |  |  |  |  |  |  | ku |
| `deviceSetup.password` |  |  |  |  |  |  |  | ku |
| `deviceSetup.qrInstructions` |  |  |  |  |  |  |  | ku |
| `deviceSetup.requestingCamera` |  |  |  |  |  |  |  | ku |
| `deviceSetup.retry` |  |  |  |  | es | it |  | ku |
| `deviceSetup.scan` |  |  |  |  |  |  |  | ku |
| `deviceSetup.scan.found` |  | nl |  |  |  |  |  |  |
| `deviceSetup.scan.notFound` |  | nl |  |  |  |  |  |  |
| `deviceSetup.scan.notFoundMessage` |  | nl |  |  |  |  |  |  |
| `deviceSetup.scan.rescan` |  | nl |  |  |  |  |  |  |
| `deviceSetup.scan.scanning` |  | nl |  |  |  |  |  |  |
| `deviceSetup.scanQR` |  |  |  |  | es | it |  |  |
| `deviceSetup.scanSubtitle` |  |  |  |  |  |  |  | ku |
| `deviceSetup.scanTitle` |  |  |  |  |  |  |  | ku |
| `deviceSetup.search` |  |  |  |  |  |  |  | ku |
| `deviceSetup.searchBySerial` |  |  |  |  |  |  |  | ku |
| `deviceSetup.searching` |  |  |  |  |  |  |  | ku |
| `deviceSetup.selectNetwork` |  |  |  |  |  |  |  | ku |
| `deviceSetup.serialPlaceholder` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.activateDevice` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.activateDeviceDesc` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.configureWiFi` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.configureWiFiDesc` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.connectDevice` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.connectDeviceDesc` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.scanQR` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.scanQRDesc` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.selectVehicle` |  |  |  |  |  |  |  | ku |
| `deviceSetup.steps.selectVehicleDesc` |  |  |  |  |  |  |  | ku |
| `deviceSetup.success` |  |  |  |  |  |  |  | ku |
| `deviceSetup.tapToConnect` |  |  |  |  |  |  |  | ku |
| `deviceSetup.turnOnBluetooth` |  |  |  |  |  |  |  | ku |
| `deviceSetup.wifi.failed` |  | nl |  |  |  |  |  |  |
| `deviceSetup.wifi.failedMessage` |  | nl |  |  |  |  |  |  |
| `deviceSetup.wifi.success` |  | nl |  |  |  |  |  |  |
| `deviceSetup.wifiConnected` |  |  |  |  |  |  |  | ku |
| `deviceSetup.wifiConnecting` |  |  |  |  |  |  |  | ku |
| `deviceSetup.wifiFailed` |  |  |  |  |  |  |  | ku |
| `deviceSetup.wifiTitle` |  |  |  |  |  |  |  | ku |
| `driverTasks.accept` |  |  |  |  |  |  |  | ku |
| `driverTasks.acceptConfirmMessage` |  |  |  |  |  |  |  | ku |
| `driverTasks.acceptConfirmTitle` |  |  |  |  |  |  |  | ku |
| `driverTasks.activeTab` |  |  |  |  |  |  |  | ku |
| `driverTasks.cancel` |  |  |  |  |  |  |  | ku |
| `driverTasks.complete` |  |  |  |  |  |  |  | ku |
| `driverTasks.completeConfirmMessage` |  |  |  |  |  |  |  | ku |
| `driverTasks.completeConfirmTitle` |  |  |  |  |  |  |  | ku |
| `driverTasks.completedTab` |  |  |  |  |  |  |  | ku |
| `driverTasks.confirm` |  |  |  |  |  |  |  | ku |
| `driverTasks.emptyActive` |  |  |  |  |  |  |  | ku |
| `driverTasks.emptyActiveDesc` |  |  |  |  |  |  |  | ku |
| `driverTasks.emptyCompleted` |  |  |  |  |  |  |  | ku |
| `driverTasks.emptyCompletedDesc` |  |  |  |  |  |  |  | ku |
| `driverTasks.emptyPending` |  |  |  |  |  |  |  | ku |
| `driverTasks.emptyPendingDesc` |  |  |  |  |  |  |  | ku |
| `driverTasks.errorLoading` |  |  |  |  |  |  |  | ku |
| `driverTasks.loading` |  |  |  |  |  |  |  | ku |
| `driverTasks.navigate` |  |  |  |  |  |  |  | ku |
| `driverTasks.pendingTab` |  |  |  |  |  |  |  | ku |
| `driverTasks.reject` |  |  |  |  |  |  |  | ku |
| `driverTasks.rejectConfirmMessage` |  |  |  |  |  |  |  | ku |
| `driverTasks.rejectConfirmTitle` |  |  |  |  |  |  |  | ku |
| `driverTasks.retry` |  |  |  |  |  |  |  | ku |
| `driverTasks.start` |  |  |  |  |  |  |  | ku |
| `driverTasks.startConfirmMessage` |  |  |  |  |  |  |  | ku |
| `driverTasks.startConfirmTitle` |  |  |  |  |  |  |  | ku |
| `driverTasks.statusMessages.accepted` |  |  |  |  |  |  |  | ku |
| `driverTasks.statusMessages.cancelled` |  |  |  |  |  |  |  | ku |
| `driverTasks.statusMessages.completed` |  |  |  |  |  |  |  | ku |
| `driverTasks.statusMessages.in_progress` |  |  |  |  |  |  |  | ku |
| `driverTasks.statusMessages.pending_review` |  |  |  |  |  |  |  | ku |
| `driverTasks.statusMessages.rejected` |  |  |  |  |  |  |  | ku |
| `driverTasks.success` |  |  |  |  |  |  |  | ku |
| `driverTasks.taskAcceptFailed` |  |  |  |  |  |  |  | ku |
| `driverTasks.taskAccepted` |  |  |  |  |  |  |  | ku |
| `driverTasks.taskCompleteFailed` |  |  |  |  |  |  |  | ku |
| `driverTasks.taskCompleted` |  |  |  |  |  |  |  | ku |
| `driverTasks.taskRejectFailed` |  |  |  |  |  |  |  | ku |
| `driverTasks.taskRejected` |  |  |  |  |  |  |  | ku |
| `driverTasks.taskStartFailed` |  |  |  |  |  |  |  | ku |
| `driverTasks.taskStarted` |  |  |  |  |  |  |  | ku |
| `driverTasks.title` |  |  |  |  |  |  |  | ku |
| `editProfile.error` |  | nl |  |  | es | it |  |  |
| `editProfile.save` |  | nl |  |  | es | it |  |  |
| `editProfile.success` |  | nl |  |  | es | it |  |  |
| `editProfile.title` |  | nl |  |  | es | it |  |  |
| `fuel.error.distSource.gps` | en |  |  |  |  | it |  |  |
| `fuel.error.distSource.manual` | en |  |  |  |  | it |  |  |
| `fuel.error.distSource.route` | en |  |  |  |  | it |  |  |
| `fuel.error.distSource.tasks` | en |  |  |  |  | it |  |  |
| `fuel.error.distSource.title` | en |  |  |  |  | it |  |  |
| `fuel.error.distSource.unknown` | en |  |  |  |  | it |  |  |
| `geofence.delete` |  |  | de | fr |  |  |  |  |
| `geofence.save` |  |  | de | fr |  |  |  |  |
| `geofence.zoneDeleted` |  |  | de | fr |  |  |  |  |
| `geofence.zoneSaved` |  |  | de | fr |  |  |  |  |
| `map.arrived` |  | nl |  |  |  |  |  |  |
| `map.completeConfirm` |  | nl |  |  |  |  |  |  |
| `map.completeTask` |  | nl |  |  |  |  |  |  |
| `map.couldNotComplete` |  | nl |  |  |  |  |  |  |
| `map.distance` |  | nl |  |  |  |  |  |  |
| `map.eta` |  | nl |  |  |  |  |  |  |
| `map.follow` |  | nl |  |  |  |  |  |  |
| `map.loadingRoute` |  | nl |  |  |  |  |  |  |
| `map.myLocation` |  | nl |  |  |  |  |  |  |
| `map.recenter` |  | nl |  |  |  |  |  |  |
| `map.routeNotFound` |  | nl |  |  |  |  |  |  |
| `map.satellite` |  | nl |  |  |  |  |  |  |
| `map.taskCompleted` |  | nl |  |  |  |  |  |  |
| `map.title` |  | nl |  |  |  |  |  |  |
| `map.traffic` |  | nl |  |  |  |  |  |  |
| `profile.error.distSource.gps` |  | nl |  |  | es |  |  |  |
| `profile.error.distSource.manual` |  | nl |  |  | es |  |  |  |
| `profile.error.distSource.route` |  | nl |  |  | es |  |  |  |
| `profile.error.distSource.tasks` |  | nl |  |  | es |  |  |  |
| `profile.error.distSource.title` |  | nl |  |  | es |  |  |  |
| `profile.error.distSource.unknown` |  | nl |  |  | es |  |  |  |
| `profile.error.loadFailed` |  | nl |  |  | es | it |  |  |
| `profile.error.noVehicle` |  | nl |  |  | es | it |  |  |
| `profile.error.saveFailed` |  | nl |  |  | es | it |  |  |
| `profile.error.title` |  | nl |  |  | es | it |  |  |
| `profile.error.vehicleUpdateFailed` |  | nl |  |  | es | it |  |  |
| `profile.fuelTypes.diesel` |  | nl |  |  | es | it |  |  |
| `profile.fuelTypes.electric` |  | nl |  |  | es | it |  |  |
| `profile.fuelTypes.gasoline` |  | nl |  |  | es | it |  |  |
| `profile.fuelTypes.lpg` |  | nl |  |  | es | it |  |  |
| `profile.message` |  | nl |  |  |  | it |  |  |
| `profile.notFullTankWarning.cancel` |  | nl |  |  | es | it |  |  |
| `profile.notFullTankWarning.message` |  | nl |  |  | es | it |  |  |
| `profile.notFullTankWarning.saveAnyway` |  | nl |  |  | es | it |  |  |
| `profile.notFullTankWarning.title` |  | nl |  |  | es | it |  |  |
| `reports.tabs.alerts` |  |  |  |  |  | it |  |  |
| `reports.tabs.drivers` |  |  |  |  |  | it |  |  |
| `reports.tabs.summary` |  |  |  |  |  | it |  |  |
| `reports.tabs.tasks` |  |  |  |  |  | it |  |  |
| `reports.tabs.vehicles` |  |  |  |  |  | it |  |  |
| `route.destination` |  | nl |  |  |  |  |  |  |
| `route.distance` |  | nl |  |  |  |  |  |  |
| `route.end_location` |  | nl |  |  |  |  |  |  |
| `route.enter_destination` |  | nl |  |  |  |  |  |  |
| `route.enter_destination_address` |  | nl |  |  |  |  |  |  |
| `route.enter_start_address` |  | nl |  |  |  |  |  |  |
| `route.enter_start_location` |  | nl |  |  |  |  |  |  |
| `route.estimated_time` |  | nl |  |  |  |  |  |  |
| `route.route` |  | nl |  |  |  |  |  |  |
| `route.start_location` |  | nl |  |  |  |  |  |  |
| `route.via` |  | nl |  |  |  |  |  |  |
| `schedule.actual_end` |  | nl |  |  |  |  |  |  |
| `schedule.actual_start` |  | nl |  |  |  |  |  |  |
| `schedule.date` |  | nl |  |  |  |  |  |  |
| `schedule.duration` |  | nl |  |  |  |  |  |  |
| `schedule.end` |  | nl |  |  |  |  |  |  |
| `schedule.end_after_start` |  | nl |  |  |  |  |  |  |
| `schedule.end_time_before_start` |  | nl |  |  |  |  |  |  |
| `schedule.hours` |  | nl |  |  |  |  |  |  |
| `schedule.hours_short` |  | nl |  |  |  |  |  |  |
| `schedule.minutes` |  | nl |  |  |  |  |  |  |
| `schedule.minutes_short` |  | nl |  |  |  |  |  |  |
| `schedule.schedule` |  | nl |  |  |  |  |  |  |
| `schedule.scheduled_end` |  | nl |  |  |  |  |  |  |
| `schedule.scheduled_start` |  | nl |  |  |  |  |  |  |
| `schedule.select_end_date` |  | nl |  |  |  |  |  |  |
| `schedule.select_end_time` |  | nl |  |  |  |  |  |  |
| `schedule.select_start_date` |  | nl |  |  |  |  |  |  |
| `schedule.select_start_time` |  | nl |  |  |  |  |  |  |
| `schedule.start` |  | nl |  |  |  |  |  |  |
| `schedule.time` |  | nl |  |  |  |  |  |  |
| `settings.clearCacheConfirm` |  |  |  |  |  |  |  | ku |
| `settings.languageChanged` |  |  |  |  |  |  |  | ku |
| `tasks.actions.cancel` |  |  | de | fr |  |  |  |  |
| `tasks.actions.complete` |  |  | de | fr |  |  |  |  |
| `tasks.actions.completeConfirm` |  |  | de | fr |  |  |  |  |
| `tasks.actions.completeTask` |  |  | de | fr |  |  |  |  |
| `tasks.actions.error` |  |  | de | fr |  |  |  |  |
| `tasks.actions.goToNavigation` |  |  | de | fr |  |  |  |  |
| `tasks.actions.operationFailed` |  |  | de | fr |  |  |  |  |
| `tasks.actions.reject` |  |  | de | fr |  |  |  |  |
| `tasks.actions.rejectTask` |  |  | de | fr |  |  |  |  |
| `tasks.actions.start` |  |  | de | fr |  |  |  |  |
| `tasks.actions.startConfirm` |  |  | de | fr |  |  |  |  |
| `tasks.actions.startTask` |  |  | de | fr |  |  |  |  |
| `tasks.actions.stayHere` |  |  | de | fr |  |  |  |  |
| `tasks.actions.success` |  |  | de | fr |  |  |  |  |
| `tasks.actions.taskCompleted` |  |  | de | fr |  |  |  |  |
| `tasks.actions.taskRejected` |  |  | de | fr |  |  |  |  |
| `tasks.actions.taskStarted` |  |  | de | fr |  |  |  |  |
| `tasks.actions.taskStartedMessage` |  |  | de | fr |  |  |  |  |
| `tasks.noTasks` |  |  | de | fr |  |  |  |  |
| `tasks.taskRejectedMessage` |  |  |  |  | es | it |  |  |
| `time.h` |  | nl |  |  |  |  |  |  |
| `time.hours` |  | nl |  |  |  |  |  |  |
| `time.min` |  | nl |  |  |  |  |  |  |
| `time.minutes` |  | nl |  |  |  |  |  |  |
| `time.seconds` |  | nl |  |  |  |  |  |  |
| `validation.invalid_date` |  | nl |  |  |  |  |  |  |
| `validation.invalid_location` |  | nl |  |  |  |  |  |  |
| `validation.invalid_time` |  | nl |  |  |  |  |  |  |
| `validation.max_length` |  | nl |  |  |  |  |  |  |
| `validation.min_length` |  | nl |  |  |  |  |  |  |
| `validation.required_field` |  | nl |  |  |  |  |  |  |
| `vehicle.addVehicle` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.beige` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.black` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.blue` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.brown` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.gray` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.green` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.navy` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.orange` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.red` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.silver` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.white` |  |  |  |  |  |  |  | ku |
| `vehicle.colorOptions.yellow` |  |  |  |  |  |  |  | ku |
| `vehicle.driver` |  |  |  |  |  |  |  | ku |
| `vehicle.editVehicle` |  |  |  |  |  |  |  | ku |
| `vehicle.editVehicleSettings` |  |  |  |  |  |  |  | ku |
| `vehicle.fuel` |  |  |  |  |  |  |  | ku |
| `vehicle.noVehicle` |  |  |  |  |  |  |  | ku |
| `vehicle.odometer` |  |  |  |  |  |  |  | ku |
| `vehicle.updateError` |  |  |  |  |  |  |  | ku |
| `vehicle.updateSuccess` |  |  |  |  |  |  |  | ku |

