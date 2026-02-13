/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TulipFleet ESP32-S3 N16R8 Tracker  —  v4.4.1 PRODUCTION   ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Board  : ESP32-S3 N16R8 (16 MB Flash / 8 MB PSRAM)        ║
 * ║  Base   : v4.3.11 (WROOM-32) + Cem's v4.3.15b S3 draft     ║
 * ║  Date   : 13 February 2026                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * MIGRATION SUMMARY  (v4.3.11 WROOM → v4.4.0 S3):
 * ─────────────────────────────────────────────────
 *  1. PIN MAPPING
 *     - GPS        : RX16/TX17 → GPIO16/GPIO17 (S3-safe, same numbers)
 *     - I2C (ADXL) : default → SDA=GPIO38, SCL=GPIO39 (explicit Wire.begin)
 *     - LEDs       : none → GPS=GPIO5, WIFI=GPIO6 (optional)
 *
 *  2. BLE + WiFi COEXISTENCE  (biggest win of S3)
 *     - stopBLE()  now does SOFT STOP (advertising off, stack stays).
 *       Old WROOM code did NimBLEDevice::deinit(true) + 1.5 s delay.
 *       S3 doesn't need that because BLE & WiFi run in parallel.
 *     - #define TULIPFLEET_BLE_HARD_STOP to force full teardown (debug).
 *
 *  3. BOOT WINDOW  (NEW – requested feature)
 *     - First activation → BLE stays until provisioned (no timeout).
 *     - Activated but WiFi fails → 120 s re-provision BLE window.
 *     - Activated + WiFi OK → 90 s BLE boot window (allows re-provision
 *       from app even after successful boot). Closes automatically.
 *
 *  4. BROWNOUT REG
 *     - Guarded with #if !defined(CONFIG_IDF_TARGET_ESP32S3).
 *       RTC_CNTL_BROWN_OUT_REG doesn't exist on S3.
 *
 *  5. WDT
 *     - disableCore0WDT kept (works on both old & new S3 Arduino cores).
 *     - esp_task_wdt_deinit() caused boot crash on some S3 cores — removed.
 *
 *  6. MQTT BUFFER
 *     - Increased to 512 (was default 256 – too small for location JSON).
 *
 *  7. WiFi CONNECT
 *     - Removed duplicate delay(100) lines from v4.3.15b.
 *     - Added detailed WL_STATUS logging.
 *
 *  8. LED FEEDBACK
 *     - GPS fix → LED_GPS solid HIGH.
 *     - WiFi connected → LED_WIFI solid HIGH.
 *
 *  9. TELEMETRY
 *     - Added chip_model "ESP32-S3" and psram_size to telemetry payload.
 *     - Added battery_mv placeholder for future ADC reading.
 *
 * 10. HEADER COMMENT
 *     - Updated to accurately describe S3 target.
 *     - Removed stale "ROOT CAUSE OF CRASH" notes (WROOM-specific).
 *
 * UNCHANGED from v4.3.11/v4.3.15b:
 *   - BLE UUIDs, service structure, callbacks
 *   - MQTT topics, JSON payload schema
 *   - Provisioning state machine flow
 *   - Haversine, speed-adaptive intervals
 *   - NVS key names (fleet/ACTIVATED, SERIAL, SSID, PASSWORD, DEVICE_TOKEN)
 *   - Backend API endpoints & activation_key
 */

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
#include "esp_mac.h"
#include "esp_bt.h"
#include "esp_task_wdt.h"

// S3 doesn't have RTC_CNTL_BROWN_OUT_REG; guard the include
#if !defined(CONFIG_IDF_TARGET_ESP32S3)
  #include "soc/soc.h"
  #include "soc/rtc_cntl_reg.h"
#endif

// ============================================
// CONFIGURATION
// ============================================

const char* FIRMWARE_VERSION   = "4.4.1";
const char* DEVICE_SERIAL      = "TF-2026-DEMO-1";   // overwritten at provisioning
const char* CHIP_MODEL         = "ESP32-S3-N16R8";

// Backend
const char* API_ACTIVATE_URL           = "https://api.tulipfleet.com/api/devices/activate";
const char* API_VERIFY_TOKEN_URL       = "https://api.tulipfleet.com/api/devices/verify-token";
const char* API_VERIFY_DEVICE_TOKEN_URL = "https://api.tulipfleet.com/api/devices/verify-device-token";
const char* DEVICE_ACTIVATION_KEY      = "TulipFleet2025SecureActivationKeyESP32";

// MQTT
const char* mqtt_server   = "46.224.1.192";
const int   mqtt_port     = 8883;
const char* mqtt_username = "fleet_esp32";
const char* mqtt_password = "ESP32Fleet2026SecureKey!";

// NTP
const char* ntpServer        = "pool.ntp.org";
const long  gmtOffset_sec    = 3 * 3600;   // UTC+3 (Turkey)
const int   daylightOffset_sec = 0;

// ============================================
// PIN MAPPING — ESP32-S3 N16R8
// ============================================
// GPS module (NEO-6M) via UART2
#define GPS_RX_PIN   16          // S3 GPIO16 ← GPS TX
#define GPS_TX_PIN   17          // S3 GPIO17 → GPS RX

// I2C — ADXL345 accelerometer
#define I2C_SDA_PIN  38          // S3 GPIO38
#define I2C_SCL_PIN  39          // S3 GPIO39

// Optional status LEDs
#define LED_GPS      5           // S3 GPIO5  — GPS fix indicator
#define LED_WIFI     6           // S3 GPIO6  — WiFi connected indicator

// Battery ADC (placeholder — wire a voltage divider to this pin)
// #define BAT_ADC_PIN 4

// ============================================
// BLE BOOT WINDOW SETTINGS
// ============================================
#define BLE_BOOT_WINDOW_MS          90000    // 90 s — normal boot window
#define BLE_REPROVISION_TIMEOUT_MS  120000   // 120 s — WiFi-fail re-provision

bool          bleBootWindowActive = false;
unsigned long bleBootWindowStart  = 0;
bool          bleReprovisionMode  = false;

// ============================================
// BLE SETTINGS
// ============================================
#define SERVICE_UUID         "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_SERIAL_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_STATUS_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define CHAR_RESULT_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26aa"
#define CHAR_WIFI_CRED_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26ab"
#define CHAR_WIFI_STAT_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26ac"
#define CHAR_WIFI_SCAN_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26ad"
#define CHAR_AUTH_TOKEN_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ae"

// WiFi Status strings (sent over BLE to mobile app)
const char* WIFI_STAT_IDLE        = "IDLE";
const char* WIFI_STAT_CONNECTING  = "CONNECTING";
const char* WIFI_STAT_OK          = "OK";
const char* WIFI_STAT_ERR_AUTH    = "ERR_AUTH";
const char* WIFI_STAT_ERR_TIMEOUT = "ERR_TIMEOUT";
const char* WIFI_STAT_ERR_NOT_FOUND = "ERR_NOT_FOUND";
const char* WIFI_STAT_ERR_UNKNOWN = "ERR_UNKNOWN";
const char* WIFI_STAT_ERR_TOKEN   = "ERR_TOKEN";

// ============================================
// GLOBALS
// ============================================

Preferences         preferences;
WiFiClientSecure    espClient;
PubSubClient        mqtt_client(espClient);
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
TinyGPSPlus         gps;
HardwareSerial      gpsSerial(2);

// Device info
String espChipId  = "";
String macAddress = "";
String deviceName = "";

// Persistent state (loaded from NVS)
bool   isActivated     = false;
String activatedSerial = "";
String storedSsid      = "";
String storedPassword  = "";
String storedToken     = "";

// Runtime state
bool wifiConnected  = false;
bool bleInitialized = false;
bool bleConnected   = false;

// WiFi scan task
volatile bool     wifiScanComplete = false;
volatile bool     wifiScanSuccess  = false;
volatile bool     ssidFoundInScan  = false;
TaskHandle_t      wifiScanTaskHandle = NULL;

// ============================================
// PROVISIONING STATE MACHINE
// ============================================

enum ProvisionState {
  PROV_IDLE,
  PROV_CREDENTIALS_RECEIVED,
  PROV_STOPPING_BLE,
  PROV_BLE_STOPPED,
  PROV_CONNECTING_WIFI,
  PROV_WIFI_CONNECTED,
  PROV_ACTIVATING,
  PROV_SUCCESS,
  PROV_FAILED
};

ProvisionState provisionState     = PROV_IDLE;
unsigned long  provisionStateTime = 0;

// Received via BLE
String receivedSerial   = "";
String receivedSsid     = "";
String receivedPassword = "";
String receivedToken    = "";
bool   serialReceived   = false;
bool   wifiCredReceived = false;
bool   tokenReceived    = false;

// BLE Characteristics
NimBLEServer*          pServer         = nullptr;
NimBLECharacteristic*  pSerialChar     = nullptr;
NimBLECharacteristic*  pStatusChar     = nullptr;
NimBLECharacteristic*  pResultChar     = nullptr;
NimBLECharacteristic*  pWifiCredChar   = nullptr;
NimBLECharacteristic*  pWifiStatusChar = nullptr;
NimBLECharacteristic*  pWifiScanChar   = nullptr;
NimBLECharacteristic*  pAuthTokenChar  = nullptr;

// MQTT Topics
String mqtt_topic_location  = "";
String mqtt_topic_telemetry = "";
String mqtt_topic_events    = "";
String mqtt_topic_heartbeat = "";
String mqtt_topic_command   = "";

// GPS & Motion
double currentLat = 0, currentLon = 0;
double lastLat    = 0, lastLon    = 0;
float  currentSpeed = 0;
float  baseX = 0, baseY = 0, baseZ = 0;
bool   gpsValid = false;

// Timing (ms)
unsigned long lastPublish          = 0;
unsigned long lastTelemetryPublish = 0;
unsigned long lastGpsRead          = 0;
unsigned long lastHeartbeat        = 0;
unsigned long lastMovingPublish    = 0;
int           eventBurstCount      = 0;

// Intervals (ms)
const long INTERVAL_IDLE    = 30000;
const long INTERVAL_FAST    = 15000;
const long INTERVAL_CITY    = 10000;
const long INTERVAL_HIGHWAY = 5000;
const long INTERVAL_EVENT   = 3000;

// Stationary detection
const float STATIONARY_DISTANCE  = 10.0;      // metres — min movement to publish
const long  STATIONARY_HEARTBEAT = 300000;     // 5 min — publish at least this often

// Speed thresholds (km/h)
const float IDLE_SPEED    = 5.0;
const float CITY_SPEED    = 50.0;
const float HIGHWAY_SPEED = 90.0;

// Accelerometer thresholds (g-force delta)
const float HARSH_BRAKE_THRESHOLD = 0.35;
const float HARSH_ACCEL_THRESHOLD = 0.25;
const float HARSH_TURN_THRESHOLD  = 0.30;
const float IMPACT_THRESHOLD      = 2.5;

// ============================================
// FORWARD DECLARATIONS
// ============================================

void initBLE();
void stopBLE();
void updateWifiStatusChar(const char* status);
void updateProvisioningStatus(const char* status);
void updateProvisioningResult(const char* result);
bool parseWifiCredentials(const String& json, String& ssid, String& password);
bool isTokenFormatValid(const String& token);
bool verifyTokenWithBackend(const String& serial, const String& provToken);
void performWiFiScan();
void processProvisionStateMachine();
bool connectWiFiDirect(const String& ssid, const String& password);
bool connectWiFi();
void connectMQTT();

// ============================================
// LED HELPERS
// ============================================

void ledsInit() {
  pinMode(LED_GPS, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  digitalWrite(LED_GPS, LOW);
  digitalWrite(LED_WIFI, LOW);
}

void ledBlink(int pin, int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(delayMs);
    digitalWrite(pin, LOW);
    if (i < times - 1) delay(delayMs);
  }
}

// ============================================
// UTILITY — JSON PARSE
// ============================================

bool parseWifiCredentials(const String& json, String& ssid, String& password) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, json);

  if (error) {
    Serial.print("[JSON] Parse error: ");
    Serial.println(error.c_str());
    return false;
  }

  if (!doc.containsKey("ssid") || !doc.containsKey("password")) {
    Serial.println("[JSON] Missing ssid or password");
    return false;
  }

  ssid     = String((const char*)doc["ssid"]);
  password = String((const char*)doc["password"]);

  return ssid.length() > 0;
}

bool isTokenFormatValid(const String& token) {
  if (token.length() < 20) return false;
  int dotCount = 0;
  for (unsigned int i = 0; i < token.length(); i++) {
    if (token.charAt(i) == '.') dotCount++;
  }
  return dotCount == 2;   // JWT format: header.payload.signature
}

// ============================================
// BLE CALLBACKS
// ============================================

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer) override {
    bleConnected = true;
    Serial.println("[BLE] Client connected");
  }

  void onDisconnect(NimBLEServer* pServer) override {
    bleConnected = false;
    Serial.println("[BLE] Client disconnected");

    // Re-advertise only if not in provisioning process
    if (provisionState == PROV_IDLE && bleInitialized) {
      delay(500);
      pServer->startAdvertising();
      Serial.println("[BLE] Re-advertising...");
    }
  }
};

class SerialCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) override {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      receivedSerial = String(value.c_str());
      serialReceived = true;
      Serial.println("[BLE] Serial received: " + receivedSerial);
    }
  }
};

class TokenCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) override {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      receivedToken = String(value.c_str());
      tokenReceived = true;
      Serial.println("[BLE] Token received (len=" + String(receivedToken.length()) + ")");

      if (!isTokenFormatValid(receivedToken)) {
        updateWifiStatusChar(WIFI_STAT_ERR_TOKEN);
        Serial.println("[BLE] Token format invalid");
        tokenReceived = false;
        receivedToken = "";
      } else {
        Serial.println("[BLE] Token format valid");
      }
    }
  }
};

// ─── CRITICAL: WiFi credentials callback ─────────────────────
// Only stores credentials; WiFi connection happens in main loop
// via the provision state machine.
class WifiCredCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) override {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      String json = String(value.c_str());
      Serial.println("[BLE] WiFi credentials received: " + json);

      if (parseWifiCredentials(json, receivedSsid, receivedPassword)) {
        wifiCredReceived = true;
        Serial.println("[BLE] SSID: " + receivedSsid);

        // Trigger state machine in main loop
        if (provisionState == PROV_IDLE) {
          provisionState     = PROV_CREDENTIALS_RECEIVED;
          provisionStateTime = millis();
          Serial.println("[PROV] Credentials stored, will process in main loop");
        }
      } else {
        Serial.println("[BLE] JSON parse failed");
      }
    }
  }
};

class WifiScanCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) override {
    std::string value = pCharacteristic->getValue();
    Serial.println("[BLE] WiFi scan command received");
    performWiFiScan();
  }

  void onRead(NimBLECharacteristic* pCharacteristic) override {
    Serial.println("[BLE] WiFi scan read requested");
    performWiFiScan();
  }
};

// ============================================
// WiFi SCAN  (max 5 networks — fits BLE MTU)
// ============================================

void performWiFiScan() {
  if (!bleInitialized || !pWifiScanChar) {
    Serial.println("[SCAN] BLE not ready");
    return;
  }

  Serial.println("[SCAN] Scanning WiFi networks...");

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  int n = WiFi.scanNetworks();
  Serial.printf("[SCAN] Found %d networks\n", n);

  int maxNetworks = min(n, 5);

  StaticJsonDocument<512> doc;
  JsonArray networks = doc.to<JsonArray>();

  for (int i = 0; i < maxNetworks; i++) {
    JsonObject net = networks.createNestedObject();
    net["ssid"]       = WiFi.SSID(i);
    net["rssi"]       = WiFi.RSSI(i);
    net["channel"]    = WiFi.channel(i);
    net["encryption"] = WiFi.encryptionType(i);
  }

  String json;
  serializeJson(doc, json);
  Serial.println("[SCAN] JSON: " + json);

  pWifiScanChar->setValue((uint8_t*)json.c_str(), json.length());
  delay(150);
  pWifiScanChar->notify();

  WiFi.scanDelete();
  Serial.printf("[SCAN] Sent %d networks via BLE\n", maxNetworks);
}

// ============================================
// BLE STATUS HELPERS
// ============================================

void updateWifiStatusChar(const char* status) {
  if (bleInitialized && pWifiStatusChar) {
    pWifiStatusChar->setValue(status);
    pWifiStatusChar->notify();
    Serial.println("[BLE] WiFi Status: " + String(status));
  }
}

void updateProvisioningStatus(const char* status) {
  if (bleInitialized && pStatusChar) {
    pStatusChar->setValue(status);
    pStatusChar->notify();
    Serial.println("[BLE] Status: " + String(status));
  }
}

void updateProvisioningResult(const char* result) {
  if (bleInitialized && pResultChar) {
    pResultChar->setValue(result);
    pResultChar->notify();
    Serial.println("[BLE] Result: " + String(result));
  }
}

// ============================================
// BLE — INIT
// ============================================

void initBLE() {
  if (bleInitialized) {
    // Already initialised — just re-start advertising
    Serial.println("[BLE] Already initialized, restarting advertising");
    NimBLEDevice::getAdvertising()->start();
    return;
  }

  Serial.println("[BLE] Starting...");
  Serial.printf("[MEM] free=%u min=%u\n", ESP.getFreeHeap(), ESP.getMinFreeHeap());

  // Release Classic BT memory (we only use BLE)
  esp_bt_controller_mem_release(ESP_BT_MODE_CLASSIC_BT);
  delay(300);

  NimBLEDevice::init(deviceName.c_str());
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);
  NimBLEDevice::setMTU(185);

  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  NimBLEService* pService = pServer->createService(SERVICE_UUID);

  // Serial
  pSerialChar = pService->createCharacteristic(CHAR_SERIAL_UUID, NIMBLE_PROPERTY::WRITE);
  pSerialChar->setCallbacks(new SerialCallbacks());

  // Status (read + notify)
  pStatusChar = pService->createCharacteristic(
    CHAR_STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

  // Result (read + notify)
  pResultChar = pService->createCharacteristic(
    CHAR_RESULT_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

  // WiFi credentials (write)
  pWifiCredChar = pService->createCharacteristic(CHAR_WIFI_CRED_UUID, NIMBLE_PROPERTY::WRITE);
  pWifiCredChar->setCallbacks(new WifiCredCallbacks());

  // WiFi status (read + notify)
  pWifiStatusChar = pService->createCharacteristic(
    CHAR_WIFI_STAT_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

  // WiFi scan (read + write + notify)
  pWifiScanChar = pService->createCharacteristic(
    CHAR_WIFI_SCAN_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR | NIMBLE_PROPERTY::NOTIFY);
  pWifiScanChar->setCallbacks(new WifiScanCallbacks());

  // Auth token (write)
  pAuthTokenChar = pService->createCharacteristic(CHAR_AUTH_TOKEN_UUID, NIMBLE_PROPERTY::WRITE);
  pAuthTokenChar->setCallbacks(new TokenCallbacks());

  pService->start();
  Serial.println("[BLE] Service started");

  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();

  bleInitialized = true;
  updateProvisioningStatus("WAITING");
  updateWifiStatusChar(WIFI_STAT_IDLE);

  Serial.println("[BLE] Active — Device: " + deviceName);
}

// ============================================
// BLE — STOP
// ─── ESP32-S3 COEXISTENCE STRATEGY ───
// S3 can run BLE + WiFi concurrently.
// Default: soft stop (advertising off, stack stays).
// Compile with -DTULIPFLEET_BLE_HARD_STOP for full teardown.
// ============================================

void stopBLE() {
  if (!bleInitialized) {
    Serial.println("[BLE] Not initialized, skip stop");
    return;
  }

#ifdef TULIPFLEET_BLE_HARD_STOP
  // ── FULL TEARDOWN (debug / edge cases) ──
  Serial.println("[BLE] HARD STOP: full teardown...");

  if (pServer) {
    pServer->stopAdvertising();
    delay(100);
    // Disconnect all clients
    std::vector<uint16_t> peers = pServer->getPeerDevices();
    for (auto id : peers) pServer->disconnect(id);
    delay(200);
  }

  delay(500);
  NimBLEDevice::deinit(true);
  delay(1000);

  bleInitialized = false;
  bleConnected   = false;
  pServer        = nullptr;
  pSerialChar    = nullptr;
  pStatusChar    = nullptr;
  pResultChar    = nullptr;
  pWifiCredChar  = nullptr;
  pWifiStatusChar = nullptr;
  pWifiScanChar  = nullptr;
  pAuthTokenChar = nullptr;

  Serial.println("[BLE] HARD STOP complete");

#else
  // ── SOFT STOP (default for S3) ──
  Serial.println("[BLE] Soft stop: advertising OFF (stack kept alive)");
  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  if (adv) adv->stop();
  // bleInitialized stays true — we can re-advertise later without re-init
#endif
}

// ============================================
// WiFi — DIRECT CONNECT
// ============================================

bool connectWiFiDirect(const String& ssid, const String& password) {
  Serial.println("[WiFi] Connecting to: " + ssid);

  WiFi.mode(WIFI_STA);
  delay(100);
  WiFi.begin(ssid.c_str(), password.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    digitalWrite(LED_WIFI, HIGH);
    Serial.println("[WiFi] CONNECTED!");
    Serial.println("[WiFi] IP: " + WiFi.localIP().toString());
    Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());
    return true;
  }

  // Detailed failure reason
  wl_status_t st = WiFi.status();
  switch (st) {
    case WL_NO_SSID_AVAIL:  Serial.println("[WiFi] SSID not found");   break;
    case WL_CONNECT_FAILED: Serial.println("[WiFi] Wrong password");    break;
    case WL_DISCONNECTED:   Serial.println("[WiFi] Disconnected");      break;
    default:                Serial.printf("[WiFi] Failed (status=%d)\n", st); break;
  }
  return false;
}

// Smart WiFi connect (for activated devices)
bool smartWiFiConnect() {
  if (storedSsid.length() == 0) {
    Serial.println("[WiFi] Stored SSID empty");
    return false;
  }
  Serial.println("[WiFi] Connecting to stored: " + storedSsid);
  return connectWiFiDirect(storedSsid, storedPassword);
}

bool connectWiFi() {
  return smartWiFiConnect();
}

// ============================================
// WiFi SCAN TASK (FreeRTOS — separate stack)
// ============================================

void wifiScanTaskFunc(void* param) {
  Serial.println("[WiFi] Scan task started...");

  WiFi.mode(WIFI_STA);
  WiFi.scanNetworks(true);  // async

  while (WiFi.scanComplete() == WIFI_SCAN_RUNNING) {
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }

  int n = WiFi.scanComplete();
  if (n < 0) {
    Serial.println("[WiFi] Scan failed");
    wifiScanComplete = true;
    wifiScanSuccess  = false;
    vTaskDelete(NULL);
    return;
  }

  ssidFoundInScan = false;
  for (int i = 0; i < n; i++) {
    String s = WiFi.SSID(i);
    Serial.printf("  [%d] %s (%d dBm)\n", i, s.c_str(), WiFi.RSSI(i));
    if (s == storedSsid) ssidFoundInScan = true;
  }

  WiFi.scanDelete();
  wifiScanComplete = true;
  wifiScanSuccess  = ssidFoundInScan;

  Serial.println("[WiFi] Scan task complete");
  vTaskDelete(NULL);
}

// ============================================
// TOKEN VERIFICATION
// ============================================

bool verifyTokenWithBackend(const String& serial, const String& provToken) {
  if (!wifiConnected) {
    Serial.println("[TOKEN] WiFi not connected");
    return false;
  }

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  http.begin(client, API_VERIFY_TOKEN_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + provToken);

  StaticJsonDocument<256> doc;
  doc["serial"]      = serial;
  doc["esp_chip_id"] = espChipId;

  String payload;
  serializeJson(doc, payload);

  Serial.println("[TOKEN] Verifying with backend...");
  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("[TOKEN] Verification OK");
    http.end();
    return true;
  }

  Serial.printf("[TOKEN] Verification failed: %d\n", httpCode);
  http.end();
  return false;
}

// ============================================
// DEVICE ACTIVATION
// ============================================

bool activateDevice(String& outDeviceToken) {
  if (!wifiConnected) {
    Serial.println("[ACT] WiFi not connected");
    return false;
  }
  if (receivedSerial.length() == 0) {
    Serial.println("[ACT] No serial");
    return false;
  }

  Serial.println("[ACT] Starting activation...");

  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  http.begin(client, API_ACTIVATE_URL);
  http.addHeader("Content-Type", "application/json");

  if (receivedToken.length() > 0) {
    http.addHeader("Authorization", "Bearer " + receivedToken);
  }

  StaticJsonDocument<512> doc;
  doc["serial"]           = receivedSerial;
  doc["esp_chip_id"]      = espChipId;
  doc["mac_address"]      = macAddress;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["chip_model"]       = CHIP_MODEL;
  doc["activation_key"]   = DEVICE_ACTIVATION_KEY;

  String payload;
  serializeJson(doc, payload);

  Serial.println("[ACT] Sending to backend...");
  int httpCode = http.POST(payload);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("[ACT] SUCCESS: " + response);
    http.end();

    // Parse device token from multiple possible response formats
    StaticJsonDocument<768> resp;
    DeserializationError err = deserializeJson(resp, response);
    if (err) {
      Serial.print("[ACT] JSON parse error: ");
      Serial.println(err.c_str());
      return false;
    }

    if (resp.containsKey("device") && resp["device"].containsKey("token")) {
      outDeviceToken = String((const char*)resp["device"]["token"]);
    } else if (resp.containsKey("deviceToken")) {
      outDeviceToken = String((const char*)resp["deviceToken"]);
    } else if (resp.containsKey("token")) {
      outDeviceToken = String((const char*)resp["token"]);
    }

    Serial.println("[ACT] Device token received");
    return true;
  }

  Serial.printf("[ACT] Failed: %d\n", httpCode);
  String errorBody = http.getString();
  Serial.println("[ACT] Error: " + errorBody);
  http.end();
  return false;
}

// ============================================
// SAVE TO NVS & RESTART
// ============================================

void saveCredentialsToNVS(const String& deviceToken) {
  preferences.begin("fleet", false);
  preferences.putString("SSID", receivedSsid);
  preferences.putString("PASSWORD", receivedPassword);
  preferences.putString("SERIAL", receivedSerial);
  preferences.putString("DEVICE_TOKEN", deviceToken);
  preferences.putBool("ACTIVATED", true);
  preferences.end();

  Serial.println("[NVS] WiFi + Device Token saved");
  Serial.println("[NVS] SSID: " + receivedSsid);
  Serial.println("[NVS] Serial: " + receivedSerial);

  delay(2000);
  ESP.restart();
}

// ============================================
// PROVISIONING STATE MACHINE
// Runs in main loop — NEVER in BLE callbacks
// ============================================

void processProvisionStateMachine() {
  switch (provisionState) {

    case PROV_IDLE:
      break;

    case PROV_CREDENTIALS_RECEIVED:
      Serial.println("\n[PROV] ===== PROVISION STARTING =====");
      Serial.println("[PROV] Serial: " + receivedSerial);
      Serial.println("[PROV] SSID: " + receivedSsid);

      updateWifiStatusChar(WIFI_STAT_CONNECTING);
      updateProvisioningStatus("STOPPING_BLE");

      provisionState     = PROV_STOPPING_BLE;
      provisionStateTime = millis();
      break;

    case PROV_STOPPING_BLE:
      // ESP32-S3: soft stop — just stop advertising to reduce RF noise
      Serial.println("[PROV] Soft-stopping BLE advertising...");
      if (bleInitialized) {
        NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
        if (adv) adv->stop();
      }

      provisionState     = PROV_BLE_STOPPED;
      provisionStateTime = millis();
      break;

    case PROV_BLE_STOPPED:
      // Short delay for RF to settle
      if (millis() - provisionStateTime < 300) return;

      Serial.println("[PROV] Connecting WiFi...");
      provisionState     = PROV_CONNECTING_WIFI;
      provisionStateTime = millis();
      break;

    case PROV_CONNECTING_WIFI:
      if (connectWiFiDirect(receivedSsid, receivedPassword)) {
        Serial.println("[PROV] WiFi connected!");
        updateWifiStatusChar(WIFI_STAT_OK);
        provisionState     = PROV_WIFI_CONNECTED;
        provisionStateTime = millis();
      } else {
        Serial.println("[PROV] WiFi connection failed");
        // Inform the app which error occurred
        wl_status_t st = WiFi.status();
        if (st == WL_NO_SSID_AVAIL)       updateWifiStatusChar(WIFI_STAT_ERR_NOT_FOUND);
        else if (st == WL_CONNECT_FAILED)  updateWifiStatusChar(WIFI_STAT_ERR_AUTH);
        else                               updateWifiStatusChar(WIFI_STAT_ERR_TIMEOUT);
        provisionState = PROV_FAILED;
      }
      break;

    case PROV_WIFI_CONNECTED:
      Serial.println("[PROV] Activating device...");
      updateProvisioningStatus("ACTIVATING");
      provisionState     = PROV_ACTIVATING;
      provisionStateTime = millis();
      break;

    case PROV_ACTIVATING: {
      String deviceToken = "";
      if (activateDevice(deviceToken)) {
        Serial.println("[PROV] ✓ Activation successful!");
        updateProvisioningResult("SUCCESS");
        provisionState = PROV_SUCCESS;
        saveCredentialsToNVS(deviceToken);   // calls ESP.restart()
      } else {
        Serial.println("[PROV] ✗ Activation failed");
        updateProvisioningResult("FAILED");
        provisionState = PROV_FAILED;
      }
      break;
    }

    case PROV_SUCCESS:
      // Device should have restarted by now
      break;

    case PROV_FAILED:
      Serial.println("[PROV] Provisioning failed — restarting BLE...");

      wifiCredReceived = false;
      serialReceived   = false;
      tokenReceived    = false;
      receivedSsid     = "";
      receivedPassword = "";

      delay(1000);

      // S3: BLE stack is still alive (soft stop), just re-advertise
      if (bleInitialized) {
        NimBLEDevice::getAdvertising()->start();
        Serial.println("[BLE] Re-advertising after failure");
      } else {
        initBLE();
      }

      provisionState = PROV_IDLE;
      break;
  }
}

// ============================================
// NTP TIMESTAMP
// ============================================

String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01T00:00:00Z";
  }
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// ============================================
// MQTT
// ============================================

void connectMQTT() {
  if (!wifiConnected) return;
  if (mqtt_client.connected()) return;

  Serial.print("[MQTT] Connecting...");

  espClient.setInsecure();

  String clientId = "ESP32S3-" + espChipId;

  if (storedToken.length() == 0) {
    Serial.println(" (no device token)");
    return;
  }

  if (mqtt_client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
    Serial.println(" OK");
    mqtt_client.subscribe(mqtt_topic_command.c_str());
    Serial.println("[MQTT] Subscribed: " + mqtt_topic_command);
  } else {
    Serial.printf(" FAILED (rc=%d)\n", mqtt_client.state());
  }
}

// ============================================
// ACCELEROMETER
// ============================================

void calibrateAccelerometer() {
  Serial.println("[CAL] Calibrating...");

  float sumX = 0, sumY = 0, sumZ = 0;
  const int samples = 10;

  for (int i = 0; i < samples; i++) {
    sensors_event_t event;
    accel.getEvent(&event);
    sumX += event.acceleration.x;
    sumY += event.acceleration.y;
    sumZ += event.acceleration.z;
    delay(100);
  }

  baseX = sumX / samples;
  baseY = sumY / samples;
  baseZ = sumZ / samples;

  Serial.printf("[CAL] Base: X=%.2f Y=%.2f Z=%.2f\n", baseX, baseY, baseZ);
}

// ============================================
// HAVERSINE DISTANCE (metres)
// ============================================

double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0;
  double dLat = (lat2 - lat1) * DEG_TO_RAD;
  double dLon = (lon2 - lon1) * DEG_TO_RAD;

  double a = sin(dLat / 2) * sin(dLat / 2) +
             cos(lat1 * DEG_TO_RAD) * cos(lat2 * DEG_TO_RAD) *
             sin(dLon / 2) * sin(dLon / 2);
  double c = 2 * atan2(sqrt(a), sqrt(1 - a));

  return R * c;
}

long getPublishInterval() {
  if (eventBurstCount > 0) return INTERVAL_EVENT;
  if (currentSpeed >= HIGHWAY_SPEED) return INTERVAL_HIGHWAY;
  if (currentSpeed >= CITY_SPEED)    return INTERVAL_CITY;
  if (currentSpeed >= IDLE_SPEED)    return INTERVAL_FAST;
  return INTERVAL_IDLE;
}

// ============================================
// MAC ADDRESS (without WiFi init)
// ============================================

String getMacNoWiFi() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

// ============================================
// SETUP
// ============================================

void setup() {
  // Brownout disable — only for original ESP32, not S3
#if !defined(CONFIG_IDF_TARGET_ESP32S3)
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
#endif

  // WDT: disable watchdog so long WiFi/BLE init doesn't trigger reset.
  // NOTE: esp_task_wdt_deinit() causes boot crash on some ESP32-S3 cores.
  // disableCore0WDT() works reliably across all tested Arduino core versions.
  disableCore0WDT();

  Serial.begin(115200);
  mqtt_client.setBufferSize(512);
  delay(2000);

  Serial.println("\n\n");
  Serial.println("╔══════════════════════════════════════════╗");
  Serial.println("║  TulipFleet ESP32-S3 Tracker v" + String(FIRMWARE_VERSION) + "     ║");
  Serial.println("║  Chip: " + String(CHIP_MODEL) + "               ║");
  Serial.println("╚══════════════════════════════════════════╝");

  // Chip ID (unique per device)
  uint64_t chipid = ESP.getEfuseMac();
  espChipId = String((uint32_t)(chipid >> 32), HEX) + String((uint32_t)chipid, HEX);
  espChipId.toUpperCase();

  macAddress = getMacNoWiFi();
  deviceName = "TulipFleet-" + espChipId.substring(espChipId.length() > 8 ? espChipId.length() - 8 : 0);

  Serial.println("[SYS] ESP Chip ID : " + espChipId);
  Serial.println("[SYS] MAC Address : " + macAddress);
  Serial.println("[SYS] Device Name : " + deviceName);
  Serial.printf("[SYS] PSRAM       : %d bytes\n", ESP.getPsramSize());
  Serial.printf("[SYS] Free Heap   : %d bytes\n", ESP.getFreeHeap());

  ledsInit();

  // ── Load NVS ──
  preferences.begin("fleet", true);   // read-only
  isActivated     = preferences.getBool("ACTIVATED", false);
  activatedSerial = preferences.getString("SERIAL", "");
  storedSsid      = preferences.getString("SSID", "");
  storedPassword  = preferences.getString("PASSWORD", "");
  storedToken     = preferences.getString("DEVICE_TOKEN", "");
  preferences.end();

  Serial.println("[NVS] Activated: " + String(isActivated ? "YES" : "NO"));
  if (isActivated) Serial.println("[NVS] Serial: " + activatedSerial);

  // ── I2C + Accelerometer ──
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(400000);

  if (accel.begin()) {
    Serial.println("[ADXL] Ready");
    calibrateAccelerometer();
  } else {
    Serial.println("[ADXL] FAILED — check wiring (SDA=" + String(I2C_SDA_PIN) + " SCL=" + String(I2C_SCL_PIN) + ")");
  }

  // ── GPS ──
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] UART2 ready (RX=" + String(GPS_RX_PIN) + " TX=" + String(GPS_TX_PIN) + ")");

  // ── Decision: BLE or WiFi? ──
  if (!isActivated) {
    // ─── FIRST ACTIVATION ───
    Serial.println("\n[BOOT] First activation required");
    Serial.println("[BOOT] → Starting BLE provisioning (no timeout)...");
    initBLE();
    // No timeout for first activation — wait until user provisions
    bleBootWindowActive = false;

  } else {
    // ─── ACTIVATED DEVICE ───
    Serial.println("\n[BOOT] Device activated, connecting to WiFi...");

    if (connectWiFi()) {
      // Setup MQTT
      mqtt_client.setServer(mqtt_server, mqtt_port);

      mqtt_topic_location  = "fleet/device/" + espChipId + "/location";
      mqtt_topic_telemetry = "fleet/device/" + espChipId + "/telemetry";
      mqtt_topic_events    = "fleet/device/" + espChipId + "/events";
      mqtt_topic_heartbeat = "fleet/device/" + espChipId + "/heartbeat";
      mqtt_topic_command   = "fleet/device/" + espChipId + "/commands";

      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
      Serial.println("[NTP] Configured");

      // Open BLE boot window for re-provisioning
      Serial.println("[BOOT] Starting 90s BLE boot window for re-provision...");
      initBLE();
      bleBootWindowActive = true;
      bleBootWindowStart  = millis();
      bleReprovisionMode  = false;

    } else {
      // WiFi failed — open longer BLE window
      Serial.println("[BOOT] WiFi failed → BLE re-provision mode (120s)");
      initBLE();
      bleBootWindowActive = true;
      bleBootWindowStart  = millis();
      bleReprovisionMode  = true;
    }
  }

  Serial.println("\n[BOOT] Setup complete\n");
}

// ============================================
// LOOP
// ============================================

void loop() {
  // ── PROVISIONING STATE MACHINE (highest priority) ──
  if (provisionState != PROV_IDLE) {
    processProvisionStateMachine();
    delay(10);
    return;
  }

  // ── BLE BOOT WINDOW TIMEOUT ──
  if (bleBootWindowActive && bleInitialized) {
    unsigned long timeout = bleReprovisionMode ? BLE_REPROVISION_TIMEOUT_MS : BLE_BOOT_WINDOW_MS;

    if (millis() - bleBootWindowStart > timeout) {
      Serial.println("[BLE] Boot window expired, stopping BLE");
      stopBLE();
      bleBootWindowActive = false;

      // If WiFi wasn't connected before, try now
      if (isActivated && !wifiConnected) {
        Serial.println("[BOOT] Retrying WiFi after BLE window...");
        if (connectWiFi()) {
          mqtt_client.setServer(mqtt_server, mqtt_port);

          mqtt_topic_location  = "fleet/device/" + espChipId + "/location";
          mqtt_topic_telemetry = "fleet/device/" + espChipId + "/telemetry";
          mqtt_topic_events    = "fleet/device/" + espChipId + "/events";
          mqtt_topic_heartbeat = "fleet/device/" + espChipId + "/heartbeat";
          mqtt_topic_command   = "fleet/device/" + espChipId + "/commands";

          configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
        }
      }
    }
  }

  // ── NORMAL OPERATION (activated + WiFi connected) ──
  if (!isActivated || !wifiConnected) {
    delay(100);
    return;
  }

  // Read GPS
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isValid()) {
    currentLat   = gps.location.lat();
    currentLon   = gps.location.lng();
    currentSpeed = gps.speed.kmph();
    gpsValid     = true;
    digitalWrite(LED_GPS, HIGH);
  }

  // MQTT keep-alive
  if (!mqtt_client.connected()) {
    connectMQTT();
  }
  mqtt_client.loop();

  unsigned long now = millis();

  // ── GPS DEBUG (every 5 s) ──
  static unsigned long lastGpsDebug = 0;
  if (now - lastGpsDebug >= 5000) {
    lastGpsDebug = now;
    Serial.printf("[GPS] chars=%lu valid=%d sats=%d lat=%.6f lon=%.6f spd=%.1f\n",
      gps.charsProcessed(), gpsValid ? 1 : 0,
      gps.satellites.value(), currentLat, currentLon, currentSpeed);
  }

  // ═══════════════════════════════════════════
  // LOCATION PUBLISH  (GPS → location topic)
  // Smart: skip if vehicle hasn't moved
  // ═══════════════════════════════════════════
  long locationInterval = getPublishInterval();

  if (now - lastPublish >= (unsigned long)locationInterval) {
    lastPublish = now;

    if (mqtt_client.connected() && gpsValid) {
      double distMoved   = haversineDistance(lastLat, lastLon, currentLat, currentLon);
      bool   isStationary = (distMoved < STATIONARY_DISTANCE) && (currentSpeed < IDLE_SPEED);
      bool   heartbeatDue = (now - lastMovingPublish >= (unsigned long)STATIONARY_HEARTBEAT);

      if (isStationary && !heartbeatDue) {
        Serial.printf("[LOC] Skipped: stationary (moved %.1fm)\n", distMoved);
      } else {
        StaticJsonDocument<384> doc;
        doc["device_id"]  = espChipId;
        doc["timestamp"]  = getTimestamp();
        doc["latitude"]   = currentLat;
        doc["longitude"]  = currentLon;
        doc["speed"]      = currentSpeed;
        doc["heading"]    = gps.course.isValid() ? gps.course.deg() : 0;
        doc["altitude"]   = gps.altitude.isValid() ? gps.altitude.meters() : 0;
        doc["satellites"] = gps.satellites.value();
        doc["hdop"]       = gps.hdop.isValid() ? gps.hdop.hdop() : 0;
        doc["wifi_rssi"]  = WiFi.RSSI();
        doc["fw_version"] = FIRMWARE_VERSION;

        String json;
        serializeJson(doc, json);

        bool sent = mqtt_client.publish(mqtt_topic_location.c_str(), json.c_str());
        if (sent) {
          lastLat = currentLat;
          lastLon = currentLon;
          lastMovingPublish = now;
        }
        Serial.printf("[LOC] %s: %.6f,%.6f spd=%.1f dist=%.1fm sats=%d\n",
          sent ? "OK" : "FAIL", currentLat, currentLon, currentSpeed,
          distMoved, gps.satellites.value());
      }
    }
  }

  // ═══════════════════════════════════════════
  // TELEMETRY PUBLISH  (system health → telemetry topic)
  // Fixed 60 s interval
  // ═══════════════════════════════════════════
  if (now - lastTelemetryPublish >= 60000) {
    lastTelemetryPublish = now;

    if (mqtt_client.connected()) {
      StaticJsonDocument<384> doc;
      doc["device_id"]  = espChipId;
      doc["timestamp"]  = getTimestamp();
      doc["uptime"]     = millis() / 1000;
      doc["wifi_rssi"]  = WiFi.RSSI();
      doc["free_heap"]  = ESP.getFreeHeap();
      doc["psram_free"] = ESP.getFreePsram();
      doc["gps_valid"]  = gpsValid;
      doc["satellites"] = gps.satellites.value();
      doc["fw_version"] = FIRMWARE_VERSION;
      doc["chip_model"] = CHIP_MODEL;
      // TODO: add fuel_level and odometer when sensors connected
      // TODO: add battery_mv when ADC wired

      String json;
      serializeJson(doc, json);

      mqtt_client.publish(mqtt_topic_telemetry.c_str(), json.c_str());
      Serial.println("[TEL] Published: system telemetry");
    }
  }

  // ═══════════════════════════════════════════
  // HEARTBEAT  (60 s)
  // ═══════════════════════════════════════════
  if (now - lastHeartbeat >= 60000) {
    lastHeartbeat = now;

    if (mqtt_client.connected()) {
      StaticJsonDocument<128> doc;
      doc["device_id"]  = espChipId;
      doc["timestamp"]  = getTimestamp();
      doc["uptime"]     = millis() / 1000;

      String json;
      serializeJson(doc, json);

      mqtt_client.publish(mqtt_topic_heartbeat.c_str(), json.c_str());
    }
  }

  delay(10);
}
