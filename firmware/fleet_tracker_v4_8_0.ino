/*
 * Fleet Tracker ESP32-S3 v4.8.0
 *
 * v4.8.0 CHANGES (09 Mar 2026):
 *  - FIX: LED_GPS and LED_WIFI now turn OFF when connection is lost
 *    (previously latched HIGH forever after first connect)
 *  - FIX: BLE_BOOT_WINDOW_MS changed 300000ms → 90000ms (production value)
 *    (was left at 5min test value)
 *  - FIX: Removed unused ledBlink() function (dead code)
 *  - FIX: Header version corrected (was stuck at v4.5.0)
 *  - FIX: MTU comment encoding corrected (was mojibake)
 *
 * PIN MAP (ESP32-S3 N16R8):
 *  - GPS  : RX=GPIO16, TX=GPIO17, UART2, 9600 baud
 *  - ADXL : SDA=GPIO8, SCL=GPIO9, I2C
 *  - LED  : GPS=GPIO4, WiFi=GPIO5
 *  NOTE   : GPIO38/39 reserved for PSRAM — do NOT use for I2C
 *
 * v4.7.0 CHANGES (preserved):
 *  - Geofence MQTT support (v4.6.0): topic geofence_event, 4096 buf
 *  - Geofence config parse moved callback→loop (v4.6.1)
 *  - Full ADXL345 event system (v4.5.0): EMA filter, IMPACT/BRAKE/ACCEL/TURN
 *  - All v4.3.11 features: BLE provisioning, smart publish, NTP, heartbeat
 *
 * 09 March 2026
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
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "esp_mac.h"
#include "esp_bt.h"
#include "esp_task_wdt.h"
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include <Preferences.h>

// ============================================
// CONFIGURATION
// ============================================

const char* FIRMWARE_VERSION = "4.7.0";
const char* DEVICE_SERIAL = "TF-2026-DEMO-1";

// Backend
const char* API_ACTIVATE_URL = "https://api.tulipfleet.com/api/devices/activate";
const char* API_VERIFY_TOKEN_URL = "https://api.tulipfleet.com/api/devices/verify-token";
const char* API_VERIFY_DEVICE_TOKEN_URL = "https://api.tulipfleet.com/api/devices/verify-device-token";
const char* DEVICE_ACTIVATION_KEY = "TulipFleet2025SecureActivationKeyESP32";

// MQTT
const char* mqtt_server = "46.224.1.192";
const int mqtt_port = 8883;
const char* mqtt_username = "fleet_esp32";
const char* mqtt_password = "ESP32Fleet2026SecureKey!";

// NTP
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 3 * 3600;
const int daylightOffset_sec = 0;

// ============================================
// BLE BOOT WINDOW SETTINGS
// ============================================

#define BLE_BOOT_WINDOW_MS    90000   // 90 seconds (production)
#define BLE_REPROVISION_TIMEOUT_MS 120000

bool bleBootWindowActive = false;
unsigned long bleBootWindowStart = 0;
bool bleReprovisionMode = false;

// ============================================
// BLE SETTINGS
// ============================================

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_SERIAL_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_STATUS_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define CHAR_RESULT_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26aa"
#define CHAR_WIFI_CRED_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ab"
#define CHAR_WIFI_STAT_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ac"
#define CHAR_WIFI_SCAN_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ad"
#define CHAR_AUTH_TOKEN_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ae"

// WiFi Status
const char* WIFI_STAT_IDLE        = "IDLE";
const char* WIFI_STAT_CONNECTING  = "CONNECTING";
const char* WIFI_STAT_OK          = "OK";
const char* WIFI_STAT_ERR_AUTH    = "ERR_AUTH";
const char* WIFI_STAT_ERR_TIMEOUT = "ERR_TIMEOUT";
const char* WIFI_STAT_ERR_NOT_FOUND = "ERR_NOT_FOUND";
const char* WIFI_STAT_ERR_UNKNOWN = "ERR_UNKNOWN";
const char* WIFI_STAT_ERR_TOKEN   = "ERR_TOKEN";

// ============================================
// GLOBALS+WIFI SCAN TASK VARIABLES
// ============================================

volatile bool wifiScanComplete = false;
volatile bool wifiScanSuccess = false;
volatile bool ssidFoundInScan = false;
TaskHandle_t wifiScanTaskHandle = NULL;

Preferences preferences;
WiFiClientSecure espClient;
PubSubClient mqtt_client(espClient);
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// Device Info
String espChipId = "";
String macAddress = "";
String deviceName = "";

// State
bool isActivated = false;
String activatedSerial = "";
String storedSsid = "";
String storedPassword = "";
String storedToken = "";

bool wifiConnected = false;
bool bleInitialized = false;
bool bleConnected = false;



// ============================================
// NEW: WiFi provisioning state machine
// ============================================

enum ProvisionState {
  PROV_IDLE,
  PROV_CREDENTIALS_RECEIVED,  // Credentials received, ready to process
  PROV_STOPPING_BLE,          // BLE stopping in progress
  PROV_BLE_STOPPED,           // BLE stopped, ready for WiFi
  PROV_CONNECTING_WIFI,       // WiFi connecting
  PROV_WIFI_CONNECTED,        // WiFi connected, verify token
  PROV_ACTIVATING,            // Activating with backend
  PROV_SUCCESS,               // All done
  PROV_FAILED                 // Failed
};

ProvisionState provisionState = PROV_IDLE;
unsigned long provisionStateTime = 0;

// Received via BLE
String receivedSerial = "";
String receivedSsid = "";
String receivedPassword = "";
String receivedToken = "";
bool serialReceived = false;
bool wifiCredReceived = false;
bool tokenReceived = false;

// BLE Characteristics
NimBLEServer* pServer = nullptr;
NimBLECharacteristic* pSerialChar = nullptr;
NimBLECharacteristic* pStatusChar = nullptr;
NimBLECharacteristic* pResultChar = nullptr;
NimBLECharacteristic* pWifiCredChar = nullptr;
NimBLECharacteristic* pWifiStatusChar = nullptr;
NimBLECharacteristic* pWifiScanChar = nullptr;
NimBLECharacteristic* pAuthTokenChar = nullptr;

// MQTT Topics
String mqtt_topic_location = "";
String mqtt_topic_telemetry = "";
String mqtt_topic_events = "";
String mqtt_topic_alert = "";    // RESTORED from v4.3.3
String mqtt_topic_heartbeat = "";
String mqtt_topic_command = "";

// Geofence topics (v4.6.0)
String mqtt_topic_gf_config = "";   // subscribe — backend pushes zone config (RETAINED)
String mqtt_topic_gf_event  = "";   // publish  — edge transition events

// GPS & Motion
double currentLat = 0, currentLon = 0;
double lastLat = 0, lastLon = 0;
float currentSpeed = 0;
bool gpsValid = false;

// ADXL345 State (RESTORED from v4.3.3)
bool adxlReady = false;          // true if ADXL345 initialized OK
bool calibrated = false;         // true after calibration
float smoothAx = 0, smoothAy = 0, smoothAz = 9.81;
float baselineAx = 0, baselineAy = 0, baselineAz = 9.81;
unsigned long lastAlertTime = 0;
unsigned long totalAlerts = 0;

// Timing
unsigned long lastPublish = 0;
unsigned long lastTelemetryPublish = 0;
unsigned long lastGpsRead = 0;
unsigned long lastHeartbeat = 0;
int eventBurstCount = 0;

// Intervals (ms)
const long INTERVAL_IDLE = 30000;
const long INTERVAL_FAST = 15000;
const long INTERVAL_CITY = 10000;
const long INTERVAL_HIGHWAY = 5000;
const long INTERVAL_EVENT = 3000;

// Stationary detection - don't send if vehicle hasn't moved
const float STATIONARY_DISTANCE = 10.0;    // meters - minimum movement to trigger publish
const long STATIONARY_HEARTBEAT = 300000;   // 5 min - send at least one location every 5 min even if stationary
unsigned long lastMovingPublish = 0;        // last time we published due to actual movement

// Speed thresholds
const float IDLE_SPEED = 5.0;
const float CITY_SPEED = 50.0;
const float HIGHWAY_SPEED = 90.0;

// (Thresholds defined above as #define)

// DEG_TO_RAD is already defined in Arduino.h

// LED Pins
#define LED_GPS 4
#define LED_WIFI 5

// I2C Pins (ESP32-S3 N16R8 — GPIO38/39 PSRAM conflict!)
#define I2C_SDA 8
#define I2C_SCL 9

// ADXL345 Thresholds (G-force)
#define THRESHOLD_BRAKE   0.40
#define THRESHOLD_ACCEL   0.30
#define THRESHOLD_TURN    0.35
#define THRESHOLD_IMPACT  2.00

// Alert timing
#define ALERT_COOLDOWN    5000   // ms between alerts (prevent spam)

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

// ADXL345 functions (RESTORED from v4.3.3)
void calibrateAccel();
void readAndSmoothAccel();
void checkForEvents();
void sendAlert(String type, String message, float value, String severity);

// ============================================
// LED FUNCTIONS
// ============================================

void ledsInit() {
  pinMode(LED_GPS, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  digitalWrite(LED_GPS, LOW);
  digitalWrite(LED_WIFI, LOW);
}

void ledSet(int pin, bool on) {
  digitalWrite(pin, on ? HIGH : LOW);
}

// ============================================
// UTILITY - JSON PARSE
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
  
  ssid = String((const char*)doc["ssid"]);
  password = String((const char*)doc["password"]);
  
  return ssid.length() > 0;
}

bool isTokenFormatValid(const String& token) {
  if (token.length() < 20) return false;
  int dotCount = 0;
  for (int i = 0; i < token.length(); i++) {
    if (token.charAt(i) == '.') dotCount++;
  }
  return dotCount == 2;
}

// ============================================
// BLE CALLBACKS
// ============================================

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer) {
    bleConnected = true;
    Serial.println("[BLE] Client connected");
  }
  
  void onDisconnect(NimBLEServer* pServer) {
    bleConnected = false;
    Serial.println("[BLE] Client disconnected");
    
    // Only re-advertise if not in provisioning process
    if (!isActivated && provisionState == PROV_IDLE) {
      delay(500);
      pServer->startAdvertising();
      Serial.println("[BLE] Re-advertising...");
    }
  }
};

class SerialCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      receivedSerial = String(value.c_str());
      serialReceived = true;
      Serial.println("[BLE] Serial received: " + receivedSerial);
    }
  }
};

class TokenCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) {
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

// ============================================
// CRITICAL FIX: WiFi credentials callback
// Only stores credentials, does NOT attempt WiFi connection
// ============================================

class WifiCredCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      String json = String(value.c_str());
      Serial.println("[BLE] WiFi credentials received: " + json);
      
      if (parseWifiCredentials(json, receivedSsid, receivedPassword)) {
        wifiCredReceived = true;
        Serial.println("[BLE] SSID: " + receivedSsid);
        
        // CRITICAL: Don't connect WiFi here!
        // Just set state to trigger processing in main loop
        if (provisionState == PROV_IDLE) {
          provisionState = PROV_CREDENTIALS_RECEIVED;
          provisionStateTime = millis();
          Serial.println("[PROV] Credentials stored, will process in main loop");
        }
      } else {
        Serial.println("[BLE] JSON parse failed");
      }
    }
  }
};

// ============================================
// WiFi SCAN CALLBACKS
// ============================================

class WifiScanCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    Serial.println("[BLE] WiFi scan command received");
    performWiFiScan();
  }
  
  void onRead(NimBLECharacteristic* pCharacteristic) {
    Serial.println("[BLE] WiFi scan read requested");
    performWiFiScan();
  }
};

// ============================================
// BLE - WiFi SCAN (max 5 networks for MTU)
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
    net["ssid"] = WiFi.SSID(i);
    net["rssi"] = WiFi.RSSI(i);
    net["channel"] = WiFi.channel(i);
    net["encryption"] = WiFi.encryptionType(i);
  }

  String json;
  serializeJson(doc, json);

  Serial.println("[SCAN] JSON: " + json);
  Serial.printf("[SCAN] JSON length: %d bytes\n", json.length());

  // Debug: check subscription before notify
  Serial.printf("[SCAN] Characteristic value length before setValue: %d\n", pWifiScanChar->getValue().length());

  pWifiScanChar->setValue((uint8_t*)json.c_str(), json.length());
  Serial.printf("[SCAN] Characteristic value length after setValue: %d\n", pWifiScanChar->getValue().length());

  delay(150);

  pWifiScanChar->notify();

  WiFi.scanDelete();

  Serial.printf("[SCAN] Sent %d networks via BLE\n", maxNetworks);
}

// ============================================
// BLE - UPDATE STATUS
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
// BLE - INIT
// ============================================

void initBLE() {
  if (bleInitialized) {
    Serial.println("[BLE] Already initialized");
    return;
  }

  Serial.println("[BLE] Starting...");
  Serial.printf("[MEM] free=%u min=%u\n", ESP.getFreeHeap(), ESP.getMinFreeHeap());

  // Classic BT belleÄŸini serbest bÄ±rak
  esp_bt_controller_mem_release(ESP_BT_MODE_CLASSIC_BT);
  delay(50);

  NimBLEDevice::init(deviceName.c_str());
  delay(100);

  NimBLEDevice::setPower(ESP_PWR_LVL_P9);
  NimBLEDevice::setMTU(185);  // low MTU for stability
  
  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());
  
  NimBLEService* pService = pServer->createService(SERVICE_UUID);
  
  pSerialChar = pService->createCharacteristic(
    CHAR_SERIAL_UUID,
    NIMBLE_PROPERTY::WRITE
  );
  pSerialChar->setCallbacks(new SerialCallbacks());
  
  pStatusChar = pService->createCharacteristic(
    CHAR_STATUS_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  
  pResultChar = pService->createCharacteristic(
    CHAR_RESULT_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  
  pWifiCredChar = pService->createCharacteristic(
    CHAR_WIFI_CRED_UUID,
    NIMBLE_PROPERTY::WRITE
  );
  pWifiCredChar->setCallbacks(new WifiCredCallbacks());
  
  pWifiStatusChar = pService->createCharacteristic(
    CHAR_WIFI_STAT_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  
  pWifiScanChar = pService->createCharacteristic(
    CHAR_WIFI_SCAN_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR | NIMBLE_PROPERTY::NOTIFY
  );
  pWifiScanChar->setCallbacks(new WifiScanCallbacks());
  
  pAuthTokenChar = pService->createCharacteristic(
    CHAR_AUTH_TOKEN_UUID,
    NIMBLE_PROPERTY::WRITE
  );
  pAuthTokenChar->setCallbacks(new TokenCallbacks());
  
  pService->start();
  
  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
  
  bleInitialized = true;
  updateProvisioningStatus("WAITING");
  updateWifiStatusChar(WIFI_STAT_IDLE);
  
  Serial.println("[BLE] Active - Device: " + deviceName);
}

// ============================================
// CRITICAL FIX: Proper BLE shutdown sequence
// ============================================

void stopBLE() {
  if (!bleInitialized) {
    Serial.println("[BLE] Not initialized, skip stop");
    return;
  }
  
  Serial.println("[BLE] Stopping (proper sequence)...");
  
  // Step 1: Stop advertising
  if (pServer) {
    Serial.println("[BLE] Step 1: Stop advertising");
    pServer->stopAdvertising();
    delay(100);
  }
  
  // Step 2: Disconnect any connected clients
  if (bleConnected && pServer) {
    Serial.println("[BLE] Step 2: Disconnect clients");
    // Get connected clients and disconnect
    std::vector<uint16_t> connIds = pServer->getPeerDevices();
    for (auto id : connIds) {
      pServer->disconnect(id);
    }
    delay(200);
  }
  
  // Step 3: Wait for stack to settle
  Serial.println("[BLE] Step 3: Wait for stack to settle...");
  delay(500);
  
  // Step 4: Deinitialize NimBLE
  Serial.println("[BLE] Step 4: Deinit NimBLE...");
  NimBLEDevice::deinit(true);
  
  // Step 5: Wait for full cleanup
  Serial.println("[BLE] Step 5: Wait for cleanup...");
  delay(1000);
  
  // Clear state
  bleInitialized = false;
  bleConnected = false;
  pServer = nullptr;
  pSerialChar = nullptr;
  pStatusChar = nullptr;
  pResultChar = nullptr;
  pWifiCredChar = nullptr;
  pWifiStatusChar = nullptr;
  pWifiScanChar = nullptr;
  pAuthTokenChar = nullptr;
  
  Serial.println("[BLE] Stopped successfully");
}

// ============================================
// WiFi - CONNECT (called only after BLE stopped)
// ============================================

bool connectWiFiDirect(const String& ssid, const String& password) {
  Serial.println("[WiFi] Connecting to: " + ssid);
  delay(100);  // â† EKLE - WiFi init iÃ§in

  WiFi.mode(WIFI_STA);
  delay(100);  // â† EKLE - WiFi init iÃ§in
  delay(100);  // â† EKLE - WiFi init iÃ§in
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
    ledSet(LED_WIFI, true);
    Serial.println("[WiFi] CONNECTED!");
    Serial.println("[WiFi] IP: " + WiFi.localIP().toString());
    Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());
    return true;
  }
  
  wifiConnected = false;
  ledSet(LED_WIFI, false);
  
  wl_status_t status = WiFi.status();
  if (status == WL_NO_SSID_AVAIL) {
    Serial.println("[WiFi] SSID not found");
  } else if (status == WL_CONNECT_FAILED) {
    Serial.println("[WiFi] Wrong password");
  } else {
    Serial.println("[WiFi] Timeout");
  }
  
  return false;
}

  // ============================================
  // WIFI SCAN TASK (runs on separate stack)
  // ============================================
void wifiScanTaskFunc(void* param) {
  Serial.println("[WiFi] Scan task started...");
  
  WiFi.mode(WIFI_STA);
  
  // Async scan baÅŸlat (blocking deÄŸil!)
  WiFi.scanNetworks(true);  // true = async
  
  // Scan tamamlanana kadar bekle, watchdog'u besle
  while (WiFi.scanComplete() == WIFI_SCAN_RUNNING) {
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
  
  int n = WiFi.scanComplete();
  
  if (n < 0) {
    Serial.println("[WiFi] Scan failed");
    wifiScanComplete = true;
    wifiScanSuccess = false;
    vTaskDelete(NULL);
    return;
  }
  
  ssidFoundInScan = false;
  
  for (int i = 0; i < n; i++) {
    String ssid = WiFi.SSID(i);
    int rssi = WiFi.RSSI(i);
    Serial.printf("  [%d] %s (%d dBm)\n", i, ssid.c_str(), rssi);
    
    if (ssid == storedSsid) {
      ssidFoundInScan = true;
      Serial.println("[WiFi] Known network found: " + ssid);
    }
  }
  
  WiFi.scanDelete();
  
  wifiScanComplete = true;
  wifiScanSuccess = ssidFoundInScan;
  
  Serial.println("[WiFi] Scan task complete, deleting...");
  vTaskDelete(NULL);
}

// ============================================
// SMART WiFi CONNECT (for activated devices)
// ============================================  
bool smartWiFiConnect() {
  if (storedSsid.length() == 0) {
    Serial.println("[WiFi] Stored SSID empty");
    return false;
  }
  
  // Scan yapmadan direkt baÄŸlan - kayÄ±tlÄ± SSID zaten var
  // BaÄŸlanamazsa BLE re-provision baÅŸlayacak
  Serial.println("[WiFi] Connecting to: " + storedSsid);
  return connectWiFiDirect(storedSsid, storedPassword);
}
bool connectWiFi() {
  return smartWiFiConnect();
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
  doc["serial"] = serial;
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
// ACTIVATION
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
  
  // Token check removed for now - can be re-enabled later
  // if (receivedToken.length() == 0) {
  //   Serial.println("[ACT] No token");
  //   return false;
  // }
  
  Serial.println("[ACT] Starting activation...");
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  
  http.begin(client, API_ACTIVATE_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Add token if available
  if (receivedToken.length() > 0) {
    http.addHeader("Authorization", "Bearer " + receivedToken);
  }
  
  StaticJsonDocument<512> doc;
  doc["serial"] = receivedSerial;
  doc["esp_chip_id"] = espChipId;
  doc["mac_address"] = macAddress;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["activation_key"] = DEVICE_ACTIVATION_KEY;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("[ACT] Sending to backend...");
  int httpCode = http.POST(payload);
  
  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("[ACT] SUCCESS: " + response);
    http.end();

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
// SAVE TO NVS
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
// CRITICAL: Provision State Machine
// Runs in main loop, NOT in BLE callbacks
// ============================================

void processProvisionStateMachine() {
  switch (provisionState) {
    case PROV_IDLE:
      // Nothing to do
      break;
      
    case PROV_CREDENTIALS_RECEIVED:
      Serial.println("\n[PROV] ===== PROVISION STARTING =====");
      Serial.println("[PROV] Serial: " + receivedSerial);
      Serial.println("[PROV] SSID: " + receivedSsid);
      
      // Notify app that we're processing
      updateWifiStatusChar(WIFI_STAT_CONNECTING);
      updateProvisioningStatus("STOPPING_BLE");
      
      // Move to next state
      provisionState = PROV_STOPPING_BLE;
      provisionStateTime = millis();
      break;
      
    case PROV_STOPPING_BLE:
      Serial.println("[PROV] Stopping BLE before WiFi...");
      
      // CRITICAL: Stop BLE properly before WiFi
      stopBLE();
      
      // Move to next state
      provisionState = PROV_BLE_STOPPED;
      provisionStateTime = millis();
      break;
      
    case PROV_BLE_STOPPED:
      // Extra delay to ensure BLE is fully stopped
      if (millis() - provisionStateTime < 500) {
        return;  // Wait
      }
      
      Serial.println("[PROV] BLE stopped, connecting WiFi...");
      provisionState = PROV_CONNECTING_WIFI;
      provisionStateTime = millis();
      break;
      
    case PROV_CONNECTING_WIFI:
      if (connectWiFiDirect(receivedSsid, receivedPassword)) {
        Serial.println("[PROV] WiFi connected!");
        provisionState = PROV_WIFI_CONNECTED;
        provisionStateTime = millis();
      } else {
        Serial.println("[PROV] WiFi connection failed");
        provisionState = PROV_FAILED;
      }
      break;
      
    case PROV_WIFI_CONNECTED:
      Serial.println("[PROV] Activating device...");
      provisionState = PROV_ACTIVATING;
      provisionStateTime = millis();
      break;
      
    case PROV_ACTIVATING:
      {
        String deviceToken = "";
        if (activateDevice(deviceToken)) {
          Serial.println("[PROV] Activation successful!");
          provisionState = PROV_SUCCESS;
          
          // Save and restart
          saveCredentialsToNVS(deviceToken);
        } else {
          Serial.println("[PROV] Activation failed");
          provisionState = PROV_FAILED;
        }
      }
      break;
      
    case PROV_SUCCESS:
      // Should have restarted by now
      break;
      
    case PROV_FAILED:
      Serial.println("[PROV] Provisioning failed, restarting BLE...");
      
      // Reset state
      wifiCredReceived = false;
      serialReceived = false;
      tokenReceived = false;
      receivedSsid = "";
      receivedPassword = "";
      
      // Restart BLE
      delay(1000);
      initBLE();
      
      provisionState = PROV_IDLE;
      break;
  }
}

// ============================================
// NTP
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
// MQTT CALLBACK — incoming messages
// ============================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  Serial.printf("[MQTT] Received [%s] len=%d\n", topic, length);

  // Zone config push from backend — buffer only, parse in loop (Fix 7)
  if (topicStr == mqtt_topic_gf_config) {
    if (length == 0 || length >= GF_CONFIG_BUF_SIZE) {
      Serial.printf("[GF] Config size %d rejected (max %d)\n",
                    length, GF_CONFIG_BUF_SIZE - 1);
      return;
    }
    memcpy(gfPendingConfig, payload, length);
    gfPendingConfig[length] = '\0';
    gfPendingConfigLen      = (uint16_t)length;
    gfPendingConfigReady    = true;
    Serial.printf("[GF] Config queued (%d bytes), will parse in loop\n", length);
    return;
  }

  // Command channel (existing)
  if (topicStr == mqtt_topic_command) {
    String msg;
    msg.reserve(length);
    for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
    Serial.println("[CMD] " + msg);
    // TODO: OTA trigger, etc.
    return;
  }
}

// ============================================
// MQTT
// ============================================

void connectMQTT() {
  if (!wifiConnected) return;
  if (mqtt_client.connected()) return;
  
  Serial.print("[MQTT] Connecting...");
  
  espClient.setInsecure();
  
  String clientId = "ESP32-" + espChipId;
  
  if (storedToken.length() == 0) {
    Serial.println(" (no device token)");
    return;
  }

  if (mqtt_client.connect(clientId.c_str(), "fleet_esp32", "ESP32Fleet2026SecureKey!")) {
    Serial.println(" OK");
    
    mqtt_client.setCallback(mqttCallback);

    mqtt_client.subscribe(mqtt_topic_command.c_str());
    Serial.println("[MQTT] Subscribed: " + mqtt_topic_command);

    // Subscribe to zone config (RETAINED — broker delivers last config immediately)
    if (mqtt_topic_gf_config.length() > 0) {
      mqtt_client.subscribe(mqtt_topic_gf_config.c_str());
      Serial.println("[MQTT] Subscribed: " + mqtt_topic_gf_config);
    }
  } else {
    Serial.printf(" FAILED (rc=%d)\n", mqtt_client.state());
  }
}

// ============================================
// ACCELEROMETER - RESTORED FROM v4.3.3
// ============================================

void readAndSmoothAccel() {
  if (!adxlReady) return;
  sensors_event_t event;
  accel.getEvent(&event);
  float alpha = 0.3;
  smoothAx = alpha * event.acceleration.x + (1 - alpha) * smoothAx;
  smoothAy = alpha * event.acceleration.y + (1 - alpha) * smoothAy;
  smoothAz = alpha * event.acceleration.z + (1 - alpha) * smoothAz;
}

void calibrateAccel() {
  Serial.println("[CAL] Calibrating (50 samples)...");
  float sumX = 0, sumY = 0, sumZ = 0;
  for (int i = 0; i < 50; i++) {
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
  Serial.printf("[CAL] Done (base: %.2f, %.2f, %.2f)\n", baselineAx, baselineAy, baselineAz);
}

// ============================================
// EVENT DETECTION - RESTORED FROM v4.3.3
// ============================================

void checkForEvents() {
  if (!adxlReady || !calibrated) return;
  if (millis() - lastAlertTime < ALERT_COOLDOWN) return;
  
  float netAxG = (smoothAx - baselineAx) / 9.81;
  float netAyG = (smoothAy - baselineAy) / 9.81;
  float impactG = sqrt(netAxG * netAxG + netAyG * netAyG);
  
  // Debug every 2 seconds
  static unsigned long lastDebug = 0;
  if (millis() - lastDebug > 2000) {
    Serial.printf("[ADXL] Ax=%.2fG Ay=%.2fG impact=%.2fG spd=%.1f\n",
                  netAxG, netAyG, impactG, currentSpeed);
    lastDebug = millis();
  }
  
  // IMPACT — highest priority (check even when stationary)
  if (impactG > THRESHOLD_IMPACT) {
    sendAlert("IMPACT", "Carpma tespit edildi!", impactG, "critical");
    return;
  }
  
  // Skip driving events if vehicle is stationary
  if (currentSpeed < 2.5) return;
  
  // HARD BRAKE
  if (netAxG < -THRESHOLD_BRAKE) {
    sendAlert("HARD_BRAKE", "Ani fren!", abs(netAxG), "high");
    return;
  }
  
  // HARD ACCELERATION
  if (netAxG > THRESHOLD_ACCEL) {
    sendAlert("HARD_ACCEL", "Sert hizlanma!", netAxG, "medium");
    return;
  }
  
  // HARD TURN
  if (abs(netAyG) > THRESHOLD_TURN) {
    sendAlert("HARD_TURN", "Sert viraj!", abs(netAyG), "medium");
    return;
  }
}

// ============================================
// SEND ALERT - RESTORED FROM v4.3.3
// ============================================

void sendAlert(String type, String message, float value, String severity) {
  if (mqtt_topic_alert.length() == 0) return;
  if (!mqtt_client.connected()) return;
  
  lastAlertTime = millis();
  eventBurstCount = 3;  // Speed up location publish after events
  totalAlerts++;
  
  StaticJsonDocument<512> doc;
  doc["device_id"] = espChipId;
  doc["device_code"] = activatedSerial;
  doc["timestamp"] = getTimestamp();
  doc["type"] = type;
  doc["severity"] = severity;
  doc["title"] = type;              // Backend alerts.title (NOT NULL)
  doc["description"] = message;
  doc["value"] = value;
  
  // metadata JSONB for DB
  JsonObject meta = doc.createNestedObject("metadata");
  meta["g_force"] = value;
  meta["threshold"] = (type == "HARD_BRAKE") ? THRESHOLD_BRAKE :
                      (type == "HARD_ACCEL") ? THRESHOLD_ACCEL :
                      (type == "HARD_TURN")  ? THRESHOLD_TURN  :
                      THRESHOLD_IMPACT;
  
  if (gpsValid) {
    doc["latitude"] = currentLat;
    doc["longitude"] = currentLon;
    doc["speed"] = currentSpeed;
    doc["heading"] = gps.course.isValid() ? gps.course.deg() : 0;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  bool sent = mqtt_client.publish(mqtt_topic_alert.c_str(), payload.c_str());
  Serial.printf("[ALERT] %s %s: %.2fG (spd=%.1f) %s\n", 
    type.c_str(), severity.c_str(), value, currentSpeed, sent ? "OK" : "FAILED");
}

// ============================================
// GEOFENCE — GLOBALS (v4.6.0)
// ============================================

#define GF_MAX_ZONES         50
#define GF_HYSTERESIS_SPEED  2.0f   // km/h — below this, suppress exit (GPS drift)
#define GF_ENTRY_SHRINK_M    10.0   // entry threshold = radius - 10m (tighter)
#define GF_EXIT_EXPAND_M     15.0   // exit threshold  = radius + 15m (looser)
// Two-threshold hysteresis prevents entry/exit spam at zone boundary

struct GeoZone {
  char   id[37];          // UUID string (full, for event payload)
  char   zone_key[65];    // stable key from backend (VARCHAR 64, NVS key base)
  char   name[48];        // display name
  bool   is_circle;       // true=circle, false=polygon(skip v1)
  double center_lat;
  double center_lon;
  double radius_m;
  bool   alert_entry;
  bool   alert_exit;
  bool   active;
};

// Pending config (v4.6.1) — callback stores raw JSON, loop parses it
#define GF_CONFIG_BUF_SIZE 4096
char     gfPendingConfig[GF_CONFIG_BUF_SIZE];
bool     gfPendingConfigReady = false;
uint16_t gfPendingConfigLen   = 0;
GeoZone  gfZones[GF_MAX_ZONES];
uint8_t  gfZoneCount = 0;
uint16_t gfConfigVersion = 0;

// Per-zone inside state (index matches gfZones[])
// NVS keys: "k_<zone_key>" — zone_key bazlı, index değişiminden bağımsız
bool     gfInsideState[GF_MAX_ZONES];
uint32_t gfLastTransitionMs[GF_MAX_ZONES];  // millis() at last transition
char     gfLastTransitionType[GF_MAX_ZONES]; // 'E'=entry 'X'=exit '\0'=none
#define  GF_DEDUP_MS  30000   // suppress same event within 30s

// ============================================
// GEOFENCE — LOAD CONFIG FROM JSON
// ============================================

void loadZonesFromConfig(const String& json) {
  // ── Payload size guard ──────────────────────────────────────────
  if (json.length() == 0) {
    Serial.println("[GF] Config empty, skip");
    return;
  }
  if ((uint16_t)json.length() >= GF_CONFIG_BUF_SIZE) {
    Serial.printf("[GF] Config too large (%d >= %d), keeping old config\n",
                  json.length(), GF_CONFIG_BUF_SIZE);
    return;
  }

  // ── Parse ────────────────────────────────────────────────────────
  StaticJsonDocument<4096> doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    Serial.print("[GF] Config parse error: ");
    Serial.println(err.c_str());
    Serial.println("[GF] Keeping old config");
    return;
  }

  // Contract v1: "config_version" (primary), fallback "version" (legacy)
  uint16_t newVersion = doc["config_version"] | (doc["version"] | 0);
  if (newVersion == gfConfigVersion && gfZoneCount > 0) {
    Serial.printf("[GF] Config v%d already loaded, skip\n", newVersion);
    return;
  }
  // generated_at: log only
  const char* genAt = doc["generated_at"] | "?";
  Serial.printf("[GF] Config v%d generated_at=%s\n", newVersion, genAt);

  JsonArray zones = doc["zones"].as<JsonArray>();
  if (zones.isNull()) {
    Serial.println("[GF] No zones array in config");
    return;
  }

  // ── Purge old zone NVS states ────────────────────────────────────
  // Remove all gf state keys before applying new config
  // Key format: "k_{zone_key[:15]}" — NVS key max 15 chars
  preferences.begin("fleet_gf", false);
  for (uint8_t i = 0; i < gfZoneCount; i++) {
    char old_key[17];
    snprintf(old_key, sizeof(old_key), "k_%.15s", gfZones[i].zone_key);
    preferences.remove(old_key);
  }

  // ── Reset runtime state ───────────────────────────────────────────
  uint8_t  newCount = 0;
  GeoZone  newZones[GF_MAX_ZONES];
  bool     newInside[GF_MAX_ZONES];
  uint32_t newLastTs[GF_MAX_ZONES];
  char     newLastType[GF_MAX_ZONES];
  uint8_t  skippedPolygon = 0;

  memset(newLastTs,   0, sizeof(newLastTs));
  memset(newLastType, 0, sizeof(newLastType));

  for (JsonObject z : zones) {
    if (newCount >= GF_MAX_ZONES) {
      Serial.printf("[GF] Max zones (%d) reached, rest skipped\n", GF_MAX_ZONES);
      break;
    }

    // ── Polygon: skip safely ─────────────────────────────────────
    const char* type = z["type"] | "circle";
    if (strcmp(type, "circle") != 0) {
      skippedPolygon++;
      Serial.printf("[GF] Zone '%s' is %s — skip (v1)\n",
                    (const char*)(z["id"] | "?"), type);
      continue;
    }

    if (!(bool)(z["active"] | true)) continue;

    GeoZone& gz = newZones[newCount];

    strlcpy(gz.id,       z["id"]       | "",  sizeof(gz.id));
    strlcpy(gz.zone_key, z["zone_key"] | "",  sizeof(gz.zone_key));
    strlcpy(gz.name,     z["name"]     | "",  sizeof(gz.name));
    gz.is_circle   = true;
    gz.center_lat  = z["lat"]    | 0.0;
    gz.center_lon  = z["lng"]    | 0.0;
    gz.radius_m    = z["radius"] | 200.0;
    // Contract v1: alert_on_entry/alert_on_exit (primary), fallback: alert_entry/alert_exit
    gz.alert_entry = z["alert_on_entry"] | (z["alert_entry"] | true);
    gz.alert_exit  = z["alert_on_exit"]  | (z["alert_exit"]  | true);
    gz.active      = true;

    // zone_key must be non-empty; fallback: use first 8 chars of UUID
    if (gz.zone_key[0] == '\0' && gz.id[0] != '\0') {
      strlcpy(gz.zone_key, gz.id, sizeof(gz.zone_key));
    }
    // NVS key max=15 chars — take first 15 of zone_key
    // NVS key: "k_{zone_key[:15]}" — same format as purge and persist
    char nvs_key[17];
    snprintf(nvs_key, sizeof(nvs_key), "k_%.15s", gz.zone_key);
    newInside[newCount] = preferences.getBool(nvs_key, false);

    Serial.printf("[GF] Zone[%d] '%s' key='%s' r=%.0fm inside=%d\n",
                  newCount, gz.name, gz.zone_key, gz.radius_m, newInside[newCount]);
    newCount++;
  }

  // ── Atomic swap ──────────────────────────────────────────────────
  memcpy(gfZones,          newZones,    sizeof(GeoZone) * newCount);
  memcpy(gfInsideState,    newInside,   sizeof(bool)    * newCount);
  memcpy(gfLastTransitionMs,   newLastTs,   sizeof(uint32_t) * newCount);
  memcpy(gfLastTransitionType, newLastType, sizeof(char)     * newCount);
  gfZoneCount     = newCount;
  gfConfigVersion = newVersion;

  preferences.end();
  Serial.printf("[GF] Loaded %d zones (v%d, skipped %d polygon)\n",
                gfZoneCount, gfConfigVersion, skippedPolygon);
}

// ============================================
// GEOFENCE — PUBLISH TRANSITION EVENT
// ============================================

void publishGeofenceEvent(const GeoZone& zone, const char* event_type) {
  if (!mqtt_client.connected()) return;
  if (mqtt_topic_gf_event.length() == 0) return;

  // Contract v1 — event payload schema
  // event_type değeri: "geofence_entry" veya "geofence_exit"
  char fullEventType[32];
  snprintf(fullEventType, sizeof(fullEventType), "geofence_%s", event_type);  // entry→geofence_entry

  StaticJsonDocument<512> doc;
  doc["event_type"]     = fullEventType;        // "geofence_entry" | "geofence_exit"
  doc["zone_key"]       = zone.zone_key;        // stable key (primary ID for backend)
  doc["zone_id"]        = zone.id;              // UUID (fallback/cross-check)
  doc["zone_name"]      = zone.name;            // display (debug)
  doc["config_version"] = gfConfigVersion;      // dedup + version check
  doc["chip_id"]        = espChipId.c_str();    // device identity
  doc["vehicle_serial"] = receivedSerial.c_str(); // vehicle identity
  doc["lat"]            = (double)currentLat;
  doc["lng"]            = (double)currentLon;
  doc["speed"]          = (float)currentSpeed;
  doc["timestamp"]      = getTimestamp();       // ISO8601 UTC
  doc["fw_version"]     = FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);

  bool sent = mqtt_client.publish(mqtt_topic_gf_event.c_str(), payload.c_str());
  Serial.printf("[GF] Event %s zone='%s' key='%s' v%d %s\n",
                fullEventType, zone.name, zone.zone_key,
                gfConfigVersion, sent ? "OK" : "FAILED");
}

// ============================================
// GEOFENCE — CHECK ALL ZONES (called each loop)
// ============================================

void checkGeofences() {
  if (gfZoneCount == 0) return;
  if (!gpsValid) return;

  // ── GPS quality filter (Fix 10) ──────────────────────────────────
  // Skip if HDOP is poor (>3.0 = low accuracy), or fix is stale (>10s)
  if (gps.hdop.isValid() && gps.hdop.hdop() > 3.0) return;
  if (!gps.location.isUpdated()) return;  // no new fix this cycle

  preferences.begin("fleet_gf", false);

  for (uint8_t i = 0; i < gfZoneCount; i++) {
    GeoZone& z = gfZones[i];

    double dist = haversineDistance(currentLat, currentLon,
                                    z.center_lat, z.center_lon);
    bool wasInside = gfInsideState[i];

    // ── Two-threshold hysteresis (Fix 3) ─────────────────────────
    // Entry: must be inside tighter boundary (radius - GF_ENTRY_SHRINK_M)
    // Exit:  must be outside looser boundary (radius + GF_EXIT_EXPAND_M)
    // When inside: only exit when dist > radius + expand
    // When outside: only enter when dist < radius - shrink
    bool nowInside;
    if (wasInside) {
      nowInside = (dist <= (z.radius_m + GF_EXIT_EXPAND_M));
    } else {
      nowInside = (dist < (z.radius_m - GF_ENTRY_SHRINK_M));
    }

    if (nowInside == wasInside) continue;  // no transition

    // ── Speed filter: suppress exit when nearly stationary ───────
    if (!nowInside && currentSpeed < GF_HYSTERESIS_SPEED) continue;

    // ── Dedup: same event within GF_DEDUP_MS → skip (Fix 8) ─────
    char transType = nowInside ? 'E' : 'X';
    if (gfLastTransitionType[i] == transType &&
        (millis() - gfLastTransitionMs[i]) < GF_DEDUP_MS) {
      Serial.printf("[GF] Dedup: zone '%s' %s suppressed\n",
                    z.name, nowInside ? "entry" : "exit");
      continue;
    }

    // ── Transition confirmed ─────────────────────────────────────
    gfInsideState[i]         = nowInside;
    gfLastTransitionMs[i]    = millis();
    gfLastTransitionType[i]  = transType;

    // NVS persist — zone_key based, first 15 chars (NVS key max 15)
    char nvs_key[17];
    snprintf(nvs_key, sizeof(nvs_key), "k_%.15s", z.zone_key);
    preferences.putBool(nvs_key, nowInside);

    if (nowInside && z.alert_entry) {
      publishGeofenceEvent(z, "entry");
    } else if (!nowInside && z.alert_exit) {
      publishGeofenceEvent(z, "exit");
    }
  }

  preferences.end();
}

// ============================================
// HAVERSINE DISTANCE
// ============================================

double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000;
  double dLat = (lat2 - lat1) * DEG_TO_RAD;
  double dLon = (lon2 - lon1) * DEG_TO_RAD;
  
  double a = sin(dLat/2) * sin(dLat/2) +
             cos(lat1 * DEG_TO_RAD) * cos(lat2 * DEG_TO_RAD) *
             sin(dLon/2) * sin(dLon/2);
  double c = 2 * atan2(sqrt(a), sqrt(1-a));
  
  return R * c;
}

long getPublishInterval() {
  if (eventBurstCount > 0) return INTERVAL_EVENT;
  if (currentSpeed >= HIGHWAY_SPEED) return INTERVAL_HIGHWAY;
  if (currentSpeed >= CITY_SPEED) return INTERVAL_CITY;
  if (currentSpeed >= IDLE_SPEED) return INTERVAL_FAST;
  return INTERVAL_IDLE;
}

// ============================================
// SETUP
// ============================================

String getMacNoWiFi() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  disableCore0WDT();
  disableCore1WDT();
  Serial.begin(115200);
  mqtt_client.setBufferSize(4096);  // v4.6.0: config JSON needs room (was 512)
  delay(2000);
  
  Serial.println("\n\n");
  Serial.println("==========================================");
  Serial.println("   TulipFleet ESP32 Tracker v" + String(FIRMWARE_VERSION));
  Serial.println("==========================================");
  
  // Chip ID
  uint64_t chipid = ESP.getEfuseMac();
  espChipId = String((uint32_t)(chipid >> 32), HEX) + String((uint32_t)chipid, HEX);
  espChipId.toUpperCase();
  
  macAddress = getMacNoWiFi();
  deviceName = "TulipFleet-" + espChipId.substring(8);
  
  Serial.println("[SYS] ESP Chip ID: " + espChipId);
  Serial.println("[SYS] MAC: " + macAddress);
  Serial.println("[SYS] Device: " + deviceName);
  
  ledsInit();
  
  // NVS - Read stored credentials
  preferences.begin("fleet", true);
  isActivated = preferences.getBool("ACTIVATED", false);
  activatedSerial = preferences.getString("SERIAL", "");
  storedSsid = preferences.getString("SSID", "");
  storedPassword = preferences.getString("PASSWORD", "");
  storedToken = preferences.getString("DEVICE_TOKEN", "");
  preferences.end();
  
  Serial.println("[NVS] Activated: " + String(isActivated ? "YES" : "NO"));
  
  // Init sensors - ADXL345 on I2C (GPIO8/9)
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);
  
  if (accel.begin()) {
    accel.setRange(ADXL345_RANGE_16_G);
    accel.setDataRate(ADXL345_DATARATE_100_HZ);
    adxlReady = true;
    Serial.println("[ADXL] Ready (SDA=8 SCL=9, 16G, 100Hz)");
    calibrateAccel();
  } else {
    adxlReady = false;
    Serial.println("[ADXL] Not found on GPIO8/9 — events disabled");
  }
  
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
  Serial.println("[GPS] Ready");
  
  // Decision: BLE or WiFi?
  if (!isActivated) {
    Serial.println("\n[BOOT] First activation required");
    Serial.println("[BOOT] -> Starting BLE provisioning...");
    initBLE();
    bleBootWindowActive = true;
    bleBootWindowStart = millis();
  } else {
    Serial.println("\n[BOOT] Device activated, connecting to WiFi...");
    
    if (connectWiFi()) {
      // Init MQTT
      mqtt_client.setServer(mqtt_server, mqtt_port);
      
      // Setup MQTT topics
      mqtt_topic_location = "fleet/device/" + espChipId + "/location";
      mqtt_topic_telemetry = "fleet/device/" + espChipId + "/telemetry";
      mqtt_topic_events = "fleet/device/" + espChipId + "/events";
      mqtt_topic_alert = "fleet/device/" + espChipId + "/alerts";
      mqtt_topic_heartbeat = "fleet/device/" + espChipId + "/heartbeat";
      mqtt_topic_command = "fleet/device/" + espChipId + "/commands";
      mqtt_topic_gf_config = "fleet/device/" + espChipId + "/config";
      mqtt_topic_gf_event  = "fleet/device/" + espChipId + "/geofence_event";
      
      // NTP
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
      Serial.println("[NTP] Configured");
      
      Serial.println("\n[BOOT] Ready for normal operation");
    } else {
      Serial.println("[BOOT] WiFi failed, starting BLE for re-provision");
      initBLE();
      bleBootWindowActive = true;
      bleBootWindowStart = millis();
      bleReprovisionMode = true;
    }
  }
  
  Serial.println("\n[BOOT] Setup complete\n");
}

// ============================================
// LOOP
// ============================================

void loop() {
  // CRITICAL: Process provision state machine
  if (provisionState != PROV_IDLE) {
    processProvisionStateMachine();
    return;  // Don't do anything else during provisioning
  }
  
  // BLE boot window timeout
  if (bleBootWindowActive && bleInitialized) {
    unsigned long timeout = bleReprovisionMode ? BLE_REPROVISION_TIMEOUT_MS : BLE_BOOT_WINDOW_MS;
    
    if (millis() - bleBootWindowStart > timeout) {
      Serial.println("[BLE] Timeout, stopping BLE");
      stopBLE();
      bleBootWindowActive = false;
      
      if (isActivated) {
        Serial.println("[BOOT] Attempting WiFi reconnect...");
        if (connectWiFi()) {
          mqtt_client.setServer(mqtt_server, mqtt_port);
        }
      }
    }
  }
  
  // Normal operation (only if activated and connected)
  // -- LED state: reflect real-time connection status --
  ledSet(LED_WIFI, WiFi.status() == WL_CONNECTED);
  if (WiFi.status() != WL_CONNECTED) wifiConnected = false;

  if (isActivated && wifiConnected) {
    // GPS
    while (gpsSerial.available() > 0) {
      gps.encode(gpsSerial.read());
    }
    
    if (gps.location.isValid()) {
      currentLat = gps.location.lat();
      currentLon = gps.location.lng();
      currentSpeed = gps.speed.kmph();
      gpsValid = true;
      ledSet(LED_GPS, true);
    } else {
      gpsValid = false;
      ledSet(LED_GPS, false);
    }
    
    // ADXL345 — read & smooth every loop cycle, check events
    readAndSmoothAccel();
    checkForEvents();

    // Geofence edge check (v4.6.0)
    checkGeofences();

    // Pending geofence config parse — done in loop, not in callback (Fix 7)
    if (gfPendingConfigReady) {
      gfPendingConfigReady = false;
      Serial.printf("[GF] Parsing queued config (%d bytes)...\n", gfPendingConfigLen);
      loadZonesFromConfig(String(gfPendingConfig));
    }
    
    // MQTT
    if (!mqtt_client.connected()) {
      connectMQTT();
    }
    mqtt_client.loop();
    
    unsigned long now = millis();
    
    // GPS Debug - her 10 saniyede durum
    static unsigned long lastGpsDebug = 0;
    if (now - lastGpsDebug >= 10000) {
      lastGpsDebug = now;
      Serial.printf("[GPS] chars=%lu valid=%d sats=%d lat=%.6f lon=%.6f spd=%.1f\n",
        gps.charsProcessed(), gpsValid ? 1 : 0, 
        gps.satellites.value(), currentLat, currentLon, currentSpeed);
    }
    
    // â”€â”€ LOCATION publish (GPS data â†’ location topic) â”€â”€
    // Smart publish: skip if vehicle hasn't moved (saves bandwidth & DB)
    long locationInterval = getPublishInterval();
    
    if (now - lastPublish >= locationInterval) {
      lastPublish = now;
      
      if (mqtt_client.connected() && gpsValid) {
        // Calculate distance from last published position
        double distMoved = haversineDistance(lastLat, lastLon, currentLat, currentLon);
        bool isStationary = (distMoved < STATIONARY_DISTANCE) && (currentSpeed < IDLE_SPEED);
        bool heartbeatDue = (now - lastMovingPublish >= STATIONARY_HEARTBEAT);
        
        // Skip if stationary AND we sent a location recently
        if (isStationary && !heartbeatDue) {
          Serial.printf("[LOC] Skipped: stationary (moved %.1fm)\n", distMoved);
        } else {
          StaticJsonDocument<512> doc;
          doc["device_id"] = espChipId;
          doc["timestamp"] = getTimestamp();
          doc["latitude"] = currentLat;
          doc["longitude"] = currentLon;
          doc["speed"] = currentSpeed;
          doc["heading"] = gps.course.isValid() ? gps.course.deg() : 0;
          doc["altitude"] = gps.altitude.isValid() ? gps.altitude.meters() : 0;
          doc["satellites"] = gps.satellites.value();
          doc["hdop"] = gps.hdop.isValid() ? gps.hdop.hdop() : 0;
          doc["wifi_rssi"] = WiFi.RSSI();
          doc["fw_version"] = FIRMWARE_VERSION;
          
          // ADXL345 accelerometer data (for DB locations table)
          if (adxlReady && calibrated) {
            doc["accel_x"] = smoothAx;
            doc["accel_y"] = smoothAy;
            doc["accel_z"] = smoothAz;
          }
          
          String json;
          serializeJson(doc, json);
          
          bool locSent = mqtt_client.publish(mqtt_topic_location.c_str(), json.c_str());
          if (locSent) {
            lastLat = currentLat;
            lastLon = currentLon;
            lastMovingPublish = now;
          }
          Serial.printf("[LOC] %s: %.6f,%.6f spd=%.1f dist=%.1fm sats=%d (len=%d)\n", 
            locSent ? "Published" : "FAILED", currentLat, currentLon, currentSpeed, distMoved, gps.satellites.value(), json.length());
        }
      }
    }
    // -- TELEMETRY publish (vehicle sensors -> telemetry topic) --
    // Interval: 60 saniye sabit
    if (now - lastTelemetryPublish >= 60000) {
      lastTelemetryPublish = now;
      
      if (mqtt_client.connected()) {
        StaticJsonDocument<256> doc;
        doc["device_id"] = espChipId;
        doc["timestamp"] = getTimestamp();
        doc["uptime"] = millis() / 1000;
        doc["wifi_rssi"] = WiFi.RSSI();
        doc["free_heap"] = ESP.getFreeHeap();
        doc["gps_valid"] = gpsValid;
        doc["satellites"] = gps.satellites.value();
        doc["fw_version"] = FIRMWARE_VERSION;
        // TODO: fuel_level ve odometer sensorleri eklenince buraya
        
        String json;
        serializeJson(doc, json);
        
        mqtt_client.publish(mqtt_topic_telemetry.c_str(), json.c_str());
        Serial.println("[TEL] Published: system telemetry");
      }
    }
    
    // Heartbeat
    if (now - lastHeartbeat >= 60000) {
      lastHeartbeat = now;
      
      if (mqtt_client.connected()) {
        StaticJsonDocument<128> doc;
        doc["device_id"] = espChipId;
        doc["timestamp"] = getTimestamp();
        doc["uptime"] = millis() / 1000;
        
        String json;
        serializeJson(doc, json);
        
        mqtt_client.publish(mqtt_topic_heartbeat.c_str(), json.c_str());
      }
    }
  }
  
  delay(10);
}
