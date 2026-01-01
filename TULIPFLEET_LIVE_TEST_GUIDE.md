# 🧪 TulipFleet - Canlı Kullanım Test Rehberi

**Versiyon:** 1.0.0  
**Tarih:** 28 Aralık 2025  
**Amaç:** Araç üzerinde gerçek saha testi prosedürleri

---

## 📋 İÇİNDEKİLER

1. [Test Öncesi Hazırlık](#1-test-öncesi-hazırlık)
2. [ESP32 Cihaz Kontrolleri](#2-esp32-cihaz-kontrolleri)
3. [Mobil Uygulama Testleri](#3-mobil-uygulama-testleri)
4. [Sürüş Testi Senaryoları](#4-sürüş-testi-senaryoları)
5. [Çoklu Araç Yönetimi](#5-çoklu-araç-yönetimi)
6. [Test Sonrası Doğrulama](#6-test-sonrası-doğrulama)
7. [Sorun Giderme](#7-sorun-giderme)

---

## 1. TEST ÖNCESİ HAZIRLIK

### 1.1 Gerekli Ekipman

| Ekipman | Kontrol |
|---------|---------|
| ESP32 cihazı (şarjlı) | ☐ |
| Android telefon (Expo Go veya APK) | ☐ |
| Laptop (SSH erişimi için) | ☐ |
| Mobil internet (4G/5G) | ☐ |
| Araç (test edilecek) | ☐ |
| USB kablo (ESP32 debug için) | ☐ |

### 1.2 Sunucu Kontrolü

```bash
# SSH ile sunucuya bağlan
ssh root@46.224.1.192

# Container'ların çalıştığını doğrula
docker ps

# Backend loglarını izle (test sırasında açık tut)
docker logs fleet-backend -f --tail 50

# ngrok URL'ini kontrol et
curl -s localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'
```

### 1.3 Veritabanı Kontrolü

```bash
# Araçların device_id eşleşmesini kontrol et
docker exec fleet-postgres psql -U fleetadmin -d fleet_tracking -c "
SELECT plate_no, esp32_device_id, 
       (SELECT COUNT(*) FROM locations WHERE device_id = esp32_device_id) as location_count
FROM vehicles 
ORDER BY plate_no;
"
```

### 1.4 Test Kullanıcıları

| Rol | Email | Şifre |
|-----|-------|-------|
| Super Admin | superadmin@tulipfleet.com | superadmin123 |
| Company Admin | admin@fleet.com | admin123 |
| Driver | test@tulipfleet.com | test123 |

---

## 2. ESP32 CİHAZ KONTROLLERİ

### 2.1 Cihaz Başlatma

1. ESP32'yi araca bağla (OBD veya USB güç)
2. LED göstergesini kontrol et:
   - 🔴 Kırmızı: Başlatılıyor
   - 🟡 Sarı: GPS arıyor
   - 🟢 Yeşil: Bağlı ve veri gönderiyor

### 2.2 Serial Monitor Kontrolü (Opsiyonel)

```
Beklenen çıktı:
[GPS] 41.012096, 28.908829 | Uydu: 8
[ACC] X:-0.12 Y:0.05 Z:9.81
[TX] #123 | ESP-PLT-002 | Int:5s | Spd:45.2 | Alerts:0
```

### 2.3 Sunucu Tarafı Doğrulama

Backend loglarında şunu görmelisin:
```
[V3] Location: ESP-PLT-002 @ 41.012096,28.908829
```

---

## 3. MOBİL UYGULAMA TESTLERİ

### 3.1 FleetMapScreen Testleri

| Test | Beklenen Sonuç | ✓ |
|------|----------------|---|
| Harita yükleniyor | Marker görünür | ☐ |
| Marker tıklama | VehicleInfoSheet açılır | ☐ |
| Canlı konum güncelleme | Her 10 sn'de marker hareket eder | ☐ |
| Follow mode | Araç hareket edince kamera takip eder | ☐ |
| Drag to disable | Haritayı sürükleyince follow kapanır | ☐ |
| Stats bar | Araç sayısı doğru görünür | ☐ |

### 3.2 VehicleInfoSheet Testleri

| Test | Beklenen Sonuç | ✓ |
|------|----------------|---|
| Plaka görünümü | Doğru plaka | ☐ |
| Hız gösterimi | Gerçek zamanlı hız | ☐ |
| Yön (heading) | 0-360° arası | ☐ |
| Son güncelleme | < 30 sn önce | ☐ |
| Koordinat | Doğru lat/lng | ☐ |
| Takip butonu | Çalışıyor | ☐ |
| Geçmiş Rota butonu | VehicleTrackScreen açılır | ☐ |

### 3.3 VehicleTrackScreen Testleri

| Test | Beklenen Sonuç | ✓ |
|------|----------------|---|
| Polyline çizimi | Rota görünür | ☐ |
| Start marker (yeşil) | Başlangıç noktası | ☐ |
| End marker (kırmızı) | Bitiş noktası | ☐ |
| Nokta sayısı | > 0 | ☐ |
| Mesafe hesabı | Mantıklı değer | ☐ |
| Süre hesabı | Doğru zaman aralığı | ☐ |
| Playback | Marker hareket eder | ☐ |
| Hız kontrolü | 1x, 2x, 4x çalışır | ☐ |
| Zaman preset'leri | Son 1 Saat, Son 3 Saat, Bugün | ☐ |

---

## 4. SÜRÜŞ TESTİ SENARYOLARI

### 4.1 Senaryo 1: Basit Sürüş (10 dakika)

**Amaç:** Temel konum takibi ve polyline testi

**Adımlar:**
1. ☐ Araçla 2-3 km'lik bir rota çiz (park → market → park)
2. ☐ Sürüş sırasında mobil uygulamadan FleetMapScreen'i izle
3. ☐ Marker'ın gerçek zamanlı hareket ettiğini doğrula
4. ☐ Sürüş bitince VehicleTrackScreen'de rotayı kontrol et
5. ☐ Polyline'ın doğru çizildiğini doğrula

**Beklenen Sonuçlar:**
- Marker 5-10 sn aralıklarla güncellenir
- Polyline rotayı doğru gösterir
- Start/End marker'ları doğru konumda

### 4.2 Senaryo 2: Davranış Olayları (15 dakika)

**Amaç:** Sert fren, sert hızlanma tespiti

**Adımlar:**
1. ☐ Güvenli bir yerde kontrollü sert fren yap
2. ☐ Backend loglarında `HARD_BRAKE` alert'i görünmeli
3. ☐ Güvenli bir yerde kontrollü sert hızlanma yap
4. ☐ Backend loglarında `HARD_ACCEL` alert'i görünmeli

**Beklenen Log:**
```
[V3 ALERT] HARD_BRAKE saved for ESP-PLT-002 (0.45G)
[V3 ALERT] HARD_ACCEL saved for ESP-PLT-002 (0.38G)
```

### 4.3 Senaryo 3: Bağlantı Kesintisi (10 dakika)

**Amaç:** ESP32 offline/online geçişi

**Adımlar:**
1. ☐ Normal sürüş başlat
2. ☐ ESP32'yi kapat (güç kes)
3. ☐ 2 dakika bekle
4. ☐ ESP32'yi tekrar aç
5. ☐ Verilerin tekrar geldiğini doğrula

**Beklenen Sonuç:**
- Kesinti sırasında marker donuk kalır
- Yeniden bağlandığında marker güncellenir
- Veri kaybı minimal olmalı

### 4.4 Senaryo 4: Uzun Sürüş (30+ dakika)

**Amaç:** Sistem stabilitesi ve veri bütünlüğü

**Adımlar:**
1. ☐ 30 dakikalık şehir içi sürüş
2. ☐ Farklı hızlarda sürüş (durma, yavaş, hızlı)
3. ☐ Tünel/kapalı alan geçişleri
4. ☐ Sürüş sonunda VehicleTrackScreen kontrolü

**Kontrol Listesi:**
- ☐ Polyline kesintisiz mi?
- ☐ GPS kaybı olan noktalar var mı?
- ☐ Hız verileri mantıklı mı?
- ☐ Heading (yön) doğru mu?

---

## 5. ÇOKLU ARAÇ YÖNETİMİ

### 5.1 Mevcut Araçlar

| Plaka | ESP32 Device ID | Durum |
|-------|-----------------|-------|
| 34ABC123 | ESP-PLT-002 | ✅ Aktif |
| 34XYZ456 | ESP32-002 | ⚠️ Pasif |
| 06DEF789 | ESP32-003 | ⚠️ Pasif |

### 5.2 Yeni ESP32 Ekleme

```bash
# 1. Yeni cihazı veritabanına ekle
docker exec fleet-postgres psql -U fleetadmin -d fleet_tracking -c "
UPDATE vehicles 
SET esp32_device_id = 'ESP-PLT-003' 
WHERE plate_no = '34XYZ456';
"

# 2. ESP32 firmware'de device_id'yi ayarla
# config.h dosyasında:
# #define DEVICE_ID "ESP-PLT-003"
```

### 5.3 Araç Arama ve Filtreleme (Gelecek Özellik)

**Planlanan UI İyileştirmeleri:**

```
┌─────────────────────────────────────┐
│ 🔍 Araç Ara...                      │
├─────────────────────────────────────┤
│ [Tümü] [Aktif] [Müsait] [Offline]   │
├─────────────────────────────────────┤
│ 🚗 34ABC123 - Ford Transit    🟢   │
│ 🚗 34XYZ456 - Ford Transit    🔵   │
│ 🚗 06DEF789 - Mercedes Sprinter ⚫  │
└─────────────────────────────────────┘
```

**Önerilen Özellikler:**
1. **Araç listesi drawer/modal** - Haritada araç seçimi için
2. **Arama kutusu** - Plaka ile arama
3. **Durum filtreleri** - Aktif/Müsait/Offline
4. **Sıralama** - Alfabetik, son güncelleme, mesafe

### 5.4 Çoklu Araç Test Senaryosu

**Gereksinimler:**
- 2+ ESP32 cihazı
- 2+ araç

**Adımlar:**
1. ☐ Tüm ESP32'leri çalıştır
2. ☐ FleetMapScreen'de tüm marker'ları gör
3. ☐ Her araca tıkla ve bilgileri doğrula
4. ☐ Farklı araçlar arasında hızlı geçiş yap
5. ☐ Follow mode'u farklı araçlarda test et

---

## 6. TEST SONRASI DOĞRULAMA

### 6.1 Veritabanı Kontrolleri

```bash
# Son 1 saatteki konum sayısı
docker exec fleet-postgres psql -U fleetadmin -d fleet_tracking -c "
SELECT device_id, COUNT(*) as count, 
       MIN(time) as first, MAX(time) as last
FROM locations 
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY device_id;
"

# Alert'leri kontrol et
docker exec fleet-postgres psql -U fleetadmin -d fleet_tracking -c "
SELECT alert_type, COUNT(*), MAX(created_at)
FROM alerts 
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY alert_type;
"
```

### 6.2 Performans Metrikleri

| Metrik | Hedef | Gerçek | ✓ |
|--------|-------|--------|---|
| GPS güncelleme aralığı | 5-10 sn | ___ sn | ☐ |
| Marker güncelleme gecikmesi | < 3 sn | ___ sn | ☐ |
| Polyline nokta sayısı (1 saat) | 300-700 | ___ | ☐ |
| Alert tespit süresi | < 1 sn | ___ sn | ☐ |
| Batarya tüketimi (ESP32) | Minimal | ___ | ☐ |

### 6.3 Test Raporu Şablonu

```markdown
## Test Raporu - [TARİH]

### Test Bilgileri
- Tarih: ___
- Süre: ___ dakika
- Rota: ___
- Hava durumu: ___

### Araç Bilgileri
- Plaka: ___
- ESP32 ID: ___

### Sonuçlar
- Toplam konum noktası: ___
- Toplam mesafe: ___ km
- Alert sayısı: ___

### Sorunlar
1. ___
2. ___

### Notlar
___
```

---

## 7. SORUN GİDERME

### 7.1 Marker Görünmüyor

**Kontrol:**
1. ☐ ESP32 veri gönderiyor mu? (Backend log)
2. ☐ Device ID eşleşiyor mu? (Veritabanı)
3. ☐ Koordinatlar geçerli mi? (null değil)

**Çözüm:**
```bash
# Device ID güncelle
docker exec fleet-postgres psql -U fleetadmin -d fleet_tracking -c "
UPDATE vehicles SET esp32_device_id = 'ESP-PLT-002' WHERE plate_no = '34ABC123';
"
```

### 7.2 GPS Verisi Gelmiyor

**ESP32 Kontrol:**
- Açık alanda mı?
- Uydu sayısı > 4 mü?
- Anten bağlı mı?

**Çözüm:**
- Açık alana çık
- GPS modülünü kontrol et
- Firmware'i yeniden yükle

### 7.3 Alert'ler Tetiklenmiyor

**Eşik Değerleri:**
```bash
docker exec fleet-postgres psql -U fleetadmin -d fleet_tracking -c "
SELECT plate_no, threshold_brake, threshold_accel 
FROM vehicles WHERE plate_no = '34ABC123';
"
```

**Çözüm:**
- Eşik değerlerini düşür (hassasiyet artır)
- ADXL345 kalibrasyonunu kontrol et

### 7.4 Polyline Eksik

**Olası Sebepler:**
- GPS kaybı (tünel, kapalı alan)
- ESP32 güç kesintisi
- Network timeout

**Kontrol:**
```bash
# Zaman boşluklarını bul
docker exec fleet-postgres psql -U fleetadmin -d fleet_tracking -c "
SELECT time, 
       time - LAG(time) OVER (ORDER BY time) as gap
FROM locations 
WHERE device_id = 'ESP-PLT-002' 
  AND time > NOW() - INTERVAL '1 hour'
ORDER BY gap DESC NULLS LAST
LIMIT 10;
"
```

---

## 📎 REFERANSLAR

| Doküman | Açıklama |
|---------|----------|
| TULIPFLEET_MASTER_SPEC.md | Ana spesifikasyon |
| IMPLEMENTATION_GUIDE_17_12_FINAL.md | Teknik implementasyon |
| TulipFleet_Database_Design_v4.docx | Veritabanı şeması |
| TULIPFLEET_CRITICAL_CONFIG_26_12.md | Kritik konfigürasyonlar |

---

## ✅ TEST ONAY

| Rol | İsim | Tarih | İmza |
|-----|------|-------|------|
| Geliştirici | ___ | ___ | ___ |
| Tester | ___ | ___ | ___ |
| Proje Yöneticisi | ___ | ___ | ___ |

---

**Doküman Durumu:** 🟢 Aktif  
**Son Güncelleme:** 28 Aralık 2025  
**Sorumlu:** TulipFleet Geliştirme Ekibi
