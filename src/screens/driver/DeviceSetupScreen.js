// src/screens/driver/DeviceSetupScreen.js
// TulipFleet - Device Setup (BLE + QR + WiFi Provisioning)
// FULL VERSION - Backend integrated + All states
// Updated: 23 Şubat 2026 - check-status uyarısı + activation fix

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
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

// Steps (state-machine)
const STEPS = {
  CHECKING: "CHECKING",
  QR_SCAN: "QR_SCAN",
  SERIAL_MANUAL: "SERIAL_MANUAL",
  BLE_SCAN: "BLE_SCAN",
  CONNECTING: "CONNECTING",
  WIFI_FORM: "WIFI_FORM",
  WIFI_PROVISIONING: "WIFI_PROVISIONING",
  ACTIVATING: "ACTIVATING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
};

// Helper (kept for now)
const withAlpha = (hex, alpha01) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  const a = Math.max(0, Math.min(1, alpha01));
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${alpha}`;
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },

    header: {
      paddingTop: Platform.OS === "ios" ? 52 : 18,
      paddingHorizontal: COLORS.SPACING.md,
      paddingBottom: COLORS.SPACING.md,
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.1),
      borderWidth: 1,
      borderColor: withAlpha(COLORS.PRIMARY, 0.18),
    },

    content: { padding: COLORS.SPACING.md },

    cardWrap: {
      marginBottom: COLORS.SPACING.md,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    titleRowRight: { flex: 1 },
    titleRowSpacer: { width: COLORS.SPACING.sm },

    cardTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      flex: 1,
    },
    cardSub: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      marginTop: 2,
    },

    stepPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: COLORS.SPACING.md,
    },
    pill: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: withAlpha(COLORS.MUTED, 0.12),
      borderWidth: 1,
      borderColor: withAlpha(COLORS.DIVIDER, 0.18),
      marginRight: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    pillActive: {
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.12),
      borderColor: withAlpha(COLORS.PRIMARY, 0.25),
    },
    pillText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.MUTED,
    },
    pillTextActive: { color: COLORS.PRIMARY },

    bigIcon: {
      width: COLORS.SPACING.xxxl,
      height: COLORS.SPACING.xxxl,
      borderRadius: COLORS.RADIUS.xxl,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.1),
      borderWidth: 1,
      borderColor: withAlpha(COLORS.PRIMARY, 0.18),
    },

    infoBox: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.md,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.DIVIDER, 0.18),
    },
    infoText: {
      color: COLORS.TEXT_PRIMARY,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      lineHeight: 18,
    },

    btnRow: {
      flexDirection: "row",
      marginTop: COLORS.SPACING.md,
    },
    btn: {
      flex: 1,
      height: COLORS.SPACING.buttonHeight,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    btnPrimary: { backgroundColor: COLORS.PRIMARY },
    btnMuted: { backgroundColor: withAlpha(COLORS.MUTED, 0.18) },
    btnDanger: { backgroundColor: COLORS.ERROR },
    btnText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    btnTextDark: {
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    btnIconSpacer: { width: COLORS.SPACING.sm },
    btnRight: { marginRight: COLORS.SPACING.sm },

    inputLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
    },
    input: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: COLORS.RADIUS.md,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    listItem: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.md,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.DIVIDER, 0.18),
      marginBottom: COLORS.SPACING.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    listTitle: {
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      flex: 1,
    },
    listSub: {
      color: COLORS.MUTED,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      marginTop: 2,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: withAlpha(COLORS.BLACK, 0.55),
      justifyContent: "center",
      padding: COLORS.SPACING.lg,
    },
    modalCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.modal,
      padding: COLORS.SPACING.md,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.DIVIDER, 0.22),
      ...COLORS.SHADOWS.xs,
    },
    modalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    modalText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      lineHeight: 18,
    },

    centerMt: { marginTop: COLORS.SPACING.md, alignItems: "center" },
    mtMd: { marginTop: COLORS.SPACING.md },
    bottomSpacer: { height: COLORS.SPACING.xxl },
  });

export default function DeviceSetupScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // States
  const [step, setStep] = useState(STEPS.CHECKING);
  const [busy, setBusy] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [serial, setSerial] = useState("");
  const [vehicleId, setVehicleId] = useState(null);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiStatus, setWifiStatus] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [gateChecking, setGateChecking] = useState(true);
  const [skipReason, setSkipReason] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Guided setup flag
  const isGuided = !!route.params?.serial;

  // Refs
  const devicesRef = useRef([]);
  const scanCleanupRef = useRef(null);
  const resultReceivedRef = useRef(false);
  const isMountedRef = useRef(true);
  const activationStartedRef = useRef(false);

  const stepPills = useMemo(
    () => [
      { key: STEPS.QR_SCAN, label: t("deviceSetup.steps.qrScan") },
      { key: STEPS.BLE_SCAN, label: t("deviceSetup.steps.bleScan") },
      { key: STEPS.WIFI_FORM, label: t("deviceSetup.steps.wifiForm") },
      { key: STEPS.ACTIVATING, label: t("deviceSetup.steps.activating") },
      { key: STEPS.SUCCESS, label: t("deviceSetup.steps.success") },
    ],
    [t]
  );

  // ✅ 1. Unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      console.log("[DeviceSetup] Unmounting");
    };
  }, []);

  // ✅ 2. Parametre guard
  useEffect(() => {
    const { serial, deviceInfo } = route.params || {};

    if (isGuided && !serial) {
      console.error("[DeviceSetup] ❌ Missing serial!");
      Alert.alert(t("common.error"), "Seri numarası bulunamadı.", [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
      return;
    }

    console.log("[DeviceSetup] ✅ Mounted:", { serial, isGuided });
  }, []);

  // ✅ 3. State debug
  useEffect(() => {
    console.log("[DeviceSetup] STATE:", { step, busy, isGuided });
  }, [step, busy, isGuided]);

  // Load vehicle ID
  useEffect(() => {
    const loadVehicleId = async () => {
      try {
        const response = await driverAPI.getVehicle();
        const vId = response?.vehicle?.id || response?.id;
        if (vId) {
          setVehicleId(vId);
          console.log("[DeviceSetup] Vehicle ID loaded:", vId);
        }
      } catch (e) {
        console.error("[DeviceSetup] Failed to load vehicle ID:", e.message);
      }
    };
    loadVehicleId();
  }, []);

  // BLE initialize (before SmartGate)
  useEffect(() => {
    const initBLE = async () => {
      try {
        await bleService.initialize();
        console.log("[DeviceSetup] BLE initialized");
      } catch (error) {
        console.error("[DeviceSetup] BLE init error:", error);
        setError("Bluetooth başlatılamadı: " + error.message);
      }
    };
    initBLE();
  }, []);

  // Check SmartGate
  useEffect(() => {
    checkSmartGate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("[DeviceSetup] STATE:", {
      step,
      busy,
      isGuided,
      hasSerial: !!serial,
      hasParams: !!route?.params?.serial,
    });
  }, [step, busy]);

  const checkSmartGate = async () => {
    try {
      const response = await driverAPI.getVehicle();
      const vehicle = response?.vehicle || response;

      console.log("[DeviceSetup] Vehicle Data:", {
        esp32: vehicle?.esp32_device_id,
        status: vehicle?.device_status,
      });

      if (
        vehicle?.esp32_device_id &&
        (vehicle?.device_status === "ACTIVATED" ||
          vehicle?.esp32Status?.connected)
      ) {
        setDeviceStatus({
          isActive: true,
          needsSetup: false,
          serial: vehicle.esp32_device_id,
          plate: vehicle.plate_no,
        });
        setGateChecking(false);
        setStep(STEPS.SUCCESS);
        return;
      }
    } catch (e) {
      console.log("[DeviceSetup] Vehicle check failed:", e.message);
    }

    if (isGuided) {
      console.log("[DeviceSetup] Guided mode — skipping SmartGate");
      setSerial(route.params.serial);
      setGateChecking(false);
      setStep(STEPS.BLE_SCAN);
      startBLEScan();
      return;
    }

    console.log("[DeviceSetup] Legacy mode — direct to serial input");
    setGateChecking(false);
    setStep(STEPS.SERIAL_MANUAL);
  };

  const saveProvisionData = async (deviceSerial) => {
    try {
      const response = await driverAPI.getVehicle();
      const vehicleId = response?.vehicle?.id?.toString() || "";
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.PROVISIONED_SERIAL, deviceSerial],
        [STORAGE_KEYS.PROVISIONED_VEHICLE, vehicleId],
        [STORAGE_KEYS.PROVISIONED_AT, new Date().toISOString()],
      ]);
    } catch (e) {
      console.error("[Setup] Failed to save provision data:", e);
    }
  };

  const startBLEScan = () => {
    console.log("[Setup] Starting BLE scan...");
    setDevices([]);
    devicesRef.current = [];
    setStatus("Cihazlar aranıyor...");

    scanCleanupRef.current = bleService.startScan(
      (device) => {
        if (!devicesRef.current.find((d) => d.id === device.id)) {
          devicesRef.current = [...devicesRef.current, device];
          setDevices([...devicesRef.current]);
        }
      },
      (e) => {
        console.error("[Setup] Scan error:", e.message);
        setError("Tarama hatası: " + e.message);
        setStep(STEPS.ERROR);
      },
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
    scanCleanupRef.current?.();
    startBLEScan();
  };

  // ============================================
  // BLE bağlantı devamı (handleDeviceSelect'ten ayrıldı)
  // ============================================
  const proceedWithConnection = async (device) => {
    await bleService.connect(device.id);
    setStatus("Bağlandı!");
    console.log("[DeviceSetup] ✅ BLE Connected - Bundle v2.0");

    if (isGuided) {
      console.log("[DeviceSetup] ✅ isGuided=true");
      console.log("[DeviceSetup] route.params:", route.params);

      setBusy(false);

      const { InteractionManager } = require("react-native");
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate("VehiclePickerMain", {
          serial: route.params.serial,
          deviceInfo: route.params.deviceInfo,
          deviceId: device.id,
        });
        console.log(
          "[DeviceSetup] ✅ navigation.navigate(VehiclePickerMain) called"
        );
      });

      return;
    }

    console.log("[DeviceSetup] Legacy mode, showing WiFi form");
    setStep(STEPS.WIFI_FORM);
  };

  // ============================================
  // Cihaz seçimi + aktif cihaz uyarısı
  // ============================================
  const handleDeviceSelect = async (device) => {
    if (busy) {
      console.log("[DeviceSetup] Already connecting, ignoring tap");
      return;
    }

    if (scanCleanupRef.current) {
      scanCleanupRef.current();
      scanCleanupRef.current = null;
    }

    setBusy(true);
    setSelectedDevice(device);
    setStep(STEPS.CONNECTING);
    setStatus("Bağlanıyor...");

    try {
      // === Cihaz durumu kontrol ===
      // BLE adından chip ID çıkar (TulipFleet-8B0AF6E8 → 8B0AF6E8)
      const bleChipId = device.name?.replace("TulipFleet-", "") || "";

      if (bleChipId) {
        try {
          setStatus(t("deviceSetup.checkingDeviceStatus"));
          const checkResult = await deviceAPI.checkDeviceStatus(bleChipId);

          if (
            checkResult?.registered &&
            checkResult?.device?.status === "ACTIVATED" &&
            checkResult?.device?.is_online
          ) {
            // Cihaz zaten aktif ve online — uyarı göster
            const deviceInfo = checkResult.device;
            const vehicleInfo = deviceInfo.vehicle_plate
              ? ` (${deviceInfo.vehicle_plate})`
              : "";

            setBusy(false);
            return new Promise((resolve) => {
              Alert.alert(
                t("deviceSetup.activeWarning.title"),
                t("deviceSetup.activeWarning.message", {
                  serial: deviceInfo.serial,
                  vehicle: vehicleInfo,
                }),
                [
                  {
                    text: t("deviceSetup.activeWarning.cancel"),
                    style: "cancel",
                    onPress: () => {
                      setStep(STEPS.BLE_SCAN);
                      setStatus("");
                      resolve();
                    },
                  },
                  {
                    text: t("deviceSetup.activeWarning.continue"),
                    style: "destructive",
                    onPress: async () => {
                      setBusy(true);
                      setStep(STEPS.CONNECTING);
                      setStatus(t("deviceSetup.connecting"));
                      try {
                        await proceedWithConnection(device);
                      } catch (e) {
                        console.error("[DeviceSetup] Connection error:", e);
                        setError(
                          t("deviceSetup.connectionError", { error: e.message })
                        );
                        setStep(STEPS.ERROR);
                      } finally {
                        if (!isGuided && isMountedRef.current) {
                          setBusy(false);
                        }
                      }
                      resolve();
                    },
                  },
                ]
              );
            });
          }
        } catch (checkErr) {
          // Check başarısız olursa devam et (backend erişilemez olabilir)
          console.log(
            "[DeviceSetup] Status check failed, continuing:",
            checkErr.message
          );
        }
      }
      // === Kontrol sonu ===

      await proceedWithConnection(device);
    } catch (e) {
      console.error("[DeviceSetup] Connection error:", e);
      setError("Bağlantı hatası: " + e.message);
      setStep(STEPS.ERROR);
    } finally {
      if (!isGuided && isMountedRef.current) {
        setBusy(false);
      }
    }
  };

  const handleWifiFormSubmit = async () => {
    if (!wifiSsid || wifiSsid.trim().length === 0) {
      Alert.alert(
        t("taskDetail.actions.error"),
        t("deviceSetup.wifi.emptySSID")
      );
      return;
    }
    if (!wifiPassword || wifiPassword.length < 8) {
      Alert.alert(
        t("taskDetail.actions.error"),
        t("deviceSetup.wifi.shortPassword")
      );
      return;
    }

    if (typeof bleService.provisionWifi !== "function") {
      setError("BLE servisinde WiFi provisioning fonksiyonu yok.");
      setStep(STEPS.ERROR);
      return;
    }

    setStep(STEPS.WIFI_PROVISIONING);
    setWifiStatus("WiFi bilgileri gönderiliyor...");
    activationStartedRef.current = false;

    try {
      await bleService.writeSerial(serial);
      await new Promise((r) => setTimeout(r, 500));

      const result = await bleService.provisionWifi(
        wifiSsid.trim(),
        wifiPassword,
        (_phase, msg) => {
          setWifiStatus(msg);
        }
      );

      if (!result.success) {
        setError(result.message || "WiFi bağlantısı başarısız");
        setStep(STEPS.ERROR);
        return;
      }

      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_WIFI_SSID,
          wifiSsid.trim()
        );
      } catch {}

      setStep(STEPS.ACTIVATING);
      setStatus("Cihaz aktive ediliyor...");

      try {
        await performActivation();
      } catch (activationError) {
        console.log(
          "[WiFi] Activation error (ESP32 zaten activate etti):",
          activationError.message
        );
        await saveProvisionData(serial);
        setStep(STEPS.SUCCESS);
        setStatus(t("deviceSetup.activation.successStatus"));
      } finally {
        console.log(
          "[DeviceSetup] WiFi provision complete, keeping BLE connected"
        );
      }
    } catch (e) {
      console.error("[WiFi] Exception:", e.message, e.code);

      const errorStr = (e.message || "").toLowerCase();
      const errorCode = e.code || e.errorCode || "";

      const isDisconnectError =
        errorStr.includes("disconnect") ||
        errorStr.includes("not connected") ||
        errorStr.includes("timeout") ||
        errorStr.includes("gatt") ||
        errorStr.includes("device") ||
        errorCode === "DISCONNECT" ||
        errorCode === "BLE_NOT_CONNECTED";

      if (isDisconnectError) {
        console.log("[WiFi] BLE disconnect algılandı (ESP32 restart)");
        setStep(STEPS.ACTIVATING);
        setStatus("Cihaz yeniden başlatılıyor...");
        await new Promise((r) => setTimeout(r, 3000));

        if (!activationStartedRef.current) {
          activationStartedRef.current = true;
          try {
            await performActivation();
          } catch (activationError) {
            console.log("[WiFi] Backend zaten activate etti");
            await saveProvisionData(serial);
            setStep(STEPS.SUCCESS);
            setStatus(t("deviceSetup.activation.successStatus"));
          }
        }
      } else {
        setError("WiFi kurulumu sırasında hata: " + e.message);
        setStep(STEPS.ERROR);
      }
    }
  };

  const performActivation = async () => {
    try {
      const activationResult = await deviceAPI.provisioningComplete({
        serial: serial.trim(),
      });

      if (activationResult.success) {
        await saveProvisionData(serial);
        setStep(STEPS.SUCCESS);
        setStatus(t("deviceSetup.activation.successStatus"));
        return;
      }

      if (
        activationResult.statusCode === 409 ||
        activationResult.error === "ESP_ALREADY_BOUND"
      ) {
        await saveProvisionData(serial);
        setStep(STEPS.SUCCESS);
        setStatus(t("deviceSetup.activation.successStatus"));
        return;
      }

      setError(activationResult.message || "Aktivasyon başarısız");
      setStep(STEPS.ERROR);
    } catch (e) {
      await saveProvisionData(serial);
      setStep(STEPS.SUCCESS);
      setStatus(t("deviceSetup.activation.successPending"));
    }
  };

  const handleManualSerialContinue = async () => {
    if (!serial?.trim()) {
      Alert.alert(t("common.error"), t("deviceSetup.serial.enterSerial"));
      return;
    }
    setBusy(true);
    try {
      setStep(STEPS.BLE_SCAN);
      startBLEScan();
    } catch (e) {
      setError(t("deviceSetup.serial.invalid"));
      setStep(STEPS.ERROR);
    } finally {
      setBusy(false);
    }
  };

  const rssiLabel = (rssi) => {
    if (rssi >= -55) return t("deviceSetup.ble.strong");
    if (rssi >= -75) return t("deviceSetup.ble.medium");
    return t("deviceSetup.ble.weak");
  };

  const rssiColor = (rssi) => {
    if (rssi >= -55) return COLORS.SUCCESS;
    if (rssi >= -75) return COLORS.WARNING;
    return COLORS.ERROR;
  };

  const renderStepHeader = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <View style={styles.bigIcon}>
          <Ionicons name="bluetooth" size={26} color={COLORS.PRIMARY} />
        </View>
        <View style={styles.titleRowSpacer} />
        <View style={styles.titleRowRight}>
          <Text style={styles.cardTitle}>{t("deviceSetup.title")}</Text>
          <Text style={styles.cardSub}>
            {step === STEPS.CHECKING
              ? t("deviceSetup.checkingStatus")
              : status || t("deviceSetup.loading")}
          </Text>
        </View>
      </View>
      <View style={styles.stepPills}>
        {stepPills.map((p) => {
          const active = step === p.key;
          return (
            <View
              key={p.key}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {p.label}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );

  const renderChecking = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="sync" size={20} color={COLORS.PRIMARY} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>{t("deviceSetup.checkingStatus")}</Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {skipReason || t("deviceSetup.checkingStatus")}
        </Text>
      </View>
      <View style={styles.centerMt}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    </Card>
  );

  const renderSetupNotRequired = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="checkmark-circle" size={22} color={COLORS.SUCCESS} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.setupNotRequired")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {t("deviceSetup.deviceActiveMessage", {
            serial: deviceStatus?.serial || "-",
            plate: deviceStatus?.plate || "-",
          })}
        </Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => navigation.navigate("DriverDashboard")}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.WHITE} />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnText}>{t("deviceSetup.buttons.ok")}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderManualSerial = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="key-outline" size={22} color={COLORS.PRIMARY} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.serial.enterSerial")}
        </Text>
      </View>
      <Text style={styles.cardSub}>{t("deviceSetup.serial.example")}</Text>

      <Text style={styles.inputLabel}>{t("device.serial")}</Text>
      <TextInput
        value={serial}
        onChangeText={setSerial}
        placeholder={t("deviceSetup.serial.example")}
        placeholderTextColor={COLORS.PLACEHOLDER}
        style={styles.input}
        autoCapitalize="characters"
      />

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleManualSerialContinue}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.WHITE} />
          ) : (
            <Ionicons name="arrow-forward" size={18} color={COLORS.WHITE} />
          )}
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnText}>
            {t("deviceSetup.buttons.continue")}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderBleScan = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="bluetooth-outline" size={22} color={COLORS.PRIMARY} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.ble.searchingDevices")}
        </Text>
      </View>

      {devices.length === 0 ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {status || t("deviceSetup.ble.deviceHint")}
          </Text>
        </View>
      ) : null}

      <View style={styles.mtMd}>
        {devices.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={styles.listItem}
            onPress={() => handleDeviceSelect(d)}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {d.name}
              </Text>
              <Text style={styles.listSub}>
                RSSI: {d.rssi} •{" "}
                <Text style={{ color: rssiColor(d.rssi) }}>
                  {rssiLabel(d.rssi)}
                </Text>
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.MUTED} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnMuted]}
          onPress={stopAndRescan}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={18} color={COLORS.TEXT_PRIMARY} />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnTextDark}>{t("deviceSetup.ble.rescan")}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderConnecting = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="link" size={22} color={COLORS.PRIMARY} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.steps.connecting")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {status || t("deviceSetup.connection.connecting")}
        </Text>
      </View>
      <View style={styles.centerMt}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    </Card>
  );

  const renderWifiForm = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="wifi" size={22} color={COLORS.PRIMARY} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>{t("deviceSetup.wifi.title")}</Text>
      </View>

      <Text style={styles.cardSub}>{t("deviceSetup.wifi.subtitle")}</Text>

      <Text style={styles.inputLabel}>{t("deviceSetup.wifi.ssidLabel")}</Text>
      <TextInput
        value={wifiSsid}
        onChangeText={setWifiSsid}
        placeholder={t("deviceSetup.wifi.ssidPlaceholder")}
        placeholderTextColor={COLORS.PLACEHOLDER}
        style={styles.input}
        autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>
        {t("deviceSetup.wifi.passwordLabel")}
      </Text>
      <TextInput
        value={wifiPassword}
        onChangeText={setWifiPassword}
        placeholder={t("deviceSetup.wifi.passwordPlaceholder")}
        placeholderTextColor={COLORS.PLACEHOLDER}
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
      />

      <View style={[styles.infoBox, styles.mtMd]}>
        <Text style={styles.infoText}>{t("deviceSetup.wifi.hint")}</Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnMuted, styles.btnRight]}
          onPress={() => setStep(STEPS.BLE_SCAN)}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.TEXT_PRIMARY} />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnTextDark}>{t("common.back")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleWifiFormSubmit}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.WHITE} />
          ) : (
            <Ionicons name="wifi" size={18} color={COLORS.WHITE} />
          )}
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnText}>{t("deviceSetup.wifi.connect")}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderProvisioning = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="wifi-outline" size={22} color={COLORS.PRIMARY} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.steps.wifiProvisioning")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {wifiStatus || t("deviceSetup.wifi.connecting")}
        </Text>
      </View>
      <View style={styles.centerMt}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    </Card>
  );

  const renderActivating = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="flash-outline" size={22} color={COLORS.PRIMARY} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.steps.activating")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {status || t("deviceSetup.activation.serverCommunication")}
        </Text>
      </View>
      <View style={styles.centerMt}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    </Card>
  );

  const renderSuccess = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="checkmark-circle" size={22} color={COLORS.SUCCESS} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.result.setupComplete")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {status || t("deviceSetup.result.deviceReady")}
        </Text>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => navigation.navigate("DriverDashboard")}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.WHITE} />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnText}>{t("deviceSetup.result.done")}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderError = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="alert-circle" size={22} color={COLORS.ERROR} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.result.errorOccurred")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>{error || t("common.error")}</Text>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnMuted, styles.btnRight]}
          onPress={() => {
            setError(null);
            setStep(STEPS.SERIAL_MANUAL);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={18} color={COLORS.TEXT_PRIMARY} />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnTextDark}>
            {t("deviceSetup.result.retry")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnDanger]}
          onPress={() => navigation.navigate("DriverDashboard")}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={18} color={COLORS.WHITE} />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnText}>{t("deviceSetup.result.cancel")}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  useEffect(() => {
    return () => {
      console.log("BLE provision için korunuyor");
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={COLORS.TEXT ?? COLORS.DEFAULT}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("deviceSetup.title")}</Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() =>
            Alert.alert(
              t("common.info") || "Bilgi",
              t("deviceSetup.bluetooth.notReadyMessage")
            )
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={COLORS.TEXT ?? COLORS.DEFAULT}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepHeader()}
        {step === STEPS.CHECKING && renderChecking()}
        {step === STEPS.SUCCESS &&
        deviceStatus?.isActive &&
        !deviceStatus?.needsSetup
          ? renderSetupNotRequired()
          : null}
        {step === STEPS.SERIAL_MANUAL && renderManualSerial()}
        {step === STEPS.BLE_SCAN && renderBleScan()}
        {step === STEPS.CONNECTING && renderConnecting()}
        {step === STEPS.WIFI_FORM && renderWifiForm()}
        {step === STEPS.WIFI_PROVISIONING && renderProvisioning()}
        {step === STEPS.ACTIVATING && renderActivating()}
        {step === STEPS.SUCCESS &&
          (!deviceStatus?.isActive || deviceStatus?.needsSetup) &&
          renderSuccess()}
        {step === STEPS.ERROR && renderError()}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={
          busy &&
          (step === STEPS.CONNECTING ||
            step === STEPS.WIFI_PROVISIONING ||
            step === STEPS.ACTIVATING)
        }
        transparent
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("deviceSetup.loading")}</Text>
            <Text style={styles.modalText}>
              {step === STEPS.CONNECTING
                ? t("deviceSetup.connection.connecting")
                : step === STEPS.WIFI_PROVISIONING
                  ? t("deviceSetup.status.wifiConnecting")
                  : t("deviceSetup.activation.activating")}
            </Text>
            <View style={styles.centerMt}>
              <ActivityIndicator color={COLORS.PRIMARY} />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
