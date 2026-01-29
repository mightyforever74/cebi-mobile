// src/screens/driver/DeviceSetupScreen.js
// TulipFleet - Device Setup (BLE + QR + WiFi Provisioning)
// FULL VERSION - Backend integrated + All states

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
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

// Helper
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
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.1),
      borderWidth: 1,
      borderColor: withAlpha(COLORS.PRIMARY, 0.18),
    },
    content: { padding: 16 },
    card: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.22) || (COLORS.DIVIDER ?? COLORS.BORDER),
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
      marginBottom: 14,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      flex: 1,
    },
    cardSub: { fontSize: 13, color: COLORS.MUTED, marginTop: 2 },
    stepPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: withAlpha(COLORS.MUTED, 0.12),
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    pillActive: {
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.12),
      borderColor: withAlpha(COLORS.PRIMARY, 0.25),
    },
    pillText: { fontSize: 12, fontWeight: "700", color: COLORS.MUTED },
    pillTextActive: { color: COLORS.PRIMARY },
    bigIcon: {
      width: 64,
      height: 64,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.1),
      borderWidth: 1,
      borderColor: withAlpha(COLORS.PRIMARY, 0.18),
    },
    infoBox: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    infoText: {
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 18,
    },
    btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    btn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    btnPrimary: { backgroundColor: COLORS.PRIMARY },
    btnMuted: { backgroundColor: withAlpha(COLORS.MUTED, 0.18) },
    btnDanger: { backgroundColor: COLORS.ERROR },
    btnText: { color: COLORS.WHITE, fontWeight: "800" },
    btnTextDark: { color: COLORS.TEXT ?? COLORS.DEFAULT, fontWeight: "800" },
    inputLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 12,
      marginBottom: 6,
    },
    input: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: COLORS.INPUT ?? COLORS.DIVIDER ?? COLORS.BORDER,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "600",
    },
    listItem: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    listTitle: {
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "800",
      fontSize: 14,
      flex: 1,
    },
    listSub: {
      color: COLORS.MUTED,
      fontWeight: "700",
      fontSize: 12,
      marginTop: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: withAlpha(COLORS.BLACK, 0.55),
      justifyContent: "center",
      padding: 18,
    },
    modalCard: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.22) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginBottom: 8,
    },
    modalText: {
      fontSize: 13,
      color: COLORS.MUTED,
      fontWeight: "600",
      lineHeight: 18,
    },
  });

export default function DeviceSetupScreen({ navigation }) {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // States
  const [step, setStep] = useState(STEPS.CHECKING);
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
  const [busy, setBusy] = useState(false);

  // Refs
  const devicesRef = useRef([]);
  const scanCleanupRef = useRef(null);
  const resultReceivedRef = useRef(false);

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

  // Load vehicle ID
  useEffect(() => {
    const loadVehicleId = async () => {
      try {
        const response = await driverAPI.getVehicle();
        const vId = response?.vehicle?.id || response?.id;
        if (vId) {
          setVehicleId(vId);
          console.log("[Setup] Vehicle ID loaded:", vId);
        }
      } catch (e) {
        console.error("[Setup] Failed to load vehicle ID:", e.message);
      }
    };
    loadVehicleId();
  }, []);

  // BLE initialize (before SmartGate)
  useEffect(() => {
    const initBLE = async () => {
      try {
        await bleService.initialize();
        console.log("[Setup] BLE initialized");
      } catch (error) {
        console.error("[Setup] BLE init error:", error);
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

  const checkSmartGate = async () => {
    try {
      console.log("[SmartGate] Checking backend truth (driver/vehicle)...");
      const response = await driverAPI.getVehicle();
      console.log("[SmartGate] driver/vehicle:", JSON.stringify(response));

      const setupRequired =
        response?.setup_required ?? response?.vehicle?.setup_required;

      // Setup not required
      if (setupRequired === false) {
        setGateChecking(false);
        const deviceSerial =
          response.vehicle?.esp32Status?.serial ||
          response.vehicle?.esp32Status?.deviceId ||
          "-";
        Alert.alert(
          t("deviceSetup.setupNotRequired"),
          t("deviceSetup.deviceActiveMessage", {
            serial: deviceSerial,
            plate: response.vehicle?.plate || "-",
          }),
          [
            {
              text: t("deviceSetup.buttons.ok"),
              onPress: () =>
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "DriverDashboard" }],
                  })
                ),
            },
          ]
        );
        return;
      }

      // Setup required - check if reprovision
      if (setupRequired === true) {
        const inferredSerial = response.vehicle?.esp32Status?.serial || null;
        if (inferredSerial) {
          console.log(
            "[SmartGate] Reprovision inferred serial:",
            inferredSerial
          );
          setSerial(inferredSerial);
          setSkipReason("Cihaz yeniden kurulum bekliyor...");
          setGateChecking(false);
          setTimeout(() => {
            setStep(STEPS.BLE_SCAN);
            startBLEScan();
          }, 1000);
          return;
        }
      }

      // Normal flow
      setGateChecking(false);
      setStep(STEPS.SERIAL_MANUAL);
    } catch (e) {
      console.log("[SmartGate] Error (continue normal):", e.message);
      setGateChecking(false);
      setStep(STEPS.SERIAL_MANUAL);
    }
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

  const handleDeviceSelect = async (device) => {
    scanCleanupRef.current?.();
    setSelectedDevice(device);
    setStep(STEPS.CONNECTING);
    setStatus("Bağlanıyor...");
    resultReceivedRef.current = false;

    try {
      await bleService.connect(device.id);
      setStatus("Bağlandı, hazırlanıyor...");

      await bleService.subscribeToNotifications(
        (value) => setStatus(value),
        (value) => console.log("[Setup] Result received:", value)
      );

      setStep(STEPS.WIFI_FORM);
      setStatus("WiFi bilgilerini girin");
    } catch (e) {
      console.error("[Setup] Connection error:", e.message);
      setError("Bağlantı hatası: " + e.message);
      setStep(STEPS.ERROR);
    }
  };

  const activationStartedRef = useRef(false);

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
    activationStartedRef.current = false; // Reset flag

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

      // ✅ WiFi başarılı - AsyncStorage kaydet
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_WIFI_SSID,
          wifiSsid.trim()
        );
      } catch {}

      // ✅ HEMEN backend'e gönder (BLE disconnect beklemeden!)
      setStep(STEPS.ACTIVATING);
      setStatus("Cihaz aktive ediliyor...");

      try {
        // Backend finalize - ESP32 kopmadan önce gönder
        await performActivation();

        // ✅ Başarılı - SUCCESS ekranına geç
        // performActivation zaten setStep(SUCCESS) yapıyor
      } catch (activationError) {
        console.log(
          "[WiFi] Activation error (ESP32 zaten activate etti):",
          activationError.message
        );
        // ESP32 zaten /activate çağırdı, success sayalım
        await saveProvisionData(serial);
        setStep(STEPS.SUCCESS);
        setStatus(t("deviceSetup.activation.successStatus"));
      } finally {
        // BLE cleanup - best effort
        setTimeout(async () => {
          try {
            await bleService.disconnect();
          } catch (e) {
            console.log("[BLE] Disconnect error (normal):", e.message);
          }
        }, 500);
      }
    } catch (e) {
      console.error("[WiFi] Exception:", e.message, e.code);

      // BLE disconnect patterns (robust checking)
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

        // Race condition koruması
        if (!activationStartedRef.current) {
          activationStartedRef.current = true;
          try {
            await performActivation();
          } catch (activationError) {
            console.log("[WiFi] Backend zaten activate etti");
            await saveProvisionData(serial);
            setStep(STEPS.SUCCESS);
            setStatus(t("deviceSetup.activation.successStatus"));
            setTimeout(async () => {
              try {
                await bleService.disconnect();
              } catch {}
            }, 1000);
          }
        }
      } else {
        // Gerçek hata
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
        setTimeout(async () => {
          await bleService.disconnect();
        }, 1000);
        return;
      }

      if (
        activationResult.statusCode === 409 ||
        activationResult.error === "ESP_ALREADY_BOUND"
      ) {
        await saveProvisionData(serial);
        setStep(STEPS.SUCCESS);
        setStatus(t("deviceSetup.activation.successStatus"));
        setTimeout(async () => {
          await bleService.disconnect();
        }, 1000);
        return;
      }

      setError(activationResult.message || "Aktivasyon başarısız");
      setStep(STEPS.ERROR);
    } catch (e) {
      await saveProvisionData(serial);
      setStep(STEPS.SUCCESS);
      setStatus(t("deviceSetup.activation.successPending"));
      setTimeout(async () => {
        await bleService.disconnect();
      }, 1000);
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
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.bigIcon}>
          <Ionicons name="bluetooth" size={26} color={COLORS.PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
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
    </View>
  );

  const renderChecking = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="sync" size={20} color={COLORS.PRIMARY} />
        <Text style={styles.cardTitle}>{t("deviceSetup.checkingStatus")}</Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {skipReason || t("deviceSetup.checkingStatus")}
        </Text>
      </View>
      <View style={{ marginTop: 12, alignItems: "center" }}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    </View>
  );

  const renderSetupNotRequired = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="checkmark-circle" size={22} color={COLORS.SUCCESS} />
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
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "DriverDashboard" }],
              })
            )
          }
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.WHITE} />
          <Text style={styles.btnText}>{t("deviceSetup.buttons.ok")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderManualSerial = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="key-outline" size={22} color={COLORS.PRIMARY} />
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
          <Text style={styles.btnText}>
            {t("deviceSetup.buttons.continue")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBleScan = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="bluetooth-outline" size={22} color={COLORS.PRIMARY} />
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
      <View style={{ marginTop: 12 }}>
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
          <Ionicons
            name="refresh"
            size={18}
            color={COLORS.TEXT ?? COLORS.DEFAULT}
          />
          <Text style={styles.btnTextDark}>{t("deviceSetup.ble.rescan")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConnecting = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="link" size={22} color={COLORS.PRIMARY} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.steps.connecting")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {status || t("deviceSetup.connection.connecting")}
        </Text>
      </View>
      <View style={{ marginTop: 12, alignItems: "center" }}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    </View>
  );

  const renderWifiForm = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="wifi" size={22} color={COLORS.PRIMARY} />
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
      <View style={[styles.infoBox, { marginTop: 12 }]}>
        <Text style={styles.infoText}>{t("deviceSetup.wifi.hint")}</Text>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnMuted]}
          onPress={() => setStep(STEPS.BLE_SCAN)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={COLORS.TEXT ?? COLORS.DEFAULT}
          />
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
          <Text style={styles.btnText}>{t("deviceSetup.wifi.connect")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProvisioning = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="wifi-outline" size={22} color={COLORS.PRIMARY} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.steps.wifiProvisioning")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {wifiStatus || t("deviceSetup.wifi.connecting")}
        </Text>
      </View>
      <View style={{ marginTop: 12, alignItems: "center" }}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    </View>
  );

  const renderActivating = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="flash-outline" size={22} color={COLORS.PRIMARY} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.steps.activating")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {status || t("deviceSetup.activation.serverCommunication")}
        </Text>
      </View>
      <View style={{ marginTop: 12, alignItems: "center" }}>
        <ActivityIndicator color={COLORS.PRIMARY} />
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="checkmark-circle" size={22} color={COLORS.SUCCESS} />
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
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "DriverDashboard" }],
              })
            )
          }
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.WHITE} />
          <Text style={styles.btnText}>{t("deviceSetup.result.done")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderError = () => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="alert-circle" size={22} color={COLORS.ERROR} />
        <Text style={styles.cardTitle}>
          {t("deviceSetup.result.errorOccurred")}
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>{error || t("common.error")}</Text>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnMuted]}
          onPress={() => {
            setError(null);
            setStep(STEPS.SERIAL_MANUAL);
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={COLORS.TEXT ?? COLORS.DEFAULT}
          />
          <Text style={styles.btnTextDark}>
            {t("deviceSetup.result.retry")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnDanger]}
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "DriverDashboard" }],
              })
            )
          }
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={18} color={COLORS.WHITE} />
          <Text style={styles.btnText}>{t("deviceSetup.result.cancel")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <View style={{ height: 28 }} />
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
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <ActivityIndicator color={COLORS.PRIMARY} />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
