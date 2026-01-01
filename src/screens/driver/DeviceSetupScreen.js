// src/screens/driver/DeviceSetupScreen.js
// TulipFleet Device Setup - FAZ 4 BLE Activation
// Created: 01 Ocak 2026
// Updated: 02 Ocak 2026 - Smart Gate (Koşullu Atla)

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BLE_CONFIG,
  BLE_RESULT,
  BLE_STATUS,
  COLORS,
} from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { deviceAPI, driverAPI } from "../../services/api";
import { bleService } from "../../services/bleService";

// Storage Keys
const STORAGE_KEYS = {
  PROVISIONED_SERIAL: "tulipfleet_provisioned_serial",
  PROVISIONED_DRIVER: "tulipfleet_provisioned_driver",
  PROVISIONED_VEHICLE: "tulipfleet_provisioned_vehicle",
  PROVISIONED_AT: "tulipfleet_provisioned_at",
};

// ══════════════════════════════════════════════════════════════
// STEPS
// ══════════════════════════════════════════════════════════════

const STEPS = {
  QR_SCAN: "qr_scan",
  BLE_SCAN: "ble_scan",
  CONNECTING: "connecting",
  ACTIVATING: "activating",
  SUCCESS: "success",
  ERROR: "error",
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function DeviceSetupScreen({ navigation }) {
  // Auth context
  const { user } = useAuth();

  // State
  const [step, setStep] = useState(STEPS.QR_SCAN);
  const [serial, setSerial] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [bleInitialized, setBleInitialized] = useState(false);

  // Smart Gate state
  const [gateChecking, setGateChecking] = useState(true);
  const [skipReason, setSkipReason] = useState(null);

  // Manuel giriş için
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualSerial, setManualSerial] = useState("");

  // ⚠️ CRITICAL: useRef ile closure bug fix
  const devicesRef = useRef([]);
  const scanCleanupRef = useRef(null);
  const resultReceivedRef = useRef(false);

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // ════════════════════════════════════════════════════════════
  // SMART GATE: Koşullu Atlama Kontrolü
  // ════════════════════════════════════════════════════════════

  useEffect(() => {
    checkSmartGate();
  }, []);

  const checkSmartGate = async () => {
    try {
      console.log("[SmartGate] Checking conditions...");

      // ════════════════════════════════════════════════════════════
      // ÖNCELİKLİ: Backend'den cihaz durumu kontrolü
      // Eğer driver'ın aracında aktif cihaz varsa → kurulumu atla!
      // ════════════════════════════════════════════════════════════
      try {
        console.log("[SmartGate] Checking vehicle device status...");
        const response = await driverAPI.getVehicle();
        const vehicle = response?.vehicle || response; // API formatına göre

        console.log("[SmartGate] Vehicle:", JSON.stringify(vehicle));

        // ESP32 bağlı ve aktif mi?
        const esp32Status = vehicle?.esp32Status;
        const isDeviceActive = esp32Status?.connected && esp32Status?.deviceId;

        if (isDeviceActive) {
          console.log(
            "[SmartGate] ✅ Device already active:",
            esp32Status.deviceId
          );
          setGateChecking(false);

          Alert.alert(
            "Cihaz Zaten Aktif ✅",
            `Aracınıza bağlı cihaz aktif durumda.\n\nCihaz: ${
              esp32Status.deviceId
            }\nPlaka: ${vehicle?.plate || "-"}`,
            [{ text: "Tamam", onPress: () => navigation.goBack() }]
          );
          return;
        }
      } catch (e) {
        console.log("[SmartGate] Vehicle check error (continuing):", e.message);
        // Hata olursa devam et, normal akışa geç
      }

      // ════════════════════════════════════════════════════════════
      // SECONDARY: WiFi + Storage kontrolü (önceki mantık)
      // ════════════════════════════════════════════════════════════

      // 1. WiFi kontrolü
      const netState = await NetInfo.fetch();
      const hasWifi = netState.isConnected && netState.type === "wifi";
      console.log("[SmartGate] WiFi:", hasWifi);

      if (!hasWifi) {
        console.log("[SmartGate] No WiFi, showing normal flow");
        setGateChecking(false);
        return;
      }

      // 2. Daha önce provision edilmiş mi?
      const storedSerial = await AsyncStorage.getItem(
        STORAGE_KEYS.PROVISIONED_SERIAL
      );
      const storedDriver = await AsyncStorage.getItem(
        STORAGE_KEYS.PROVISIONED_DRIVER
      );
      const storedVehicle = await AsyncStorage.getItem(
        STORAGE_KEYS.PROVISIONED_VEHICLE
      );

      console.log("[SmartGate] Stored:", {
        storedSerial,
        storedDriver,
        storedVehicle,
      });

      if (!storedSerial) {
        console.log("[SmartGate] No stored serial, showing normal flow");
        setGateChecking(false);
        return;
      }

      // 3. Aynı driver mı?
      const currentDriverEmail = user?.email;
      if (storedDriver !== currentDriverEmail) {
        console.log("[SmartGate] Different driver, showing normal flow");
        setGateChecking(false);
        return;
      }

      // 4. Aynı araç mı? (API'den kontrol)
      try {
        const response = await driverAPI.getVehicle();
        const vehicle = response?.vehicle || response;
        const currentVehicleId = vehicle?.id?.toString();

        if (storedVehicle !== currentVehicleId) {
          console.log("[SmartGate] Different vehicle, showing normal flow");
          setGateChecking(false);
          return;
        }
      } catch (e) {
        console.log("[SmartGate] Vehicle check failed, showing normal flow");
        setGateChecking(false);
        return;
      }

      // ✅ Tüm koşullar sağlandı - Serial ile direkt BLE Scan'e geç
      console.log(
        "[SmartGate] ✅ All conditions met, skipping to BLE scan with serial:",
        storedSerial
      );
      setSerial(storedSerial);
      setSkipReason(
        "Daha önce kurulum yapıldı, direkt bağlantıya geçiliyor..."
      );
      setGateChecking(false);

      // Kısa bir gecikme sonra BLE Scan'e geç
      setTimeout(() => {
        setStep(STEPS.BLE_SCAN);
        startBLEScan();
      }, 1500);
    } catch (e) {
      console.error("[SmartGate] Error:", e);
      setGateChecking(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // SAVE PROVISION DATA (Success sonrası)
  // ════════════════════════════════════════════════════════════

  const saveProvisionData = async (provisionedSerial) => {
    try {
      const response = await driverAPI.getVehicle();
      const vehicle = response?.vehicle || response;
      const vehicleId = vehicle?.id?.toString() || "";

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.PROVISIONED_SERIAL, provisionedSerial],
        [STORAGE_KEYS.PROVISIONED_DRIVER, user?.email || ""],
        [STORAGE_KEYS.PROVISIONED_VEHICLE, vehicleId],
        [STORAGE_KEYS.PROVISIONED_AT, new Date().toISOString()],
      ]);

      console.log("[SmartGate] ✅ Provision data saved");
    } catch (e) {
      console.error("[SmartGate] Failed to save provision data:", e);
    }
  };

  // ════════════════════════════════════════════════════════════
  // INITIALIZE
  // ════════════════════════════════════════════════════════════

  useEffect(() => {
    initializeBLE();

    return () => {
      console.log("[Setup] Cleanup");
      scanCleanupRef.current?.();
      bleService.destroy();
    };
  }, []);

  const initializeBLE = async () => {
    try {
      await bleService.initialize();
      setBleInitialized(true);

      // Disconnect callback
      bleService.onDisconnect((error) => {
        console.log("[Setup] BLE Disconnected");
        if (
          !resultReceivedRef.current &&
          (step === STEPS.CONNECTING || step === STEPS.ACTIVATING)
        ) {
          setError("Bağlantı koptu: " + (error?.message || "Bilinmeyen hata"));
          setStep(STEPS.ERROR);
        }
      });

      // State change callback
      bleService.onStateChange((state) => {
        console.log("[Setup] BLE State:", state);
        if (state === "PoweredOff") {
          Alert.alert(
            "Bluetooth Kapalı",
            "Cihaz kurulumu için Bluetooth'u açın",
            [
              { text: "Ayarlar", onPress: openSettings },
              { text: "İptal", style: "cancel" },
            ]
          );
        }
      });
    } catch (e) {
      console.error("[Setup] BLE init error:", e.message);
      handleBLEError(e);
    }
  };

  const handleBLEError = (e) => {
    const errorMessages = {
      BLUETOOTH_OFF: {
        title: "Bluetooth Kapalı",
        message: "Cihaz kurulumu için Bluetooth'u açın",
        showSettings: true,
      },
      BLUETOOTH_UNAUTHORIZED: {
        title: "Bluetooth İzni Gerekli",
        message: "Ayarlardan Bluetooth iznini verin",
        showSettings: true,
      },
      BLUETOOTH_UNSUPPORTED: {
        title: "Bluetooth Desteklenmiyor",
        message: "Bu cihaz Bluetooth Low Energy desteklemiyor",
        showSettings: false,
      },
      PERMISSIONS_DENIED: {
        title: "İzin Gerekli",
        message: "Bluetooth ve konum izinlerini verin",
        showSettings: true,
      },
      LOCATION_PERMISSION_DENIED: {
        title: "Konum İzni Gerekli",
        message: "Bluetooth taraması için konum izni gerekli",
        showSettings: true,
      },
    };

    const errorInfo = errorMessages[e.message] || {
      title: "Bluetooth Hatası",
      message: e.message,
      showSettings: false,
    };

    Alert.alert(
      errorInfo.title,
      errorInfo.message,
      errorInfo.showSettings
        ? [
            { text: "Ayarlar", onPress: openSettings },
            { text: "İptal", style: "cancel" },
          ]
        : [{ text: "Tamam" }]
    );
  };

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("App-Prefs:Bluetooth");
    } else {
      Linking.openSettings();
    }
  };

  // ════════════════════════════════════════════════════════════
  // QR SCAN
  // ════════════════════════════════════════════════════════════

  const handleBarCodeScanned = useCallback(
    async ({ data }) => {
      if (scanned) return;
      setScanned(true);

      console.log("[Setup] QR Scanned:", data);

      // QR format: TF-2025-XXXXX-X veya TF-XXXX-XXXXX-X
      const serialRegex = /^TF-\d{4}-\d{5}-[A-Z0-9]$/;

      if (!serialRegex.test(data)) {
        Alert.alert(
          "Geçersiz QR Kod",
          "QR kod formatı tanınmadı. Lütfen cihaz üzerindeki QR kodu okutun.",
          [{ text: "Tamam", onPress: () => setScanned(false) }]
        );
        return;
      }

      setSerial(data);
      setStatus("Serial doğrulanıyor...");

      // Opsiyonel: Backend'de serial var mı kontrol et
      try {
        const validation = await deviceAPI.validateSerial(data);

        if (!validation.valid && !validation.skipValidation) {
          setError(validation.message || "Bu serial sistemde kayıtlı değil");
          setStep(STEPS.ERROR);
          return;
        }
      } catch (e) {
        console.log("[Setup] Validation skipped:", e.message);
        // Validation başarısız olsa bile devam et
      }

      // BLE initialized kontrolü
      if (!bleInitialized) {
        Alert.alert(
          "Bluetooth Hazır Değil",
          "Bluetooth başlatılırken bekleyin...",
          [{ text: "Tamam", onPress: () => setScanned(false) }]
        );
        return;
      }

      // Sonraki adım: BLE tarama
      setStep(STEPS.BLE_SCAN);
      startBLEScan();
    },
    [scanned, bleInitialized]
  );

  // ════════════════════════════════════════════════════════════
  // MANUEL SERIAL GİRİŞİ
  // ════════════════════════════════════════════════════════════

  const handleManualSerialSubmit = async () => {
    const data = manualSerial.trim().toUpperCase();

    console.log("[Setup] Manual Serial:", data);

    // QR format: TF-2025-XXXXX-X veya TF-XXXX-XXXXX-X
    const serialRegex = /^TF-\d{4}-\d{5}-[A-Z0-9]$/;

    if (!serialRegex.test(data)) {
      Alert.alert(
        "Geçersiz Serial",
        "Serial formatı hatalı. Örnek: TF-2025-00008-5",
        [{ text: "Tamam" }]
      );
      return;
    }

    setShowManualInput(false);
    setSerial(data);
    setStatus("Serial doğrulanıyor...");

    // Opsiyonel: Backend'de serial var mı kontrol et
    try {
      const validation = await deviceAPI.validateSerial(data);

      if (!validation.valid && !validation.skipValidation) {
        setError(validation.message || "Bu serial sistemde kayıtlı değil");
        setStep(STEPS.ERROR);
        return;
      }
    } catch (e) {
      console.log("[Setup] Validation skipped:", e.message);
      // Validation başarısız olsa bile devam et
    }

    // BLE initialized kontrolü
    if (!bleInitialized) {
      Alert.alert(
        "Bluetooth Hazır Değil",
        "Bluetooth başlatılırken bekleyin..."
      );
      return;
    }

    // Sonraki adım: BLE tarama
    setStep(STEPS.BLE_SCAN);
    startBLEScan();
  };

  // ════════════════════════════════════════════════════════════
  // BLE SCAN (Closure Bug Fixed)
  // ════════════════════════════════════════════════════════════

  const startBLEScan = () => {
    console.log("[Setup] Starting BLE scan...");
    setDevices([]);
    devicesRef.current = [];
    setStatus("Cihazlar aranıyor...");

    scanCleanupRef.current = bleService.startScan(
      // onDeviceFound
      (device) => {
        // useRef ile güncel listeye eriş (closure bug fix)
        if (!devicesRef.current.find((d) => d.id === device.id)) {
          devicesRef.current = [...devicesRef.current, device];
          setDevices([...devicesRef.current]);
        }
      },
      // onError
      (error) => {
        console.error("[Setup] Scan error:", error.message);
        setError("Tarama hatası: " + error.message);
        setStep(STEPS.ERROR);
      },
      // onTimeout
      () => {
        if (devicesRef.current.length === 0) {
          setStatus(
            "Cihaz bulunamadı.\n\nCihazın açık ve yakında olduğundan emin olun."
          );
        } else {
          setStatus(`${devicesRef.current.length} cihaz bulundu`);
        }
      }
    );
  };

  const stopAndRescan = () => {
    console.log("[Setup] Rescan requested");
    scanCleanupRef.current?.();
    startBLEScan();
  };

  // ════════════════════════════════════════════════════════════
  // CONNECT & ACTIVATE
  // ════════════════════════════════════════════════════════════

  const handleDeviceSelect = async (device) => {
    console.log("[Setup] Device selected:", device.name);
    scanCleanupRef.current?.();
    setSelectedDevice(device);
    setStep(STEPS.CONNECTING);
    setStatus("Bağlanıyor...");
    resultReceivedRef.current = false;

    try {
      // 1. Connect
      await bleService.connect(device.id);
      setStatus("Bağlandı, hazırlanıyor...");

      // 2. Subscribe ÖNCE (kritik!)
      await bleService.subscribeToNotifications(
        // onStatus
        (value) => {
          console.log("[Setup] Status update:", value);
          setStatus(getStatusText(value));
        },
        // onResult
        (value) => {
          console.log("[Setup] Result received:", value);
          handleActivationResult(value);
        }
      );

      // 3. Write Serial
      setStep(STEPS.ACTIVATING);
      setStatus("Serial gönderiliyor...");

      await bleService.writeSerial(serial);
      setStatus(
        "ESP32 işlem yapıyor...\n\nBu işlem 30 saniye kadar sürebilir."
      );

      // 4. Timeout - 30 saniye içinde sonuç gelmezse
      setTimeout(() => {
        if (!resultReceivedRef.current && step === STEPS.ACTIVATING) {
          console.log("[Setup] Response timeout");
          // Sonucu manuel kontrol et
          checkResultManually();
        }
      }, BLE_CONFIG.TIMEOUTS.RESPONSE);
    } catch (error) {
      console.error("[Setup] Connection/Write error:", error.message);
      setError("İşlem hatası: " + error.message);
      setStep(STEPS.ERROR);
    }
  };

  const checkResultManually = async () => {
    try {
      const result = await bleService.readResult();
      if (result && result !== "PENDING" && result !== "IDLE") {
        handleActivationResult(result);
      } else {
        setError("Zaman aşımı: ESP32'den yanıt alınamadı");
        setStep(STEPS.ERROR);
      }
    } catch (e) {
      setError("Zaman aşımı: ESP32'den yanıt alınamadı");
      setStep(STEPS.ERROR);
    }
  };

  const handleActivationResult = async (result) => {
    if (resultReceivedRef.current) return; // Duplicate prevention
    resultReceivedRef.current = true;

    console.log("[Setup] Processing result:", result);

    if (result === BLE_RESULT.SUCCESS || result === "SUCCESS") {
      setStatus("ESP32 başarılı, backend doğrulanıyor...");

      // ═══════════════════════════════════════════════════════════
      // FAZ 4 KRİTİK: Mobil JWT ile backend'i de çağır (idempotent)
      // ESP32 zaten çağırmış olabilir, bu çağrı doğrulama amaçlı
      // ═══════════════════════════════════════════════════════════
      try {
        console.log("[Setup] Calling backend with JWT for serial:", serial);
        const apiResult = await deviceAPI.activate(serial);

        if (apiResult.success) {
          console.log("[Setup] Backend activation confirmed:", apiResult.data);
          setStep(STEPS.SUCCESS);
          setStatus("Cihaz başarıyla aktive edildi!");
          // ✅ Smart Gate için kaydet
          await saveProvisionData(serial);
        } else {
          // Backend hatası - ama ESP32 başarılı demişti
          // Muhtemelen zaten aktive (409) - bu OK
          if (
            apiResult.statusCode === 409 ||
            apiResult.error === "ESP_ALREADY_BOUND"
          ) {
            console.log("[Setup] Device already activated (expected)");
            setStep(STEPS.SUCCESS);
            setStatus("Cihaz aktive edildi!");
            // ✅ Smart Gate için kaydet
            await saveProvisionData(serial);
          } else {
            // Gerçek bir hata
            console.error("[Setup] Backend error:", apiResult);
            setError("Backend doğrulama hatası: " + apiResult.message);
            setStep(STEPS.ERROR);
          }
        }
      } catch (apiError) {
        // Network hatası - ESP32 başarılı olduğu için yine de SUCCESS sayabiliriz
        console.error("[Setup] Backend call failed:", apiError);
        // ESP32 zaten başarılı, backend'e ulaşamadık ama cihaz çalışıyor
        setStep(STEPS.SUCCESS);
        setStatus(
          "Cihaz aktive edildi!\n(Backend doğrulaması sonra yapılacak)"
        );
        // ✅ Smart Gate için kaydet
        await saveProvisionData(serial);
      }

      // Bağlantıyı kapat
      setTimeout(async () => {
        await bleService.disconnect();
      }, 1000);
    } else if (
      result === BLE_RESULT.FAILED ||
      result === "FAILED" ||
      result.startsWith("ERROR") ||
      result === BLE_RESULT.INVALID_SERIAL ||
      result === BLE_RESULT.ALREADY_ACTIVATED ||
      result === BLE_RESULT.NETWORK_ERROR ||
      result === BLE_RESULT.SERVER_ERROR
    ) {
      setError("Aktivasyon başarısız: " + getResultText(result));
      setStep(STEPS.ERROR);
      await bleService.disconnect();
    }
  };

  // ════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════

  const getStatusText = (status) => {
    const map = {
      [BLE_STATUS.WAITING_SERIAL]: "Serial bekleniyor",
      [BLE_STATUS.SERIAL_RECEIVED]: "Serial alındı",
      [BLE_STATUS.ACTIVATING]: "Aktivasyon başlıyor...",
      [BLE_STATUS.WIFI_CONNECTING]: "WiFi bağlanıyor...",
      [BLE_STATUS.WIFI_CONNECTED]: "WiFi bağlandı",
      [BLE_STATUS.CALLING_API]: "Sunucu ile iletişim...",
      [BLE_STATUS.API_SUCCESS]: "Sunucu onayladı",
      [BLE_STATUS.API_FAILED]: "Sunucu hatası",
      [BLE_STATUS.SAVING_NVS]: "Kaydediliyor...",
      [BLE_STATUS.COMPLETE]: "Tamamlandı",
      WAITING_SERIAL: "Serial bekleniyor",
      ACTIVATING: "Aktivasyon başlıyor...",
    };
    return map[status] || status;
  };

  const getResultText = (result) => {
    const map = {
      [BLE_RESULT.INVALID_SERIAL]: "Geçersiz serial numarası",
      [BLE_RESULT.ALREADY_ACTIVATED]: "Cihaz zaten aktive edilmiş",
      [BLE_RESULT.NETWORK_ERROR]: "Ağ hatası - WiFi bağlantısını kontrol edin",
      [BLE_RESULT.SERVER_ERROR]: "Sunucu hatası",
      [BLE_RESULT.FAILED]: "İşlem başarısız",
      INVALID_SERIAL: "Geçersiz serial numarası",
      ALREADY_ACTIVATED: "Cihaz zaten aktive edilmiş",
      NETWORK_ERROR: "Ağ hatası",
      SERVER_ERROR: "Sunucu hatası",
      FAILED: "İşlem başarısız",
    };
    return map[result] || result;
  };

  const getStepTitle = (step) => {
    const titles = {
      [STEPS.QR_SCAN]: "Adım 1: QR Kod Okutun",
      [STEPS.BLE_SCAN]: "Adım 2: Cihaz Seçin",
      [STEPS.CONNECTING]: "Adım 3: Bağlanıyor",
      [STEPS.ACTIVATING]: "Adım 4: Aktivasyon",
      [STEPS.SUCCESS]: "Tamamlandı",
      [STEPS.ERROR]: "Hata",
    };
    return titles[step];
  };

  const getStepNumber = (step) => {
    const numbers = {
      [STEPS.QR_SCAN]: 1,
      [STEPS.BLE_SCAN]: 2,
      [STEPS.CONNECTING]: 3,
      [STEPS.ACTIVATING]: 4,
      [STEPS.SUCCESS]: 5,
      [STEPS.ERROR]: 0,
    };
    return numbers[step];
  };

  const handleRetry = async () => {
    console.log("[Setup] Retry requested");
    await bleService.disconnect();
    setError(null);
    setSerial(null);
    setDevices([]);
    devicesRef.current = [];
    setSelectedDevice(null);
    setStatus("");
    setScanned(false);
    resultReceivedRef.current = false;
    setStep(STEPS.QR_SCAN);
  };

  const handleDone = () => {
    navigation.goBack();
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════
  // SMART GATE: Kontrol ekranı
  // ════════════════════════════════════════════════════════════

  if (gateChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>
            Cihaz durumu kontrol ediliyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Skip reason göster (Smart Gate aktif)
  if (skipReason && step === STEPS.QR_SCAN) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.skipIcon}>🔄</Text>
          <Text style={styles.skipTitle}>Otomatik Bağlantı</Text>
          <Text style={styles.skipText}>{skipReason}</Text>
          <Text style={styles.skipSerial}>{serial}</Text>
          <ActivityIndicator
            size="small"
            color={COLORS.PRIMARY}
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Camera permission check
  if (!cameraPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionText}>
            QR kod okumak için kamera izni vermeniz gerekiyor.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.primaryButtonText}>İzin Ver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Cihaz Kurulumu</Text>
          <Text style={styles.subtitle}>{getStepTitle(step)}</Text>
        </View>
        {serial && (
          <View style={styles.serialBadge}>
            <Text style={styles.serialBadgeText}>{serial}</Text>
          </View>
        )}
      </View>

      {/* Progress */}
      {step !== STEPS.SUCCESS && step !== STEPS.ERROR && (
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((num) => (
            <View
              key={num}
              style={[
                styles.progressDot,
                getStepNumber(step) >= num && styles.progressDotActive,
                getStepNumber(step) === num && styles.progressDotCurrent,
              ]}
            />
          ))}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {step === STEPS.QR_SCAN && (
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
            </View>
            <View style={styles.hintContainer}>
              <Text style={styles.hint}>
                📱 Cihaz üzerindeki QR kodu okutun
              </Text>
            </View>

            {/* Manuel Giriş Butonu */}
            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={styles.manualEntryButtonText}>
                ⌨️ Manuel Serial Giriş
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === STEPS.BLE_SCAN && (
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderIcon}>📡</Text>
              <Text style={styles.listHeaderText}>{status}</Text>
            </View>

            {devices.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.emptyText}>
                  Bluetooth cihazları aranıyor...
                </Text>
                <Text style={styles.emptyHint}>
                  ESP32 cihazının açık ve yakında olduğundan emin olun
                </Text>
              </View>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.deviceItem}
                    onPress={() => handleDeviceSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deviceIcon}>
                      <Text style={styles.deviceIconText}>📟</Text>
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{item.name}</Text>
                      <Text style={styles.deviceId}>
                        {item.id.substring(0, 17)}...
                      </Text>
                    </View>
                    <View style={styles.rssiContainer}>
                      <Text
                        style={[
                          styles.deviceRssi,
                          item.rssi > -60
                            ? styles.rssiStrong
                            : item.rssi > -80
                            ? styles.rssiMedium
                            : styles.rssiWeak,
                        ]}
                      >
                        {item.rssi} dBm
                      </Text>
                      <Text style={styles.rssiLabel}>
                        {item.rssi > -60
                          ? "🟢 Güçlü"
                          : item.rssi > -80
                          ? "🟡 Orta"
                          : "🔴 Zayıf"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.deviceList}
              />
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={stopAndRescan}
            >
              <Text style={styles.secondaryButtonText}>🔄 Tekrar Tara</Text>
            </TouchableOpacity>
          </View>
        )}

        {(step === STEPS.CONNECTING || step === STEPS.ACTIVATING) && (
          <View style={styles.centerContainer}>
            <View style={styles.progressCircle}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.activatingDevice}>{selectedDevice?.name}</Text>
            <Text style={styles.activatingStatus}>{status}</Text>
            {step === STEPS.ACTIVATING && (
              <Text style={styles.activatingHint}>
                Lütfen bekleyin, cihaz WiFi'a bağlanıp sunucu ile iletişim
                kuruyor...
              </Text>
            )}
          </View>
        )}

        {step === STEPS.SUCCESS && (
          <View style={styles.centerContainer}>
            <View style={styles.successCircle}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.resultTitle}>Kurulum Tamamlandı!</Text>
            <Text style={styles.resultSerial}>{serial}</Text>
            <Text style={styles.resultMessage}>
              Cihaz başarıyla aktive edildi ve kullanıma hazır.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
              <Text style={styles.primaryButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === STEPS.ERROR && (
          <View style={styles.centerContainer}>
            <View style={styles.errorCircle}>
              <Text style={styles.errorIcon}>✗</Text>
            </View>
            <Text style={styles.resultTitle}>Hata Oluştu</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRetry}
            >
              <Text style={styles.primaryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={handleDone}>
              <Text style={styles.linkButtonText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Manuel Serial Giriş Modal */}
      <Modal
        visible={showManualInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowManualInput(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Serial Numarası Girin</Text>
            <Text style={styles.modalSubtitle}>Örnek: TF-2025-00008-5</Text>

            <TextInput
              style={styles.modalInput}
              value={manualSerial}
              onChangeText={setManualSerial}
              placeholder="TF-XXXX-XXXXX-X"
              placeholderTextColor="#ADB5BD"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowManualInput(false);
                  setManualSerial("");
                }}
              >
                <Text style={styles.modalCancelButtonText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleManualSerialSubmit}
              >
                <Text style={styles.modalSubmitButtonText}>Devam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.MUTED,
  },

  // Header
  header: {
    backgroundColor: COLORS.PRIMARY,
    paddingTop: Platform.OS === "ios" ? 0 : StatusBar.currentHeight,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    left: 15,
    top: Platform.OS === "ios" ? 10 : StatusBar.currentHeight + 10,
    zIndex: 10,
    padding: 5,
  },
  backButtonText: {
    fontSize: 28,
    color: COLORS.WHITE,
    fontWeight: "300",
  },
  headerContent: {
    alignItems: "center",
    paddingTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.WHITE,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 5,
  },
  serialBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 12,
  },
  serialBadgeText: {
    color: COLORS.WHITE,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Progress
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.BORDER,
    marginHorizontal: 8,
  },
  progressDotActive: {
    backgroundColor: COLORS.SUCCESS,
  },
  progressDotCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.PRIMARY,
  },

  content: {
    flex: 1,
  },

  // Camera Permission
  permissionIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.TEXT,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.MUTED,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },

  // Scanner
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: COLORS.PRIMARY,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  hintContainer: {
    backgroundColor: COLORS.WHITE,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  hint: {
    textAlign: "center",
    fontSize: 16,
    color: COLORS.TEXT,
  },

  // Device List
  listContainer: {
    flex: 1,
    padding: 20,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  listHeaderIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  listHeaderText: {
    fontSize: 15,
    color: COLORS.MUTED,
    flex: 1,
  },
  deviceList: {
    paddingBottom: 10,
  },
  deviceItem: {
    backgroundColor: COLORS.WHITE,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.SECONDARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  deviceIconText: {
    fontSize: 20,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.TEXT,
  },
  deviceId: {
    fontSize: 12,
    color: COLORS.MUTED,
    marginTop: 3,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  rssiContainer: {
    alignItems: "flex-end",
  },
  deviceRssi: {
    fontSize: 15,
    fontWeight: "600",
  },
  rssiStrong: {
    color: COLORS.SUCCESS,
  },
  rssiMedium: {
    color: COLORS.WARNING,
  },
  rssiWeak: {
    color: COLORS.DANGER,
  },
  rssiLabel: {
    fontSize: 11,
    color: COLORS.MUTED,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  emptyHint: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.MUTED,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 50,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 25,
    minWidth: 200,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.WHITE,
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 20,
    padding: 10,
  },
  linkButtonText: {
    color: COLORS.MUTED,
    fontSize: 16,
  },

  // Activating
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.SECONDARY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  activatingDevice: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.TEXT,
    marginBottom: 10,
  },
  activatingStatus: {
    fontSize: 16,
    color: COLORS.MUTED,
    textAlign: "center",
    lineHeight: 24,
  },
  activatingHint: {
    fontSize: 14,
    color: COLORS.MUTED,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 30,
    fontStyle: "italic",
  },

  // Results
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.SUCCESS,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  successIcon: {
    fontSize: 55,
    color: COLORS.WHITE,
  },
  errorCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.DANGER,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  errorIcon: {
    fontSize: 55,
    color: COLORS.WHITE,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.TEXT,
    marginBottom: 10,
  },
  resultSerial: {
    fontSize: 18,
    color: COLORS.PRIMARY,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 15,
  },
  resultMessage: {
    fontSize: 16,
    color: COLORS.MUTED,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.DANGER,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 24,
  },

  // Manuel Giriş Butonu
  manualEntryButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 25,
  },
  manualEntryButtonText: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 25,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.TEXT,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.MUTED,
    textAlign: "center",
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlign: "center",
    letterSpacing: 1,
    color: COLORS.TEXT,
    backgroundColor: "#F8F9FA",
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F1F3F4",
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.MUTED,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.WHITE,
  },

  // Smart Gate Styles
  skipIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  skipTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.TEXT,
    marginBottom: 10,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.MUTED,
    textAlign: "center",
    marginBottom: 15,
  },
  skipSerial: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.PRIMARY,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
