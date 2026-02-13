/*
 * Fleet Tracker ESP32-S3 v5.0.0
 * 
 * PLATFORM: ESP32-S3 (with encryption support)
 * 
 * v5.0.0 CHANGES:
 *  - Clean rewrite for ESP32-S3
 *  - Removed all workarounds for ESP32-WROOM issues
 *  - Optimized BLE initialization (no task hacks needed)
 *  - Direct WiFi connection (no scan required)
 *  - Proper MAC address reading without WiFi init
 *  - Separated MQTT topics: location vs telemetry
 *  - GPS data published to fleet/device/{id}/location
 *  - Smart publish: skip if stationary
 * 
 * ESP32-S3 ADVANTAGES:
 *  - Better BLE/WiFi coexistence
 *  - Hardware encryption support
 *  - More stable radio stack
 *  - Better memory management
 * 
 * 10 February 2026 - ESP32-S3 Release
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
#include "esp_mac.h"
#include "esp_bt.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include <Preferences.h>

// ============================================
// CONFIGURATION
// ============================================

const char* FIRMWARE_VERSION = "5.0.2-NoBLE";
const char* DEVICE_SERIAL = "TF-2026-DEMO-1";

// Backend
const char* API_ACTIVATE_URL = "https://api.tulipfleet.com/api/devices/activate";
const char* API_VERIFY_TOKEN_URL = "https://api.tulipfleet.com/api/devices/verify-token";
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
// ESP32-S3 PIN CONFIGURATION
// ============================================

// GPS - UART2
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define GPS_BAUD 9600

// I2C (ADXL345)
#define I2C_SDA 21
#define I2C_SCL 22

// LED Pins (adjust for your S3 board)
#define LED_STATUS 2
#define LED_GPS 4
#define LED_WIFI 5

// ============================================
// BLE SETTINGS
// ============================================

#define BLE_BOOT_WINDOW_MS        300000  // 5 minutes
#define BLE_REPROVISION_TIMEOUT_MS 120000 // 2 minutes

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_SERIAL_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_STATUS_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define CHAR_RESULT_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26aa"
#define CHAR_WIFI_CRED_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ab"
#define CHAR_WIFI_STAT_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ac"
#define CHAR_WIFI_SCAN_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ad"
#define CHAR_AUTH_TOKEN_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ae"

// WiFi Status constants
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
bool bleBootWindowActive = false;
unsigned long bleBootWindowStart = 0;
bool bleReprovisionMode = false;

// Provisioning state machine
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
String mqtt_topic_heartbeat = "";
String mqtt_topic_command = "";

// GPS & Motion
double currentLat = 0, currentLon = 0;
double lastLat = 0, lastLon = 0;
float currentSpeed = 0;
float baseX = 0, baseY = 0, baseZ = 0;
bool gpsValid = false;

// Timing
unsigned long lastPublish = 0;
unsigned long lastTelemetryPublish = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastMovingPublish = 0;
int eventBurstCount = 0;

// Intervals (ms)
const long INTERVAL_IDLE = 30000;
const long INTERVAL_FAST = 15000;
const long INTERVAL_CITY = 10000;
const long INTERVAL_HIGHWAY = 5000;
const long INTERVAL_EVENT = 3000;

// Thresholds
const float STATIONARY_DISTANCE = 10.0;
const long STATIONARY_HEARTBEAT = 300000;
const float IDLE_SPEED = 5.0;
const float CITY_SPEED = 50.0;
const float HIGHWAY_SPEED = 90.0;
const float HARSH_BRAKE_THRESHOLD = 0.35;
const float HARSH_ACCEL_THRESHOLD = 0.25;
const float HARSH_TURN_THRESHOLD = 0.30;
const float IMPACT_THRESHOLD = 2.5;

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
void processProvisionStateMachine();

// ============================================
// UTILITY FUNCTIONS
// ============================================

String getMacAddress() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

void ledsInit() {
  pinMode(LED_STATUS, OUTPUT);
  pinMode(LED_GPS, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  digitalWrite(LED_STATUS, LOW);
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
  for (unsigned int i = 0; i < token.length(); i++) {
    if (token.charAt(i) == '.') dotCount++;
  }
  return dotCount == 2;
}

String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01T00:00:00Z";
  }
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

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

class WifiCredCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      String json = String(value.c_str());
      Serial.println("[BLE] WiFi credentials received: " + json);
      
      if (parseWifiCredentials(json, receivedSsid, receivedPassword)) {
        wifiCredReceived = true;
        Serial.println("[BLE] SSID: " + receivedSsid);
        
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

class WifiScanCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pCharacteristic) {
    Serial.println("[BLE] WiFi scan requested");
    // WiFi scan on ESP32-S3 - simple implementation
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
    }
    
    String json;
    serializeJson(doc, json);
    
    if (pWifiScanChar) {
      pWifiScanChar->setValue((uint8_t*)json.c_str(), json.length());
      pWifiScanChar->notify();
    }
    
    WiFi.scanDelete();
    Serial.println("[SCAN] Sent results via BLE");
  }
};

// ============================================
// BLE STATUS UPDATES
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
// BLE INIT - Clean for ESP32-S3
// ============================================

void initBLE() {
  if (bleInitialized) {
    Serial.println("[BLE] Already initialized");
    return;
  }

  Serial.println("[BLE] Starting...");
  Serial.printf("[MEM] free=%u min=%u\n", ESP.getFreeHeap(), ESP.getMinFreeHeap());

  // Release classic BT memory (not needed for BLE only)
  esp_bt_controller_mem_release(ESP_BT_MODE_CLASSIC_BT);
  delay(100);

  // Initialize NimBLE - ESP32-S3 handles this much better
  NimBLEDevice::init(deviceName.c_str());
  delay(100);
  
  Serial.println("[BLE] NimBLE initialized");

  NimBLEDevice::setPower(ESP_PWR_LVL_P9);
  NimBLEDevice::setMTU(512);  // ESP32-S3 can handle larger MTU
  
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
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
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
// BLE STOP
// ============================================

void stopBLE() {
  if (!bleInitialized) {
    Serial.println("[BLE] Not initialized, skip stop");
    return;
  }
  
  Serial.println("[BLE] Stopping...");
  
  if (pServer) {
    pServer->stopAdvertising();
    delay(100);
    
    if (bleConnected) {
      std::vector<uint16_t> connIds = pServer->getPeerDevices();
      for (auto id : connIds) {
        pServer->disconnect(id);
      }
      delay(200);
    }
  }
  
  delay(300);
  NimBLEDevice::deinit(true);
  delay(500);
  
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
  
  Serial.println("[BLE] Stopped");
}

// ============================================
// WiFi CONNECT
// ============================================

bool connectWiFi(const String& ssid, const String& password) {
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

bool connectStoredWiFi() {
  if (storedSsid.length() == 0) {
    Serial.println("[WiFi] No stored SSID");
    return false;
  }
  return connectWiFi(storedSsid, storedPassword);
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
    Serial.println("[ACT] SUCCESS");
    http.end();

    StaticJsonDocument<768> resp;
    DeserializationError err = deserializeJson(resp, response);
    if (err) {
      Serial.println("[ACT] JSON parse error");
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
  http.end();
  return false;
}

// ============================================
// NVS SAVE
// ============================================

void saveCredentialsToNVS(const String& deviceToken) {
  preferences.begin("fleet", false);
  preferences.putString("SSID", receivedSsid);
  preferences.putString("PASSWORD", receivedPassword);
  preferences.putString("SERIAL", receivedSerial);
  preferences.putString("DEVICE_TOKEN", deviceToken);
  preferences.putBool("ACTIVATED", true);
  preferences.end();
  
  Serial.println("[NVS] Credentials saved");
  delay(2000);
  ESP.restart();
}

// ============================================
// PROVISIONING STATE MACHINE
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
      
      provisionState = PROV_STOPPING_BLE;
      provisionStateTime = millis();
      break;
      
    case PROV_STOPPING_BLE:
      Serial.println("[PROV] Stopping BLE...");
      stopBLE();
      provisionState = PROV_BLE_STOPPED;
      provisionStateTime = millis();
      break;
      
    case PROV_BLE_STOPPED:
      if (millis() - provisionStateTime < 500) return;
      
      Serial.println("[PROV] Connecting WiFi...");
      provisionState = PROV_CONNECTING_WIFI;
      provisionStateTime = millis();
      break;
      
    case PROV_CONNECTING_WIFI:
      if (connectWiFi(receivedSsid, receivedPassword)) {
        Serial.println("[PROV] WiFi connected!");
        provisionState = PROV_WIFI_CONNECTED;
        provisionStateTime = millis();
      } else {
        Serial.println("[PROV] WiFi failed");
        provisionState = PROV_FAILED;
      }
      break;
      
    case PROV_WIFI_CONNECTED:
      Serial.println("[PROV] Activating...");
      provisionState = PROV_ACTIVATING;
      provisionStateTime = millis();
      break;
      
    case PROV_ACTIVATING:
      {
        String deviceToken = "";
        if (activateDevice(deviceToken)) {
          Serial.println("[PROV] Activation successful!");
          provisionState = PROV_SUCCESS;
          saveCredentialsToNVS(deviceToken);
        } else {
          Serial.println("[PROV] Activation failed");
          provisionState = PROV_FAILED;
        }
      }
      break;
      
    case PROV_SUCCESS:
      break;
      
    case PROV_FAILED:
      Serial.println("[PROV] Failed, restarting BLE...");
      
      wifiCredReceived = false;
      serialReceived = false;
      tokenReceived = false;
      receivedSsid = "";
      receivedPassword = "";
      
      delay(1000);
      initBLE();
      provisionState = PROV_IDLE;
      break;
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
  String clientId = "ESP32S3-" + espChipId;
  
  if (storedToken.length() == 0) {
    Serial.println(" (no token)");
    return;
  }

  if (mqtt_client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
    Serial.println(" OK");
    mqtt_client.subscribe(mqtt_topic_command.c_str());
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
  int samples = 10;
  
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
  
  Serial.println("[CAL] Complete");
}

// ============================================
// SETUP
// ============================================

void setup() {
  // Disable brownout detector
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n");
  Serial.println("==========================================");
  Serial.println("   TulipFleet ESP32-S3 Tracker v" + String(FIRMWARE_VERSION));
  Serial.println("==========================================");
  
  // Chip ID
  uint64_t chipid = ESP.getEfuseMac();
  espChipId = String((uint32_t)(chipid >> 32), HEX) + String((uint32_t)chipid, HEX);
  espChipId.toUpperCase();
  
  // MAC address without WiFi init
  macAddress = getMacAddress();
  deviceName = "TulipFleet-" + espChipId.substring(8);
  
  Serial.println("[SYS] ESP Chip ID: " + espChipId);
  Serial.println("[SYS] MAC: " + macAddress);
  Serial.println("[SYS] Device: " + deviceName);
  Serial.printf("[SYS] Free Heap: %u bytes\n", ESP.getFreeHeap());
  
  ledsInit();
  
  // MQTT buffer
  mqtt_client.setBufferSize(512);
  
  // NVS - Read stored credentials
  preferences.begin("fleet", true);
  isActivated = preferences.getBool("ACTIVATED", false);
  activatedSerial = preferences.getString("SERIAL", "");
  storedSsid = preferences.getString("SSID", "");
  storedPassword = preferences.getString("PASSWORD", "");
  storedToken = preferences.getString("DEVICE_TOKEN", "");
  preferences.end();
  
  Serial.println("[NVS] Activated: " + String(isActivated ? "YES" : "NO"));
  
  // Init sensors
  Wire.begin(I2C_SDA, I2C_SCL);
  if (accel.begin()) {
    Serial.println("[ADXL] Ready");
    calibrateAccelerometer();
  } else {
    Serial.println("[ADXL] Not found");
  }
  
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] Ready");
  
  // Decision: BLE or WiFi?
  if (!isActivated) {
    Serial.println("\n[BOOT] First activation required");
    Serial.println("[BOOT] -> BLE DISABLED - Using hardcoded WiFi credentials");
    
    // Hardcoded WiFi credentials for testing (BLE bypass)
    receivedSsid = "FiberHGW_ZTR9EJ";      // ← SSID'nı yaz
    receivedPassword = "YOUR_WIFI_PASSWORD";  // ← Şifreni yaz
    receivedSerial = "TF-2026-TEST-001";
    
    // Connect WiFi directly
    if (connectWiFi(receivedSsid, receivedPassword)) {
      Serial.println("[BOOT] WiFi connected, activating device...");
      
      String deviceToken = "";
      if (activateDevice(deviceToken)) {
        saveCredentialsToNVS(deviceToken);
      } else {
        Serial.println("[BOOT] Activation failed - check backend");
      }
    } else {
      Serial.println("[BOOT] WiFi connection failed");
    }
  } else {
    Serial.println("\n[BOOT] Device activated, connecting to WiFi...");
    
    if (connectStoredWiFi()) {
      mqtt_client.setServer(mqtt_server, mqtt_port);
      
      mqtt_topic_location = "fleet/device/" + espChipId + "/location";
      mqtt_topic_telemetry = "fleet/device/" + espChipId + "/telemetry";
      mqtt_topic_events = "fleet/device/" + espChipId + "/events";
      mqtt_topic_heartbeat = "fleet/device/" + espChipId + "/heartbeat";
      mqtt_topic_command = "fleet/device/" + espChipId + "/commands";
      
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
      Serial.println("[NTP] Configured");
      
      Serial.println("\n[BOOT] Ready for operation");
    } else {
      Serial.println("[BOOT] WiFi failed, starting BLE re-provision");
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
  // Provisioning state machine
  if (provisionState != PROV_IDLE) {
    processProvisionStateMachine();
    return;
  }
  
  // BLE timeout
  if (bleBootWindowActive && bleInitialized) {
    unsigned long timeout = bleReprovisionMode ? BLE_REPROVISION_TIMEOUT_MS : BLE_BOOT_WINDOW_MS;
    
    if (millis() - bleBootWindowStart > timeout) {
      Serial.println("[BLE] Timeout");
      stopBLE();
      bleBootWindowActive = false;
      
      if (isActivated) {
        Serial.println("[BOOT] Attempting WiFi reconnect...");
        if (connectStoredWiFi()) {
          mqtt_client.setServer(mqtt_server, mqtt_port);
        }
      }
    }
  }
  
  // Normal operation
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
      digitalWrite(LED_GPS, HIGH);
    }
    
    // MQTT
    if (!mqtt_client.connected()) {
      connectMQTT();
    }
    mqtt_client.loop();
    
    unsigned long now = millis();
    
    // GPS Debug
    static unsigned long lastGpsDebug = 0;
    if (now - lastGpsDebug >= 5000) {
      lastGpsDebug = now;
      Serial.printf("[GPS] valid=%d sats=%d lat=%.6f lon=%.6f spd=%.1f\n",
        gpsValid ? 1 : 0, gps.satellites.value(), 
        currentLat, currentLon, currentSpeed);
    }
    
    // Location publish
    long locationInterval = getPublishInterval();
    
    if (now - lastPublish >= locationInterval) {
      lastPublish = now;
      
      if (mqtt_client.connected() && gpsValid) {
        double distMoved = haversineDistance(lastLat, lastLon, currentLat, currentLon);
        bool isStationary = (distMoved < STATIONARY_DISTANCE) && (currentSpeed < IDLE_SPEED);
        bool heartbeatDue = (now - lastMovingPublish >= STATIONARY_HEARTBEAT);
        
        if (isStationary && !heartbeatDue) {
          Serial.printf("[LOC] Skip: stationary (%.1fm)\n", distMoved);
        } else {
          StaticJsonDocument<384> doc;
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
          
          String json;
          serializeJson(doc, json);
          
          bool sent = mqtt_client.publish(mqtt_topic_location.c_str(), json.c_str());
          if (sent) {
            lastLat = currentLat;
            lastLon = currentLon;
            lastMovingPublish = now;
          }
          Serial.printf("[LOC] %s: %.6f,%.6f\n", sent ? "OK" : "FAIL", currentLat, currentLon);
        }
      }
    }
    
    // Telemetry publish (60s)
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
        
        String json;
        serializeJson(doc, json);
        
        mqtt_client.publish(mqtt_topic_telemetry.c_str(), json.c_str());
        Serial.println("[TEL] Published");
      }
    }
    
    // Heartbeat (60s)
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
