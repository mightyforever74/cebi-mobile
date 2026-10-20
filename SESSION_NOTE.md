# SESSION_NOTE.md — cebi-mobile

Bu dosya, `cebi-mobile` üzerinde yapılan çalışma oturumlarının kronolojik günlüğüdür (yeni kayıtlar en üste eklenir). `FORK_BASELINE.md` fork'un "doğum sertifikası"dır ve sabittir; bu dosya ise ilerleyen her oturumun hikayesini, karşılaşılan hataları ve çözümlerini tutar — standart: `SESSION_NOTE.md` + `FORK_BASELINE.md` + ADR, başka doküman türü eklenmez.

## 2026-10-20 (devam) — Yeni risk bulundu ve kapatıldı: `eas.json`'daki tüm build profilleri ana projenin API adresine işaret ediyordu

**Bağlam:** Risk #16 testi için driver kullanıcısı + test seferi oluşturulup gerçek telefonda giriş denendi — "sessizce kalıyor" (hata mesajı yok, login hiç olmuyor).

**Kök neden (kod okunarak doğrulandı):** `src/constants/config.js`, `EXPO_PUBLIC_API_URL`'i build-time env'den okuyor, eksikse boş string dönüp ADR-CE-03 gereği hiçbir sabit adrese fallback yapmıyor (bilinçli tasarım). Ama `eas.json`'daki `development`/`preview`/`production` profillerinin hepsinde `EXPO_PUBLIC_API_URL`/`API_URL` hâlâ ana projenin adresiydi (`https://api.tulipfleet.com`, `development`'ta ise ana projenin sunucu IP'si `http://46.224.1.192:3000`) — Risk #14/paket kimliği ile aynı aile: fork sırasında birebir taşınmış, hiç güncellenmemişti. Demin alınan `preview` build'i bu yüzden `cebi-api.tulipfleet.com`'a değil, ana projenin backend'ine istek atıyordu — `driver@cebi-test.local` orada olmadığından login sessizce başarısız oluyordu.

**Yapılan (bu commit):** Üç profilin de `EXPO_PUBLIC_API_URL`/`MQTT_HOST` değerleri `https://cebi-api.tulipfleet.com`'a çevrildi. `staging` profiline dokunulmadı — Cebi'nin ayrı bir staging ortamı yok, bu profil şu an kullanılmıyor/anlamsız, ileride gerekirse ele alınır.

**Sonuç — YENİ BİR BUILD GEREKİYOR:** Bu değişiklik build-time env'e gömülüyor, mevcut kurulu APK'da düzelmez. `npx eas-cli build --platform android --profile preview` tekrar çalıştırılıp yeni APK telefona kurulmalı.

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
1. **Firebase config artık uyuşmuyor:** `google-services.json` (kök + `android/app/`) ve `GoogleService-Info.plist` hâlâ `package_name`/`BUNDLE_ID: com.tulipfleet.app` taşıyor. Google Services Gradle plugin paket adı eşleşmesini build-time'da zorunlu kılıyor — bu dosyalar güncellenmeden Android build'i düşer. Çözüm: Cem, mevcut `cebi-mobile` Firebase projesinde (proje no `631643994904`) `com.tulipfleet.cebi` paket adıyla yeni bir Android app + (varsa) iOS app kaydetmeli, yeni `google-services.json`/`GoogleService-Info.plist` dosyalarını indirip buraya iletmeli.
2. **Maps key kısıtlamaları:** `cebi-mobile-maps-android`/`-ios` key'leri eski paket/bundle adına kısıtlı (Risk #14 notunda kayıtlı) — Google Cloud Console'da kısıtlamalar `com.tulipfleet.cebi`'ye güncellenmeli, yoksa Maps istekleri `REQUEST_DENIED` döner.
3. **EAS projesi paylaşılıyor (yeni bulgu, henüz çözülmedi):** `app.json`'daki `extra.eas.projectId` (`7c0ea9e5-7cc1-4723-ad38-3fbe23256d50`) ve `updates.url`, `tulipfleet-qa/BUILD.md`'de kayıtlı ana projenin EAS projesiyle **aynı** (`mightyforever / tulipfleet`, aynı `7c0ea9e5` öneki). Bu oturum EAS CLI'ya kimlik doğrulayamıyor (Expo hesap girişi gerektiriyor); Cem'in kendi ortamında `eas init` ile cebi-mobile'a ayrı bir EAS projesi bağlaması, ya da en azından `eas update`'i hiç bu projeden çalıştırmaması gerekiyor — aksi halde OTA update kanalı ana app'inkiyle çakışabilir. Bloklayıcı değil (henüz hiçbir cebi-mobile build/update denenmedi) ama native build'den önce netleşmeli.

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
