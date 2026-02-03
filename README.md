# TulipFleet 🚚📍

TulipFleet is a real-time fleet tracking and management platform with IoT devices, GPS telemetry, TimescaleDB backend, and a React Native mobile admin panel.

## Core Features

- Live vehicle location tracking (GPS)
- Smooth map markers with heading & follow mode
- Vehicle history & route playback
- Geofence visualization and violation alerts
- Multi-tenant company structure
- Admin, Driver, and Super Admin roles

## Tech Stack

- **Mobile:** React Native (Expo)
- **Backend:** Node.js (Fastify)
- **Database:** PostgreSQL + TimescaleDB
- **Messaging:** MQTT (EMQX)
- **Maps:** Google Maps

## Development Workflow

This repository uses:

- Pull Request templates
- Issue templates
- AI-assisted PR description generation (PR Writer Agent)

## Docs

- `docs/map/TulipFleet_Map_Implementation_Document_v2.docx`
- `docs/map/TulipFleet_Map_Implementation_Checklist_v2.pdf`

## Status

🚧 Active development
Sürücüye Göstermeme Mantığı
Neden Sürücü Alert Görmemeli?
SebepAçıklama🎯 Dikkat dağıtmaSürüş sırasında alert = tehlike😰 Psikolojik baskı"Sürekli izleniyorum" hissi⚖️ Yasal sorumlulukAlert görüp tepki vermezse?🎮 Manipülasyon riskiSürücü sistemi "kandırmaya" çalışabilir📊 Yönetim aracıAlert'ler performans değerlendirme için
Alternatif: Sürücüye Özet Göster?
┌─────────────────────────────────────────┐
│ Bugünkü Sürüş Özeti (Günlük 1 kez) │
│ │
│ 🟢 Güvenlik Skoru: 85/100 │
│ 📍 Toplam mesafe: 127 km │
│ ⏱️ Sürüş süresi: 3s 45dk │
│ │
│ İyileştirme önerisi: │
│ "Daha yumuşak fren yapabilirsiniz" │
└─────────────────────────────────────────┘
Bu yaklaşım:

✅ Sürücüyü eğitir
✅ Detay vermez (hangi an, nerede)
✅ Pozitif motivasyon sağlar

AlanNeden Sorun Değil
TimescaleDBMilyonlarca konum kaydını rahatça taşır,
hypertable + retention policy doğru kurulmuşMQTT/EMQXBinlerce cihazı destekler,
TLS altyapısı hazır
Multi-tenantcompany_id izolasyonu baştan doğru kurulmuş
React NativeDoğru optimize edilirse 500+ araç bile sorunsuz

Harita Performansı (En Kritik Alan)
Araç SayısıDurumÖnlem1-50✅ Sorunsuz-50-200⚠️ DikkatMarker clustering şart200-500🔴 RiskliViewport dışı araçları render etme500+🔴 KritikWebGL/Canvas tabanlı çözüm gerekir
Dokümanlarında zaten bu var: "Çok araçta performans: sadece değişen araçlar için target update stratejisi" 3. MQTT Message Volume
Araç SayısıSaniyede MesajDurum3 araç (şu an)~0.6 msg/s✅ Rahat50 araç~10 msg/s✅ OK200 araç~40 msg/s⚠️ Backend throttle gerekebilir1000 araç~200 msg/s🔴 Batching/queue gerekir

Büyüme Senaryosu Değerlendirmesi
Senaryo A: 3 → 50 Araç (6 ay içinde)
Mevcut yapı: ✅ Yeterli
Gerekli değişiklik: Yok
Senaryo B: 50 → 200 Araç (1 yıl içinde)
Mevcut yapı: ⚠️ Kısmen yeterli
Gerekli değişiklikler:

