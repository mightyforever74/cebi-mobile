/*
 * Fleet Tracker ESP32 v4.3.4 PRODUCTION (Clean)
 * 
 * DEĞİŞİKLİKLER (v4.3.3'ten):
 *  - TEST_MODE KALDIRILDI: Production için temiz kod
 *  - Hardcoded credentials kaldırıldı
 *  - Sadece BLE üzerinden WiFi provisioning
 * 
 * AKIŞ:
 *  Boot → isActivated?
 *    ├─ HAYIR → BLE aç → Sonsuz provision bekleme
 *    │           ├─ Serial + WiFi al (BLE)
 *    │           ├─ WiFi'ye bağlan
 *    │           ├─ Backend'e POST /api/devices/activate
 *    │           └─ NVS'e kaydet → Restart
 *    └─ EVET → BLE aç (60sn) → Re-provision bekleme
 *                ├─ Yeni WiFi geldi → Kaydet → Restart  
 *                └─ Timeout → BLE kapat → Normal çalışma
 * 
 * 29 Ocak 2026 - Production Ready
 */
// ========================================
// PRODUCTION MODE - Test mode kaldırıldı
// ========================================


#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <time.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include <Preferences.h>

// ============================================
// YAPILANDIRMA
// ============================================

const char* FIRMWARE_VERSION = "4.3.4";
const char* DEVICE_SERIAL = "TF-2026-DEMO-1";  // ← EKLE!

// Backend
const char* API_ACTIVATE_URL = "https://api.tulipfleet.com/api/devices/activate";
const char* DEVICE_ACTIVATION_KEY = "TulipFleet2025SecureActivationKeyESP32";

// MQTT
const char* mqtt_server = "46.224.1.192";
const int mqtt_port = 8883; // TLS
const char* mqtt_username = "fleet-backend";
const char* mqtt_password = "BackendMQTT2024!";

// NTP
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 3 * 3600;
const int daylightOffset_sec = 0;

// ============================================
// BLE BOOT WINDOW AYARLARI (YENİ)
// ============================================

#define BLE_BOOT_WINDOW_MS    60000   // 60 saniye BLE penceresi
#define BLE_REPROVISION_TIMEOUT_MS 120000  // MQTT ile tetiklenince 2 dakika

bool bleBootWindowActive = false;
unsigned long bleBootWindowStart = 0;
bool bleReprovisionMode = false;  // MQTT komutu ile tetiklendi mi?

// ============================================
// BLE AYARLARI
// ============================================

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_SERIAL_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_STATUS_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define CHAR_RESULT_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26aa"
#define CHAR_WIFI_CRED_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ab"

#define CHAR_WIFI_STAT_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ac"
#define CHAR_WIFI_SCAN_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ad"  // YENİ

// WiFi Status
const char* WIFI_STAT_IDLE        = "IDLE";
const char* WIFI_STAT_CONNECTING  = "CONNECTING";
const char* WIFI_STAT_OK          = "OK";
const char* WIFI_STAT_ERR_AUTH    = "ERR_AUTH";
const char* WIFI_STAT_ERR_TIMEOUT = "ERR_TIMEOUT";
const char* WIFI_STAT_ERR_NOT_FOUND = "ERR_NOT_FOUND";

NimBLEServer* pServer = NULL;
NimBLECharacteristic* pSerialChar = NULL;
NimBLECharacteristic* pStatusChar = NULL;
NimBLECharacteristic* pResultChar = NULL;
NimBLECharacteristic* pWifiCredChar = NULL;
NimBLECharacteristic* pWifiStatusChar = NULL;

NimBLECharacteristic* pWifiScanChar = NULL;  // YENİ

bool bleConnected = false;
bool bleInitialized = false;  // YENİ - BLE başlatıldı mı?
String receivedSerial = "";
bool serialReceived = false;
String receivedSsid = "";
String receivedPassword = "";
bool wifiCredReceived = false;

// ============================================
// NVS - ACTIVATION & WIFI
// ============================================

Preferences preferences;
bool isActivated = false;
String activatedSerial = "";
String storedSsid = "";
String storedPassword = "";
String espChipId = "";

// ============================================
// CİHAZ BİLGİLERİ
// ============================================

String deviceName = "";
String macAddress = "";

String mqtt_topic_telemetry = "";
String mqtt_topic_alert = "";
String mqtt_topic_location = "";
String mqtt_topic_command = "";

// ============================================
// EŞİKLER
// ============================================

float THRESHOLD_ACCEL = 0.30;
float THRESHOLD_BRAKE = 0.40;
float THRESHOLD_TURN = 0.35;
float THRESHOLD_IMPACT = 2.00;

// ============================================
// SABİTLER
// ============================================

#define IDLE_SPEED          5.0
#define CITY_SPEED          50.0
#define HIGHWAY_SPEED       80.0

#define INTERVAL_IDLE       60000
#define INTERVAL_CITY       10000
#define INTERVAL_HIGHWAY    5000
#define INTERVAL_FAST       3000
#define INTERVAL_EVENT      1000

#define DISTANCE_TRIGGER    15.0
#define ALERT_COOLDOWN      5000
#define HEARTBEAT_INTERVAL  60000

// ============================================
// DONANIM - GPS AYARLARI
// ============================================

HardwareSerial gpsSerial(2);
#define GPS_RX 16
#define GPS_TX 17
#define GPS_BAUD 115200

#define LED_WIFI_PIN 4
#define LED_GPS_PIN  5

static const uint8_t LED_ON  = HIGH;
static const uint8_t LED_OFF = LOW;

static const uint32_t GPS_STALE_MS = 5000;

#define I2C_SDA 21
#define I2C_SCL 22

// ============================================
// GLOBAL DEĞİŞKENLER
// ============================================

WiFiClientSecure espClient;
PubSubClient mqtt_client(espClient);
TinyGPSPlus gps;

struct BlinkState { uint32_t lastMs; bool on; };
static BlinkState wifiBlink{0,false};
static BlinkState gpsBlink{0,false};

static bool wifiConnected = false;
static bool gpsHasFix = false;
static uint32_t lastValidGpsMs = 0;

static inline void blinkTick(int pin, BlinkState &b, uint16_t periodMs) {
  uint32_t now = millis();
  if (now - b.lastMs >= periodMs) {
    b.lastMs = now;
    b.on = !b.on;
    digitalWrite(pin, b.on ? LED_ON : LED_OFF);
  }
}

static inline void ledsInit() {
  pinMode(LED_WIFI_PIN, OUTPUT);
  pinMode(LED_GPS_PIN, OUTPUT);
  digitalWrite(LED_WIFI_PIN, LED_OFF);
  digitalWrite(LED_GPS_PIN, LED_OFF);
}

static inline void ledsTick() {
  // WiFi (blue) - Boot window sırasında hızlı yanıp söner
  if(bleBootWindowActive || bleReprovisionMode) {
    blinkTick(LED_WIFI_PIN, wifiBlink, 200);  // Hızlı blink = BLE aktif
  } else if (!wifiConnected) {
    blinkTick(LED_WIFI_PIN, wifiBlink, 500);
  } else {
    digitalWrite(LED_WIFI_PIN, LED_ON);
  }

  // GPS (red)
  if (!gpsHasFix) blinkTick(LED_GPS_PIN, gpsBlink, 300);
  else digitalWrite(LED_GPS_PIN, LED_ON);
}

Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

unsigned long lastPublish = 0;
unsigned long lastAlertTime = 0;
unsigned long lastHeartbeat = 0;
unsigned long totalMessages = 0;
unsigned long totalAlerts = 0;
int eventBurstCount = 0;
float currentSpeed = 0;

static bool hasValidFix = false;
static double lastSentLat = 0, lastSentLng = 0;
static unsigned long lastGpsUpdateMs = 0;
static bool forcePublish = false;

float smoothAx = 0, smoothAy = 0, smoothAz = 9.81;
float baselineAx = 0, baselineAy = 0, baselineAz = 9.81;
bool calibrated = false;

volatile bool g_restartRequested = false;
volatile bool g_clearWifiRequested = false;
volatile bool g_reprovisionRequested = false;  // YENİ - MQTT ile re-provision tetikleme

// ============================================
// JSON PARSE - WiFi Credentials
// ============================================

bool parseWifiCredentials(const String& json, String& ssid, String& password) {
  int ssidStart = json.indexOf("\"ssid\"");
  if (ssidStart < 0) return false;
  
  int ssidValueStart = json.indexOf("\"", ssidStart + 6) + 1;
  int ssidValueEnd = json.indexOf("\"", ssidValueStart);
  if (ssidValueStart <= 0 || ssidValueEnd <= 0) return false;
  
  ssid = json.substring(ssidValueStart, ssidValueEnd);
  
  int passStart = json.indexOf("\"password\"");
  if (passStart < 0) return false;
  
  int passValueStart = json.indexOf("\"", passStart + 10) + 1;
  int passValueEnd = json.indexOf("\"", passValueStart);
  if (passValueStart <= 0 || passValueEnd <= 0) return false;
  
  password = json.substring(passValueStart, passValueEnd);
  
  return ssid.length() > 0;
}

// ============================================
// BLE CALLBACKS
// ============================================

class MyServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) {
    bleConnected = true;
    Serial.println("\n[BLE] ✅ Cihaz bağlandı!");
  }
  
  void onConnect(NimBLEServer* pServer) {
    bleConnected = true;
    Serial.println("\n[BLE] ✅ Cihaz bağlandı!");
  }

  void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) {
    bleConnected = false;
    Serial.println("[BLE] Bağlantı koptu");
    // Boot window veya reprovision modunda advertising devam etsin
    if(bleBootWindowActive || bleReprovisionMode || !isActivated) {
      NimBLEDevice::startAdvertising();
    }
  }
  
  void onDisconnect(NimBLEServer* pServer) {
    bleConnected = false;
    Serial.println("[BLE] Bağlantı koptu");
    if(bleBootWindowActive || bleReprovisionMode || !isActivated) {
      NimBLEDevice::startAdvertising();
    }
  }
};

class SerialCharCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) {
    handleWrite(pChar);
  }
  
  void onWrite(NimBLECharacteristic* pChar) {
    handleWrite(pChar);
  }
  
  void handleWrite(NimBLECharacteristic* pChar) {
    std::string value = pChar->getValue();
    receivedSerial = String(value.c_str());
    receivedSerial.trim();
    
    if(receivedSerial.length() > 0) {
      serialReceived = true;
      Serial.println("\n[BLE] 📝 Serial alındı: " + receivedSerial);
      if(pStatusChar) {
        pStatusChar->setValue("SERIAL_RECEIVED");
        pStatusChar->notify();
      }
    }
  }
};

// WiFi Scan Callback - Mobile app okuyunca WiFi listesi döndür
class WiFiScanCharCallbacks : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* pChar) {
    Serial.println("[BLE] WiFi scan istendi");
    // WiFi scan yap
    int n = WiFi.scanNetworks();
    // JSON array oluştur
    String json = "[";
    for (int i = 0; i < n && i < 10; i++) { // Max 10 network
      if (i > 0) json += ",";
      json += "{";
      json += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
      json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
      json += "\"channel\":" + String(WiFi.channel(i)) + ",";
      json += "\"encryption\":" + String(WiFi.encryptionType(i));
      json += "}";
    }
    json += "]";
    // BLE'ye gönder
    pChar->setValue(json.c_str());
    Serial.println("[BLE] WiFi listesi gönderildi: " + String(n) + " network");
  }
};

class WifiCredCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) {
    handleWrite(pChar);
  }
  
  void onWrite(NimBLECharacteristic* pChar) {
    handleWrite(pChar);
  }
  
  void handleWrite(NimBLECharacteristic* pChar) {
    std::string value = pChar->getValue();
    String json = String(value.c_str());
    json.trim();
    
    Serial.println("[BLE] 📶 WiFi credentials alındı");
    
    String ssid, password;
    if (parseWifiCredentials(json, ssid, password)) {
      receivedSsid = ssid;
      receivedPassword = password;
      wifiCredReceived = true;
      
      Serial.println("[BLE] SSID: " + ssid);
      
      if(pStatusChar) {
        pStatusChar->setValue("WIFI_CRED_RECEIVED");
        pStatusChar->notify();
      }
    } else {
      Serial.println("[BLE] ❌ JSON parse hatası");
    }
  }
};

// ============================================
// FUNCTION PROTOTYPES
// ============================================

void getEspChipId();
void loadFromNvs();
void saveActivationToNvs();
void saveWifiToNvs();
void initBLE();
void stopBLE();
bool activateDevice(String serial);
void connectWiFi();
bool wifiConnectWithStatus(const String& ssid, const String& password);
void syncNTP();
void sendHeartbeat();
void connectMQTT();
void calibrateAccel();
void readAndSmoothAccel();
void checkForEvents();
void sendAlert(String type, String message, float value, String severity);
void publishTelemetry();
long getPublishInterval();
String getTimestamp();
void setWifiStatus(const char* status);
void handleBleBootWindow();  // YENİ
void handleReprovisionMode();  // YENİ
bool processWifiUpdate();  // YENİ

// ============================================
// ESP CHIP ID
// ============================================

void getEspChipId() {
  uint64_t chipid = ESP.getEfuseMac();
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           (uint8_t)(chipid), (uint8_t)(chipid >> 8),
           (uint8_t)(chipid >> 16), (uint8_t)(chipid >> 24),
           (uint8_t)(chipid >> 32), (uint8_t)(chipid >> 40));
  espChipId = String(buf);
  
  String suffix = espChipId;
  suffix.replace(":", "");
  suffix = suffix.substring(max(0, (int)suffix.length() - 6));
  deviceName = "TF-" + suffix;
}

// ============================================
// NVS LOAD/SAVE
// ============================================

void loadFromNvs() {
  preferences.begin("fleet", true);
  isActivated = preferences.getBool("activated", false);
  activatedSerial = preferences.getString("serial", "");
  preferences.end();
  
  preferences.begin("wifi", true);
  storedSsid = preferences.getString("ssid", "");
  storedPassword = preferences.getString("pass", "");
  preferences.end();
  
  Serial.println("[NVS] Yüklendi:");
  Serial.println("  - Activated: " + String(isActivated ? "EVET" : "HAYIR"));
  Serial.println("  - Serial: " + activatedSerial);
  Serial.println("  - SSID: " + storedSsid);
}

void saveActivationToNvs() {
  preferences.begin("fleet", false);
  preferences.putBool("activated", true);
  preferences.putString("serial", receivedSerial);
  preferences.end();
  activatedSerial = receivedSerial;
  isActivated = true;
  Serial.println("[NVS] Aktivasyon kaydedildi");
}

void saveWifiToNvs() {
  preferences.begin("wifi", false);
  preferences.putString("ssid", receivedSsid);
  preferences.putString("pass", receivedPassword);
  preferences.end();
  storedSsid = receivedSsid;
  storedPassword = receivedPassword;
  Serial.println("[NVS] WiFi kaydedildi");
}

// ============================================
// BLE INIT
// ============================================

void initBLE() {
  if(bleInitialized) {
    Serial.println("[BLE] Zaten başlatılmış, advertising başlatılıyor...");
    NimBLEDevice::startAdvertising();
    return;
  }
  
  Serial.println("[BLE] Başlatılıyor...");

  NimBLEDevice::init(deviceName.c_str());
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);

  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  NimBLEService* svc = pServer->createService(SERVICE_UUID);

  // Serial
  pSerialChar = svc->createCharacteristic(
    CHAR_SERIAL_UUID,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  pSerialChar->setCallbacks(new SerialCharCallbacks());

  // Status
  pStatusChar = svc->createCharacteristic(
    CHAR_STATUS_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  
  // Boot window modunda farklı status
  if(isActivated) {
    pStatusChar->setValue("REPROVISION_READY");
  } else {
    pStatusChar->setValue("WAITING_SERIAL");
  }

  // Result
  pResultChar = svc->createCharacteristic(
    CHAR_RESULT_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  pResultChar->setValue("IDLE");

  // WiFi Credentials
  pWifiCredChar = svc->createCharacteristic(
    CHAR_WIFI_CRED_UUID,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  pWifiCredChar->setCallbacks(new WifiCredCallbacks());


  // WiFi Status
  pWifiStatusChar = svc->createCharacteristic(
    CHAR_WIFI_STAT_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  pWifiStatusChar->setValue(WIFI_STAT_IDLE);

  // WiFi Scan (YENİ)
  pWifiScanChar = svc->createCharacteristic(
    CHAR_WIFI_SCAN_UUID,
    NIMBLE_PROPERTY::READ
  );
  pWifiScanChar->setCallbacks(new WiFiScanCharCallbacks());
  pWifiScanChar->setValue("[]"); // Başlangıçta boş array
  Serial.println("[BLE] WiFi Scan characteristic oluşturuldu");

  svc->start();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  NimBLEAdvertisementData advData;
  advData.setName(deviceName.c_str());
  advData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
  adv->setAdvertisementData(advData);
  adv->start();

  bleInitialized = true;
  Serial.println("[BLE] Ready: " + deviceName);
}

void stopBLE() {
  if(!bleInitialized) return;
  
  Serial.println("[BLE] Stopping...");
  NimBLEDevice::deinit(true);
  pServer = NULL;
  bleInitialized = false;
  bleBootWindowActive = false;
  bleReprovisionMode = false;
}

// ============================================
// WiFi STATUS NOTIFY
// ============================================

void setWifiStatus(const char* status) {
  if(pWifiStatusChar) {
    pWifiStatusChar->setValue(status);
    pWifiStatusChar->notify();
  }
  Serial.print("[WIFI_STATUS] ");
  Serial.println(status);
}

// ============================================
// WiFi CONNECT WITH STATUS
// ============================================

bool wifiConnectWithStatus(const String& ssid, const String& password) {
  Serial.println("[WIFI] Bağlanıyor: " + ssid);
  setWifiStatus(WIFI_STAT_CONNECTING);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  
  int attempts = 0;
  while(WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if(WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    ledsTick();
    Serial.println("[WIFI] ✅ " + WiFi.localIP().toString());
    setWifiStatus(WIFI_STAT_OK);
    return true;
  }
  
  wl_status_t status = WiFi.status();
  if(status == WL_NO_SSID_AVAIL) {
    setWifiStatus(WIFI_STAT_ERR_NOT_FOUND);
  } else if(status == WL_CONNECT_FAILED) {
    setWifiStatus(WIFI_STAT_ERR_AUTH);
  } else {
    setWifiStatus(WIFI_STAT_ERR_TIMEOUT);
  }
  
  return false;
}

// ============================================
// BACKEND ACTIVATE
// ============================================

bool activateDevice(String serial) {
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  http.begin(client, API_ACTIVATE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Activation-Key", DEVICE_ACTIVATION_KEY);
  http.setTimeout(15000);
  
  StaticJsonDocument<256> doc;
  doc["serial"] = serial;
  doc["esp_chip_id"] = espChipId;
  doc["firmware_version"] = FIRMWARE_VERSION;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.print("[ACT] POST ");
  Serial.println(API_ACTIVATE_URL);
  Serial.println("[ACT] " + payload);
  
  int httpCode = http.POST(payload);
  String response = http.getString();
  
  Serial.print("[ACT] HTTP: ");
  Serial.println(httpCode);
  Serial.println("[ACT] " + response);
  
  http.end();
  
  if(httpCode == 200) {
    StaticJsonDocument<512> resDoc;
    if(!deserializeJson(resDoc, response)) {
      if(resDoc["success"] == true) {
        if(pResultChar) {
          pResultChar->setValue("SUCCESS");
          pResultChar->notify();
        }
        return true;
      }
    }
  }
  
  if(pResultChar) {
    pResultChar->setValue("FAILED");
    pResultChar->notify();
  }
  return false;
}

// ============================================
// WIFI UPDATE İŞLEMİ (YENİ)
// ============================================

bool processWifiUpdate() {
  if(!wifiCredReceived) return false;
  
  Serial.println("\n[REPROV] ════════════════════════════════");
  Serial.println("[REPROV] WiFi güncelleme başlatılıyor...");
  Serial.println("[REPROV] Yeni SSID: " + receivedSsid);
  
  if(pStatusChar) {
    pStatusChar->setValue("WIFI_UPDATING");
    pStatusChar->notify();
  }
  
  // Mevcut WiFi'ı kes
  WiFi.disconnect(true);
  delay(500);
  
  // Yeni WiFi'a bağlan
  bool wifiOk = wifiConnectWithStatus(receivedSsid, receivedPassword);
  
  if(wifiOk) {
    Serial.println("[REPROV] ✅ Yeni WiFi başarılı!");
    
    // NVS'e kaydet
    saveWifiToNvs();
    
    if(pStatusChar) {
      pStatusChar->setValue("WIFI_UPDATED");
      pStatusChar->notify();
    }
    
    if(pResultChar) {
      pResultChar->setValue("SUCCESS");
      pResultChar->notify();
    }
    
    delay(1000);  // BLE notification'ların gitmesi için bekle
    
    Serial.println("[REPROV] Rebooting...");
    delay(500);
    ESP.restart();
    return true;
  }
  
  // Başarısız - eski WiFi'a geri dön
  Serial.println("[REPROV] ❌ Yeni WiFi başarısız, eski WiFi'a dönülüyor...");
  
  if(pStatusChar) {
    pStatusChar->setValue("WIFI_UPDATE_FAILED");
    pStatusChar->notify();
  }
  
  // Eski credentials'ı geri yükle
  receivedSsid = "";
  receivedPassword = "";
  wifiCredReceived = false;
  
  // Eski WiFi'a bağlan
  WiFi.begin(storedSsid.c_str(), storedPassword.c_str());
  int attempts = 0;
  while(WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    attempts++;
  }
  
  if(WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("[REPROV] Eski WiFi'a geri bağlandı");
  }
  
  return false;
}

// ============================================
// BLE BOOT WINDOW HANDLER (YENİ)
// ============================================

void handleBleBootWindow() {
  unsigned long elapsed = millis() - bleBootWindowStart;
  unsigned long remaining = (BLE_BOOT_WINDOW_MS > elapsed) ? (BLE_BOOT_WINDOW_MS - elapsed) : 0;
  
  // Her 10 saniyede bir kalan süreyi göster
  static unsigned long lastPrint = 0;
  if(millis() - lastPrint > 10000) {
    Serial.printf("[BLE] Boot window: %lu saniye kaldı\n", remaining / 1000);
    lastPrint = millis();
  }
  
  // LED feedback
  ledsTick();
  
  // WiFi credentials alındı mı?
  if(wifiCredReceived) {
    Serial.println("[BLE] Boot window: WiFi credentials alındı!");
    processWifiUpdate();
    return;
  }
  
  // Timeout kontrolü
  if(elapsed >= BLE_BOOT_WINDOW_MS) {
    Serial.println("\n[BLE] ⏰ Boot window timeout - BLE kapatılıyor");
    bleBootWindowActive = false;
    stopBLE();
    
    // Normal WiFi bağlantısına geç
    Serial.println("[WIFI] Normal moda geçiliyor...");
    connectWiFi();
    macAddress = WiFi.macAddress();
    syncNTP();
    
    // MQTT Topics
    mqtt_topic_location = "fleet/truck/" + activatedSerial + "/location";
    mqtt_topic_alert = "fleet/truck/" + activatedSerial + "/alerts";
    mqtt_topic_telemetry = "fleet/truck/" + activatedSerial + "/telemetry";
    mqtt_topic_command = "fleet/truck/" + activatedSerial + "/command";
    
    // MQTT Setup
    mqtt_client.setServer(mqtt_server, mqtt_port);
    mqtt_client.setBufferSize(512);
    mqtt_client.setCallback(mqttCallback);
    espClient.setInsecure();
    connectMQTT();
    
    // Kalibrasyon
    calibrateAccel();
    
    Serial.println("[SYS] ✅ Normal çalışma moduna geçildi");
  }
}

// ============================================
// REPROVISION MODE HANDLER (YENİ - MQTT tetiklemeli)
// ============================================

void handleReprovisionMode() {
  unsigned long elapsed = millis() - bleBootWindowStart;
  unsigned long remaining = (BLE_REPROVISION_TIMEOUT_MS > elapsed) ? (BLE_REPROVISION_TIMEOUT_MS - elapsed) : 0;
  
  // Her 15 saniyede bir kalan süreyi göster
  static unsigned long lastPrint = 0;
  if(millis() - lastPrint > 15000) {
    Serial.printf("[REPROV] Re-provision mode: %lu saniye kaldı\n", remaining / 1000);
    lastPrint = millis();
  }
  
  // LED feedback
  ledsTick();
  
  // WiFi credentials alındı mı?
  if(wifiCredReceived) {
    Serial.println("[REPROV] WiFi credentials alındı!");
    processWifiUpdate();
    return;
  }
  
  // Timeout kontrolü
  if(elapsed >= BLE_REPROVISION_TIMEOUT_MS) {
    Serial.println("\n[REPROV] ⏰ Re-provision timeout - Normal moda dönülüyor");
    bleReprovisionMode = false;
    stopBLE();
    
    // WiFi'a yeniden bağlan
    connectWiFi();
    connectMQTT();
    
    Serial.println("[SYS] ✅ Normal çalışma moduna geri dönüldü");
  }
}

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(500);
    
  Serial.println("\n");
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║  Fleet Tracker ESP32 v4.3.3 STABLE    ║");
  Serial.println("║  BLE Boot Window + Re-Provisioning    ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  
  // LEDs
  ledsInit();

  // ESP Chip ID
  getEspChipId();
  Serial.println("[INFO] Chip ID: " + espChipId);
  Serial.println("[INFO] Device: " + deviceName);
  
  //loadNVS();
  
 
  // NVS'den yükle
  loadFromNvs();
  
  // Test mode kaldırıldı - Production için temiz başlangıç

  // I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  
  // ADXL345
  if(!accel.begin()) {
    Serial.println("[WARN] ADXL345 bulunamadı");
  } else {
    Serial.println("[OK] ADXL345 başlatıldı");
    accel.setRange(ADXL345_RANGE_16_G);
    accel.setDataRate(ADXL345_DATARATE_100_HZ);
  }
  
  // GPS
  gpsSerial.begin(115200, SERIAL_8N1, GPS_RX, GPS_TX);  // 9600 → 115200
  Serial.println("[OK] GPS başlatıldı");
  
  // ============================================
  // ACTIVATION KONTROLÜ
  // ============================================
  
  if(!isActivated) {
    // ========== İLK AKTİVASYON MODU ==========
    Serial.println("\n⚠️ ════════════════════════════════════");
    Serial.println("   CİHAZ AKTİVE DEĞİL!");
    Serial.println("   BLE ile serial + WiFi bekleniyor...");
    Serial.println("════════════════════════════════════════\n");
    
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    delay(100);
    
    initBLE();
    
    // Sonsuz activation döngüsü
    while(!isActivated) {
      ledsTick();
      
      // Serial + WiFi alındı mı?
      if(serialReceived && wifiCredReceived) {
        serialReceived = false;
        wifiCredReceived = false;
        
        Serial.println("\n[ACT] ════════════════════════════════");
        Serial.println("[ACT] Activation başlatılıyor...");
        Serial.println("[ACT] Serial: " + receivedSerial);
        Serial.println("[ACT] SSID: " + receivedSsid);
        
        if(pStatusChar) {
          pStatusChar->setValue("WIFI_CONNECTING");
          pStatusChar->notify();
        }
        
        bool wifiOk = wifiConnectWithStatus(receivedSsid, receivedPassword);
        
        if(!wifiOk) {
          Serial.println("[ACT] ❌ WiFi başarısız");
          if(pStatusChar) {
            pStatusChar->setValue("WIFI_FAILED");
            pStatusChar->notify();
          }
          WiFi.disconnect(true);
          WiFi.mode(WIFI_OFF);
          continue;
        }
        
        if(pStatusChar) {
          pStatusChar->setValue("ACTIVATING");
          pStatusChar->notify();
        }
        
        if(activateDevice(receivedSerial)) {
          Serial.println("[ACT] ✅ Aktivasyon başarılı!");
          
          saveWifiToNvs();
          saveActivationToNvs();
          
          // ✅ WiFi Status'e başarı gönder (Mobile app bunu dinliyor!)
          if(pWifiStatusChar) {
            pWifiStatusChar->setValue(WIFI_STAT_OK);
            pWifiStatusChar->notify();
            Serial.println("[BLE] WiFi Status: OK gönderildi");
          }
          
          if(pStatusChar) {
            pStatusChar->setValue("COMPLETE");
            pStatusChar->notify();
          }
          
          delay(1000); // Mobile app'in alması için 1 saniye bekle
          stopBLE();
          
          Serial.println("[SYS] Rebooting...");
          delay(500);
          ESP.restart();
        } else {
          Serial.println("[ACT] ❌ Backend activation başarısız");
          if(pStatusChar) {
            pStatusChar->setValue("API_FAILED");
            pStatusChar->notify();
          }
          WiFi.disconnect(true);
          WiFi.mode(WIFI_OFF);
        }
      }
      
      delay(100);
    }
  } else {
    // ========== ZATEN AKTİF - BLE BOOT WINDOW ==========
    Serial.println("\n[NVS] ✅ Cihaz aktif: " + activatedSerial);
    
    // ============================================
    // YENİ: BLE BOOT WINDOW (60 saniye)
    // ============================================
    Serial.println("\n📱 ════════════════════════════════════");
    Serial.println("   BLE BOOT WINDOW AKTİF (60 saniye)");
    Serial.println("   WiFi değişikliği için BLE ile bağlanın");
    Serial.println("   Cihaz adı: " + deviceName);
    Serial.println("════════════════════════════════════════\n");
    
    bleBootWindowActive = true;
    bleBootWindowStart = millis();
    
    initBLE();
    
    // Boot window döngüsü
    while(bleBootWindowActive) {
      handleBleBootWindow();
      delay(100);
    }
    
    // Boot window bitti, normal çalışma devam ediyor (handleBleBootWindow içinde ayarlandı)
  }
}

// ============================================
// WiFi CONNECT (Normal mode)
// ============================================

void connectWiFi() {
  if(storedSsid.length() == 0) {
    Serial.println("[WIFI] NVS'de SSID yok!");
    wifiConnected = false;
    ledsTick();
    return;
  }

  Serial.print("[WIFI] Bağlanıyor: " + storedSsid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(storedSsid.c_str(), storedPassword.c_str());

  int attempts = 0;
  while(WiFi.status() != WL_CONNECTED && attempts < 30) {
    wifiConnected = false;
    ledsTick();
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if(WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    ledsTick();
    Serial.println("[WIFI] ✅ " + WiFi.localIP().toString());
  } else {
    wifiConnected = false;
    ledsTick();
    Serial.println("[WIFI] ❌ Bağlanamadı");
  }
}

void syncNTP() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  struct tm timeinfo;
  if(getLocalTime(&timeinfo)) {
    Serial.println("[NTP] ✅ Senkronize");
  }
}

void connectMQTT() {
  if(activatedSerial.length() == 0) return;
  
  Serial.print("[MQTT] Bağlanıyor...");
  String clientId = "ESP32_" + activatedSerial;
  
  int attempts = 0;
  while(!mqtt_client.connected() && attempts < 3) {
    if(mqtt_client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("\n[MQTT] ✅ Bağlandı");
      
      if(mqtt_topic_command.length() > 0) {
        mqtt_client.subscribe(mqtt_topic_command.c_str());
        Serial.println("[MQTT] 📡 Subscribed: " + mqtt_topic_command);
      }
      return;
    }
    Serial.print(".");
    delay(2000);
    attempts++;
  }
  Serial.println("\n[MQTT] ❌ Bağlanamadı");
}

String getTimestamp() {
  struct tm timeinfo;
  if(getLocalTime(&timeinfo)) {
    char ts[25];
    strftime(ts, sizeof(ts), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return String(ts);
  }
  return "1970-01-01T00:00:00Z";
}

// ============================================
// HAVERSINE DISTANCE (metre)
// ============================================

double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0;
  double dLat = radians(lat2 - lat1);
  double dLon = radians(lon2 - lon1);
  double a = sin(dLat/2) * sin(dLat/2) +
             cos(radians(lat1)) * cos(radians(lat2)) *
             sin(dLon/2) * sin(dLon/2);
  double c = 2 * atan2(sqrt(a), sqrt(1-a));
  return R * c;
}

// ============================================
// YAYIN ARALIĞI - Adaptive
// ============================================

long getPublishInterval() {
  if(eventBurstCount > 0) return INTERVAL_EVENT;
  
  if(forcePublish) {
    forcePublish = false;
    return 0;
  }
  
  if(currentSpeed < IDLE_SPEED) return INTERVAL_IDLE;
  if(currentSpeed < CITY_SPEED) return INTERVAL_CITY;
  if(currentSpeed < HIGHWAY_SPEED) return INTERVAL_HIGHWAY;
  return INTERVAL_FAST;
}



// ============================================
// MAIN LOOP
// ============================================

void loop() {
  if(!isActivated) {
    ESP.restart();
  }

  if(bleReprovisionMode) {
    handleReprovisionMode();
    delay(100);
    return;  // Normal loop'u atla
  }
  
  // Uzaktan komut flag'lerini işle
  if(g_clearWifiRequested) {
    g_clearWifiRequested = false;
    preferences.begin("wifi", false);
    preferences.remove("ssid");
    preferences.remove("pass");
    preferences.end();
    delay(200);
    ESP.restart();
  }

  if(g_restartRequested) {
    g_restartRequested = false;
    delay(200);
    ESP.restart();
  }
  
  // YENİ: Re-provision komutu
  if(g_reprovisionRequested) {
    g_reprovisionRequested = false;
    Serial.println("\n[MQTT] 📱 Re-provision mode tetiklendi!");
    
    // WiFi'ı kes, BLE'yi başlat
    mqtt_client.disconnect();
    WiFi.disconnect(true);
    delay(500);
    
    bleReprovisionMode = true;
    bleBootWindowStart = millis();
    
    initBLE();
    
    Serial.println("[BLE] Re-provision için BLE açıldı (2 dakika)");
    return;
  }
  
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  if(!wifiConnected) {
    connectWiFi();
  }
  
  if(!mqtt_client.connected()) {
    connectMQTT();
  }
  mqtt_client.loop();
  
  // GPS okuma
  while(gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // GPS fix health
  if(gps.location.isValid() && gps.location.isUpdated()) {
    lastValidGpsMs = millis();
    hasValidFix = true;
    
    if(lastSentLat != 0) {
      double dist = haversineDistance(lastSentLat, lastSentLng, 
                                       gps.location.lat(), gps.location.lng());
      if(dist > DISTANCE_TRIGGER) {
        forcePublish = true;
      }
    }
  }
  gpsHasFix = (lastValidGpsMs != 0) && (millis() - lastValidGpsMs < GPS_STALE_MS);
  
  if(gps.speed.isValid()) {
    float speedKnots = gps.speed.knots();
    currentSpeed = speedKnots * 1.852;
    
    static unsigned long lastSpeedDebug = 0;
    if(millis() - lastSpeedDebug > 5000 && currentSpeed > 5) {
      Serial.printf("[GPS] Speed: %.2f knots = %.1f km/h\n", speedKnots, currentSpeed);
      lastSpeedDebug = millis();
    }
  }
  
  readAndSmoothAccel();
  checkForEvents();
  
  long interval = getPublishInterval();
  if(millis() - lastPublish >= interval) {
    ledsTick();
    publishTelemetry();
    lastPublish = millis();
    if(eventBurstCount > 0) eventBurstCount--;
  }
  
  if(millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  delay(10);
}

// ============================================
// OLAY TESPİTİ
// ============================================

void checkForEvents() {
  if(!calibrated) return;
  if(millis() - lastAlertTime < ALERT_COOLDOWN) return;
  
  float netAxG = (smoothAx - baselineAx) / 9.81;
  float netAyG = (smoothAy - baselineAy) / 9.81;
  float impactG = sqrt(netAxG*netAxG + netAyG*netAyG);
  
  static unsigned long lastDebug = 0;
  if(millis() - lastDebug > 2000) {
    Serial.printf("[ADXL] Ax=%.2fG Ay=%.2fG impact=%.2fG spd=%.1f\n", 
                  netAxG, netAyG, impactG, currentSpeed);
    lastDebug = millis();
  }
  
  if(impactG > THRESHOLD_IMPACT) {
    sendAlert("IMPACT", "Carpma tespit edildi!", impactG, "critical");
    return;
  }
  
  if(currentSpeed < 2.5) return;
  
  if(netAxG < -THRESHOLD_BRAKE) {
    sendAlert("HARD_BRAKE", "Ani fren!", abs(netAxG), "high");
    return;
  }
  
  if(netAxG > THRESHOLD_ACCEL) {
    sendAlert("HARD_ACCEL", "Sert hizlanma!", netAxG, "medium");
    return;
  }
  
  if(abs(netAyG) > THRESHOLD_TURN) {
    sendAlert("HARD_TURN", "Sert viraj!", abs(netAyG), "medium");
    return;
  }
}

// ============================================
// MQTT CALLBACK - Uzaktan Komut
// ============================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  msg.reserve(length + 1);
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  msg.trim();

  Serial.printf("[MQTT] topic=%s msg=%s\n", topic, msg.c_str());

  if (strcmp(topic, mqtt_topic_command.c_str()) != 0) return;

  if (msg == "RESET" || msg == "REBOOT") {
    Serial.println("[CMD] ⚡ Restart requested");
    g_restartRequested = true;
  } 
  else if (msg == "STATUS") {
    Serial.println("[CMD] 📊 Status requested");
    publishTelemetry();
  } 
  else if (msg == "CLEAR_WIFI") {
    Serial.println("[CMD] 🗑️ Clear WiFi requested");
    g_clearWifiRequested = true;
  } 
  else if (msg == "RECALIBRATE") {
    Serial.println("[CMD] 🔧 Recalibrate requested");
    calibrateAccel();
  }
  // YENİ: Re-provision komutu
  else if (msg == "REPROVISION" || msg == "BLE_MODE") {
    Serial.println("[CMD] 📱 Re-provision mode requested");
    g_reprovisionRequested = true;
  }
}

// ============================================
// ALERT
// ============================================

void sendAlert(String type, String message, float value, String severity) {
  if(mqtt_topic_alert.length() == 0) return;
  
  lastAlertTime = millis();
  eventBurstCount = 3;
  totalAlerts++;
  
  StaticJsonDocument<512> doc;
  doc["device_code"] = activatedSerial;
  doc["serial"] = activatedSerial;
  doc["esp_chip_id"] = espChipId;
  doc["timestamp"] = getTimestamp();
  doc["type"] = type;
  doc["severity"] = severity;
  doc["description"] = message;
  doc["value"] = value;
  
  if(gps.location.isValid()) {
    doc["latitude"] = gps.location.lat();
    doc["longitude"] = gps.location.lng();
    doc["speed"] = currentSpeed;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  mqtt_client.publish(mqtt_topic_alert.c_str(), payload.c_str());
  Serial.println("[ALERT] " + type + " " + String(value, 2) + "G");
}

// ============================================
// TELEMETRY
// ============================================

void publishTelemetry() {
  if(mqtt_topic_location.length() == 0) return;
  
  if(!gpsHasFix) {
    Serial.printf("[GPS] ⚠️ stale/no_fix (age=%lu ms)\n", millis() - lastValidGpsMs);
    return;
  }
  
  if(!gps.location.isValid()) {
    Serial.println("[GPS] ⚠️ invalid location");
    return;
  }
  
  double curLat = gps.location.lat();
  double curLng = gps.location.lng();

  bool locationChanged = false;
  if(hasValidFix && lastSentLat != 0) {
    double dist = haversineDistance(lastSentLat, lastSentLng, curLat, curLng);
    locationChanged = (dist > 5.0);
    
    if(!locationChanged && currentSpeed < 2.0) {
      if(millis() - lastGpsUpdateMs < 60000) {
        return;
      }
    }
  }
  
  StaticJsonDocument<512> doc;
  doc["device_code"] = activatedSerial;
  doc["serial"] = activatedSerial;
  doc["esp_chip_id"] = espChipId;
  doc["timestamp"] = getTimestamp();
  doc["latitude"] = curLat;
  doc["longitude"] = curLng;
  doc["speed"] = currentSpeed;
  doc["altitude"] = gps.altitude.meters();
  doc["heading"] = gps.course.deg();
  doc["satellites"] = gps.satellites.value();
  doc["fw_version"] = FIRMWARE_VERSION;
  doc["accel_x"] = smoothAx;
  doc["accel_y"] = smoothAy;
  doc["accel_z"] = smoothAz;
  
  String payload;
  serializeJson(doc, payload);
  
  if(mqtt_client.publish(mqtt_topic_location.c_str(), payload.c_str())) {
    lastSentLat = curLat;
    lastSentLng = curLng;
    lastGpsUpdateMs = millis();
    totalMessages++;
    
    Serial.printf("[TX] #%lu | %.6f, %.6f | %.1f km/h %s\n", 
                  totalMessages, curLat, curLng, currentSpeed,
                  locationChanged ? "✓" : "(hb)");
  } else {
    Serial.println("[TX] ❌ MQTT publish failed");
  }
}

// ============================================
// HEARTBEAT
// ============================================

void sendHeartbeat() {
  Serial.println("[HB] ✅ Heartbeat gönderildi");
}

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

void readAndSmoothAccel() {
  sensors_event_t event;
  accel.getEvent(&event);
  float alpha = 0.3;
  smoothAx = alpha * event.acceleration.x + (1 - alpha) * smoothAx;
  smoothAy = alpha * event.acceleration.y + (1 - alpha) * smoothAy;
  smoothAz = alpha * event.acceleration.z + (1 - alpha) * smoothAz;
}

void calibrateAccel() {
  Serial.println("[CAL] Kalibrasyon...");
  float sumX = 0, sumY = 0, sumZ = 0;
  for(int i = 0; i < 50; i++) {
    sensors_event_t event;
    accel.getEvent(&event);
    sumX += event.acceleration.x;
    sumY += event.acceleration.y;
    sumZ += event.acceleration.z;
    delay(20);
  }
  baselineAx = sumX / 50;
  baselineAy = sumY / 50;
  baselineAz = sumZ / 50;
  smoothAx = baselineAx;
  smoothAy = baselineAy;
  smoothAz = baselineAz;
  calibrated = true;
  Serial.println("[CAL] ✅ Tamamlandı");
}
