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

import { CameraView, useCameraPermissions } from "expo-camera";
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
  SUCCESS_PENDING: "SUCCESS_PENDING",
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

    // ✅ Disabled görünümü
    btnDisabled: { opacity: 0.6 },

    // ✅ Inline hint (disabled durumları için)
    hintText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      lineHeight: 18,
    },
    hintTextWarn: { color: COLORS.WARNING },

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

    // ⭐ Password göster/gizle
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.md,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    passwordToggle: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.md,
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

    qrCameraContainer: {
      width: "100%",
      height: 280,
      borderRadius: COLORS.RADIUS.lg,
      overflow: "hidden",
      marginTop: COLORS.SPACING.md,
      backgroundColor: COLORS.BLACK,
    },
    qrCamera: {
      flex: 1,
    },
    qrOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    qrFrame: {
      width: 200,
      height: 200,
      borderWidth: 2,
      borderColor: COLORS.PRIMARY,
      borderRadius: COLORS.RADIUS.md,
      backgroundColor: "transparent",
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
    mtSm: { marginTop: COLORS.SPACING.sm },
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
  const [showPassword, setShowPassword] = useState(false);
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
  const qrLockRef = useRef(false);

  // Camera permission
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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

  // ✅ 1. Unmount cleanup — scan + BLE bağlantı temizliği
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (__DEV__) console.log("[DeviceSetup] Unmounting — cleaning up");

      if (scanCleanupRef.current) {
        scanCleanupRef.current();
        scanCleanupRef.current = null;
      }

      try {
        bleService.disconnect?.();
      } catch (e) {
        if (__DEV__)
          console.log("[DeviceSetup] BLE disconnect on unmount:", e.message);
      }
    };
  }, []);

  // ✅ 2. Parametre guard
  useEffect(() => {
    const { serial } = route.params || {};

    if (isGuided && !serial) {
      console.error("[DeviceSetup] ❌ Missing serial!");
      Alert.alert(t("common.error"), "Seri numarası bulunamadı.", [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
      return;
    }

    if (__DEV__) console.log("[DeviceSetup] Mounted:", { serial, isGuided });
  }, []);

  // ✅ 3. State debug
  useEffect(() => {
    if (__DEV__) console.log("[DeviceSetup] STATE:", { step, busy, isGuided });
  }, [step, busy, isGuided]);

  // Load vehicle ID
  useEffect(() => {
    const loadVehicleId = async () => {
      try {
        const response = await driverAPI.getVehicle();
        const vId = response?.vehicle?.id || response?.id;
        if (vId) {
          setVehicleId(vId);
          if (__DEV__) console.log("[DeviceSetup] Vehicle ID loaded:", vId);
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
        if (__DEV__) console.log("[DeviceSetup] BLE initialized");
      } catch (error) {
        console.error("[DeviceSetup] BLE init error:", error);
        setError("Bluetooth başlatılamadı: " + error.message);
      }
    };
    initBLE();
  }, []);

  // Son kullanılan WiFi SSID'yi yükle
  useEffect(() => {
    const loadLastSsid = async () => {
      try {
        const lastSsid = await AsyncStorage.getItem(
          STORAGE_KEYS.LAST_WIFI_SSID
        );
        if (lastSsid && !wifiSsid) {
          setWifiSsid(lastSsid);
          if (__DEV__) console.log("[DeviceSetup] Last SSID loaded:", lastSsid);
        }
      } catch (e) {
        if (__DEV__)
          console.log("[DeviceSetup] Failed to load last SSID:", e.message);
      }
    };
    loadLastSsid();
  }, []);

  // Check SmartGate
  useEffect(() => {
    checkSmartGate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (__DEV__)
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

      if (__DEV__)
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
      if (__DEV__)
        console.log("[DeviceSetup] Vehicle check failed:", e.message);
    }

    if (isGuided) {
      if (__DEV__) console.log("[DeviceSetup] Guided mode");
      setSerial(route.params.serial);
      setGateChecking(false);
      setStep(STEPS.BLE_SCAN);
      startBLEScan();
      return;
    }

    if (__DEV__) console.log("[DeviceSetup] Normal mode — QR scan");
    setGateChecking(false);
    setStep(STEPS.QR_SCAN);
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
    if (__DEV__) console.log("[Setup] Starting BLE scan...");
    setDevices([]);
    devicesRef.current = [];
    setStatus("Cihazlar aranıyor...");

    scanCleanupRef.current = bleService.startScan(
      (device) => {
        // ✅ Sadece TulipFleet cihazları
        if (!device?.name?.startsWith("TulipFleet-")) return;

        // ✅ chipId format kontrolü (spoof azaltma)
        const chipId = device.name.replace("TulipFleet-", "");
        if (!/^[A-F0-9]{4,16}$/i.test(chipId)) return;

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

  const proceedWithConnection = async (device) => {
    await bleService.connect(device.id);
    setStatus("Bağlandı!");
    if (__DEV__) console.log("[DeviceSetup] BLE Connected");

    if (isGuided) {
      if (__DEV__) console.log("[DeviceSetup] isGuided=true");

      setBusy(false);

      const { InteractionManager } = require("react-native");
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate("VehiclePickerMain", {
          serial: route.params.serial,
          deviceInfo: route.params.deviceInfo,
          deviceId: device.id,
        });
        if (__DEV__)
          console.log(
            "[DeviceSetup] navigation.navigate(VehiclePickerMain) called"
          );
      });

      return;
    }

    if (__DEV__) console.log("[DeviceSetup] WiFi form");
    setStep(STEPS.WIFI_FORM);
  };

  const handleDeviceSelect = async (device) => {
    if (busy) {
      if (__DEV__) console.log("[DeviceSetup] Already connecting");
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
      const bleChipId = device.name?.replace("TulipFleet-", "") || "";

      if (bleChipId && /^[A-F0-9]{4,16}$/i.test(bleChipId)) {
        try {
          setStatus(t("deviceSetup.checkingDeviceStatus"));
          const checkResult = await deviceAPI.checkDeviceStatus(bleChipId);

          if (
            checkResult?.registered &&
            checkResult?.device?.status === "ACTIVATED" &&
            checkResult?.device?.is_online
          ) {
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
          if (__DEV__)
            console.log(
              "[DeviceSetup] Status check failed, continuing:",
              checkErr.message
            );
        }
      }

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
    // ✅ Emniyet kemeri: UI disable olsa bile çift basmayı engelle
    if (busy) return;

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

    setBusy(true);
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
        if (__DEV__)
          console.log(
            "[WiFi] Activation error (ESP32 zaten activate etti):",
            activationError.message
          );
        await saveProvisionData(serial);
        setStep(STEPS.SUCCESS_PENDING);
        setStatus(t("deviceSetup.activation.successPending"));
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
        if (__DEV__) console.log("[WiFi] BLE disconnect (ESP32 restart)");
        setStep(STEPS.ACTIVATING);
        setStatus("Cihaz yeniden başlatılıyor...");
        await new Promise((r) => setTimeout(r, 3000));

        if (!activationStartedRef.current) {
          activationStartedRef.current = true;
          try {
            await performActivation();
          } catch (activationError) {
            if (__DEV__) console.log("[WiFi] Backend already activated");
            await saveProvisionData(serial);
            setStep(STEPS.SUCCESS_PENDING);
            setStatus(t("deviceSetup.activation.successPending"));
          }
        }
      } else {
        setError("WiFi kurulumu sırasında hata: " + e.message);
        setStep(STEPS.ERROR);
      }
    } finally {
      if (isMountedRef.current) {
        setBusy(false);
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
      if (__DEV__) console.log("[ACT] SUCCESS_PENDING:", e.message);
      await saveProvisionData(serial);
      setStep(STEPS.SUCCESS_PENDING);
      setStatus(t("deviceSetup.activation.successPending"));
    }
  };

  // ============================================
  // C) SUCCESS_PENDING: Aktivasyon doğrulama (3 deneme, 5sn aralık)
  // ✅ busy her durumda kapanır (try/finally)
  // ============================================
  const verifyActivation = async () => {
    setBusy(true);
    setStatus(t("deviceSetup.checkingStatus"));

    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (!isMountedRef.current) return;

        try {
          if (__DEV__) console.log(`[VERIFY] Attempt ${attempt}/3...`);
          const response = await driverAPI.getVehicle();
          const vehicle = response?.vehicle || response;

          if (
            vehicle?.esp32_device_id &&
            (vehicle?.device_status === "ACTIVATED" ||
              vehicle?.esp32Status?.connected)
          ) {
            if (__DEV__) console.log("[VERIFY] Device confirmed active!");
            if (!isMountedRef.current) return;
            setStep(STEPS.SUCCESS);
            setStatus(t("deviceSetup.activation.successStatus"));
            return;
          }
        } catch (e) {
          if (__DEV__)
            console.log(`[VERIFY] Attempt ${attempt} failed:`, e.message);
        }

        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }

      if (!isMountedRef.current) return;

      setStatus(t("deviceSetup.activation.successPending"));
      Alert.alert(
        t("common.warning") || "Uyarı",
        t("deviceSetup.activation.verifyFailed") ||
          "Aktivasyon henüz doğrulanamadı. Cihazı yeniden başlatın veya internet bağlantısını kontrol edin."
      );
    } finally {
      if (isMountedRef.current) setBusy(false);
    }
  };

  // ============================================
  // QR Code Scan Handler
  // ============================================
  const handleQRScanned = ({ data }) => {
    if (qrLockRef.current) return;
    qrLockRef.current = true;

    const raw = typeof data === "string" ? data : "";
    if (__DEV__) console.log("[QR] scanned");

    if (!raw) {
      qrLockRef.current = false;
      return;
    }

    let scannedSerial = raw.trim().toUpperCase();

    if (scannedSerial.includes("?S=") || scannedSerial.includes("?s=")) {
      const match = raw.match(/[?&]s=([^&#]+)/i);
      if (match) scannedSerial = decodeURIComponent(match[1]).toUpperCase();
    }

    if (scannedSerial.includes("?T=") || scannedSerial.includes("?t=")) {
      const match = raw.match(/[?&]t=([^&#]+)/i);
      if (match) scannedSerial = decodeURIComponent(match[1]).toUpperCase();
    }

    const serialRegex = /^TF-\d{4}-\d{5}-[A-Z0-9]$/;
    if (!serialRegex.test(scannedSerial)) {
      Alert.alert(
        t("deviceSetup.qr.invalidCode") || "Invalid QR Code",
        t("deviceSetup.qr.invalidCodeMessage") ||
          "QR code format not recognized. Please scan the QR code on the device.",
        [
          {
            text: t("common.ok") || "OK",
            onPress: () => {
              qrLockRef.current = false;
            },
          },
        ]
      );
      return;
    }

    if (__DEV__) console.log("[QR] Valid serial:", scannedSerial);
    setSerial(scannedSerial);
    setStatus(`Serial: ${scannedSerial}`);
    setStep(STEPS.BLE_SCAN);
    startBLEScan();

    setTimeout(() => {
      qrLockRef.current = false;
    }, 2000);
  };

  const handleManualSerialContinue = async () => {
    const trimmed = serial?.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert(t("common.error"), t("deviceSetup.serial.enterSerial"));
      return;
    }

    const serialRegex = /^TF-\d{4}-\d{5}-[A-Z0-9]$/;
    if (!serialRegex.test(trimmed)) {
      Alert.alert(
        t("deviceSetup.serial.invalid"),
        t("deviceSetup.serial.invalidFormat")
      );
      return;
    }

    setSerial(trimmed);
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

  const renderQRScan = () => {
    if (!cameraPermission) {
      return (
        <Card variant="setup" style={styles.cardWrap}>
          <View style={styles.centerMt}>
            <ActivityIndicator color={COLORS.PRIMARY} />
          </View>
        </Card>
      );
    }

    if (!cameraPermission.granted) {
      return (
        <Card variant="setup" style={styles.cardWrap}>
          <View style={styles.titleRow}>
            <Ionicons name="camera-outline" size={22} color={COLORS.WARNING} />
            <View style={styles.titleRowSpacer} />
            <Text style={styles.cardTitle}>
              {t("deviceSetup.camera.permissionRequired")}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {t("deviceSetup.camera.permissionMessage")}
            </Text>
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={requestCameraPermission}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={18} color={COLORS.WHITE} />
              <View style={styles.btnIconSpacer} />
              <Text style={styles.btnText}>
                {t("deviceSetup.camera.grantPermission")}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnMuted]}
              onPress={() => setStep(STEPS.SERIAL_MANUAL)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="keypad-outline"
                size={18}
                color={COLORS.TEXT_PRIMARY}
              />
              <View style={styles.btnIconSpacer} />
              <Text style={styles.btnTextDark}>
                {t("deviceSetup.qr.manualEntry")}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      );
    }

    return (
      <Card variant="setup" style={styles.cardWrap}>
        <View style={styles.titleRow}>
          <Ionicons name="qr-code-outline" size={22} color={COLORS.PRIMARY} />
          <View style={styles.titleRowSpacer} />
          <Text style={styles.cardTitle}>{t("deviceSetup.steps.qrScan")}</Text>
        </View>
        <Text style={styles.cardSub}>{t("deviceSetup.qr.scanHint")}</Text>

        <View style={styles.qrCameraContainer}>
          <CameraView
            style={styles.qrCamera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={handleQRScanned}
          />
          <View style={styles.qrOverlay}>
            <View style={styles.qrFrame} />
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnMuted]}
            onPress={() => setStep(STEPS.SERIAL_MANUAL)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="keypad-outline"
              size={18}
              color={COLORS.TEXT_PRIMARY}
            />
            <View style={styles.btnIconSpacer} />
            <Text style={styles.btnTextDark}>
              {t("deviceSetup.qr.manualEntry")}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

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
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnMuted]}
          onPress={() => setStep(STEPS.QR_SCAN)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="qr-code-outline"
            size={18}
            color={COLORS.TEXT_PRIMARY}
          />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnTextDark}>{t("deviceSetup.qr.scanHint")}</Text>
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
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {status || t("deviceSetup.ble.deviceHint")}
            </Text>
          </View>

          <View
            style={[
              styles.infoBox,
              styles.mtSm,
              {
                backgroundColor: withAlpha(COLORS.WARNING, 0.1),
                borderColor: withAlpha(COLORS.WARNING, 0.25),
              },
            ]}
          >
            <Text
              style={[
                styles.infoText,
                { fontSize: COLORS.TYPOGRAPHY.sizes.sm },
              ]}
            >
              {"💡 "}
              {t("deviceSetup.ble.bootWindowHint") ||
                "ESP32 cihazının BLE modu açılıştan sonra 5 dakika aktiftir. Cihaz bulunamazsa cihazı yeniden başlatın (USB çıkar-tak)."}
            </Text>
            <Text
              style={[
                styles.infoText,
                styles.mtSm,
                { fontSize: COLORS.TYPOGRAPHY.sizes.sm },
              ]}
            >
              {"📱 "}
              {t("deviceSetup.ble.deviceNameHint") ||
                'Cihaz adı "TulipFleet-XXXX" şeklinde görünür. 1-2 metre yaklaşın.'}
            </Text>
          </View>
        </>
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

  // ⭐ SSID 5GHz algılama
  const is5GHz = useMemo(() => {
    const s = (wifiSsid || "").toLowerCase();
    return s.includes("5g") || s.includes("5ghz") || s.includes("_5_");
  }, [wifiSsid]);

  // ✅ WiFi connect disable koşulları + inline hint
  const ssidOk = useMemo(() => (wifiSsid || "").trim().length > 0, [wifiSsid]);
  const passOk = useMemo(
    () => (wifiPassword || "").length >= 8,
    [wifiPassword]
  );

  const canConnectWifi = useMemo(() => {
    return !busy && ssidOk && passOk;
  }, [busy, ssidOk, passOk]);

  const wifiInlineHint = useMemo(() => {
    if (busy) return null;
    if (!ssidOk) return t("deviceSetup.wifi.emptySSID") || "SSID gerekli.";
    if (!passOk)
      return (
        t("deviceSetup.wifi.shortPassword") || "Şifre en az 8 karakter olmalı."
      );
    return null;
  }, [busy, ssidOk, passOk, t]);

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

      {/* ⭐ 5GHz SSID uyarısı */}
      {is5GHz && (
        <View
          style={[
            styles.infoBox,
            styles.mtSm,
            {
              backgroundColor: withAlpha(COLORS.WARNING, 0.1),
              borderColor: withAlpha(COLORS.WARNING, 0.25),
            },
          ]}
        >
          <Text
            style={[styles.infoText, { fontSize: COLORS.TYPOGRAPHY.sizes.sm }]}
          >
            {"⚠️ "}
            {t("deviceSetup.wifi.warning5GHz") ||
              "Bu SSID 5GHz ağa ait olabilir. ESP32 sadece 2.4GHz destekler. Lütfen 2.4GHz ağınızı kullanın."}
          </Text>
        </View>
      )}

      <Text style={styles.inputLabel}>
        {t("deviceSetup.wifi.passwordLabel")}
      </Text>

      {/* ⭐ Şifre göster/gizle */}
      <View style={styles.passwordContainer}>
        <TextInput
          value={wifiPassword}
          onChangeText={setWifiPassword}
          placeholder={t("deviceSetup.wifi.passwordPlaceholder")}
          placeholderTextColor={COLORS.PLACEHOLDER}
          style={styles.passwordInput}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.passwordToggle}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={COLORS.MUTED}
          />
        </TouchableOpacity>
      </View>

      {/* ✅ Inline hint */}
      {wifiInlineHint ? (
        <Text style={[styles.hintText, styles.hintTextWarn]}>
          {"ℹ️ "}
          {wifiInlineHint}
        </Text>
      ) : null}

      <View style={[styles.infoBox, styles.mtMd]}>
        <Text style={styles.infoText}>{t("deviceSetup.wifi.hint")}</Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnMuted,
            styles.btnRight,
            busy && styles.btnDisabled,
          ]}
          onPress={() => setStep(STEPS.BLE_SCAN)}
          activeOpacity={0.85}
          disabled={busy}
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.TEXT_PRIMARY} />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnTextDark}>{t("common.back")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnPrimary,
            !canConnectWifi && styles.btnDisabled,
          ]}
          onPress={handleWifiFormSubmit}
          activeOpacity={0.85}
          disabled={!canConnectWifi}
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

      {(serial || deviceStatus?.plate) && (
        <View
          style={[
            styles.infoBox,
            styles.mtSm,
            {
              backgroundColor: withAlpha(COLORS.SUCCESS, 0.08),
              borderColor: withAlpha(COLORS.SUCCESS, 0.2),
            },
          ]}
        >
          {serial ? (
            <Text
              style={[
                styles.infoText,
                { fontSize: COLORS.TYPOGRAPHY.sizes.sm },
              ]}
            >
              {"📟 "}
              {t("device.serial") || "Serial"}: {serial}
            </Text>
          ) : null}
          {deviceStatus?.plate ? (
            <Text
              style={[
                styles.infoText,
                styles.mtSm,
                { fontSize: COLORS.TYPOGRAPHY.sizes.sm },
              ]}
            >
              {"🚛 "}
              {t("vehicle.plate") || "Plaka"}: {deviceStatus.plate}
            </Text>
          ) : null}
        </View>
      )}

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

  const renderSuccessPending = () => (
    <Card variant="setup" style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Ionicons name="time-outline" size={22} color={COLORS.WARNING} />
        <View style={styles.titleRowSpacer} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.activation.pendingTitle") ||
            "Kurulum Tamamlanıyor..."}
        </Text>
      </View>
      <View
        style={[
          styles.infoBox,
          {
            backgroundColor: withAlpha(COLORS.WARNING, 0.1),
            borderColor: withAlpha(COLORS.WARNING, 0.25),
          },
        ]}
      >
        <Text style={styles.infoText}>
          {status || t("deviceSetup.activation.successPending")}
        </Text>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, styles.btnRight]}
          onPress={verifyActivation}
          activeOpacity={0.85}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.WHITE} />
          ) : (
            <Ionicons name="refresh-circle" size={18} color={COLORS.WHITE} />
          )}
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnText}>
            {t("deviceSetup.activation.verifyButton") || "Durumu Kontrol Et"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnMuted]}
          onPress={() => navigation.navigate("DriverDashboard")}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.TEXT_PRIMARY} />
          <View style={styles.btnIconSpacer} />
          <Text style={styles.btnTextDark}>{t("deviceSetup.result.done")}</Text>
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
      if (__DEV__) console.log("BLE provision preserved");
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
        {step === STEPS.QR_SCAN && renderQRScan()}
        {step === STEPS.BLE_SCAN && renderBleScan()}
        {step === STEPS.CONNECTING && renderConnecting()}
        {step === STEPS.WIFI_FORM && renderWifiForm()}
        {step === STEPS.WIFI_PROVISIONING && renderProvisioning()}
        {step === STEPS.ACTIVATING && renderActivating()}
        {step === STEPS.SUCCESS &&
          (!deviceStatus?.isActive || deviceStatus?.needsSetup) &&
          renderSuccess()}
        {step === STEPS.SUCCESS_PENDING && renderSuccessPending()}
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
