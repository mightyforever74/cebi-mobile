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

## Bağımsızlık durumu (fork anında — henüz uygulanmadı)

`EXPO_PUBLIC_API_URL` henüz ana projenin `api.tulipfleet.com`'una fallback yapıyor (kod tarafı, `src/services/api.js`) — Dedicated DB/backend kurulana kadar bu repo build edilip test edilecekse `.env`'de `EXPO_PUBLIC_API_URL` **açıkça** `cebi-backend`'in kendi adresine ayarlanmalı, yoksa sessizce ana projeye bağlanır.

## Değişiklik günlüğü

| Tarih | Not |
|---|---|
| 2026-10-18 | Fork oluşturuldu, baseline sabitlendi. |
