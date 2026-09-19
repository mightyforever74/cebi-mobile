# TulipFleet Mobile — P2-c rapor (DeviceSetup / BLE hardcoded göç)

Branch: `i18n-mobile-p2c-devicesetup` (main `8bd46f5` üstünden).
Kapsam: `src/screens/driver/DeviceSetupScreen.js`, `src/services/bleService.js`, `src/components/driver/WaypointsPanel.js`, `src/constants/config.js` (`WIFI_ERROR_MESSAGES` + `WIFI_PROGRESS_KEYS`), DeviceSetup akışı tüketicisi `src/screens/driver/WiFiPasswordScreen.js` (yalnız progress/hata-kodu eşlemesi; UI P2-a’da göçmüştü).
Yeni bağımlılık yok. `package.json` dokunulmadı. OTA/EAS yok. Sözlük yazımı yalnız `scripts/i18n-add-keys.mjs` + `scripts/i18n-patches/p2c-*.json`. Push yok.
Admin / Superadmin / navigation **dokunulmadı**.

DeviceSetup* / *Provision* envanteri: `DeviceSetupScreen.js` (tek `DeviceSetup*`); `*Provision*` yok. İlgili akış: `WiFiPasswordScreen.js` (`provisionWifi`), `WiFiPickerScreen.js` (`scanWifiNetworks` — bu pakette literal göçü yok).

## Commit'ler

| # | hash | konu |
|---|---|---|
| 1 | `56efa0b` | patch dosyaları + 8 sözlük (KU yok) |
| 2 | `220de9b` | DeviceSetupScreen concat Alert + WaypointsPanel `t()` / `formatTime` |
| 3 | `874900d` | bleService hata kodu; `WIFI_ERROR_MESSAGES` tek kaynak; WiFiPassword eşlemesi |
| 4 | (bu commit) | `docs/I18N_P2C_REPORT.md` |

```
56efa0b fix(i18n): add P2-c DeviceSetup, WiFi error, and waypoint keys
220de9b fix(i18n): migrate DeviceSetup and WaypointsPanel copy to t()
874900d fix(i18n): return WiFi BLE errors as codes and drop Turkish copy
```

## Adım 0 — envanter (önce / sonra)

Tarama: `Alert.alert` t’siz, `<Text>` literal, placeholder, `Speech.speak`, concat, `toLocaleTimeString`. `Speech.speak` bu grupta yok.

### Önce (göç edilecek — kullanıcıya görünen)

| dosya:satır | mevcut metin | dil | önerilen key | grup |
|---|---|---|---|---|
| DeviceSetupScreen.js:423 | `Seri numarası bulunamadı.` | TR | `deviceSetup.serial.missing` | screen |
| DeviceSetupScreen.js:462 | `Bluetooth başlatılamadı: ` + error | TR concat | `deviceSetup.bluetooth.initFailed` `{{detail}}` | screen |
| DeviceSetupScreen.js:568 | `Cihazlar aranıyor...` | TR | `deviceSetup.ble.searchingDevices` | reuse |
| DeviceSetupScreen.js:586 | `Tarama hatası: ` + e.message | TR concat | `deviceSetup.ble.scanError` `{{detail}}` | screen |
| DeviceSetupScreen.js:591–595 | cihaz bulunamadı / `N cihaz bulundu` | TR | `deviceSetup.ble.deviceNotFound` / `devicesFound` `{{count}}` | reuse |
| DeviceSetupScreen.js:608 | `Bağlandı!` | TR | `deviceSetup.connection.connected` | reuse |
| DeviceSetupScreen.js:650 | `Bağlanıyor...` | TR | `deviceSetup.connecting` | reuse |
| DeviceSetupScreen.js:727 | `Bağlantı hatası: ` + e.message | TR concat | `deviceSetup.connectionError` `{{error}}` | reuse |
| DeviceSetupScreen.js:756 | `BLE servisinde WiFi provisioning fonksiyonu yok.` | TR | `deviceSetup.wifi.provisionMissing` | screen |
| DeviceSetupScreen.js:763 | `WiFi bilgileri gönderiliyor...` | TR | `deviceSetup.wifi.sendingCredentials` | reuse |
| DeviceSetupScreen.js:786 | `result.message` / `WiFi bağlantısı başarısız` | TR | `WIFI_ERROR_MESSAGES[code]` / `connectionFailed` | reuse + map |
| DeviceSetupScreen.js:800 | `Cihaz aktive ediliyor...` | TR | `deviceSetup.activation.activating` | reuse |
| DeviceSetupScreen.js:832 | `Cihaz yeniden başlatılıyor...` | TR | `wifi.espRestarting` | reuse (P2-a) |
| DeviceSetupScreen.js:847 | `WiFi kurulumu sırasında hata: ` + e.message | TR concat | `deviceSetup.wifi.setupError` `{{detail}}` | screen |
| DeviceSetupScreen.js:880 | `Aktivasyon başarısız` fallback | TR | `deviceSetup.activation.failed` | reuse |
| DeviceSetupScreen.js:989 | `` Serial: ${scannedSerial} `` | EN/TR | `deviceSetup.serial.scanned` `{{serial}}` | screen |
| bleService.js:986–999 | onProgress TR cümleleri | TR | faz kodu; ekran `WIFI_PROGRESS_KEYS` | service→screen |
| bleService.js:1003–1021 | `errorMessages` TR + WIFI_TIMEOUT/INVALID_* | TR | `{ error: code }`; `deviceSetup.wifi.errors.*` | map |
| WaypointsPanel.js:89 | `toLocaleTimeString(isEn ? en-GB : tr-TR)` | NL→tr-TR bug | `helpers.formatTime` | helper |
| WaypointsPanel.js:95–105 | `N min` / `N dk` süre | TR/EN | `units.min` / `units.h` | reuse |
| WaypointsPanel.js:144 | `` Waypoint ${n} `` | EN | `taskDetail.waypoints.unnamed` `{{index}}` | waypoints |
| WaypointsPanel.js:202 | getText `Durak` + `dk` | TR/EN | `taskDetail.waypoints.stop` + `units.min` | reuse |
| WaypointsPanel.js:287/322 | getText Başlangıç/Varış | TR/EN | `taskDetail.route.origin/destination` | reuse |
| WaypointsPanel.js:396–417 | getText rota başlık | TR/EN | `nav.route_waypoints` / `nav.direct_route` / `nav.completed` | reuse |
| WaypointsPanel.js:460/465 | `km` / `dk` | birim | `units.km` / `units.min` | reuse |
| WaypointsPanel.js:486 | `Complete` / `Tamamla` | EN/TR | `taskDetail.waypoints.complete` | reuse |

### Sonra (DeviceSetup grubu — kullanıcıya görünen göç seti)

Kapsam içi göç seti = **0**. Kalan `t() \|\| "TR fallback"` ölü yollar (key var). `RSSI:` donanım etiketi. BLE `console.*` / throw kodları (`WIFI_TIMEOUT`, `NOT_CONNECTED`) kullanıcıya gösterilmeden önce ekranda `t()`.

`node` ile `bleService.js` içinde `[ğüşöçıİĞÜŞÖÇ]` = **0**.

## Adım 1 — key tasarımı

### Reuse (yeni key açılmadı)

| key | gerekçe |
|---|---|
| `deviceSetup.ble.searchingDevices/deviceNotFound/devicesFound` | tarama status |
| `deviceSetup.connecting` / `connection.connected` / `connectionError` | BLE bağlantı |
| `deviceSetup.wifi.sendingCredentials/connectionFailed/deviceConnecting` | progress |
| `deviceSetup.status.wifiConnecting/wifiProvisionOk` | faz |
| `deviceSetup.activation.activating/failed` | aktivasyon |
| `deviceSetup.wifi.errors.ERR_*` / `WIFI_TIMEOUT` | P2-a sözlük |
| `wifi.espRestarting` | ESP32 restart status |
| `taskDetail.waypoints.stop/complete` | durak etiketi + Tamamla |
| `taskDetail.route.origin/destination` | başlangıç/varış |
| `nav.route_waypoints/direct_route/completed` | panel başlık |
| `units.km/min/h` | mesafe/süre (plural yok) |
| `common.error/ok` | Alert |

`bleService` içinde `i18n.t` **yok**. Gerekçe: servis kod döndürür; çeviri ekranda. Timeouts (`WIFI_CONNECT` 30000, scan, 500ms settle) değişmedi.

### Yeni namespace / ek

- `deviceSetup.bluetooth.initFailed` `{{detail}}`
- `deviceSetup.ble.scanError` `{{detail}}`
- `deviceSetup.serial.missing` / `serial.scanned` `{{serial}}`
- `deviceSetup.wifi.provisionMissing` / `setupError` `{{detail}}`
- `deviceSetup.wifi.errors.INVALID_SSID` / `INVALID_PASSWORD` / `generic` `{{code}}`
- `taskDetail.waypoints.unnamed` `{{index}}`

### WIFI_ERROR_MESSAGES (tek kaynak)

P2-a key haritası duruyor; bleService TR kopyası **silindi**. Ekran: `t(WIFI_ERROR_MESSAGES[code])`. Eklenen kodlar: `INVALID_SSID`, `INVALID_PASSWORD`. `WIFI_PROGRESS_KEYS` config’de faz→key (WiFiPassword tüketir; DeviceSetup kendi kopyasını kullanır, değerler aynı).

`{{detail}}` = `error.message` (BLE/native). Backend `activationResult.message` / `validateSerial` mesajı olduğu gibi — **BACKEND**.

## Adım 2 — patch sayaçları + idempotency

| patch | 1. koşu | 2. koşu |
|---|---|---|
| `p2c-devicesetup.json` | added=48 skipped_lang=6 files=8 | identical=48 **0 değişiklik** |
| `p2c-wifi-errors.json` | added=24 skipped_lang=3 files=8 | identical=24 **0 değişiklik** |
| `p2c-waypoints.json` | added=8 skipped_lang=1 files=8 | identical=8 **0 değişiklik** |

48+24+8 = 80 yazım (10 key × 8 dil). KU yok.

TR/EN/NL: Cursor. DE/FR/ES/IT/BG: Cursor + **SUSPECT**.

### SUSPECT

DE/FR/ES/IT/BG tüm 10 yeni key.

### KU_OMITTED (10)

`deviceSetup.bluetooth.initFailed`, `deviceSetup.ble.scanError`, `deviceSetup.serial.missing`, `deviceSetup.serial.scanned`, `deviceSetup.wifi.provisionMissing`, `deviceSetup.wifi.setupError`, `deviceSetup.wifi.errors.INVALID_SSID`, `deviceSetup.wifi.errors.INVALID_PASSWORD`, `deviceSetup.wifi.errors.generic`, `taskDetail.waypoints.unnamed`.

## Adım 3 — kod

- DeviceSetup: mevcut `useTranslation`. Concat → `t(..., { detail \| error \| serial \| count })`.
- WaypointsPanel: `getText`/`isEn` kaldırıldı; `helpers.formatTime`; JSX/`makeStyles` aritmetik yok.
- bleService: `provisionWifi` `{ success, error }` (code). `onProgress(phase)` — ikinci argüman kullanıcı metni değil.
- BLE tarama/bağlantı/provision sırası ve timeout’lar aynı.

## Adım 4 — doğrulama

### verify BEFORE / AFTER

BEFORE = main `8bd46f5` / P2-b AFTER. AFTER = P2-c commit 3.

| | BEFORE (`8bd46f5`) | AFTER (commit 3) |
|---|---|---|
| UNION | 2377 | **2387** (+10) |
| intersection | 1809 | **1809** |
| code keys not in union | **0** | **0** |
| code keys missing in tr | **0** | **0** |
| manifest subkey missing | **0** | **0** |
| interp mismatches | **0** | **0** |
| encoding mojibake | **0** | **0** |
| errors / warnings | 2622 / 2490 | 2632 / 2570 |
| KU missing vs union | 434 | **444** (+10) |

```
lang  keys  missing  extra
tr    2081      306    272
en    2087      300    278
nl    2189      198    380
de    2106      281    297
fr    2106      281    297
es    2138      249    329
it    2120      267    311
bg    2081      306    272
ku    1943      444    134
```

### Yeniden tarama

DeviceSetup + WaypointsPanel kullanıcıya görünen göç seti = 0.

### bleService Türkçe

`Select-String` PowerShell karakter sınıfı tüm satırları boyadı (encoding). Kanıt: `node` UTF-8 `[ğüşöçıİĞÜŞÖÇ]` eşleşme = **0**.

### expo export

```
npx expo export --platform ios --output-dir C:\Users\might\AppData\Local\Temp\p2c-ios-export
```

Exit 0. `iOS Bundled 7965ms index.js (2087 modules)`. `_expo/static/js/ios/index-16ef829454ca934c7301ddea3e420485.hbc` (7.92 MB). Repo ağacına yazılmadı.

### `git diff --stat` (`8bd46f5...HEAD`, rapor commit’inden önce)

```
 scripts/i18n-patches/p2c-devicesetup.json | 62 +++++++++++++++++++++++
 scripts/i18n-patches/p2c-waypoints.json   | 12 +++++
 scripts/i18n-patches/p2c-wifi-errors.json | 32 ++++++++++++
 src/components/driver/WaypointsPanel.js   | 82 ++++++++++---------------------
 src/constants/config.js                   | 10 ++++
 src/locales/bg.json                       | 22 ++++++---
 src/locales/de.json                       | 22 ++++++---
 src/locales/en.json                       | 22 ++++++---
 src/locales/es.json                       | 22 ++++++---
 src/locales/fr.json                       | 22 ++++++---
 src/locales/it.json                       | 22 ++++++---
 src/locales/nl.json                       | 22 ++++++---
 src/locales/tr.json                       | 22 ++++++---
 src/screens/driver/DeviceSetupScreen.js   | 61 +++++++++++++++--------
 src/screens/driver/WiFiPasswordScreen.js  | 11 +++--
 src/services/bleService.js                | 65 +++++++++---------------
 16 files changed, 342 insertions(+), 169 deletions(-)
```

`ku.json`, `package.json`, Admin / Superadmin / navigation yok. `WiFiPasswordScreen.js` izinli: DeviceSetup `provisionWifi` tüketicisi (hata-kodu sözleşmesi).

## Kapsam dışı bulgular

| aday | kanıt | kova |
|---|---|---|
| `validateSerial` / `activationResult.message` | backend string | **BACKEND** |
| DeviceSetup `t() \|\| "TR fallback"` | key var; ölü yol | dokunulmadı |
| `RSSI: {n}` | donanım | dokunma |
| bleService throw/`console` İngilizce kodlar | `WIFI_TIMEOUT`, `NOT_CONNECTED`, scan log | kapsam dışı |
| `WiFiPickerScreen.js` | scan API; literal göçü yok | P2 follow-up tarama |
| Superadmin `toLocale*` | P2-b raporu | **P2-d** |
| Driver FuelEntry / Dashboard `toLocaleString("tr-TR")` | P2-b raporu | P2 follow-up |
| `CreateTaskScreen` `getText`/`isEn` | P2-b | follow-up |

## Fiziksel test (DeviceSetup × TR/EN/NL)

BLE gerçek ESP32 ister. Bu oturumda cihaz yok — BLE satırları **cihazsız doğrulanamadı**.

| senaryo | TR | EN | NL |
|---|---|---|---|
| Bluetooth kapalı uyarısı (`initFailed` / BLE state throw) | cihazsız doğrulanamadı | cihazsız doğrulanamadı | cihazsız doğrulanamadı |
| QR geçersiz (`deviceSetup.qr.invalidCode` — zaten t()) | cihazsız doğrulanamadı | cihazsız doğrulanamadı | cihazsız doğrulanamadı |
| Tarama zaman aşımı (`deviceNotFound`) | cihazsız doğrulanamadı | cihazsız doğrulanamadı | cihazsız doğrulanamadı |
| WiFi şifre hatası (`errors.ERR_AUTH`) | cihazsız doğrulanamadı | cihazsız doğrulanamadı | cihazsız doğrulanamadı |
| Serial doğrulama hatası (Alert + `serial.invalid` / backend msg) | cihazsız doğrulanamadı | cihazsız doğrulanamadı | cihazsız doğrulanamadı |
| TaskDetail durak listesi (WaypointsPanel `formatTime` + `unnamed` / Tamamla) | cihazsız doğrulanamadı (görev+nav gerekir) | | |

KU: yeni key yok → tr fallback.

## `git status --short`

Rapor commit’inden sonra boş beklenir (yalnız `docs/I18N_P2C_REPORT.md` bu commit’te).
