// src/services/bleService.js
// TulipFleet BLE Service - FAZ 4 Device Activation + WiFi Provisioning
// Created: 01 Ocak 2026
// Updated: 05 Ocak 2026 - WiFi-via-BLE eklendi

import { Buffer } from "buffer";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, State } from "react-native-ble-plx";
import { BLE_CONFIG } from "../constants/config";

class BLEService {
  constructor() {
    this.manager = null;
    this.device = null;
    this.isScanning = false;
    this.statusSubscription = null;
    this.resultSubscription = null;
    this.disconnectSubscription = null;
    this.stateSubscription = null;
    this.wifiStatusSubscription = null; // 🆕 WiFi status subscription
    this.onDisconnectCallback = null;
    this.onStateChangeCallback = null;
  }

  // ══════════════════════════════════════════════════════════════
  // 1. LIFECYCLE + PERMISSIONS
  // ══════════════════════════════════════════════════════════════

  async initialize() {
    if (this.manager) {
      console.log("[BLE] Already initialized");
      return;
    }

    console.log("[BLE] Initializing...");
    this.manager = new BleManager();

    // State change listener
    this.stateSubscription = this.manager.onStateChange((state) => {
      console.log("[BLE] State changed:", state);
      this.onStateChangeCallback?.(state);
    }, true);

    // Mevcut durumu kontrol et
    const state = await this.manager.state();
    console.log("[BLE] Current state:", state);

    if (state !== State.PoweredOn) {
      if (state === State.PoweredOff) {
        throw new Error("BLUETOOTH_OFF");
      }
      if (state === State.Unauthorized) {
        throw new Error("BLUETOOTH_UNAUTHORIZED");
      }
      if (state === State.Unsupported) {
        throw new Error("BLUETOOTH_UNSUPPORTED");
      }
      throw new Error("BLUETOOTH_UNAVAILABLE");
    }

    // Android 12+ runtime permissions
    if (Platform.OS === "android") {
      await this.requestAndroidPermissions();
    }

    console.log("[BLE] Initialized successfully");
  }

  async requestAndroidPermissions() {
    if (Platform.Version < 31) {
      // Android 11 ve altı için sadece lokasyon
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (locationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error("LOCATION_PERMISSION_DENIED");
      }
      return;
    }

    // Android 12+ için BLE permissions
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    console.log("[BLE] Requesting Android permissions...");
    const results = await PermissionsAndroid.requestMultiple(permissions);

    const allGranted = Object.values(results).every(
      (result) => result === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      console.log("[BLE] Permissions denied:", results);
      throw new Error("PERMISSIONS_DENIED");
    }

    console.log("[BLE] All permissions granted");
  }

  destroy() {
    console.log("[BLE] Destroying...");
    this.stopScan();
    this.disconnect();
    this.stateSubscription?.remove();
    this.stateSubscription = null;
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
    console.log("[BLE] Destroyed");
  }

  onStateChange(callback) {
    this.onStateChangeCallback = callback;
  }

  onDisconnect(callback) {
    this.onDisconnectCallback = callback;
  }

  // ══════════════════════════════════════════════════════════════
  // 2. SCANNING (Filtered + Unfiltered Fallback)
  // ══════════════════════════════════════════════════════════════

  startScan(onDeviceFound, onError, onTimeout) {
    if (this.isScanning) {
      console.log("[BLE] Already scanning");
      return () => {};
    }

    if (!this.manager) {
      onError?.(new Error("BLE not initialized"));
      return () => {};
    }

    this.isScanning = true;
    const foundDevices = new Map();
    let useUnfiltered = false;
    let unfilteredTimeout = null;
    let mainTimeout = null;

    const scanWithFilter = (serviceUUIDs) => {
      console.log(
        "[BLE] Scanning with filter:",
        serviceUUIDs ? "Service UUID" : "None (unfiltered)"
      );

      this.manager.startDeviceScan(
        serviceUUIDs,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error("[BLE] Scan error:", error.message);
            this.isScanning = false;
            onError?.(error);
            return;
          }

          if (device && this.isValidDevice(device)) {
            if (!foundDevices.has(device.id)) {
              foundDevices.set(device.id, true);
              console.log(
                "[BLE] Found device:",
                device.name,
                "RSSI:",
                device.rssi
              );
              onDeviceFound?.({
                id: device.id,
                name: device.name,
                rssi: device.rssi,
                isConnectable: device.isConnectable,
              });
            }
          }
        }
      );
    };

    // Önce service UUID ile filtered scan
    scanWithFilter([BLE_CONFIG.SERVICE_UUID]);

    // 3sn sonra hiç cihaz yoksa unfiltered'a geç
    unfilteredTimeout = setTimeout(() => {
      if (foundDevices.size === 0 && !useUnfiltered && this.isScanning) {
        console.log(
          "[BLE] No devices found with filter, switching to unfiltered scan"
        );
        useUnfiltered = true;
        this.manager?.stopDeviceScan();
        scanWithFilter(null); // Unfiltered - name prefix ile filtrelenir
      }
    }, BLE_CONFIG.TIMEOUTS.SCAN_UNFILTERED);

    // Ana timeout
    mainTimeout = setTimeout(() => {
      if (unfilteredTimeout) clearTimeout(unfilteredTimeout);
      this.stopScan();
      if (foundDevices.size === 0) {
        console.log("[BLE] Scan timeout - no devices found");
        onTimeout?.();
      } else {
        console.log(
          "[BLE] Scan complete - found",
          foundDevices.size,
          "devices"
        );
      }
    }, BLE_CONFIG.TIMEOUTS.SCAN);

    // Cleanup function
    return () => {
      if (unfilteredTimeout) clearTimeout(unfilteredTimeout);
      if (mainTimeout) clearTimeout(mainTimeout);
      this.stopScan();
    };
  }

  isValidDevice(device) {
    if (!device.name) return false;
    const isValid = BLE_CONFIG.DEVICE_NAME_PREFIXES.some((prefix) =>
      device.name.startsWith(prefix)
    );
    return isValid;
  }

  stopScan() {
    if (this.manager && this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      console.log("[BLE] Scan stopped");
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 3. CONNECTION
  // ══════════════════════════════════════════════════════════════

  async connect(deviceId) {
    if (!this.manager) {
      throw new Error("BLE not initialized");
    }

    this.stopScan();

    // Önceki subscription'ları temizle
    this.cleanupSubscriptions();

    try {
      console.log("[BLE] Connecting to:", deviceId);

      this.device = await this.manager.connectToDevice(deviceId, {
        timeout: BLE_CONFIG.TIMEOUTS.CONNECT,
        autoConnect: false,
      });

      console.log("[BLE] Connected, discovering services...");
      await this.device.discoverAllServicesAndCharacteristics();

      // Service'leri kontrol et
      const services = await this.device.services();
      console.log(
        "[BLE] Found services:",
        services.map((s) => s.uuid)
      );

      // Disconnect listener
      this.disconnectSubscription = this.device.onDisconnected(
        (error, device) => {
          console.log("[BLE] Disconnected:", error?.message || "No error");
          this.device = null;
          this.cleanupSubscriptions();
          this.onDisconnectCallback?.(error);
        }
      );

      console.log("[BLE] Connection complete");
      return true;
    } catch (error) {
      console.error("[BLE] Connect error:", error.message);
      this.device = null;
      throw error;
    }
  }

  async disconnect() {
    this.cleanupSubscriptions();

    if (this.device) {
      try {
        const isConnected = await this.device.isConnected();
        if (isConnected) {
          await this.device.cancelConnection();
          console.log("[BLE] Disconnected");
        }
      } catch (e) {
        console.log("[BLE] Disconnect error (ignored):", e.message);
      }
      this.device = null;
    }
  }

  cleanupSubscriptions() {
    if (this.statusSubscription) {
      this.statusSubscription.remove();
      this.statusSubscription = null;
    }
    if (this.resultSubscription) {
      this.resultSubscription.remove();
      this.resultSubscription = null;
    }
    if (this.disconnectSubscription) {
      this.disconnectSubscription.remove();
      this.disconnectSubscription = null;
    }
    // 🆕 WiFi subscription cleanup
    if (this.wifiStatusSubscription) {
      this.wifiStatusSubscription.remove();
      this.wifiStatusSubscription = null;
    }
  }

  isConnected() {
    return this.device !== null;
  }

  async checkConnection() {
    if (!this.device) return false;
    try {
      return await this.device.isConnected();
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 4. SUBSCRIBE TO NOTIFICATIONS (Önce subscribe!)
  // ══════════════════════════════════════════════════════════════

  async subscribeToNotifications(onStatus, onResult) {
    if (!this.device) throw new Error("NOT_CONNECTED");

    console.log("[BLE] Subscribing to notifications...");

    try {
      // Status subscription
      this.statusSubscription = this.device.monitorCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.STATUS,
        (error, characteristic) => {
          if (error) {
            console.error("[BLE] Status monitor error:", error.message);
            return;
          }
          if (characteristic?.value) {
            const value = Buffer.from(characteristic.value, "base64").toString(
              "utf8"
            );
            console.log("[BLE] Status notification:", value);
            onStatus?.(value);
          }
        }
      );

      // Result subscription
      this.resultSubscription = this.device.monitorCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.RESULT,
        (error, characteristic) => {
          if (error) {
            console.error("[BLE] Result monitor error:", error.message);
            return;
          }
          if (characteristic?.value) {
            const value = Buffer.from(characteristic.value, "base64").toString(
              "utf8"
            );
            console.log("[BLE] Result notification:", value);
            onResult?.(value);
          }
        }
      );

      // Kısa bekleme (subscription'ların aktif olması için)
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("[BLE] Subscriptions active");
    } catch (error) {
      console.error("[BLE] Subscribe error:", error.message);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 5. WRITE SERIAL (WriteWithoutResponse + Fallback)
  // ══════════════════════════════════════════════════════════════

  async writeSerial(serial) {
    if (!this.device) throw new Error("NOT_CONNECTED");

    const base64Value = Buffer.from(serial, "utf8").toString("base64");
    console.log("[BLE] Writing serial:", serial);

    // Önce writeWithoutResponse dene (daha hızlı)
    try {
      await this.device.writeCharacteristicWithoutResponseForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.SERIAL,
        base64Value
      );
      console.log("[BLE] Write (without response) success");
      return true;
    } catch (error) {
      console.log("[BLE] WriteWithoutResponse failed:", error.message);
    }

    // Fallback: writeWithResponse
    try {
      await this.device.writeCharacteristicWithResponseForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.SERIAL,
        base64Value
      );
      console.log("[BLE] Write (with response) success");
      return true;
    } catch (fallbackError) {
      console.error("[BLE] Write failed:", fallbackError.message);
      throw fallbackError;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 6. READ CURRENT VALUES
  // ══════════════════════════════════════════════════════════════

  async readStatus() {
    if (!this.device) throw new Error("NOT_CONNECTED");

    try {
      const characteristic = await this.device.readCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.STATUS
      );
      const value = Buffer.from(characteristic.value, "base64").toString(
        "utf8"
      );
      console.log("[BLE] Read status:", value);
      return value;
    } catch (error) {
      console.error("[BLE] Read status error:", error.message);
      throw error;
    }
  }

  async readResult() {
    if (!this.device) throw new Error("NOT_CONNECTED");

    try {
      const characteristic = await this.device.readCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.RESULT
      );
      const value = Buffer.from(characteristic.value, "base64").toString(
        "utf8"
      );
      console.log("[BLE] Read result:", value);
      return value;
    } catch (error) {
      console.error("[BLE] Read result error:", error.message);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 7. WIFI PROVISIONING (YENİ - WiFi-via-BLE)
  // ══════════════════════════════════════════════════════════════

  /**
   * WiFi credentials'ı ESP32'ye gönder
   * Payload: JSON {"ssid":"xxx","password":"yyy"}
   * @param {string} ssid - WiFi ağ adı
   * @param {string} password - WiFi şifresi
   * @returns {Promise<boolean>}
   */
  async writeWifiCredentials(ssid, password) {
    if (!this.device) throw new Error("NOT_CONNECTED");

    // Validation
    if (!ssid || ssid.trim().length === 0) {
      throw new Error("INVALID_SSID");
    }
    if (!password || password.length < 8) {
      throw new Error("INVALID_PASSWORD");
    }

    // config.js'de WIFI_CREDENTIALS tanımlı mı kontrol et
    if (!BLE_CONFIG.CHARACTERISTICS.WIFI_CREDENTIALS) {
      throw new Error("WIFI_CREDENTIALS_UUID_NOT_DEFINED");
    }

    // JSON payload oluştur
    const payload = JSON.stringify({
      ssid: ssid.trim(),
      password: password,
    });

    // Base64 encode
    const base64Value = Buffer.from(payload, "utf8").toString("base64");

    console.log(
      "[BLE] Writing WiFi credentials, SSID:",
      ssid,
      "Payload size:",
      payload.length
    );

    // Önce writeWithResponse dene (daha güvenilir)
    try {
      await this.device.writeCharacteristicWithResponseForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.WIFI_CREDENTIALS,
        base64Value
      );
      console.log("[BLE] WiFi credentials sent successfully");
      return true;
    } catch (error) {
      console.error("[BLE] WiFi write error:", error.message);

      // Fallback: writeWithoutResponse
      try {
        console.log("[BLE] Trying writeWithoutResponse...");
        await this.device.writeCharacteristicWithoutResponseForService(
          BLE_CONFIG.SERVICE_UUID,
          BLE_CONFIG.CHARACTERISTICS.WIFI_CREDENTIALS,
          base64Value
        );
        console.log("[BLE] WiFi credentials sent (without response)");
        return true;
      } catch (fallbackError) {
        console.error(
          "[BLE] WiFi write fallback failed:",
          fallbackError.message
        );
        throw fallbackError;
      }
    }
  }

  /**
   * WiFi bağlantı durumunu dinle (subscribe)
   * ESP32 şu değerleri notify eder: CONNECTING, OK, ERR_AUTH, ERR_TIMEOUT, ERR_NOT_FOUND
   * @param {function} onStatus - Her status değişikliğinde çağrılır
   * @returns {Promise<string>} - Final result: 'OK' | 'ERR_xxx'
   */
  subscribeToWifiStatus(onStatus) {
    if (!this.device) throw new Error("NOT_CONNECTED");

    // config.js'de WIFI_STATUS tanımlı mı kontrol et
    if (!BLE_CONFIG.CHARACTERISTICS.WIFI_STATUS) {
      throw new Error("WIFI_STATUS_UUID_NOT_DEFINED");
    }

    return new Promise((resolve, reject) => {
      let resolved = false; // Tek sefer resolve garantisi

      // Timeout (config'den al, yoksa 30 saniye)
      const timeoutMs = BLE_CONFIG.TIMEOUTS?.WIFI_CONNECT || 30000;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanupWifiSubscription();
          reject(new Error("WIFI_TIMEOUT"));
        }
      }, timeoutMs);

      console.log("[BLE] Subscribing to WiFi status...");

      // Monitor characteristic
      this.wifiStatusSubscription = this.device.monitorCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.WIFI_STATUS,
        (error, characteristic) => {
          if (resolved) return; // Zaten resolve olduysa ignore

          if (error) {
            console.error("[BLE] WiFi status monitor error:", error.message);
            // Hata olsa bile devam et, timeout'a düşsün
            return;
          }

          if (characteristic?.value) {
            const status = Buffer.from(characteristic.value, "base64")
              .toString("utf8")
              .trim();
            console.log("[BLE] WiFi status received:", status);

            // Callback çağır
            onStatus?.(status);

            // Final states - resolve once
            if (status === "OK") {
              resolved = true;
              clearTimeout(timeout);
              this.cleanupWifiSubscription();
              resolve("OK");
            } else if (status.startsWith("ERR_")) {
              resolved = true;
              clearTimeout(timeout);
              this.cleanupWifiSubscription();
              resolve(status); // ERR_AUTH, ERR_TIMEOUT, ERR_NOT_FOUND
            }
            // CONNECTING gibi intermediate state'ler için devam et
          }
        }
      );
    });
  }

  /**
   * WiFi subscription temizle
   */
  cleanupWifiSubscription() {
    if (this.wifiStatusSubscription) {
      this.wifiStatusSubscription.remove();
      this.wifiStatusSubscription = null;
      console.log("[BLE] WiFi subscription cleaned up");
    }
  }

  /**
   * Tam WiFi provisioning akışı (convenience method)
   * 1. Credentials gönder
   * 2. Sonucu bekle
   * 3. Sonucu değerlendir
   *
   * @param {string} ssid
   * @param {string} password
   * @param {function} onProgress - Progress callback: (phase, message) => void
   *   phase: 'sending' | 'connecting' | 'status' | 'success' | 'error'
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  async provisionWifi(ssid, password, onProgress) {
    try {
      // 1. Credentials gönder
      onProgress?.("sending", "WiFi bilgileri gönderiliyor...");
      await this.writeWifiCredentials(ssid, password);

      // Kısa bekleme - ESP32'nin işlemesi için
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. Sonucu bekle
      onProgress?.("connecting", "ESP32 WiFi'ye bağlanıyor...");
      const result = await this.subscribeToWifiStatus((status) => {
        // Intermediate status updates
        if (status === "CONNECTING") {
          onProgress?.("status", "Bağlantı kuruluyor...");
        }
      });

      // 3. Sonucu değerlendir
      if (result === "OK") {
        onProgress?.("success", "WiFi bağlantısı başarılı!");
        return { success: true };
      } else {
        // Hata mesajlarını çevir
        const errorMessages = {
          ERR_AUTH: "WiFi şifresi yanlış",
          ERR_TIMEOUT: "WiFi ağına bağlanılamadı (zaman aşımı)",
          ERR_NOT_FOUND: "WiFi ağı bulunamadı (5GHz desteklenmez)",
          ERR_UNKNOWN: "Bilinmeyen bir hata oluştu",
        };
        const message = errorMessages[result] || `Hata: ${result}`;
        onProgress?.("error", message);
        return { success: false, error: result, message };
      }
    } catch (error) {
      console.error("[BLE] provisionWifi error:", error.message);

      // Timeout veya exception
      let message = error.message;
      if (error.message === "WIFI_TIMEOUT") {
        message = "WiFi bağlantısı zaman aşımına uğradı";
      } else if (error.message === "INVALID_SSID") {
        message = "Geçersiz WiFi ağ adı";
      } else if (error.message === "INVALID_PASSWORD") {
        message = "Şifre en az 8 karakter olmalı";
      } else if (error.message === "WIFI_CREDENTIALS_UUID_NOT_DEFINED") {
        message = "WiFi characteristic tanımlı değil (config.js güncelleyin)";
      }

      onProgress?.("error", message);
      return { success: false, error: error.message, message };
    } finally {
      this.cleanupWifiSubscription();
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 8. UTILITY
  // ══════════════════════════════════════════════════════════════

  getState() {
    return {
      initialized: !!this.manager,
      scanning: this.isScanning,
      connected: !!this.device,
      deviceId: this.device?.id || null,
      deviceName: this.device?.name || null,
      wifiSubscribed: !!this.wifiStatusSubscription,
    };
  }
}

// Singleton export
export const bleService = new BLEService();
export default bleService;
