# FORK_BASELINE.md — cebi-mobile

Bu dosya, `cebi-mobile` reposunun "doğum sertifikası"dır. Fork anındaki durumu sabitler; ilerleyen fazlarda değiştirilmez, sadece altına tarihli not eklenir.

| Alan | Değer |
|---|---|
| **Proje** | TulipFleet Customer Edition — Mobile (Sürücü + Tartı Memuru uygulaması) |
| **Fork tarihi** | 2026-10-18 |
| **Kaynak repo** | https://github.com/mightyforever74/tulipfleet |
| **Baseline branch** | `main` (kaynak `origin/main`) |
| **Baseline commit SHA** | `b51570a8e85ba57ab9425f09c6cf222ed68699fd` |
| **Baseline commit mesajı** | "sec: mqttService.js'deki sabit MQTT şifresi kaldırıldı (hardcoded key taraması)" |
| **Fork senaryosu** | Senaryo A — doğrudan `origin/main`'den |
| **Doğrulama** | Fork anında `git fetch origin main` ile drift kontrolü yapıldı: local HEAD ile `origin/main` birebir eşleşti. Push sonrası `git ls-remote origin main` ile aynı SHA doğrulandı. |
| **Kardeş repolar** | `cebi-backend` ← `tulipfleet-backend` @ `23bfa4e7252daac0bbc70a546384a8ccf5b275b1` · `cebi-dispatcher` ← `tulipfleet-dispatcher` @ `723f3a21f74d1935323b2b82ba75b73d379b0b5d` |
| **Merkezi ADR'ler** | `cebi-backend` reposunda, `/docs/adr/ADR-CE-01…04` — bu repoyu doğrudan ilgilendirenler: ADR-CE-01 (Mobil Konum Takibi), ADR-CE-02 (Mobil Telemetri İletimi) |
| **Faz 1 raporu** | Proje dokümanı: `claude/tulipfleet-customer-edition-faz1-kesif-raporu.md` |

## Push sırasında tespit edilen bulgu (temizlik adayı)

Push sırasında GitHub şu uyarıyı verdi: `android/kotlin_log.txt` — 95.64 MB (GitHub'ın 50 MB önerisinin üzerinde, 100 MB sert limitin altında; push başarılı oldu). Bu, commit edilmiş bir build/log artefaktı — ileride `.gitignore`'a eklenip geçmişten temizlenmesi (ayrı bir karar, history rewrite gerektirir) değerlendirilebilir.

## Bağımsızlık durumu

**2026-10-18 (fork anında):** `EXPO_PUBLIC_API_URL` ana projenin `api.tulipfleet.com`'una fallback yapıyordu (`src/constants/config.js`); ayrıca (fork sırasında fark edilmemiş, Faz 4'te bulunan) `DEV_API_URL` ve `WS_URL` ana projenin sunucu IP'sine (`46.224.1.192`) sabitlenmişti.

**2026-10-18 (Faz 4, commit `f159e12`) — düzeltildi:** Üç sabit değer de kaldırıldı. `EXPO_PUBLIC_API_URL` tanımsızsa artık sessizce ana projeye düşmüyor — boş döner ve açık bir hata loglanır (ADR-CE-03). Bu repo build edilip test edilecekse `.env`'de `EXPO_PUBLIC_API_URL` **zorunlu olarak** `cebi-backend`'in kendi adresine ayarlanmalı — henüz gerçek bir sunucu adresi yok (sunucu `fleet-enterprise-01` olarak kararlaştırıldı, domain/subdomain adlandırması açık — bkz. `cebi-backend/FORK_BASELINE.md`).

**2026-10-18 (gece) — henüz ayrışmamış, tespit edildi:** `app.json`'daki Google Maps API key (`googleMapsApiKey`/`config.googleMaps.apiKey`) ve `GoogleService-Info.plist`/`google-services.json`'daki Firebase credential'ları fork'tan aynen geldi — hâlâ ana projenin (`tulipfleet`, Firebase projesi `tulipfleet-523be`) kimlik bilgileri, Cebi'ye özel değil. GitGuardian'ın Maps key için verdiği sızıntı uyarısı analiz edilirken fark edildi (detay: `SESSION_NOTE.md`). ADR-CE-03 gereği bu ikisinin de ayrıştırılması gerekiyor — henüz yapılmadı, acil değil (mevcut key zaten API-scope restriction'lı, risk kota/maliyet seviyesinde).

**2026-10-19 — kapandı (Risk #14):** Ayrı, boş bir Firebase projesi (`cebi-mobile`, proje no `631643994904`) + iki kısıtlı Maps key (Android: paket adı+debug SHA-1; iOS: bundle ID) oluşturuldu; kök + `android/app/` `google-services.json`, `GoogleService-Info.plist`, `app.json`'daki Maps key'ler yeni projeye çevrildi. Detay/commit'ler: `SESSION_NOTE.md` "2026-10-19 (öğleden önce)".

**2026-10-20 — paket kimliği ayrıştı, 3 yeni açık madde çıktı, 1'i aynı gün kapandı:** `applicationId`/`bundleIdentifier` ana projeyle birebir aynıydı (`com.tulipfleet.app`) — `com.tulipfleet.cebi`'ye değiştirildi (commit `958dacf`). Bu değişiklik anında 3 maddeyi açtı: (1) Firebase config paket adıyla uyuşmuyor → **aynı gün kapandı**, aynı Firebase projesinde (`631643994904`) yeni paket adıyla Android+iOS app kaydedilip `google-services.json`/`GoogleService-Info.plist` güncellendi (commit `fef9c5e`, `e446cff`); (2) Maps key restriction'ları hâlâ eski paket/bundle adına kısıtlı — **açık**, Google Cloud Console'da güncellenmeli; (3) `app.json`'daki EAS `projectId` (`7c0ea9e5-7cc1-4723-ad38-3fbe23256d50`) hâlâ ana projeyle (`tulipfleet-qa`/`mightyforever/tulipfleet`) paylaşılan aynı ID — **açık**, native build öncesi ayrıştırılmalı (`eas init` veya bu projeden hiç `eas update` çalıştırılmaması). Detay: `SESSION_NOTE.md` "2026-10-20".

**2026-10-20 (devam) — yeni bulgu, kapandı:** `eas.json`'ın `development`/`preview`/`production` profillerinin hepsi hâlâ ana projenin API adresine (`api.tulipfleet.com`, `development`'ta ana sunucu IP'si) işaret ediyordu — fork sırasında taşınmış, hiç güncellenmemişti; gerçek cihazda sessiz login hatasına yol açtı. `cebi-api.tulipfleet.com`'a çevrildi (commit `0473125`). **Build-time env olduğundan mevcut kurulu APK'da düzelmez — yeni build gerekiyor.**

## Değişiklik günlüğü

| Tarih | Not |
|---|---|
| 2026-10-18 | Fork oluşturuldu, baseline sabitlendi. |
| 2026-10-18 | Faz 4: ana projeye ait sabit URL/IP fallback'leri kaldırıldı (commit `f159e12`). |
| 2026-10-18 | GitGuardian Google Maps API key sızıntı uyarısı analiz edildi; key'in ana projeyle paylaşıldığı ve API-scope ile sınırlı (restriction'lı) olduğu teyit edildi; rotasyon acil değil, bölme/ayrıştırma bir sonraki release'e planlandı. Detay: `SESSION_NOTE.md`. |
| 2026-10-19 | Risk #14 kapandı: ayrı Firebase projesi + Maps key'leri (`631643994904`) devreye alındı. |
| 2026-10-20 | Paket kimliği `com.tulipfleet.cebi`'ye ayrıştırıldı; Firebase config yeni pakete güncellendi (aynı gün kapandı); Maps key restriction + EAS projectId ayrışması hâlâ açık. |
| 2026-10-20 | `eas.json` API adresi düzeltildi — yeni build bekliyor. |
