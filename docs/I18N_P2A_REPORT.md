# TulipFleet Mobile — P2-a rapor (Driver hardcoded göç)

Branch: `i18n-mobile-p2a-driver` (main `67eafee` üstünden).
Kapsam: `src/screens/driver/**` (DeviceSetupScreen hariç), `src/utils/helpers.js` (`formatDate` / `formatDateTime` / `formatTime` / `getTimeAgo`), `src/constants/config.js` (`WIFI_ERROR_MESSAGES`, `ALERT_TYPES`).
Yeni bağımlılık yok. `package.json` dokunulmadı. OTA/EAS yok. Sözlük yazımı yalnız `scripts/i18n-add-keys.mjs` + `scripts/i18n-patches/p2a-*.json`. Push yok.

## Commit'ler

| # | hash | konu |
|---|---|---|
| 1 | `9f07119` | patch dosyaları + 8 sözlük (KU yok) |
| 2 | `18d8a36` | Driver ekranları `t()` + sürüm/© interpolasyon; 2 ek WiFi status key |
| 3 | `2384df1` | helpers localeMap + time-ago; WIFI key haritası; `ALERT_TYPES` silindi |
| 4 | (bu commit) | `docs/I18N_P2A_REPORT.md` |

```
9f07119 fix(i18n): add P2-a driver keys for picker, WiFi password, time-ago, and wifi errors
18d8a36 fix(i18n): migrate driver screen copy to t() and interpolate version/copyright
2384df1 fix(i18n): locale-aware dates/time-ago and map WiFi errors to dictionary keys
```

## Adım 0 — envanter (önce / sonra)

Tarama: `<Text>` literal, `Alert.alert` (t'siz), `placeholder=`, `title:`, `Speech.speak`, `accessibilityLabel`, `"..." + x`, template-cümle. Kullanıcıya görünmeyen (`console.*`, yorum, key/id) = kapsam dışı, dokunulmadı.

`DeviceSetupScreen.js` path olarak `src/screens/driver/` altında; P2-a kapsamı **dışı** (P2-c). 6 satır tabloya kapsam dışı girdi.

### Önce (göç edilecek — kullanıcıya görünen)

| dosya:satır | mevcut metin | dil | önerilen key | grup |
|---|---|---|---|---|
| VehiclePickerScreen.js:187 | `Sürücü` (isim yoksa) | TR | `common.user` (reuse) | common |
| VehiclePickerScreen.js:201 | Alert `Hata` / `Araçlar yüklenemedi` | TR | `common.error` / `vehiclePicker.loadFailed` | common + screen |
| VehiclePickerScreen.js:208–216 | `Bilinmeyen`; `Cihaz Ataması`; `{{plate}} plakalı aracı…`; `İptal`; `Devam` | TR | `common.unknown`; `vehiclePicker.assignTitle`; `vehiclePicker.assignConfirm`; `common.cancel`; `common.continue` | common + screen |
| VehiclePickerScreen.js:223–234 | `BLE Bağlantısı Yok`; BLE mesajı; `Baştan Başlat` | TR | `vehiclePicker.noBleTitle/Message/restart` | screen |
| VehiclePickerScreen.js:266 | `Atama başarısız` | TR | `vehiclePicker.assignFailed` | screen |
| VehiclePickerScreen.js:273–275 | `Cihaz ataması başarısız: ` + error | TR | `vehiclePicker.assignFailedDetail` `{{detail}}` | screen |
| VehiclePickerScreen.js:287 | `Araçlar yükleniyor...` | TR | `vehiclePicker.loading` | screen |
| VehiclePickerScreen.js:295 | `Kullanılabilir araç bulunamadı` | TR | `vehiclePicker.empty` | screen |
| VehiclePickerScreen.js:301 | `Yeniden Dene` | TR | `common.retry` | common |
| VehiclePickerScreen.js:310–313 | `Araç Seçin`; `{{name}}, hangi aracı…` | TR | `vehiclePicker.title/subtitle` | screen |
| VehiclePickerScreen.js:322–326 | `Dizel`/`Benzin`; `Yakıt: ` | TR | `adminVehicles.fuelTypes.*`; `vehiclePicker.fuelLine` | reuse + screen |
| VehiclePickerScreen.js:381 | footer `İptal` | TR | `common.cancel` | common |
| VehiclePickerScreen.js:388 | `Atanıyor...` | TR | `vehiclePicker.assigning` | screen |
| WiFiPasswordScreen.js:39–50 | SSID/şifre/ESP32 Alert TR | TR | `deviceSetup.wifi.emptySSID/shortPassword`; `wifi.bleDisconnected`; `common.ok` | reuse |
| WiFiPasswordScreen.js:63–94 | status + serial/WiFi fail | TR | `wifi.sendingSerial`; `wifi.serialSendFailed`; `deviceSetup.wifi.sendingCredentials/connectionFailed` | reuse + screen |
| WiFiPasswordScreen.js:106–165 | ESP32 status cümleleri | TR | `wifi.connectingEsp/registeringBackend/checkingStatus/stillWorking/fallbackMethod` | screen |
| WiFiPasswordScreen.js:187 | `ESP32 yeniden başlatılıyor...` | TR | `wifi.espRestarting` | screen |
| WiFiPasswordScreen.js:219 | `Bağlantı hatası: ` + msg | TR | `wifi.connectionErrorDetail` `{{detail}}` | screen |
| WiFiPasswordScreen.js:236 | `Setup tamamlanamadı` | TR | `wifi.setupIncomplete` | screen |
| WiFiPasswordScreen.js:244–251 | `Kurulum tamamlandı! ✅`; `Başarılı!`; plaka cümlesi; `Tamam` | TR | `wifi.completeStatus`; `common.success`; `wifi.successAssigned`; `common.ok` | common + screen |
| WiFiPasswordScreen.js:304–406 | başlık/etiket/placeholder/sinyal/Bağlan/İptal | TR | `wifi.password` (reuse) + `wifi.*` yeni; `wifi.connect`; `common.cancel` | reuse + screen |
| DriverProfile.js:423,441–442 | `profile.version 2.0.5`; `TulipFleet v1.0.0`; `© 2025 TulipFleet` | TR/EN | `driverSettings.version` `{{version}}`; `common.copyright` `{{year}}` | common + settings |
| DriverSettings.js:701,726–727 | `settings.version + " 2.1.0"`; `TulipFleet v2.1.0`; `© 2026 TulipFleet` | TR/EN | aynı | common + settings |
| FuelEntryScreen.js:700–703,1052 | FUEL_TYPES satır içi 9-dil label | TR/EN/… | `adminVehicles.fuelTypes.${id}` | reuse |
| FuelEntryScreen.js:879,963–976 | `Tüketim`; `KM`; `Litre` | TR | `fuelEntry.consumption/km/liters` | screen |
| DriverDashboard.js:652,658 | mojibake defaultValue; `Link error` | EN bozuk | `common.cannotOpenLink` (reuse, defaultValue silindi) | common |
| DriverDashboard.js:586 | `Unknown error` | EN | `common.unknown` | common |
| TaskOffers.js:27–35,437–441 | yerel `localeMap` + `toLocaleString` | — | `helpers.formatDateTime` | helper |
| TaskOfferDetail.js:28–36,519–523 | aynı | — | `helpers.formatDateTime` | helper |
| DriverTaskDetail.js:467–482 | yerel `getLocale` + `formatDate` | — | `helpers.formatDateTime` | helper |
| helpers.js:20–39 | `N yıl/ay/gün/saat/dakika/saniye önce` | TR | `time.ago.*` `{{count}}` | time |
| config.js:127–133 | WIFI TR sabitleri | TR | `deviceSetup.wifi.errors.<code>` (key haritası) | deviceSetup |
| config.js:335–344 | `ALERT_TYPES` | kod | referans yok → silindi | — |

### Sonra (Driver grubu — kullanıcıya görünen literal)

Kapsam içi göç seti = **0**. Tarama (`p2a-scan.mjs`) hâlâ 74 “visible” satır üretir; filter KEEP=20. Hepsi ya zaten `t()`, ya false-positive JSX, ya kapsam dışı (aşağıdaki liste). VehiclePicker/WiFiPassword Alert.alert t'siz = 0.

Kalan tarama eşleşmeleri (dokunulmadı, kapsam dışı / zaten t()):

| dosya:satır | metin | neden kapsam dışı |
|---|---|---|
| DeviceSetupScreen.js:462,586,727,847,989 | BLE concat / `Serial: ${…}` | P2-c; bu pakette yasak |
| DriverDashboard.js:862 | `0 && tr?.delay_min` | false-positive (JSX koşulu) |
| DriverRouteMapScreen.js:1038,12500 placeholder | JS ifade / sayı örneği | id/örnek |
| DriverWelcomeScreen.js:164–166,282 | saat koşulu; marka `TulipFleet` | marka / false-positive |
| DriverDashboard / FuelEntry / RouteMap placeholder | `TF-2025-00001-1`, `60`, `12500` | seri/sayı örneği |
| HelpCenter / Troubleshooting | e-posta ve URL | tanımlayıcı |
| LEDIndicatorsScreen | `WiFi`/`GPS`/`GPIO4`/`GPIO5` / cihaz modeli | donanım etiketi |
| FuelEntry template `/km` | birim, cümle değil | sayı formatı bu pakette yok |
| DriverSettings.js:433 | `t() + count + t("settings.itemsCleared")` | zaten t(); concat sayı |
| DriverSettings.js:457,460 | destek mailto gövdesi (`Kullanıcı`/`Versiyon: 2.1.0`) | e-posta şablonu; P2 follow-up |
| DriverSettings.js:878–914 | gizlilik politikası EN gövdesi (7 madde) | yasal metin; P2 follow-up |
| TaskOfferDetail.js | `t("…") \|\| "TR fallback"` | zaten t(); fallback ölü yol |
| FuelEntry `toLocaleString("tr-TR")` | sayı | bu paket yalnız formatDate kopyaları |
| Speech.speak | `fullText` / `speechText` değişken | zaten t() ile üretiliyor |
| VehiclePicker.js:326 | `` adminVehicles.fuelTypes.${id} `` | dinamik key, literal değil |

## Adım 1 — key tasarımı

### Reuse (yeni key açılmadı)

| key | gerekçe |
|---|---|
| `common.error/cancel/ok/retry/continue/success/user` | Alert ve butonlar |
| `common.cannotOpenLink` | Dashboard link; mojibake defaultValue kaldırıldı |
| `wifi.password` | ekran başlığı “WiFi Şifresi” |
| `wifi.connect` | Bağlan |
| `wifi.bleDisconnected` | ESP32 koptu (metin “tekrar deneyin” ≈ “baştan başlayın”) |
| `deviceSetup.wifi.emptySSID/shortPassword/sendingCredentials/connectionFailed` | WiFiPassword validasyon/status |
| `adminVehicles.fuelTypes.{diesel,gasoline,lpg,electric}` | VehiclePicker + FuelEntry |

Patch’te yazılıp kodda reuse edilen yakın eşler (sözlükte duruyor, zarar yok): `wifi.ssidEmpty`, `wifi.passwordShort`, `wifi.sendingCredentials`, `wifi.connectFailed`.

### Yeni namespace

- `vehiclePicker.*` — 13 key
- `wifi.*` — password ekranı status/label (mevcut `wifi` ağacına ek)
- `fuelEntry.{km,liters,consumption}`
- `driverSettings.version` = `TulipFleet v{{version}}` — değer `Constants.expoConfig.version` (`app.json` 2.0.7); sözlüğe sürüm yazılmaz
- `common.copyright` = `© {{year}} TulipFleet` — `new Date().getFullYear()`
- `common.unknown` = `Bilinmeyen`
- `time.ago.{seconds,minutes,hours,days,months,years}` = `{{count}} dk önce` biçimi; **i18next plural yok** (compatibilityJSON v3 + ku/bg)
- `deviceSetup.wifi.errors.{ERR_AUTH,ERR_TIMEOUT,ERR_NOT_FOUND,ERR_UNKNOWN,WIFI_TIMEOUT}`

### WIFI_ERROR_MESSAGES

`src/constants/config.js` değerleri artık key string. `WIFI_ERROR_MESSAGES` **hiçbir dosyadan import edilmiyor** (kanıt: `src` içinde yalnız tanım). Tüketici `src/services/bleService.js:1003–1021` kendi TR kopyasını tutuyor → **P2-c**.

### ALERT_TYPES

`Select-String` / workspace grep:

- `src/constants/config.js` — tanımdı; **silindi** (commit 3)
- `constants/config.js:142` — kök kopya, **dokunulmadı** (P2-b/d adayı)
- `docs/I18N_P0_DISCOVERY.md`, `docs/I18N_P0FIX_REPORT.md` — dokümantasyon

Canlı AdminAlerts haritası P0-FIX’te; src `ALERT_TYPES` referanssız olduğu için eşitleme yerine silindi.

### String birleştirme

Cümleler `t("key", { plate | name | type | level | detail | count | version | year })`. `error.message` → `{{detail}}`.

## Adım 2 — patch sayaçları + idempotency

Komut: `node scripts/i18n-add-keys.mjs scripts/i18n-patches/<file>.json`

| patch | 1. koşu | 2. koşu |
|---|---|---|
| `p2a-driver-common.json` | added=24 skipped_lang=3 files=8 | identical=24 skipped_lang=3 **0 değişiklik** |
| `p2a-driver-screens.json` | added=344 skipped_lang=43 files=8; sonra 2 key için added=16 skipped_lang=45 | identical=360 **0 değişiklik** |
| `p2a-time-ago.json` | added=48 skipped_lang=6 files=8 | identical=48 **0 değişiklik** |
| `p2a-wifi-errors.json` | added=40 skipped_lang=5 files=8 | identical=40 **0 değişiklik** |

24+344+48+40 = 456 ilk yazım (8 dil × key; KU yok). screens ikinci ek 16 = 2 key × 8 dil.

TR/EN/NL: Cursor. DE/FR/ES/IT/BG: Cursor + **SUSPECT**. KU: hiç yazılmadı.

### SUSPECT

DE/FR/ES/IT/BG tüm 59 yeni key (çeviri Cursor; native review yok).

### KU_OMITTED (59)

`ku.json` bu pakette değişmedi (tr fallback). Liste: `common.copyright`, `common.unknown`, `driverSettings.version`, 45 `p2a-driver-screens` key, 6 `time.ago.*`, 5 `deviceSetup.wifi.errors.*`.

## Adım 3 — kod

- Desen: dosyanın kendi `useTranslation` / mevcut `t` kancası. VehiclePicker ve WiFiPassword’a `useTranslation` eklendi.
- JSX/stil/`makeStyles` aritmetik yok.
- Sürüm: `expo-constants` (`package.json`’ta zaten var).
- Driver yerel `formatDate` kopyaları `toLocaleString` kullandığı için **`formatDateTime` olarak** `src/utils/helpers.js`’e yönlendirildi (`import { formatDateTime as formatDate }`). Admin kopyaları P2-b.
- helpers `localeMap`: tr-TR, en-GB, nl-NL, de-DE, fr-FR, es-ES, it-IT, bg-BG, **ku→tr-TR**. `formatDate` / `formatDateTime` / `formatTime` aynı locale. `formatNumber`/`formatCurrency` hâlâ `tr-TR` (bu paket dışı).
- `getTimeAgo`: `i18n.t("time.ago.*", { count })`. Şu an helpers dışında çağrı yok; yine de göç edildi.

## Adım 4 — doğrulama

### verify BEFORE / AFTER

BEFORE = main `67eafee` / P4 preflight (`docs/I18N_P4_PREFLIGHT.md`). AFTER = P2-a commit 3.

Beş kapı (P2-a tanımı): code-not-in-union, code-missing-in-tr, manifest-missing, interp, encoding.

| | BEFORE (`67eafee`) | AFTER (commit 3) |
|---|---|---|
| UNION | 2246 | **2305** (+59) |
| intersection | 1809 | **1809** (KU yok → kesişim aynı) |
| code keys not in union | **0** | **0** |
| code keys missing in tr | **0** | **0** |
| manifest subkey missing | **0** | **0** |
| interp mismatches | **0** | **0** |
| encoding mojibake | **0** | **0** |
| errors / warnings | 2491 / (P4) | 2550 / 1914 |
| KU missing vs union | 303 | **362** (+59 KU_OMITTED) |

Dil tablosu AFTER:

```
lang  keys  missing  extra
tr    1999      306    190
en    2005      300    196
nl    2107      198    298
de    2024      281    215
fr    2024      281    215
es    2056      249    247
it    2038      267    229
bg    1999      306    190
ku    1943      362    134
```

`missing_key` (dil vs UNION) hâlâ hata sayılır — P4 ile aynı politika; P2-a beş kapı 0.

Dinamik kök `adminVehicles.fuelTypes` VehiclePicker + FuelEntry’de kullanılıyor; manifest’te zaten `ok`.

### Yeniden tarama

Driver kullanıcıya görünen göç seti = 0. Kalanlar Adım 0 “kapsam dışı” listesiyle eşleşir.

### expo export

```
npx expo export --platform ios --output-dir C:\Users\might\AppData\Local\Temp\p2a-ios-export
```

Exit 0. `iOS Bundled 8635ms index.js (2087 modules)`. Çıktı: `_expo/static/js/ios/index-09ef7f448719b4f45516371f0a1f2908.hbc` (7.9 MB). Repo ağacına yazılmadı.

### `git diff --stat` (`67eafee...HEAD`, rapor commit’inden önce)

```
 scripts/i18n-patches/p2a-driver-common.json  |  32 ++
 scripts/i18n-patches/p2a-driver-screens.json | 452 +++++++++++++++++++++++++++
 scripts/i18n-patches/p2a-time-ago.json       |  62 ++++
 scripts/i18n-patches/p2a-wifi-errors.json    |  52 +++
 src/constants/config.js                      |  27 +-
 src/locales/bg.json                          |  77 ++++-
 src/locales/de.json                          |  77 ++++-
 src/locales/en.json                          |  77 ++++-
 src/locales/es.json                          |  77 ++++-
 src/locales/fr.json                          |  77 ++++-
 src/locales/it.json                          |  77 ++++-
 src/locales/nl.json                          |  77 ++++-
 src/locales/tr.json                          |  77 ++++-
 src/screens/driver/DriverDashboard.js        |  11 +-
 src/screens/driver/DriverProfile.js          |  21 +-
 src/screens/driver/DriverSettings.js         |  21 +-
 src/screens/driver/DriverTaskDetail.js       |  22 +-
 src/screens/driver/FuelEntryScreen.js        |  21 +-
 src/screens/driver/TaskOfferDetail.js        |  20 +-
 src/screens/driver/TaskOffers.js             |  20 +-
 src/screens/driver/VehiclePickerScreen.js    |  65 ++--
 src/screens/driver/WiFiPasswordScreen.js     |  98 +++---
 src/utils/helpers.js                         |  45 ++-
 23 files changed, 1386 insertions(+), 199 deletions(-)
```

İzinli yollar: `src/screens/driver/**`, `src/utils/helpers.js`, `src/constants/config.js`, `src/locales/*.json`, `scripts/i18n-patches/p2a-*`, `docs/`. `ku.json`, `package.json`, Admin / DeviceSetup / Superadmin / navigation yok.

## Kapsam dışı bulgular (P2-b / P2-c / P2-d)

| aday | kanıt | kova |
|---|---|---|
| `src/screens/driver/DeviceSetupScreen.js` concat Alert’ler | :462 Bluetooth, :586 Tarama, :727 Bağlantı, :847 WiFi, :989 Serial | P2-c |
| `src/services/bleService.js` WIFI TR kopyası | :1003–1021 `errorMessages`; WIFI_TIMEOUT/INVALID_* | P2-c |
| `WIFI_ERROR_MESSAGES` tüketicisi yok | import yok; bleService kendi map’i | P2-c bağla |
| Admin `formatDate` / `localeMap` kopyaları | AdminTasks.js:186, AdminReportsScreen.js:48, VehicleTrackScreen.js:325, RecentFuelRecords.js:28 (`tr-TR`) | P2-b |
| Superadmin `toLocaleDateString("tr-TR")` | CompaniesScreen, DeviceDetail, PlatformUsers, SuperAdminCompanies | P2-d |
| `constants/config.js` (kök) `ALERT_TYPES` | :142 hâlâ duruyor | P2-b/d temizlik |
| DriverSettings gizlilik EN + destek mailto TR | :457, :878–914 | P2 follow-up (yasal/e-posta) |
| FuelEntry sayı `toLocaleString("tr-TR")` | :485+ | P2 sayı/locale |
| HelpCenter/LED/Welcome marka ve GPIO | e-posta, URL, donanım | P2-c yardım / dokunma |
| `getTaskStatusText` helpers.js:113 TR map | `Bekliyor`… | P2 helper (bu paket getTimeAgo/formatDate) |

## Fiziksel test (Driver × TR/EN/NL)

Sonuç sütunu boş — cihaz doğrulaması bu oturumda yok.

| ekran | TR | EN | NL |
|---|---|---|---|
| VehiclePickerScreen (liste, boş, atama Alert, BLE yok, overlay) | | | |
| WiFiPasswordScreen (manuel + RSSI, validasyon Alert, status, başarı) | | | |
| DriverProfile footer sürüm + © (yıl sistem, sürüm 2.0.7) | | | |
| DriverSettings about subtitle + footer sürüm + © | | | |
| FuelEntry last-record KM/Litre/Tüketim + yakıt tipi chip | | | |
| DriverDashboard dış link hata Alert | | | |
| TaskOffers / TaskOfferDetail tarih satırları | | | |
| DriverTaskDetail tarih satırları | | | |

KU: key yok → tr fallback; ayrı satır yok.

## `git status --short`

Rapor commit’inden sonra boş beklenir (yalnız `docs/I18N_P2A_REPORT.md` bu commit’te).
