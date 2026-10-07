# Sürücü görevleri — 7 Ekim düzeltmeleri

Branch: `fix/driver-tasks-oct7` (main `f99c4f8`).
Kod: üç ekran. Sözlük dosyası değişmedi. OTA yok. Merge yok. Prod görev durumu değiştirilmedi.

## a) Adres metni

`DriverTaskDetail.js` `getOrigin` / `getDestination` (`route_json.origin` / `destination` doluysa) değeri olduğu gibi döndürüyordu. HERE önbelleği bu alanları `{lat,lng,label}` nesnesi olarak yazabiliyor; nesne `<Text>` çocuğu olunca React Native çöküyor (`routeAddress`, satır 837 ve 856).

Artık yalnız kırpılmış boş olmayan string kabul ediliyor. Nesne veya `null` ise `start_location` / `end_location` deneniyor, o da string değilse `taskDetail.info.notSpecified`.

`DriverRouteMapScreen` zaten `route_json.origin` / `destination` nesnelerini metin olarak basmıyordu (yorum: koordinat objesi). `getStartLocation` / `getEndLocation` yalnızca `start_location` / `end_location` okuyor. Aynı string koruması oraya da eklendi; `prepareWaypoints` koordinatları sayı olarak kullanmaya devam ediyor, `<Text>` içine girmiyor.

## b) Haritaya Git - Başlat

`DriverTasks.js` kart aksiyonu `status === "accepted"` idi. Koşul `accepted` veya `assigned`. Etiket `tasks.goToMapStart` (tr: «Haritaya Git - Başlat»). `in_progress` kartı aynı butonu kullanmıyor; «Haritaya Devam Et» / «Vazgeç» duruyor.

## c) Tamamlanan rozet metni

`statusKey` boş değil. `getStatusLabel` `tasks.statuses.${statusKey}` okuyor. tr: `completed` = «Tamamlandı» (satır 663), `cancelled` = «İptal» (satır 667). `returnEmptyString` yok; `fallbackLng` tr.

Rozet metni ve ikon rengi `COLORS.SUCCESS` / `COLORS.ERROR`, zemin `COLORS.INPUT_SUCCESS` / `COLORS.INPUT_ERROR` idi. Koyu temada bu çiftler aynı hex:

| token | koyu |
|---|---|
| `SUCCESS` ve `INPUT_SUCCESS` | `#34D399` |
| `ERROR` ve `INPUT_ERROR` | `#F87171` |

Metin zeminin üstünde duruyor, erişilebilirlik ağacı stringi taşıyor, göz görmüyor. Açık temada `SUCCESS` `#2DCE89`, `INPUT_SUCCESS` `#7BDEB2` olduğu için metin zaten okunuyordu. `Theme.js` değiştirilmedi. `completed`, `cancelled` ve aynı çarpışmayı taşıyan `rejected` zeminleri `withAlpha(COLORS.SUCCESS|ERROR, 0.18)`.

## Doğrulama

`node scripts/verify-i18n.mjs`: `PASS errors=0 warnings=670` (ku eksik anahtarlar, beklenen). tr referans 2479 anahtar. Sözlük dosyası yazılmadı.

Emülatör `emulator-5554`, debug dev client, Metro `10.0.2.2:8081`. Oturum: Dobbe sürücüsü, arayüz Türkçe. Rozet kanıtı için Ayarlar’dan karanlık mod açıldı.

| görüntü | ne |
|---|---|
| `docs/screenshots/driver-tasks-oct7/01-active-tlp-26-00003.png` | Aktif kart, karanlık mod |
| `docs/screenshots/driver-tasks-oct7/02-task-detail.png` | Detay açıldı; başlangıç ve varış adres string |
| `docs/screenshots/driver-tasks-oct7/03-completed-tamamlandi.png` | Tamamlanan sekmesi, «Tamamlandı» okunuyor |
| `docs/screenshots/driver-tasks-oct7/04-cancelled-iptal.png` | TLP-26-00002 rozeti «İptal» |

TLP-26-00003 canlıda `in_progress` («Devam Ediyor»). Aktif sekmede tek kart bu. «Haritaya Git - Başlat» yalnız `accepted` / `assigned` için; bu kartta «Vazgeç» ve «Haritaya Devam Et» görünüyor. Durumu prod’da değiştirip butonu zorlamak yapılmadı. Kabul edilmiş veya atanmış başka kart olmadığı için o butonun ekran görüntüsü yok.

Detay (`02-task-detail.png`) karanlık moda geçmeden önce, aynı Metro paketinde alındı. Adresler `<Text>` içinde string; nesne çocuk hatası yok.

## Emülatör notu

Release imzalı uygulama kalkıp debug dev client kuruldu; önceki release oturumu silindi. Debug APK sığsın diye emülatörden bir kısım önceden yüklü uygulama kaldırıldı (YouTube, Fotoğraflar, Chrome, Gmail, Dokümanlar, YouTube Music, Haritalar, Arama, Mesajlar, Wellbeing, Play Store, Gearhead, TTS). AVD’yi sıfırlamak bu uygulamaları geri getirir. Karanlık mod bu oturumda açık bırakıldı.
