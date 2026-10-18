# SESSION_NOTE.md — cebi-mobile

Bu dosya, `cebi-mobile` üzerinde yapılan çalışma oturumlarının kronolojik günlüğüdür (yeni kayıtlar en üste eklenir). `FORK_BASELINE.md` fork'un "doğum sertifikası"dır ve sabittir; bu dosya ise ilerleyen her oturumun hikayesini, karşılaşılan hataları ve çözümlerini tutar — standart: `SESSION_NOTE.md` + `FORK_BASELINE.md` + ADR, başka doküman türü eklenmez.

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
