# 🌷 TULIPFLEET MASTER SPECIFICATION
## Tek Kaynak Doğru (Single Source of Truth)

**Versiyon:** 1.0.0  
**Tarih:** 27 Aralık 2025  
**Durum:** AKTİF  
**Sonraki Büyük Güncelleme:** App Store Yayını Sonrası (v2.0)

---

## 📋 DOKÜMAN HİYERARŞİSİ

```
TULIPFLEET_MASTER_SPEC.md (BU DOKÜMAN)
│
├── 📊 VERİTABANI
│   └── TulipFleet_Database_Design_v4.docx ✅ GÜNCEL
│
├── 📱 MOBİL UYGULAMA
│   └── IMPLEMENTATION_GUIDE_16_12_FINAL.md ✅ GÜNCEL
│
├── 🗺️ HARİTA GELİŞTİRME
│   ├── haritageliştirme.docx (Vizyon + Detay)
│   ├── TulipFleet_Map_Implementation_Document.docx (Final Referans)
│   └── TulipFleet_Map_Checklist_v2.md (Kontrol Listesi)
│
├── 🤖 YAPAY ZEKA
│   └── tulipfleet_ai_strategycht.pdf (AI Strateji)
│
└── ⚙️ ALTYAPI
    ├── TULIPFLEET_PROJECT_STRUCTURE_v4.md
    └── TULIPFLEET_CRITICAL_CONFIG_26_12.md
```

---

## 🎯 PROJE DURUMU

### Tamamlanan Modüller (%90 Genel İlerleme)

| Modül | Durum | Referans Doküman |
|-------|-------|------------------|
| Backend API | ✅ %100 | IMPLEMENTATION_GUIDE_16_12_FINAL.md |
| Mobil UI | ✅ %100 | IMPLEMENTATION_GUIDE_16_12_FINAL.md |
| Authentication | ✅ %100 | Refresh Token dahil |
| ESP32 Telemetry | ✅ %100 | TULIPFLEET_CRITICAL_CONFIG_26_12.md |
| Maps (Temel) | ✅ %100 | FleetMapScreen çalışıyor |
| SuperAdmin Panel | ✅ %100 | 7 ekran tamamlandı |

### Devam Eden / Bekleyen

| Modül | Durum | Öncelik |
|-------|-------|---------|
| Alert Sistemi | 🟡 %40 | **P1 - KRİTİK** |
| Harita Geliştirme (Pro) | 🔴 %0 | **P2 - SONRAKİ** |
| Push Notifications | 🔴 %0 | P3 |
| AI Entegrasyonu | 🔴 %0 | P4 (App Store sonrası) |

---

## 🗺️ DRIVER NAVİGASYON GELİŞTİRME PLANI

### Neden Driver Öncelikli?

Driver rolü, sistemi en kapsamlı ve uzun süre kullanacak kullanıcı grubudur. Harita fonksiyonları driver deneyiminin merkezindedir.

### Uygulama Sırası (Paket Bağımlılıkları)

```
┌─────────────────────────────────────────────────────────────────┐
│  PAKET A: Pro Marker System                                      │
│  ✅ Zorunlu İlk Adım - Diğer paketler buna bağlı                │
│                                                                  │
│  İçerik:                                                         │
│  • Marker Smoothing (LERP) - Zıplama yok                        │
│  • Heading Rotation + Bearing Fallback                          │
│  • Follow Mode (Kamera takibi)                                  │
│  • Z-Index/Overlay (Seçili marker üstte)                        │
│  • Durum Renkleri (🟢🟡🔴⚠️)                                     │
│  • Performans: Sadece değişen araçlar güncellenir              │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│  PAKET B: Vehicle Track │         │  PAKET C: Geofence      │
│  (A'ya bağlı)           │         │  (A'ya bağlı)           │
│                         │         │                         │
│  • Polyline çizimi      │         │  • Polygon/Circle render│
│  • Start/End marker     │         │  • Çizim editörü        │
│  • Playback MVP         │         │  • Validasyon           │
│  • Downsample (500-800) │         │  • JSONB coordinates    │
└─────────────────────────┘         └────────────┬────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────┐
                                    │  PAKET D: Alerts        │
                                    │  (A + C'ye bağlı)       │
                                    │                         │
                                    │  • Giriş/Çıkış tespiti  │
                                    │  • Violation marker     │
                                    │  • Alert üretimi        │
                                    │  • is_resolved alanı    │
                                    └─────────────────────────┘
```

> **📚 Detaylı Referans:** `haritageliştirme.docx` ve `TulipFleet_Map_Implementation_Document.docx`

---

## 📊 VERİTABANI ŞEMASI (Özet)

> **📚 Tam Referans:** `TulipFleet_Database_Design_v4.docx`

### Harita ile İlişkili Tablolar

| Tablo | Amaç | Kritik Alanlar |
|-------|------|----------------|
| `locations` | Konum verisi (TimescaleDB) | `time, lat, lng, speed, heading, accel_x/y/z` |
| `vehicles` | Araç bilgisi | `plate_no, status, company_id` |
| `geofences` | Bölge tanımları | `fence_type, coordinates (JSONB), radius` |
| `geofence_violations` | İhlaller | `violation_time` (= location_time!) |
| `alerts` | Uyarılar | `is_resolved` (❌ resolved değil!) |
| `driver_behavior` | Davranış skoru | `harsh_brake_count, safety_score` |

### ⚠️ KRİTİK İSİM TUTARLILIĞI

```
✅ alerts.is_resolved        ❌ alerts.resolved
✅ violation_time            ❌ server_time
✅ coordinates (JSONB)       ❌ coords
✅ last_location_time        ❌ updated_at
```

---

## 🔄 DEĞİŞEN ARAÇLAR İÇİN TARGET UPDATE STRATEJİSİ

> **📚 Detaylı Referans:** `haritageliştirme.docx` - Bölüm: "Çok araçta performans"

### Amaç
200+ araçta bile stabil performans.

### Uygulama Kuralları

```javascript
// 1. Değişim tespiti (hash/compare)
const shouldUpdateTarget = (id, lat, lng, heading, updatedAtISO) => {
  const prev = lastAppliedRef.current.get(id);
  if (!prev) return true;
  if (prev.updatedAtISO === updatedAtISO) return false;  // Aynı veri
  
  // Küçük oynamalar için eşik
  const movedEnough = Math.abs(prev.lat - lat) > 0.00001 || 
                      Math.abs(prev.lng - lng) > 0.00001;
  return movedEnough;
};

// 2. Batch update (tek tek setState yok!)
const ingestVehiclesForTargets = (vehicles) => {
  for (const v of vehicles) {
    if (!shouldUpdateTarget(...)) continue;  // Skip unchanged
    targetsRef.current.set(v.id, { lat, lng, heading, updatedAt });
  }
};

// 3. MQTT'de sadece ilgili araç
// Topic: fleet/device/{device_code}/telemetry
// → Sadece o device_id için target update
```

### Performans Hedefleri

| Araç Sayısı | Hedef FPS | Strateji |
|-------------|-----------|----------|
| 1-50 | 60 | Standart |
| 50-200 | 30 | shouldUpdateTarget aktif |
| 200-500 | 30 | + Marker clustering |
| 500+ | - | v2.0'da değerlendirilecek |

---

## 🤖 AI GELİŞTİRMELERİ (GELECEK)

> **📚 Tam Referans:** `tulipfleet_ai_strategycht.pdf`

### Temel Prensipler

1. **Strategic Information Filtering:** AI sadece gerekli olduğunda konuşur
2. **Dual Alert System:** Kritik uyarılar vs nazik koçluk
3. **Human State Assessment:** Multi-sensör verisi ile durum tahmini

### AI Kullanım Alanları (Planlanan)

| Alan | Açıklama | Öncelik |
|------|----------|---------|
| Sürüş Davranışı Skoru | ADXL345 + hız analizi | P1 (Hazır) |
| Akıllı Alert Filtreleme | Gereksiz alarm azaltma | P2 |
| Rota Optimizasyonu | Trafik + geçmiş veri | P3 |
| Predictive Maintenance | Araç bakım tahmini | P4 |

### EU Uyumluluk
- Safety öncelikli
- Sustainability odaklı
- Ethical AI deployment

---

## 📱 DRIVER EKRANLARI (Mevcut + Planlanan)

### Mevcut (✅)

| Ekran | Dosya | Durum |
|-------|-------|-------|
| Dashboard | `DriverDashboard.js` | ✅ |
| Tasks | `DriverTasks.js` | ✅ |
| Vehicle | `DriverVehicle.js` | ✅ |
| Profile | `DriverProfile.js` | ✅ |
| Settings | `DriverSettings.js` | ✅ |
| Route Map | `DriverRouteMapScreen.js` | ✅ |

### Planlanan (🔜)

| Ekran | Özellik | Bağımlılık |
|-------|---------|------------|
| SafetyScoreCard | Günlük skor gösterimi | Paket A |
| TrackPlayback | Geçmiş rota oynatma | Paket B |
| NavigationScreen | Turn-by-turn yönlendirme | Paket B + External API |

---

## 🔐 KRİTİK KONFİGÜRASYON

> **📚 Tam Referans:** `TULIPFLEET_CRITICAL_CONFIG_26_12.md`

### Özet

| Parametre | Değer |
|-----------|-------|
| MQTT Port (TLS) | 8883 |
| MQTT Credentials | fleet-backend / BackendMQTT2024! |
| SSL Certs | /opt/fleet-certs/ (chmod 644!) |
| ESP32 TLS | `setInsecure()` ONLY |
| TimescaleDB Retention | 7 gün |
| API URL | ngrok domain |

---

## 📋 UYGULAMA PLANI (5. SORUNUN CEVABI)

### Faz 1: Alert Sistemi Tamamlama (Öncelik 1)

| Adım | Görev | Referans |
|------|-------|----------|
| 1.1 | Backend MQTT handler - alerts topic | CRITICAL_CONFIG |
| 1.2 | Alert API test | IMPLEMENTATION_GUIDE |
| 1.3 | AdminAlerts.js real API | IMPLEMENTATION_GUIDE |
| 1.4 | AdminSettings.js push toggle | IMPLEMENTATION_GUIDE |

### Faz 2: Paket A - Pro Marker System

| Adım | Görev | Referans |
|------|-------|----------|
| 2.1 | `src/components/map/mapMath.js` oluştur | haritageliştirme.docx |
| 2.2 | `VehicleMarker.js` - smoothing + rotation | haritageliştirme.docx |
| 2.3 | `VehicleInfoSheet.js` - yeni props | haritageliştirme.docx |
| 2.4 | FleetMapScreen entegrasyonu | haritageliştirme.docx |
| 2.5 | Follow mode + user pan cancel | haritageliştirme.docx |
| 2.6 | Target update stratejisi | Bu doküman |

### Faz 3: Paket B - Vehicle Track

| Adım | Görev | Referans |
|------|-------|----------|
| 3.1 | Backend: GET /api/vehicles/:id/track | Database_v4 |
| 3.2 | api.js: vehicleAPI.getTrack() | IMPLEMENTATION_GUIDE |
| 3.3 | VehicleTrackScreen.js | haritageliştirme.docx |
| 3.4 | Polyline + Start/End marker | Map_Checklist |
| 3.5 | Playback slider MVP | haritageliştirme.docx |

### Faz 4: Paket C - Geofence

| Adım | Görev | Referans |
|------|-------|----------|
| 4.1 | GeofenceLayer.js | haritageliştirme.docx |
| 4.2 | GeofenceDrawToolbar.js | haritageliştirme.docx |
| 4.3 | GeofenceEditorScreen.js | haritageliştirme.docx |
| 4.4 | api.js: geofenceAPI | Database_v4 |
| 4.5 | FleetMapScreen layer entegrasyonu | Map_Implementation |

### Faz 5: Paket D - Violations & Alerts

| Adım | Görev | Referans |
|------|-------|----------|
| 5.1 | Backend: checkGeofences() | haritageliştirme.docx |
| 5.2 | Redis state: inside/outside | haritageliştirme.docx |
| 5.3 | geofence_violations insert | Database_v4 |
| 5.4 | alerts insert (is_resolved!) | Database_v4 |
| 5.5 | Violation markers on map | Map_Checklist |

### Faz 6: Driver Behavior & Scoring

| Adım | Görev | Referans |
|------|-------|----------|
| 6.1 | driver_behavior tablosu | Database_v4 |
| 6.2 | Batch analyzer job | haritageliştirme.docx |
| 6.3 | SafetyScoreCard component | haritageliştirme.docx |
| 6.4 | DriverDashboard entegrasyonu | IMPLEMENTATION_GUIDE |
| 6.5 | AdminSafetySummaryCard | haritageliştirme.docx |
| 6.6 | BehaviorEventLayer (sert fren noktaları) | haritageliştirme.docx |
| 6.7 | ColoredTrackLayer (🟢🟡🔴 segmentler) | haritageliştirme.docx |

---

## 🚀 YAYINLAMA SONRASI (v2.0)

### Backend Modüler Yapı

```
/opt/fleet/backend/
├── server.js (minimal - sadece app init)
├── routes/
│   ├── auth.js
│   ├── vehicles.js
│   ├── drivers.js
│   ├── tasks.js
│   ├── alerts.js
│   ├── geofences.js
│   └── superadmin.js
├── handlers/
│   └── mqtt.js
├── services/
│   ├── geofenceService.js
│   └── behaviorService.js
└── utils/
    └── validators.js
```

### AI Entegrasyonu
- tulipfleet_ai_strategycht.pdf referans alınacak
- Strategic filtering implementasyonu
- Dual alert system

---

## 📝 DEĞİŞİKLİK GEÇMİŞİ

| Tarih | Versiyon | Değişiklik |
|-------|----------|------------|
| 27.12.2025 | 1.0.0 | İlk oluşturma |

---

## ✅ KONTROL LİSTESİ (Her Geliştirme Öncesi)

- [ ] Bu dokümanı kontrol et
- [ ] İlgili referans dokümanı oku
- [ ] Database şemasını doğrula (alan isimleri!)
- [ ] API endpoint'i IMPLEMENTATION_GUIDE'da var mı?
- [ ] Test credentials CRITICAL_CONFIG'dan al

---

*Bu doküman TulipFleet projesinin TEK KAYNAK DOĞRU referansıdır.*
*Diğer tüm dokümanlar bu dokümana bağlıdır.*

**© 2025 TulipFleet - Tüm Hakları Saklıdır**
