# SESSION_NOTE.md — cebi-mobile

Bu dosya, `cebi-mobile` üzerinde yapılan çalışma oturumlarının kronolojik günlüğüdür (yeni kayıtlar en üste eklenir). `FORK_BASELINE.md` fork'un "doğum sertifikası"dır ve sabittir; bu dosya ise ilerleyen her oturumun hikayesini, karşılaşılan hataları ve çözümlerini tutar — standart: `SESSION_NOTE.md` + `FORK_BASELINE.md` + ADR, başka doküman türü eklenmez.

## 2026-10-20 (akşam) — Harita beyaz ekran arızası: kök neden ESP32 konum vermemesiydi (credential DEĞİL), DriverRouteMapScreen'e telefon GPS fallback'i eklendi

**Bağlam:** Gerçek cihazda (ADR-CE-02 §4.2 kapsamında, ilk kez) harita ekranı test edilirken tamamen boş/beyaz kaldığı rapor edildi (grid yok, Google logosu yok, zoom butonu yok; alttaki rota kutusu görünüyordu). Önce bu, Risk #14/#15'in (19–20 Ekim paket kimliği + Maps/Firebase credential ayırımı) eksik kalan bir tarafı sanılıp uzun bir süre o yönde incelendi.

**Dışlanan ihtimaller (hepsi tek tek doğrulandı, sorun bunlarda değildi):**
- `cebi-mobile-maps-android` key'inin Application restriction'ı: paket adı `com.tulipfleet.cebi` ve SHA-1 doğru (Console'dan teyit edildi).
- Kurulu APK'nin gerçek imzalama sertifikasının SHA-1'i (`apksigner verify --print-certs` ile çıkarıldı: `746864bdbecc09459a6f6981ebf2f4c323d345d0`) key kısıtlamasıyla birebir eşleşiyor.
- `cebi-mobile` GCP projesinde billing hesabı aktif (Paid account, `013EA7-88C2C2-65AF28`) ve Maps SDK for Android enabled.
- Manifest/app.json'daki gömülü key değeri (`AIzaSyArByYajxwW3sbYamRU4QTy2nValdDxcmM`) Console'daki `cebi-mobile-maps-android` key'iyle aynı.
- Cihazın genel internet/DNS erişimi sorunsuz (tarayıcıdan `google.com/maps` açılıyor), VPN/firewall yok.

**Gerçek kök neden (filtresiz logcat ile bulundu):** Credential/ağ ile hiç ilgisi yoktu. Backend, test aracının (`eeb6b27c-3188-435d-bd8e-83031f97f4e4`) konumu istendiğinde `404 { error: "No location data", message: "ESP32 henuz konum gondermedi" }` döndürüyordu — yani o aracın ESP32 GPS takipçisi hiç konum göndermemişti. `DriverRouteMapScreen.js`'deki `getLocation()`/`pollLocation()`, `vehicleAPI.getLatestLocation()` başarısız olunca `location` state'ini `null` bırakıyordu; harita merkezlenecek koordinat bulamayınca boş/beyaz kalıyordu. Telefonun kendi GPS'i (fused_location_provider) ayrı çalışıp normal çalıştığı için bu, yanlışlıkla credential sorunu sanılmasına yol açtı.

**Yapılan (`8ee34bd`):** `src/screens/driver/DriverRouteMapScreen.js`'e `getFallbackPhoneLocation()` eklendi — `vehicleAPI.getLatestLocation()` konum döndürmezse/hata verirse (hem ilk yükleme hem 7s'lik polling döngüsünde) `expo-location` ile telefonun kendi GPS'inden konum alınıp harita bu veriyle gösteriliyor; ESP32 gerçek veri göndermeye başladığında vehicleAPI sonucu normal akışta öncelikli kalmaya devam eder. `expo-location` zaten mevcut bağımlılık (`telemetrySync.js` de kullanıyor), yeni native paket eklenmedi — salt JS değişikliği, yeni native build şart değil (dev-client reload ya da `eas update` OTA yeterli). `npm test`'teki syntax kontrolü (`node --check`) geçti.

**Ayrıca rastlantısal bulunan, bu oturumda dokunulmayan iki açık konu:**
1. Repo genelinde (~229 dosya) çalışma kopyası (CRLF) ile git nesneleri (LF) arasında satır sonu tutarsızlığı tespit edildi — muhtemelen Cem'in kendi git/`core.autocrlf` ayarları bunu şeffafça gizliyor (kendi `git status`'u temiz görünebilir), ama başka bir ortamdan (ör. bu oturumun bağlandığı shell) bakıldığında hepsi değişmiş görünüyor. Gerçek içerik değil, sadece satır sonu temsili — ileride `.gitattributes` ile netleştirilebilir.
2. `android/app/src/main/AndroidManifest.xml` ve `android/app/src/main/res/values/strings.xml`'de commit edilmemiş yerel değişiklikler var (muhtemelen eski bir `expo prebuild` çalıştırmasından kalma) — manifest'teki değişiklik, ADR-CE-02 §4.2'yi açıklayan bir yorum satırının kaybolması (izin satırının kendisi hâlâ duruyor). Cem'in kendi ortamında incelemesi/karar vermesi gerekiyor.

---
## 2026-10-20 (devam) — Yeni risk bulundu ve kapatıldı: `eas.json`'daki tüm build profilleri ana projenin API adresine işaret ediyordu

**Bağlam:** Risk #16 testi için driver kullanıcısı + test seferi oluşturulup gerçek telefonda giriş denendi — "sessizce kalıyor" (hata mesajı yok, login hiç olmuyor).

**Kök neden (kod okunarak doğrulandı):** `src/constants/config.js`, `EXPO_PUBLIC_API_URL`'i build-time env'den okuyor, eksikse boş string dönüp ADR-CE-03 gereği hiçbir sabit adrese fallback yapmıyor (bilinçli tasarım). Ama `eas.json`'daki `development`/`preview`/`production` profillerinin hepsinde `EXPO_PUBLIC_API_URL`/`API_URL` hâlâ ana projenin adresiydi (`https://api.tulipfleet.com`, `development`'ta ise ana projenin sunucu IP'si `http://46.224.1.192:3000`) — Risk #14/paket kimliği ile aynı aile: fork sırasında birebir taşınmış, hiç güncellenmemişti. Demin alınan `preview` build'i bu yüzden `cebi-api.tulipfleet.com`'a değil, ana projenin backend'ine istek atıyordu — `driver@cebi-test.local` orada olmadığından login sessizce başarısız oluyordu.

**Yapılan (bu commit):** Üç profilin de `EXPO_PUBLIC_API_URL`/`MQTT_HOST` değerleri `https://cebi-api.tulipfleet.com`'a çevrildi. `staging` profiline dokunulmadı — Cebi'nin ayrı bir staging ortamı yok, bu profil şu an kullanılmıyor/anlamsız, ileride gerekirse ele alınır.

**Sonuç — YENİ BİR BUILD GEREKİYOR:** Bu değişiklik build-time env'e gömülüyor, mevcut kurulu APK'da düzelmez. `npx eas-cli build --platform android --profile preview` tekrar çalıştırılıp yeni APK telefona kurulmalı.

---

## 2026-10-20 (geriye dönük kayıt, 21 Ekim'de eklendi) — Firebase config paket adına güncellendi

**Not:** Bu iki commit (`fef9c5e`, `e446cff`, 12:57-13:02) aşağıdaki "paket kimliği" kaydının AÇIK RİSK #1 maddesini aynı gün kapatmıştı, ama o sırada burada ayrı bir giriş olarak kaydedilmemişti — 21 Ekim'deki rapor/doküman doğrulama turunda fark edildi, geriye dönük işleniyor.

**Yapılan:** Cem, mevcut `cebi-mobile` Firebase projesinde (`631643994904`) yeni paket adıyla (`com.tulipfleet.cebi`) bir Android app + bir iOS app (bundle ID `com.tulipfleet.cebi`) kaydetti.
- `fef9c5e`: kök + `android/app/` `google-services.json`'a yeni client eklendi — dosya artık hem eski (`com.tulipfleet.app`) hem yeni client'ı taşıyor, Google Services Gradle plugin build anında `applicationId`'ye göre doğru olanı seçiyor.
- `e446cff`: `GoogleService-Info.plist` güncellendi — `API_KEY`/`GOOGLE_APP_ID` yeni app'e ait, `BUNDLE_ID` artık `com.tulipfleet.cebi`.

**Sonuç:** Firebase config paket/bundle adı artık tutarlı — bu madde kapandı. Maps key restriction ve EAS projectId ayrışması da kapandı — detay aşağıdaki madde 2-3'te ve dosyanın en üstündeki "21 Ekim" kaydında.

---

## 2026-10-20 — Yeni risk bulundu ve kapatıldı: paket kimliği (`applicationId`/`bundleIdentifier`) ana `tulipfleet` ile birebir aynıydı

**Bağlam:** Cem, ana `tulipfleet` reposunda yapılan bir GitHub Actions build/Play Console yayını konuşulurken şu soruyu sordu: "yeni mobil app için yaptığımız build'i isim değiştirmeden ana mobil app yerine paste edecek şekilde mi yaptın?" Kontrol edilince o build'in cebi-mobile'a hiç dokunmadığı doğrulandı, ama soru gerçek ve o ana kadar belgelenmemiş bir riski ortaya çıkardı.

**Bulgu (kod okunarak doğrulandı, Risk #14 kapanışında atlanmış):** `android/app/build.gradle` (`applicationId`/`namespace`) ve `app.json` (`ios.bundleIdentifier`/`android.package`) hâlâ `com.tulipfleet.app` — ana projeyle birebir aynı. Risk #14 (19 Ekim) sadece Firebase/Maps credential'larını ayrıştırmıştı, paket kimliğine dokunmamıştı. Sonuç: bu haliyle bir build alınıp mağazaya/gerçek cihaza gönderilse, Google Play/Apple bunu "aynı uygulamanın güncellemesi" sayar — farklı imzalama anahtarıyla reddedilir, ya da (daha kötü) aynı imzalama kimlik bilgileri yanlışlıkla kullanılırsa canlı ana uygulamanın üzerine yazılması mümkündü. ADR-CE-03'ün "Bağımsız Çalışma Zamanı" ilkesini ihlal ediyordu.

**Cem'in kararı:** Yeni paket adı `com.tulipfleet.cebi` onaylandı.

**Yapılan (bu commit):**
- `android/app/build.gradle`: `namespace`/`applicationId` → `com.tulipfleet.cebi`.
- `app.json`: `ios.bundleIdentifier`, `android.package` → `com.tulipfleet.cebi`.
- `android/app/src/main/java/com/tulipfleet/app/{MainActivity,MainApplication}.kt` → dizin `com/tulipfleet/cebi/`'ye taşındı, `package` bildirimleri güncellendi.
- `.env.example`: kullanılmayan (hiçbir script tarafından okunmuyor, grep ile doğrulandı) `IOS_BUNDLE_ID`/`PACKAGE_NAME` placeholder'ları tutarlılık için güncellendi.

**AÇIK RİSK — bu commit build'i KIRAR, ayrıca ele alınmalı (Cem'in Console erişimi gerekiyor):**
1. ~~**Firebase config artık uyuşmuyor**~~ → **aynı gün (20 Ekim, 12:57-13:02) kapandı**, bkz. aşağıdaki "Firebase config paket adına güncellendi" kaydı.
2. ~~**Maps key kısıtlamaları**~~ → **kapandı.** Cem, 21 Ekim'de Google Cloud Console'u bizzat kontrol etti: `cebi-mobile-maps-android` key'i ayrı `cebi-mobile` GCP projesinde, Application restriction = Android apps, kayıtlı tek paket `com.tulipfleet.cebi` + doğru debug SHA-1 (`74:68:64:BD:...`), API kısıtlaması yalnızca "Maps SDK for Android". Bu madde muhtemelen Risk #14 kapanışı (19 Ekim) sırasında zaten doğru kurulmuştu — bu dosyada hiç ayrı not düşülmediği için 3 kez "hâlâ açık" diye yanlış raporlandı. Ders: Console/harici sistem durumunu doğrulamadan "açık" diye tekrar etme.
3. ~~**EAS projesi paylaşılıyor**~~ → **21 Ekim'de kapandı.** `app.json`'daki `name`/`slug` ("TulipFleet"/"tulipfleet") ve `extra.eas.projectId`/`updates.url` ayrıştırıldı (commit `74c5da0`); Cem kendi ortamında `npx eas-cli init` çalıştırdı, yeni ve tamamen bağımsız proje oluştu: `@mightyforever/cebi-mobile`, projectId `14378253-7bd3-451e-98bc-3ee3b59376a5` (commit `4549e1f`). Artık `eas update`/`eas build` ana `tulipfleet` projesiyle hiçbir şekilde kesişmiyor.

**Yapılmadı (kapsam dışı, not edildi):** `docs/I18N_P0_DISCOVERY.md`'deki eski paket adı referansları — o doküman 18 Ekim'deki bir keşif raporu, geçmişe dönük sabit kayıt, güncellenmedi.

---

## 2026-10-19 (öğleden önce) — Risk #14 kapatıldı: `cebi-mobile`, ana `tulipfleet` ile paylaşılan Firebase/Maps credential'larından ayrıştı

**Bağlam:** 18 Ekim gece bulunan açık (bkz. aşağıdaki "GitGuardian" kaydı) planlanan iyileştirme olarak bırakılmıştı — bu turda Cem'in sağladığı yeni credential'larla kapatıldı.

**Cem'in yaptığı (Console'dan elle):** Yeni, boş Firebase projesi oluşturuldu (`cebi-mobile`, proje numarası `631643994904`), Maps Platform etkinleştirildi, iki kısıtlı Maps key üretildi (`cebi-mobile-maps-android`: paket adı + **debug keystore SHA-1** kısıtlı; `cebi-mobile-maps-ios`: bundle ID kısıtlı). `google-services.json`/`GoogleService-Info.plist` + iki key değeri Claude'a iletildi.

**Yapılan (3 commit):**
1. `3d0991c` — kök `google-services.json`/`GoogleService-Info.plist`, eski paylaşılan `tulipfleet-523be` projesinden yeni `cebi-mobile` projesine değiştirildi.
2. `f0ef8b9` — `app.json`'daki `ios.config.googleMapsApiKey` ve `android.config.googleMaps.apiKey`, yeni iki kısıtlı key'e çevrildi. Kod doğrulaması: `cebi-mobile`'da `@react-native-firebase` bağımlılığı yok, push `expo-notifications` üzerinden gidiyor — Maps-only key kısıtlaması başka bir şeyi kırmıyor.
3. `cb53858` — **kritik tamamlayıcı düzeltme:** ilk iki commit sadece proje-kökü güncelledi, ama `cebi-mobile`'ın CI'si (`android-build.yml`) `expo prebuild` ÇALIŞTIRMIYOR, doğrudan commit'lenmiş `android/` klasöründen build alıyor (ana `tulipfleet` ile aynı desen, bkz. `tulipfleet-qa/BUILD.md` §14.14). Gerçek Gradle `google-services` plugin'inin okuduğu `android/app/google-services.json` ve `AndroidManifest.xml`'deki hardcoded `com.google.android.geo.API_KEY` meta-data hâlâ eski projeye işaret ediyordu — ikisi de ayrıca düzeltildi, yoksa gerçek derlenen AAB eski paylaşılan credential'ları taşımaya devam edecekti.

**Açık alt-risk (kod değişikliği gerektirmiyor, ileride ele alınacak):** Android Maps key şu an sadece **debug keystore SHA-1**'ine kısıtlı — `cebi-mobile` kendi gerçek release imzalama anahtarıyla (henüz yok, Play Console listesi yok) ilk kez yayına çıkarken bu SHA-1 de key kısıtlamasına eklenmeli, aksi halde release build'de Maps `REQUEST_DENIED` döner.

---

## 2026-10-19 — Offline-First / dayanıklılık: önce düzeltme (kuyruk zaten vardı), sonra 2 somut gerçek açık kapatıldı

**Cem'in talimatı:** "Offline-First & Local Cache" başlığına geçelim (donanım bağımsız, kod tabanında ilerleyebileceğimiz bir iş).

**Önce düzeltme (kod yazmadan önce, repo taraması ile):** Cem'in tarif ettiği "GPS/telemetri verisini yerel SQLite/AsyncStorage'da saklayıp internet gelince flush etme" davranışı **ZATEN TAMAMEN MEVCUTTU** — ADR-CE-02 işinde (`telemetryQueue.js`, AsyncStorage'a kalıcı kuyruk, `clientPingId` ile idempotent flush, uygulama öldürülse/yeniden açılsa bile kuyruk kaybolmuyor). Bu, yeniden yazılacak bir şey değildi; bunun yerine repo taramasıyla bulunan 2 SOMUT, gerçek açık ele alındı:

**1. `@react-native-community/netinfo@11.4.1` package.json'da kuruluydu ama repo genelinde SIFIR kullanımı vardı (grep ile doğrulandı).** İki yerde kullanıma alındı:
- `telemetryFlush.js`: `flushQueue` artık once `NetInfo.fetch()` ile kesin offline durumunu kontrol ediyor, kesin offline ise denemeden çıkıyor (zayıf sinyal bölgelerinde her 20s'de bir boşuna fetch deneyip radyo uyandırmayı/batarya tüketmeyi önler). `isConnected` null/belirsizse YİNE DE dener (graceful degradation ile aynı ilke: şüpheli durumda engelleme).
- `telemetrySync.js`: `startTracking` artık `NetInfo.addEventListener` ile offline→online geçişini dinliyor, FLUSH_INTERVAL_MS (20s) beklemeden hemen flush tetikliyor (uzun offline dönem sonrası senkronizasyon gecikmesini azaltır). `stopTracking`'de temizleniyor.

**2. Gerçek dayanıklılık açığı (kod taramasıyla doğrulandı, varsayım değil): uygulama bir sefer "in_progress" iken öldürülüp yeniden açılırsa, foreground GPS takibi OTOMATIK DEVAM ETMİYORDU.** `startTracking` çağrısı sadece `DriverRouteMapScreen.js`'in mount-effect'inden geliyor; sürücünün rolünün varsayılan/initial ekranı `DriverDashboard.js` (AppNavigator.js/MainNavigator.js ile doğrulandı) ve hiçbir yerde soğuk açılışta "aktif bir göreve geri dön" mantığı yoktu — sürücü manuel olarak göreve tekrar girene kadar takip durmuş kalıyordu. Düzeltme: `DriverDashboard.js`'in zaten her focus'ta (ilk soğuk açılış dahil) çalışan `fetchDashboardData`'sına `resumeActiveTrackingIfNeeded` eklendi — kalıcı `activeTrackingTaskId`'yi hâlâ `in_progress` olan bir görevle eşleştirip sürücüyü otomatik olarak `Navigation` (DriverRouteMapScreen) ekranına geri gönderiyor; eşleşme yoksa (görev tamamlanmış/iptal/başka sürücüye atanmış) bayat state temizleniyor. `isTracking()` ile bu JS context'inde takip zaten aktifse (Drawer'da Dashboard'a geçilmiş ama RouteMap arka planda hâlâ mount'luysa) müdahale edilmiyor.

**Açık soru (Cem'e, kod değiştirilmedi):** `telemetryQueue.js`'teki `MAX_QUEUE_SIZE=2000` mevcut ping aralığında (~10s) ~5.5 saatlik offline kapasiteye denk geliyor; tam günlük bir sefer boyunca sürekli zayıf sinyal olursa en eski ping'ler sessizce düşer. Bu sınır yeterli mi, yoksa yükseltilsin mi?

**Doğrulama:** `npm test` (node --check zinciri, `DriverDashboard.js` eklendi): tümü geçti. Gerçek NetInfo bağlantı durumu/kesinti senaryosu cihazda test edilmedi (bu session'da cihaz erişimi yok, aynı ADR-CE-02 §4.2 kısıtı).

## 2026-10-18 (gece) — GitGuardian: Google Maps API Key sızıntısı tespit/analiz edildi, acil değil kararı verildi

**Tetikleyici:** `cebi-backend`'de HERE_API_KEY tedariki sürerken, GitGuardian `mightyforever74/cebi-mobile` reposu için "Google API Key exposed on GitHub" uyarısı gönderdi (push: 2026-10-18 16:31:31 UTC).

**Bulgu:** Uyarı `app.json`'daki `googleMapsApiKey` değerine işaret ediyordu (`AIzaSyCiMevsW6CTrW6gNT284njKrJt6RzTLQTY`, hem iOS `config.googleMapsApiKey` hem Android `config.googleMaps.apiKey` alanında aynı değer). Bu dosya `.gitignore`'da değil, repo'da açık commit edilmiş durumda (Expo/React Native projelerinde bu normal bir pratik — gizlilik secrecy'ye değil restriction'a dayanır).

**Kritik teyit (tahmin etmeden, repo karşılaştırmasıyla):** Ana proje (`mightyforever74/tulipfleet`) bu oturumda bağlanıp `app.json` kontrol edildi — HEAD'i hâlâ `cebi-mobile`'ın fork edildiği commit'te (`b51570a8e...`) duruyor ve **aynı key'i içeriyor**. Yani bu key hem canlı, App Store/Play Store'da yayında olan ana TulipFleet mobile app'in hem de `cebi-mobile`'ın key'i — henüz ADR-CE-03 gereği ayrışmamış. **Bu nedenle key silinmedi/regenerate edilmedi** — bu, canlı production app'in Maps özelliğini anında kırardı (kullanıcıların elindeki build'ler key'i binary'ye gömülü taşıyor).

**Key'in nerede yaşadığı bulundu:** `gcloud` CLI kuruldu (`fleet-enterprise-01` üzerine, `google-cloud-cli` apt paketi) ve Cem'in Google hesabıyla (`mightyforever74@gmail.com`) `gcloud auth login --no-launch-browser` ile giriş yapıldı. Hesabın eriştiği 15 GCP projesi tek tek tarandı (`gcloud services api-keys list` + `get-key-string`, değerler hiç ekrana basılmadan sadece eşleşme kontrolü yapılarak). Key, ana Firebase projesinde (`tulipfleet-523be`) DEĞİL, ayrı bir projede (`project-456f98dd-c829-43cb-a70`, proje numarası `210470834270`) bulundu — key kaydı: `projects/210470834270/locations/global/keys/bd7f16dd-cc5f-462d-a33d-6c57cc6c3acf`, displayName `tulipfleet-backend-prod-2026-05`, createTime `2026-05-02` (daha önceki bir rotasyon commit'iyle, `4049de7` "fix: rotate Google Maps API key", tarih olarak örtüşüyor).

**Risk değerlendirmesi:** `gcloud services api-keys describe` ile key'in mevcut `apiTargets` restriction'ı görüldü — sadece 5 servise izinli: `directions-backend`, `geocoding-backend`, `maps-android-backend`, `maps-ios-backend`, `distance-matrix-backend`. Yani key zaten API-scope olarak dar — sızması durumunda saldırgan sadece bu 5 Maps Platform servisini TulipFleet'in faturasına/kotasına karşı kullanabilir, başka bir Google servisine veya hesap/veri erişimine yol açmaz. **Application restriction (Android paket adı / iOS bundle ID) yok** — ama bu key hem iOS hem Android için app.json'da paylaşıldığından, bir key'e ikisi birden (Android apps VE iOS apps) restriction olarak eklenemez (Google bu ikisini mutually exclusive tutuyor) — düzgün çözüm key'i platforma göre ikiye bölmek.

**Karar (Cem ile, bu oturumda):** Acil rotasyon/restriction yapılmadı — risk veri/hesap güvenliği değil, kota/maliyet suistimali seviyesinde ve zaten API-scope ile sınırlı. Planlanan, acil olmayan iyileştirme:
1. Bir sonraki mobile release'de: key'i Android-only (paket adı + SHA-1 restriction) ve iOS-only (bundle ID restriction) olarak ikiye böl, `app.json`'ı güncelle.
2. `cebi-mobile` için ADR-CE-03 gereği kendi ayrı Maps key'i (ve muhtemelen ayrı Firebase projesi — `GoogleService-Info.plist`/`google-services.json` da hâlâ ana projenin `tulipfleet-523be` Firebase projesine ait, henüz ayrıştırılmadı) oluşturulacak.
3. (Opsiyonel, düşük öncelik) Bu key için proje/API bazlı günlük kota sınırı değerlendirilebilir (maliyet tavanı için).

**Ayrıca not edilen, henüz çözülmemiş tali bulgu:** Fork sırasında `android/kotlin_log.txt` (95.64 MB) commit edilmiş durumda kalmış (bkz. `FORK_BASELINE.md` "Push sırasında tespit edilen bulgu") — bu oturumda dokunulmadı.
