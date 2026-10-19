# SESSION_NOTE.md — cebi-mobile

Bu dosya, `cebi-mobile` üzerinde yapılan çalışma oturumlarının kronolojik günlüğüdür (yeni kayıtlar en üste eklenir). `FORK_BASELINE.md` fork'un "doğum sertifikası"dır ve sabittir; bu dosya ise ilerleyen her oturumun hikayesini, karşılaşılan hataları ve çözümlerini tutar — standart: `SESSION_NOTE.md` + `FORK_BASELINE.md` + ADR, başka doküman türü eklenmez.

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
