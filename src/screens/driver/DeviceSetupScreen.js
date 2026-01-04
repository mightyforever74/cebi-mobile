// src/screens/driver/DeviceSetupScreen.js
// TulipFleet Device Setup - FAZ 4 BLE Activation + WiFi Provisioning
// Created: 01 Ocak 2026
// Updated: 05 Ocak 2026 - WiFi-via-BLE Provisioning
// Fixed: 05 Ocak 2026 - 4 kritik nokta düzeltildi

import AsyncStorage from "@react-native-async-storage/async-storage";
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
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BLE_RESULT, BLE_STATUS, COLORS } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { deviceAPI, driverAPI } from "../../services/api";
import { bleService } from "../../services/bleService";

// Storage Keys
const STORAGE_KEYS = {
  PROVISIONED_SERIAL: "tulipfleet_provisioned_serial",
  PROVISIONED_DRIVER: "tulipfleet_provisioned_driver",
  PROVISIONED_VEHICLE: "tulipfleet_provisioned_vehicle",
  PROVISIONED_AT: "tulipfleet_provisioned_at",
  LAST_WIFI_SSID: "tulipfleet_last_wifi_ssid",
};

// ══════════════════════════════════════════════════════════════
// STEPS
// ══════════════════════════════════════════════════════════════

const STEPS = {
  QR_SCAN: "qr_scan",
  BLE_SCAN: "ble_scan",
  CONNECTING: "connecting",
  WIFI_FORM: "wifi_form",
  WIFI_PROVISIONING: "wifi_provisioning",
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

  // WiFi Form State
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [wifiStatus, setWifiStatus] = useState("");
  const [lastUsedSsid, setLastUsedSsid] = useState(null);

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

  // 🔧 FIX #3: Step ref for onDisconnect callback (stale closure fix)
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // ════════════════════════════════════════════════════════════
  // 🔧 FIX #1: SmartGate - Backend Truth (assigned-device API)
  // ════════════════════════════════════════════════════════════

  useEffect(() => {
    checkSmartGate();
  }, []);

  const checkSmartGate = async () => {
    try {
      console.log("[SmartGate] Checking backend truth...");

      // ════════════════════════════════════════════════════════════
      // 🔧 FIX #1: Backend'in tek kaynak olması (assigned-device)
      // Bu endpoint setup_required değerini döner
      // ════════════════════════════════════════════════════════════
      try {
        console.log("[SmartGate] Calling getAssignedDevice...");
        const response = await driverAPI.getAssignedDevice();

        console.log("[SmartGate] Response:", JSON.stringify(response));

        // setup_required === false → Kurulum gerekmiyor, geri dön
        if (response && response.setup_required === false) {
          console.log(
            "[SmartGate] ✅ setup_required=false, kurulum gerekmiyor"
          );
          setGateChecking(false);

          Alert.alert(
            "Cihaz Zaten Aktif ✅",
            `Aracınıza bağlı cihaz aktif durumda.\n\nCihaz: ${
              response.device?.serial || "-"
            }`,
            [{ text: "Tamam", onPress: () => navigation.goBack() }]
          );
          return;
        }

        // setup_required === true → Kurulum gerekiyor
        if (response && response.setup_required === true) {
          console.log("[SmartGate] ⚠️ setup_required=true, kurulum gerekiyor");

          // Eğer device.serial varsa, onu kullan (reprovision senaryosu)
          if (response.device?.serial) {
            console.log(
              "[SmartGate] Reprovision için serial:",
              response.device.serial
            );
            setSerial(response.device.serial);
            setSkipReason("Cihaz yeniden kurulum bekliyor...");
            setGateChecking(false);

            // 🔧 FIX #2: BLE init bekle
            await waitForBLEInit();

            setTimeout(() => {
              setStep(STEPS.BLE_SCAN);
              startBLEScan();
            }, 1000);
            return;
          }
        }

        // Hiç cihaz yok veya atanmamış → Normal akış
        console.log("[SmartGate] Normal akışa devam");
        setGateChecking(false);
      } catch (e) {
        console.log("[SmartGate] API error (continuing):", e.message);
        // API hatası durumunda normal akışa devam
        setGateChecking(false);
      }
    } catch (e) {
      console.error("[SmartGate] Error:", e);
      setGateChecking(false);
    }
  };

  // 🔧 FIX #2: BLE Init Race - BLE hazır olana kadar bekle
  const waitForBLEInit = async (maxWait = 5000) => {
    const startTime = Date.now();

    while (!bleInitialized && Date.now() - startTime < maxWait) {
      console.log("[SmartGate] Waiting for BLE init...");
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (!bleInitialized) {
      console.log("[SmartGate] BLE init timeout, initializing now...");
      try {
        await bleService.initialize();
        setBleInitialized(true);
      } catch (e) {
        console.error("[SmartGate] BLE init failed:", e.message);
      }
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

  // Load last used SSID
  useEffect(() => {
    const loadLastSsid = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.LAST_WIFI_SSID);
        if (saved) {
          setLastUsedSsid(saved);
          setWifiSsid(saved);
          console.log("[WiFi] Last used SSID loaded:", saved);
        }
      } catch (e) {
        console.log("[WiFi] Failed to load last SSID:", e.message);
      }
    };
    loadLastSsid();
  }, []);

  const initializeBLE = async () => {
    try {
      await bleService.initialize();
      setBleInitialized(true);

      // 🔧 FIX #3: Disconnect callback - stepRef kullan (stale closure fix)
      bleService.onDisconnect((error) => {
        console.log("[Setup] BLE Disconnected, current step:", stepRef.current);

        const currentStep = stepRef.current;
        if (
          !resultReceivedRef.current &&
          (currentStep === STEPS.CONNECTING ||
            currentStep === STEPS.ACTIVATING ||
            currentStep === STEPS.WIFI_FORM ||
            currentStep === STEPS.WIFI_PROVISIONING)
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

    try {
      const validation = await deviceAPI.validateSerial(data);

      if (!validation.valid && !validation.skipValidation) {
        setError(validation.message || "Bu serial sistemde kayıtlı değil");
        setStep(STEPS.ERROR);
        return;
      }
    } catch (e) {
      console.log("[Setup] Validation skipped:", e.message);
    }

    if (!bleInitialized) {
      Alert.alert(
        "Bluetooth Hazır Değil",
        "Bluetooth başlatılırken bekleyin..."
      );
      return;
    }

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
  // CONNECT TO DEVICE (BLE bağlantısı → WiFi Form'a geç)
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

      // 2. Subscribe to notifications
      await bleService.subscribeToNotifications(
        (value) => {
          console.log("[Setup] Status update:", value);
          setStatus(getStatusText(value));
        },
        (value) => {
          console.log("[Setup] Result received:", value);
        }
      );

      // 3. WiFi Form'a geç
      console.log("[Setup] BLE connected, showing WiFi form...");
      setStep(STEPS.WIFI_FORM);
      setStatus("WiFi bilgilerini girin");
    } catch (error) {
      console.error("[Setup] Connection error:", error.message);
      setError("Bağlantı hatası: " + error.message);
      setStep(STEPS.ERROR);
    }
  };

  // ════════════════════════════════════════════════════════════
  // WIFI PROVISIONING
  // ════════════════════════════════════════════════════════════

  const handleWifiFormSubmit = async () => {
    // Validation
    if (!wifiSsid || wifiSsid.trim().length === 0) {
      Alert.alert("Hata", "WiFi ağ adı (SSID) boş olamaz");
      return;
    }
    if (!wifiPassword || wifiPassword.length < 8) {
      Alert.alert("Hata", "WiFi şifresi en az 8 karakter olmalı");
      return;
    }

    console.log("[WiFi] Form submitted, SSID:", wifiSsid);
    setStep(STEPS.WIFI_PROVISIONING);
    setWifiStatus("WiFi bilgileri gönderiliyor...");

    try {
      // 1. Serial gönder (ESP32'nin bilmesi için)
      console.log("[WiFi] Writing serial first:", serial);
      await bleService.writeSerial(serial);

      // Kısa bekleme
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. WiFi credentials gönder
      const result = await bleService.provisionWifi(
        wifiSsid.trim(),
        wifiPassword,
        (phase, message) => {
          console.log("[WiFi] Progress:", phase, message);
          setWifiStatus(message);
        }
      );

      if (result.success) {
        console.log("[WiFi] Provisioning successful!");

        // Son kullanılan SSID'yi kaydet
        try {
          await AsyncStorage.setItem(
            STORAGE_KEYS.LAST_WIFI_SSID,
            wifiSsid.trim()
          );
        } catch (e) {
          console.log("[WiFi] Failed to save SSID:", e.message);
        }

        // Backend aktivasyona geç
        setStep(STEPS.ACTIVATING);
        setStatus("Cihaz aktive ediliyor...");
        await performActivation();
      } else {
        console.log("[WiFi] Provisioning failed:", result.error);
        setError(result.message || "WiFi bağlantısı başarısız");
        setStep(STEPS.ERROR);
      }
    } catch (e) {
      console.error("[WiFi] Exception:", e.message);
      setError("WiFi kurulumu sırasında hata: " + e.message);
      setStep(STEPS.ERROR);
    }
  };

  const handleWifiRetry = () => {
    setWifiStatus("");
    setStep(STEPS.WIFI_FORM);
  };

  const performActivation = async () => {
    try {
      console.log("[Setup] Calling backend activation for serial:", serial);
      const activationResult = await deviceAPI.activate(serial);

      if (activationResult.success) {
        console.log("[Setup] Activation successful!");
        await saveProvisionData(serial);
        setStep(STEPS.SUCCESS);
        setStatus("Cihaz başarıyla aktive edildi!");

        // Bağlantıyı kapat
        setTimeout(async () => {
          await bleService.disconnect();
        }, 1000);
      } else {
        // 409 = zaten aktive - bu OK
        if (
          activationResult.statusCode === 409 ||
          activationResult.error === "ESP_ALREADY_BOUND"
        ) {
          console.log("[Setup] Device already activated (OK)");
          await saveProvisionData(serial);
          setStep(STEPS.SUCCESS);
          setStatus("Cihaz aktive edildi!");

          setTimeout(async () => {
            await bleService.disconnect();
          }, 1000);
        } else {
          console.log("[Setup] Activation failed:", activationResult.error);
          setError(activationResult.message || "Aktivasyon başarısız");
          setStep(STEPS.ERROR);
        }
      }
    } catch (e) {
      console.error("[Setup] Activation exception:", e.message);
      // Network hatası olsa bile ESP32 WiFi'ye bağlandı, başarılı sayabiliriz
      console.log("[Setup] Network error but WiFi OK, marking success");
      await saveProvisionData(serial);
      setStep(STEPS.SUCCESS);
      setStatus("Cihaz aktive edildi!\n(Backend doğrulaması sonra yapılacak)");

      setTimeout(async () => {
        await bleService.disconnect();
      }, 1000);
    }
  };

  // ════════════════════════════════════════════════════════════
  // RETRY & DONE
  // ════════════════════════════════════════════════════════════

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
    // WiFi state temizle
    setWifiSsid(lastUsedSsid || "");
    setWifiPassword("");
    setWifiStatus("");
    setStep(STEPS.QR_SCAN);
  };

  const handleDone = () => {
    navigation.goBack();
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
      WIFI_CRED_RECEIVED: "WiFi bilgileri alındı",
      WIFI_PROVISION_OK: "WiFi bağlantısı başarılı",
      WIFI_PROVISION_FAIL: "WiFi bağlantısı başarısız",
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
      [STEPS.QR_SCAN]: "QR Kod Okutun",
      [STEPS.BLE_SCAN]: "Cihaz Aranıyor",
      [STEPS.CONNECTING]: "Bağlanıyor",
      [STEPS.WIFI_FORM]: "WiFi Ayarları",
      [STEPS.WIFI_PROVISIONING]: "WiFi Bağlantısı",
      [STEPS.ACTIVATING]: "Aktive Ediliyor",
      [STEPS.SUCCESS]: "Tamamlandı",
      [STEPS.ERROR]: "Hata",
    };
    return titles[step] || "";
  };

  const getStepNumber = (step) => {
    const numbers = {
      [STEPS.QR_SCAN]: 1,
      [STEPS.BLE_SCAN]: 2,
      [STEPS.CONNECTING]: 3,
      [STEPS.WIFI_FORM]: 4,
      [STEPS.WIFI_PROVISIONING]: 5,
      [STEPS.ACTIVATING]: 6,
      [STEPS.SUCCESS]: 7,
      [STEPS.ERROR]: 0,
    };
    return numbers[step];
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  // Smart Gate: Kontrol ekranı
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

  // Skip reason göster (Smart Gate aktif - reprovision senaryosu)
  if (skipReason && step === STEPS.QR_SCAN) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.skipIcon}>🔄</Text>
          <Text style={styles.skipTitle}>Cihaz Yeniden Kurulumu</Text>
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
          {[1, 2, 3, 4, 5, 6].map((num) => (
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
        {/* QR SCAN */}
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

        {/* BLE SCAN */}
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

        {/* CONNECTING */}
        {step === STEPS.CONNECTING && (
          <View style={styles.centerContainer}>
            <View style={styles.progressCircle}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.activatingDevice}>{selectedDevice?.name}</Text>
            <Text style={styles.activatingStatus}>{status}</Text>
          </View>
        )}

        {/* WIFI FORM */}
        {step === STEPS.WIFI_FORM && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.wifiFormContainer}
          >
            <ScrollView
              contentContainerStyle={styles.wifiFormContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.wifiIcon}>
                <Text style={{ fontSize: 50 }}>📶</Text>
              </View>

              <Text style={styles.wifiTitle}>WiFi Bağlantısı</Text>
              <Text style={styles.wifiSubtitle}>
                ESP32 cihazının bağlanacağı WiFi ağ bilgilerini girin
              </Text>

              {/* SSID Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WiFi Ağ Adı (SSID)</Text>
                <TextInput
                  style={styles.wifiInput}
                  value={wifiSsid}
                  onChangeText={setWifiSsid}
                  placeholder="Örn: Ev_WiFi"
                  placeholderTextColor="#ADB5BD"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {lastUsedSsid && lastUsedSsid !== wifiSsid && (
                  <TouchableOpacity
                    style={styles.lastSsidButton}
                    onPress={() => setWifiSsid(lastUsedSsid)}
                  >
                    <Text style={styles.lastSsidText}>
                      Son kullanılan: {lastUsedSsid}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WiFi Şifresi</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={wifiPassword}
                    onChangeText={setWifiPassword}
                    placeholder="En az 8 karakter"
                    placeholderTextColor="#ADB5BD"
                    secureTextEntry={!showWifiPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowWifiPassword(!showWifiPassword)}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {showWifiPassword ? "🙈" : "👁️"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Hint */}
              <View style={styles.wifiHintBox}>
                <Text style={styles.wifiHintText}>
                  💡 Cihaz bu WiFi ağına bağlanarak veri gönderecek. Ağın 2.4GHz
                  olduğundan emin olun (5GHz desteklenmez).
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!wifiSsid || wifiPassword.length < 8) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleWifiFormSubmit}
                disabled={!wifiSsid || wifiPassword.length < 8}
              >
                <Text style={styles.primaryButtonText}>Bağlan</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* WIFI PROVISIONING */}
        {step === STEPS.WIFI_PROVISIONING && (
          <View style={styles.centerContainer}>
            <View style={styles.progressCircle}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.wifiConnectingTitle}>📶 WiFi Bağlantısı</Text>
            <Text style={styles.wifiConnectingStatus}>{wifiStatus}</Text>
            <Text style={styles.wifiConnectingSsid}>Ağ: {wifiSsid}</Text>
            <Text style={styles.activatingHint}>
              ESP32 cihazı WiFi ağına bağlanıyor, lütfen bekleyin...
            </Text>
          </View>
        )}

        {/* ACTIVATING */}
        {step === STEPS.ACTIVATING && (
          <View style={styles.centerContainer}>
            <View style={styles.progressCircle}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.activatingDevice}>{selectedDevice?.name}</Text>
            <Text style={styles.activatingStatus}>{status}</Text>
            <Text style={styles.activatingHint}>
              Cihaz sunucu ile iletişim kuruyor...
            </Text>
          </View>
        )}

        {/* SUCCESS */}
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

        {/* ERROR */}
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
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  serialBadge: {
    position: "absolute",
    right: 15,
    top: Platform.OS === "ios" ? 15 : StatusBar.currentHeight + 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  serialBadgeText: {
    fontSize: 10,
    color: COLORS.WHITE,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Progress
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.BORDER,
    marginHorizontal: 6,
  },
  progressDotActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  progressDotCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  // Content
  content: {
    flex: 1,
  },

  // Camera/Scanner
  scannerContainer: {
    flex: 1,
    position: "relative",
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
    width: 250,
    height: 250,
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: COLORS.WHITE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  hintContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hint: {
    backgroundColor: "rgba(0,0,0,0.7)",
    color: COLORS.WHITE,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    fontSize: 15,
    overflow: "hidden",
  },

  // Permissions
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
    paddingHorizontal: 40,
    lineHeight: 24,
  },

  // Device List
  listContainer: {
    flex: 1,
    padding: 20,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  listHeaderIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  listHeaderText: {
    fontSize: 16,
    color: COLORS.MUTED,
    flex: 1,
  },
  deviceList: {
    paddingBottom: 20,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  buttonDisabled: {
    opacity: 0.5,
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

  // Activating/Progress
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

  // WiFi Form Styles
  wifiFormContainer: {
    flex: 1,
  },
  wifiFormContent: {
    padding: 20,
    alignItems: "center",
  },
  wifiIcon: {
    marginBottom: 20,
  },
  wifiTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  wifiSubtitle: {
    fontSize: 14,
    color: COLORS.MUTED,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  wifiInput: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  eyeButton: {
    padding: 14,
  },
  lastSsidButton: {
    marginTop: 8,
    padding: 8,
  },
  lastSsidText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
  },
  wifiHintBox: {
    backgroundColor: "#FFF9E6",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    width: "100%",
  },
  wifiHintText: {
    fontSize: 13,
    color: "#8B6914",
    lineHeight: 20,
  },

  // WiFi Connecting Styles
  wifiConnectingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.TEXT,
    marginBottom: 10,
  },
  wifiConnectingStatus: {
    fontSize: 16,
    color: COLORS.MUTED,
    textAlign: "center",
    marginBottom: 10,
  },
  wifiConnectingSsid: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: "600",
    marginBottom: 20,
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
