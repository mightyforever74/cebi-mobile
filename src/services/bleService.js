// src/services/bleService.js
// TulipFleet BLE Service - FAZ 4 Device Activation
// Created: 01 Ocak 2026

import { BleManager, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';
import { BLE_CONFIG } from '../constants/config';

class BLEService {
  constructor() {
    this.manager = null;
    this.device = null;
    this.isScanning = false;
    this.statusSubscription = null;
    this.resultSubscription = null;
    this.disconnectSubscription = null;
    this.stateSubscription = null;
    this.onDisconnectCallback = null;
    this.onStateChangeCallback = null;
  }

  // ══════════════════════════════════════════════════════════════
  // 1. LIFECYCLE + PERMISSIONS
  // ══════════════════════════════════════════════════════════════

  async initialize() {
    if (this.manager) {
      console.log('[BLE] Already initialized');
      return;
    }
    
    console.log('[BLE] Initializing...');
    this.manager = new BleManager();
    
    // State change listener
    this.stateSubscription = this.manager.onStateChange((state) => {
      console.log('[BLE] State changed:', state);
      this.onStateChangeCallback?.(state);
    }, true);
    
    // Mevcut durumu kontrol et
    const state = await this.manager.state();
    console.log('[BLE] Current state:', state);
    
    if (state !== State.PoweredOn) {
      if (state === State.PoweredOff) {
        throw new Error('BLUETOOTH_OFF');
      }
      if (state === State.Unauthorized) {
        throw new Error('BLUETOOTH_UNAUTHORIZED');
      }
      if (state === State.Unsupported) {
        throw new Error('BLUETOOTH_UNSUPPORTED');
      }
      throw new Error('BLUETOOTH_UNAVAILABLE');
    }
    
    // Android 12+ runtime permissions
    if (Platform.OS === 'android') {
      await this.requestAndroidPermissions();
    }
    
    console.log('[BLE] Initialized successfully');
  }

  async requestAndroidPermissions() {
    if (Platform.Version < 31) {
      // Android 11 ve altı için sadece lokasyon
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (locationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('LOCATION_PERMISSION_DENIED');
      }
      return;
    }

    // Android 12+ için BLE permissions
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    console.log('[BLE] Requesting Android permissions...');
    const results = await PermissionsAndroid.requestMultiple(permissions);
    
    const allGranted = Object.values(results).every(
      (result) => result === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      console.log('[BLE] Permissions denied:', results);
      throw new Error('PERMISSIONS_DENIED');
    }
    
    console.log('[BLE] All permissions granted');
  }

  destroy() {
    console.log('[BLE] Destroying...');
    this.stopScan();
    this.disconnect();
    this.stateSubscription?.remove();
    this.stateSubscription = null;
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
    console.log('[BLE] Destroyed');
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
      console.log('[BLE] Already scanning');
      return () => {};
    }
    
    if (!this.manager) {
      onError?.(new Error('BLE not initialized'));
      return () => {};
    }
    
    this.isScanning = true;
    const foundDevices = new Map();
    let useUnfiltered = false;
    let unfilteredTimeout = null;
    let mainTimeout = null;

    const scanWithFilter = (serviceUUIDs) => {
      console.log('[BLE] Scanning with filter:', serviceUUIDs ? 'Service UUID' : 'None (unfiltered)');
      
      this.manager.startDeviceScan(
        serviceUUIDs,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('[BLE] Scan error:', error.message);
            this.isScanning = false;
            onError?.(error);
            return;
          }

          if (device && this.isValidDevice(device)) {
            if (!foundDevices.has(device.id)) {
              foundDevices.set(device.id, true);
              console.log('[BLE] Found device:', device.name, 'RSSI:', device.rssi);
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
        console.log('[BLE] No devices found with filter, switching to unfiltered scan');
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
        console.log('[BLE] Scan timeout - no devices found');
        onTimeout?.();
      } else {
        console.log('[BLE] Scan complete - found', foundDevices.size, 'devices');
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
    const isValid = BLE_CONFIG.DEVICE_NAME_PREFIXES.some(prefix => 
      device.name.startsWith(prefix)
    );
    return isValid;
  }

  stopScan() {
    if (this.manager && this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      console.log('[BLE] Scan stopped');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 3. CONNECTION
  // ══════════════════════════════════════════════════════════════

  async connect(deviceId) {
    if (!this.manager) {
      throw new Error('BLE not initialized');
    }
    
    this.stopScan();
    
    // Önceki subscription'ları temizle
    this.cleanupSubscriptions();

    try {
      console.log('[BLE] Connecting to:', deviceId);
      
      this.device = await this.manager.connectToDevice(deviceId, {
        timeout: BLE_CONFIG.TIMEOUTS.CONNECT,
        autoConnect: false,
      });

      console.log('[BLE] Connected, discovering services...');
      await this.device.discoverAllServicesAndCharacteristics();

      // Service'leri kontrol et
      const services = await this.device.services();
      console.log('[BLE] Found services:', services.map(s => s.uuid));

      // Disconnect listener
      this.disconnectSubscription = this.device.onDisconnected((error, device) => {
        console.log('[BLE] Disconnected:', error?.message || 'No error');
        this.device = null;
        this.cleanupSubscriptions();
        this.onDisconnectCallback?.(error);
      });

      console.log('[BLE] Connection complete');
      return true;
    } catch (error) {
      console.error('[BLE] Connect error:', error.message);
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
          console.log('[BLE] Disconnected');
        }
      } catch (e) {
        console.log('[BLE] Disconnect error (ignored):', e.message);
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
    if (!this.device) throw new Error('NOT_CONNECTED');

    console.log('[BLE] Subscribing to notifications...');

    try {
      // Status subscription
      this.statusSubscription = this.device.monitorCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.STATUS,
        (error, characteristic) => {
          if (error) {
            console.error('[BLE] Status monitor error:', error.message);
            return;
          }
          if (characteristic?.value) {
            const value = Buffer.from(characteristic.value, 'base64').toString('utf8');
            console.log('[BLE] Status notification:', value);
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
            console.error('[BLE] Result monitor error:', error.message);
            return;
          }
          if (characteristic?.value) {
            const value = Buffer.from(characteristic.value, 'base64').toString('utf8');
            console.log('[BLE] Result notification:', value);
            onResult?.(value);
          }
        }
      );

      // Kısa bekleme (subscription'ların aktif olması için)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[BLE] Subscriptions active');
    } catch (error) {
      console.error('[BLE] Subscribe error:', error.message);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 5. WRITE SERIAL (WriteWithoutResponse + Fallback)
  // ══════════════════════════════════════════════════════════════

  async writeSerial(serial) {
    if (!this.device) throw new Error('NOT_CONNECTED');

    const base64Value = Buffer.from(serial, 'utf8').toString('base64');
    console.log('[BLE] Writing serial:', serial, '(base64:', base64Value, ')');

    // Önce writeWithoutResponse dene (daha hızlı)
    try {
      await this.device.writeCharacteristicWithoutResponseForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.SERIAL,
        base64Value
      );
      console.log('[BLE] Write (without response) success');
      return true;
    } catch (error) {
      console.log('[BLE] WriteWithoutResponse failed:', error.message);
      console.log('[BLE] Trying with response...');
    }
    
    // Fallback: writeWithResponse
    try {
      await this.device.writeCharacteristicWithResponseForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.SERIAL,
        base64Value
      );
      console.log('[BLE] Write (with response) success');
      return true;
    } catch (fallbackError) {
      console.error('[BLE] Write (with response) failed:', fallbackError.message);
      throw fallbackError;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 6. READ CURRENT VALUES
  // ══════════════════════════════════════════════════════════════

  async readStatus() {
    if (!this.device) throw new Error('NOT_CONNECTED');

    try {
      const characteristic = await this.device.readCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.STATUS
      );
      const value = Buffer.from(characteristic.value, 'base64').toString('utf8');
      console.log('[BLE] Read status:', value);
      return value;
    } catch (error) {
      console.error('[BLE] Read status error:', error.message);
      throw error;
    }
  }

  async readResult() {
    if (!this.device) throw new Error('NOT_CONNECTED');

    try {
      const characteristic = await this.device.readCharacteristicForService(
        BLE_CONFIG.SERVICE_UUID,
        BLE_CONFIG.CHARACTERISTICS.RESULT
      );
      const value = Buffer.from(characteristic.value, 'base64').toString('utf8');
      console.log('[BLE] Read result:', value);
      return value;
    } catch (error) {
      console.error('[BLE] Read result error:', error.message);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 7. UTILITY
  // ══════════════════════════════════════════════════════════════

  getState() {
    return {
      initialized: !!this.manager,
      scanning: this.isScanning,
      connected: !!this.device,
      deviceId: this.device?.id || null,
      deviceName: this.device?.name || null,
    };
  }
}

// Singleton export
export const bleService = new BLEService();
export default bleService;
