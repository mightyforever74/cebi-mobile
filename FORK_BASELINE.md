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

**2026-10-18 (Faz 4, commit `f159e12`) — düzeltildi:** Üç sabit değer de kaldırıldı. `EXPO_PUBLIC_API_URL` tanımsızsa artık sessizce ana projeye düşmüyor — boş döner ve açık bir hata loglanır (ADR-CE-03). Bu repo build edilip test edilecekse `.env`'de `EXPO_PUBLIC_API_URL` **zorunlu olarak** `cebi-backend`'in kendi adresine ayarlanmalı (bkz. `cebi-backend/DEPLOYMENT_RUNBOOK.md` — henüz gerçek bir sunucu adresi yok, açık karar).

## Değişiklik günlüğü

| Tarih | Not |
|---|---|
| 2026-10-18 | Fork oluşturuldu, baseline sabitlendi. |
| 2026-10-18 | Faz 4: ana projeye ait sabit URL/IP fallback'leri kaldırıldı (commit `f159e12`). |
