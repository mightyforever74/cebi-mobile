// src/services/bleService.js
// TulipFleet BLE Service - FAZ 4 Device Activation + WiFi Provisioning
// Created: 02 Ocak 2026
// Updated: 02 Şubat 2026 - WiFi scan v3.1 HARDENED (writeWithoutResponse + re-entrancy guard + no double base64)

import { Buffer } from "buffer";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, State } from "react-native-ble-plx";
import { BLE_CONFIG } from "../constants/config";

// ═══ SCAN RE-ENTRANCY GUARDS ═══
const scanInFlight = { current: false };
const lastScanAt = { current: 0 };
const wifiBuffer = { current: "" };

class BLEService {
  constructor() {
    this.manager = null;
    this.device = null;
    this.isScanning = false;
    this.statusSubscription = null;
    this.resultSubscription = null;
    this.disconnectSubscription = null;
    this.stateSubscription = null;
    this.wifiStatusSubscription = null;
    this.wifiScanSubscription = null; // 🆕 WiFi scan subscription
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
    // No .remove() - native cancelTransaction causes crash
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
    const now = Date.now();

    // ═══ RE-ENTRANCY GUARD ═══
    if (scanInFlight.current) {
      console.log("[BLE] Scan already in flight, skipping");
      return () => {};
    }

    // ═══ COOLDOWN ═══
    if (now - lastScanAt.current < 800) {
      console.log("[BLE] Scan cooldown active, skipping");
      return () => {};
    }

    if (this.isScanning) {
      console.log("[BLE] Already scanning");
      return () => {};
    }

    if (!this.manager) {
      onError?.(new Error("BLE not initialized"));
      return () => {};
    }

    // ═══ MARK AS IN FLIGHT ═══
    scanInFlight.current = true;
    lastScanAt.current = now;

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
      scanInFlight.current = false; // ═══ RESET GUARD ═══
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

      // ✅ Connection priority: High (connection'ı stabil tut)
      try {
        await this.device.requestConnectionPriority(1); // 1 = High priority
        console.log("[BLE] Connection priority set to HIGH");
      } catch (e) {
        console.log("[BLE] Connection priority not supported:", e.message);
      }

      // MTU negotiate (512 byte) - CRITICAL for WiFi scan
      try {
        const mtu = await this.device.requestMTU(512);
        console.log("[BLE] MTU negotiated:", mtu);
      } catch (e) {
        console.log("[BLE] MTU negotiation failed:", e.message);
        // Continue anyway, will try with default MTU
      }

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
    // DO NOT call .remove() on any subscription!
    // react-native-ble-plx cancelTransaction triggers native
    // PromiseImpl.reject(null, ...) → NullPointerException → app crash.
    // Just null the references and let BLE disconnect handle cleanup.
    if (this.statusSubscription) {
      this.statusSubscription = null;
    }
    if (this.resultSubscription) {
      this.resultSubscription = null;
    }
    if (this.disconnectSubscription) {
      this.disconnectSubscription = null;
    }
    if (this.wifiStatusSubscription) {
      this.wifiStatusSubscription = null;
    }
    if (this.wifiScanSubscription) {
      this.wifiScanSubscription = null;
    }
    console.log("[BLE] Subscriptions nulled (no remove to avoid native crash)");
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
  // 4. SUBSCRIPTIONS (Status & Result notifications)
  // ══════════════════════════════════════════════════════════════

  async subscribeToNotifications(onStatus, onResult) {
    if (!this.device) throw new Error("NOT_CONNECTED");

    try {
      // Status subscription
      this.statusSubscription = this.device.monitorCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.STATUS,
        (error, characteristic) => {
          if (error) {
            console.error("[BLE] Status notification error:", error.message);
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
            console.error("[BLE] Result notification error:", error.message);
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
  // 7. WIFI PROVISIONING & SCAN (Phase 3 + Phase 4)
  // ══════════════════════════════════════════════════════════════

  /**
   * WiFi scan - v3.1 HARDENED
   * - writeWithoutResponse (non-blocking)
   * - monitor first
   * - single base64 decode
   * - robust JSON detection (accepts "[]")
   * - re-entrancy guard
   * - proper subscription tracking (this.wifiScanSubscription)
   * - optional read fallback
   */
  async scanWifiNetworks() {
    if (!this.device) {
      throw new Error("Device not connected");
    }

    // ── Re-entrancy guard ──
    if (this._wifiScanInFlight) {
      throw new Error("WIFI_SCAN_IN_FLIGHT");
    }
    this._wifiScanInFlight = true;

    const WIFI_SCAN_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26ad";
    const NOTIFY_TIMEOUT_MS = 10000; // 10s for notify
    const SUBSCRIBE_SETTLE_MS = 250; // monitor settle delay (small)
    const READ_RETRY_DELAY_MS = 2000;

    try {
      console.log("[BLE] === WiFi scan v3.1 starting ===");

      const isConnected = await this.device.isConnected();
      if (!isConnected) {
        throw new Error("BLE connection lost");
      }

      // Reset buffer
      wifiBuffer.current = "";

      return await new Promise((resolve, reject) => {
        let done = false;
        let notifyTimeout = null;

        const cleanup = () => {
          if (notifyTimeout) {
            clearTimeout(notifyTimeout);
            notifyTimeout = null;
          }
          // DO NOT call this.wifiScanSubscription.remove() here!
          // react-native-ble-plx native cancelTransaction triggers
          // PromiseImpl.reject(null, ...) → NullPointerException → app crash.
          // Instead, rely on the `done` flag to ignore further callbacks,
          // and let the subscription die naturally when BLE disconnects.
          this.wifiScanSubscription = null;
        };

        const finish = (result, error) => {
          if (done) return;
          done = true;
          cleanup();
          if (error) reject(error);
          else resolve(result);
        };

        const normalizeNetworks = (parsed) => {
          const networks = Array.isArray(parsed)
            ? parsed
            : parsed?.networks || [];
          return networks.map((net) => ({
            ssid: net?.ssid || "",
            rssi: typeof net?.rssi === "number" ? net.rssi : -100,
            secure:
              net?.secure !== undefined
                ? !!net.secure
                : net?.encryption !== undefined
                  ? net.encryption !== 0
                  : true,
            channel: typeof net?.channel === "number" ? net.channel : 0,
          }));
        };

        const tryParseBuffer = () => {
          const buf = (wifiBuffer.current || "").trim();

          // Must look like JSON to attempt parse
          const looksJson = buf.startsWith("[") || buf.startsWith("{");
          if (!looksJson) return null;

          try {
            const parsed = JSON.parse(buf);
            return parsed;
          } catch {
            return null; // incomplete or invalid
          }
        };

        // ── STEP 1: Start monitor FIRST ──
        console.log("[BLE] Step 1: Starting notify monitor...");
        this.wifiScanSubscription = this.device.monitorCharacteristicForService(
          BLE_CONFIG.SERVICE_UUID,
          WIFI_SCAN_UUID,
          (error, characteristic) => {
            if (done) return;

            if (error) {
              console.error("[BLE] WiFi scan monitor error:", error.message);
              // Don't finish here; let timeout + read fallback handle it.
              return;
            }

            if (!characteristic?.value) return;

            // Decode base64 → utf8 ONCE
            const decoded = Buffer.from(
              characteristic.value,
              "base64"
            ).toString("utf8");

            // Some stacks may emit non-UTF8 / empty / ACK-like frames; ignore non-JSON
            // IMPORTANT: don't length-filter; "[]" is valid.
            const decodedTrim = decoded.trim();
            const looksJson =
              decodedTrim.startsWith("[") || decodedTrim.startsWith("{");
            if (!looksJson) {
              console.log(
                "[BLE] Non-JSON notify frame ignored. len:",
                decodedTrim.length
              );
              return;
            }

            // Accumulate raw decoded (not trimmed) to reduce risk of breaking chunks
            wifiBuffer.current += decoded;

            const parsed = tryParseBuffer();
            if (parsed === null) {
              console.log(
                "[BLE] JSON not complete yet, buffered:",
                wifiBuffer.current.length,
                "chars"
              );
              return;
            }

            // Parsed OK
            wifiBuffer.current = "";
            const normalized = normalizeNetworks(parsed);

            console.log(
              "[BLE] Parsed",
              normalized.length,
              "WiFi networks from notify"
            );

            // Accept empty list too (valid outcome)
            finish(normalized);
          }
        );

        // ── STEP 2: Notify timeout → read fallback ──
        notifyTimeout = setTimeout(async () => {
          if (done) return;

          console.log(
            "[BLE] Notify timeout after",
            NOTIFY_TIMEOUT_MS,
            "ms, trying direct read..."
          );

          try {
            // Read fallback only works if characteristic has READ property.
            const ch = await this.device.readCharacteristicForService(
              BLE_CONFIG.SERVICE_UUID,
              WIFI_SCAN_UUID
            );

            if (!ch?.value) {
              finish(
                null,
                new Error("WiFi scan: read empty (no notify received)")
              );
              return;
            }

            const jsonString = Buffer.from(ch.value, "base64")
              .toString("utf8")
              .trim();
            console.log("[BLE] Read fallback length:", jsonString.length);
            console.log("[BLE] Read preview:", jsonString.substring(0, 120));

            const looksJson =
              jsonString.startsWith("[") || jsonString.startsWith("{");
            if (!looksJson) {
              console.log(
                "[BLE] Read fallback not JSON, retrying in",
                READ_RETRY_DELAY_MS,
                "ms..."
              );
              await new Promise((r) => setTimeout(r, READ_RETRY_DELAY_MS));

              const retry = await this.device.readCharacteristicForService(
                BLE_CONFIG.SERVICE_UUID,
                WIFI_SCAN_UUID
              );

              if (retry?.value) {
                const retryStr = Buffer.from(retry.value, "base64")
                  .toString("utf8")
                  .trim();
                const retryLooksJson =
                  retryStr.startsWith("[") || retryStr.startsWith("{");
                if (retryLooksJson) {
                  const parsed = JSON.parse(retryStr);
                  const normalized = normalizeNetworks(parsed);
                  console.log(
                    "[BLE] Parsed",
                    normalized.length,
                    "WiFi networks from retry read"
                  );
                  finish(normalized);
                  return;
                }
              }

              finish(
                null,
                new Error("WiFi scan: no valid JSON received (notify+read)")
              );
              return;
            }

            const parsed = JSON.parse(jsonString);
            const normalized = normalizeNetworks(parsed);
            console.log(
              "[BLE] Parsed",
              normalized.length,
              "WiFi networks from read fallback"
            );
            finish(normalized);
          } catch (e) {
            // If READ is not supported, this is expected; provide a clearer error.
            console.error("[BLE] Read fallback failed:", e.message);
            finish(
              null,
              new Error(
                `WiFi scan: notify timeout and read fallback failed (${e.message}). ` +
                  `Ensure characteristic has NOTIFY and optionally READ.`
              )
            );
          }
        }, NOTIFY_TIMEOUT_MS);

        // ── STEP 3: Send SCAN command ──
        // Try writeWithoutResponse first (needs WRITE_NR on ESP32).
        // If it fails, fall back to writeWithResponse but fire-and-forget
        // (don't await) so it doesn't block the monitor callback.
        setTimeout(async () => {
          if (done) return;
          const command = Buffer.from("SCAN", "utf8").toString("base64");

          // Attempt 1: writeWithoutResponse (non-blocking, ideal)
          try {
            console.log(
              "[BLE] Step 3: Sending SCAN command (writeWithoutResponse)..."
            );
            await this.device.writeCharacteristicWithoutResponseForService(
              BLE_CONFIG.SERVICE_UUID,
              WIFI_SCAN_UUID,
              command
            );
            console.log(
              "[BLE] SCAN command sent (without response), waiting for notify..."
            );
            return; // Success, wait for notify
          } catch (e1) {
            console.log(
              "[BLE] writeWithoutResponse failed:",
              e1.message,
              "- trying writeWithResponse..."
            );
          }

          // Attempt 2: writeWithResponse (fire-and-forget, don't block monitor)
          // This will block until ESP32 finishes WiFi.scanNetworks() (~3-4s)
          // but monitor callback runs on a separate event, so notify should still arrive.
          this.device
            .writeCharacteristicWithResponseForService(
              BLE_CONFIG.SERVICE_UUID,
              WIFI_SCAN_UUID,
              command
            )
            .then(() =>
              console.log(
                "[BLE] SCAN command sent (with response), notify should follow..."
              )
            )
            .catch((e2) =>
              console.error(
                "[BLE] SCAN writeWithResponse also failed:",
                e2.message
              )
            );
          // NOTE: Not awaited! Monitor callback should catch the notify.
        }, SUBSCRIBE_SETTLE_MS);
      });
    } catch (error) {
      console.error("[BLE] WiFi scan error:", error.message);
      throw error;
    } finally {
      // release guard
      this._wifiScanInFlight = false;
    }
  }

  /**
   * WiFi credentials'ı ESP32'ye gönder (Phase 4 - WiFiPassword için)
   * Payload: JSON {"ssid":"xxx","password":"yyy"}
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
   */
  subscribeToWifiStatus(onStatus) {
    if (!this.device) throw new Error("NOT_CONNECTED");

    if (!BLE_CONFIG.CHARACTERISTICS.WIFI_STATUS) {
      throw new Error("WIFI_STATUS_UUID_NOT_DEFINED");
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      const timeoutMs = BLE_CONFIG.TIMEOUTS?.WIFI_CONNECT || 30000;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanupWifiSubscription();
          reject(new Error("WIFI_TIMEOUT"));
        }
      }, timeoutMs);

      console.log("[BLE] Subscribing to WiFi status...");

      this.wifiStatusSubscription = this.device.monitorCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.WIFI_STATUS,
        (error, characteristic) => {
          if (resolved) return;

          if (error) {
            console.error("[BLE] WiFi status monitor error:", error.message);
            return;
          }

          if (characteristic?.value) {
            const status = Buffer.from(characteristic.value, "base64")
              .toString("utf8")
              .trim();
            console.log("[BLE] WiFi status received:", status);

            onStatus?.(status);

            if (status === "OK") {
              resolved = true;
              clearTimeout(timeout);
              this.cleanupWifiSubscription();
              console.log("[BLE] OK received, disconnecting...");
              this.disconnect()
                .then(() => {
                  console.log("[BLE] Disconnect complete");
                  resolve("OK");
                })
                .catch((e) => {
                  console.log("[BLE] Disconnect error (normal):", e.message);
                  resolve("OK");
                });
            } else if (status.startsWith("ERR_")) {
              resolved = true;
              clearTimeout(timeout);
              this.cleanupWifiSubscription();
              resolve(status);
            }
          }
        }
      );
    });
  }

  cleanupWifiSubscription() {
    if (this.wifiStatusSubscription) {
      // No .remove() - native cancelTransaction causes crash
      this.wifiStatusSubscription = null;
      console.log("[BLE] WiFi subscription cleaned up (no remove)");
    }
  }

  /**
   * Tam WiFi provisioning akışı
   */
  async provisionWifi(ssid, password, onProgress) {
    try {
      onProgress?.("sending", "WiFi bilgileri gönderiliyor...");
      await this.writeWifiCredentials(ssid, password);

      await new Promise((resolve) => setTimeout(resolve, 500));

      onProgress?.("connecting", "ESP32 WiFi'ye bağlanıyor...");
      const result = await this.subscribeToWifiStatus((status) => {
        if (status === "CONNECTING") {
          onProgress?.("status", "Bağlantı kuruluyor...");
        }
      });

      if (result === "OK") {
        onProgress?.("success", "WiFi bağlantısı başarılı!");
        return { success: true };
      } else {
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

      let message = error.message;
      if (error.message === "WIFI_TIMEOUT") {
        message = "WiFi bağlantısı zaman aşımına uğradı";
      } else if (error.message === "INVALID_SSID") {
        message = "Geçersiz WiFi ağ adı";
      } else if (error.message === "INVALID_PASSWORD") {
        message = "Şifre en az 8 karakter olmalı";
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
