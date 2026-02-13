// src/screens/driver/WiFiPickerScreen.js
// TulipFleet - WiFi Network Picker (BLE Provisioning)
// Updated: 11 Şubat 2026 - Theme migration (UI System Guide v3)
// ✅ useTheme + useThemedStyles, 0 hardcoded hex, 8px grid, i18n, dark mode ready

import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import bleService from "../../services/bleService";

// ── Styles factory ──────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },

    // ── Header ──
    header: {
      padding: COLORS.SPACING.lg, // 24
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    title: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm, // 8
    },
    subtitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.xs, // 4
    },
    vehicleInfo: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
      fontStyle: "italic",
    },

    // ── Loading ──
    loadingText: {
      marginTop: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_SECONDARY,
    },
    loadingSubtext: {
      marginTop: COLORS.SPACING.sm, // 8
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
    },

    // ── Error ──
    errorContainer: {
      backgroundColor: COLORS.WARNING_LIGHT,
      padding: COLORS.SPACING.md, // 16
      margin: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.sm, // 8
      borderWidth: 1,
      borderColor: COLORS.WARNING,
    },
    errorText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.WARNING,
    },

    // ── List ──
    listContainer: {
      flex: 1,
      padding: COLORS.SPACING.md, // 16
    },
    emptyContainer: {
      paddingVertical: COLORS.SPACING.xxl, // 40
      alignItems: "center",
    },
    emptyText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.lg, // 24
    },
    retryButton: {
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg, // 24
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button, // 8
      alignItems: "center",
      justifyContent: "center",
      ...COLORS.SHADOWS.button,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.button,
    },

    // ── WiFi Card ──
    wifiCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE,
      padding: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.card, // 12
      marginBottom: COLORS.SPACING.md, // 16
      ...COLORS.SHADOWS.card,
    },
    wifiCardDisabled: {
      opacity: 0.4,
    },
    wifiIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: COLORS.INFO_LIGHT,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md, // 16
    },
    wifiIconText: {
      fontSize: 28,
    },
    wifiInfo: {
      flex: 1,
    },
    wifiSsid: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.xs, // 4
    },
    wifiDetails: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    wifiDetailText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginRight: COLORS.SPACING.sm, // 8
    },
    unsupportedText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.ERROR,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    arrowIcon: {
      marginLeft: COLORS.SPACING.sm, // 8
    },
    arrowText: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.PRIMARY,
    },

    // ── Footer ──
    footer: {
      flexDirection: "row",
      padding: COLORS.SPACING.md, // 16
      backgroundColor: COLORS.SURFACE,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    manualButton: {
      flex: 1,
      backgroundColor: COLORS.SECONDARY,
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button, // 8
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.sm, // 8
    },
    manualButtonText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
    },
    rescanButton: {
      flex: 1,
      backgroundColor: COLORS.PRIMARY,
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button, // 8
      alignItems: "center",
      justifyContent: "center",
      marginLeft: COLORS.SPACING.sm, // 8
      ...COLORS.SHADOWS.button,
    },
    rescanButtonText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.WHITE,
    },
  });

// ── Component ───────────────────────────────
const WiFiPickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { serial, vehicle, assignment_id, deviceId } = route.params;

  const [scanning, setScanning] = useState(false);
  const [wifiList, setWifiList] = useState([]);
  const [error, setError] = useState(null);

  const startedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (startedRef.current) {
        console.log("[WiFiPicker] Already started, skipping");
        return;
      }

      if (!deviceId) {
        Alert.alert(
          t("common.error") || "Hata",
          t("wifi.bleDisconnected") ||
            "ESP32 bağlantısı kesildi. Lütfen tekrar deneyin.",
          [
            {
              text: t("common.ok") || "Tamam",
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }

      startedRef.current = true;
      console.log("[WiFiPicker] First mount - starting scan");

      const checkBLEAndScan = async () => {
        try {
          const isConnected = await bleService.checkConnection();
          console.log("[WiFiPicker] BLE isConnected:", isConnected);

          if (!isConnected) {
            Alert.alert(
              t("wifi.connectionError") || "Bağlantı Hatası",
              t("wifi.bleConnectionLost") ||
                "ESP32 ile bağlantı kopmuş. Kurulumu yeniden başlatın.",
              [
                {
                  text: t("common.ok") || "Tamam",
                  onPress: () => navigation.goBack(),
                },
              ]
            );
            return;
          }

          await scanWifiNetworks();
        } catch (err) {
          console.error("[WiFiPicker] BLE check error:", err);
          setError(
            (t("wifi.bleError") || "BLE bağlantı hatası: ") + err.message
          );
        }
      };

      checkBLEAndScan();

      return () => {
        console.log("[WiFiPicker] Cleanup");
      };
    }, [deviceId])
  );

  const scanWifiNetworks = async () => {
    try {
      setScanning(true);
      setError(null);

      console.log("[WiFiPicker] Starting WiFi scan...");
      console.log("[WiFiPicker] deviceId:", deviceId);

      const bleState = bleService.getState();
      console.log("[WiFiPicker] BLE State:", JSON.stringify(bleState));

      const networks = await bleService.scanWifiNetworks();

      console.log("[WiFiPicker] Raw networks:", JSON.stringify(networks));

      if (networks && networks.length > 0) {
        const sorted = networks
          .filter((n) => n.ssid && n.ssid.trim().length > 0)
          .sort((a, b) => b.rssi - a.rssi);

        setWifiList(sorted);
        console.log(`[WiFiPicker] Found ${sorted.length} valid networks`);
      } else {
        setWifiList([]);
        setError(
          t("wifi.noNetworks") ||
            "WiFi ağı bulunamadı. ESP32'nin açık olduğundan emin olun."
        );
      }
    } catch (err) {
      console.error("[WiFiPicker] Scan error:", err);

      let errorMessage = t("wifi.scanFailed") || "WiFi taraması başarısız";

      if (
        err.message.includes("bağlı değil") ||
        err.message.includes("kopmuş")
      ) {
        errorMessage =
          t("wifi.bleConnectionLost") ||
          "ESP32 bağlantısı kopmuş. Kurulumu yeniden başlatın.";
      } else if (err.message.includes("characteristic")) {
        errorMessage =
          t("wifi.firmwareNoSupport") ||
          "ESP32 firmware'i WiFi scan desteklemiyor. Firmware güncelleyin.";
      } else if (err.message.includes("JSON")) {
        errorMessage =
          t("wifi.invalidData") ||
          "ESP32'den geçersiz veri geldi. Yeniden deneyin.";
      } else {
        errorMessage =
          (t("wifi.scanFailed") || "WiFi taraması başarısız: ") + err.message;
      }

      setError(errorMessage);
      setWifiList([]);
    } finally {
      setScanning(false);
    }
  };

  const handleWifiSelect = (network) => {
    if (network.channel && network.channel > 14) {
      Alert.alert(
        t("common.warning") || "Uyarı",
        t("wifi.no5GHz") ||
          "Bu ağ 5GHz bandında. ESP32 sadece 2.4GHz ağları destekler. Başka bir ağ seçin.",
        [{ text: t("common.ok") || "Tamam" }]
      );
      return;
    }

    navigation.navigate("WiFiPasswordMain", {
      ssid: network.ssid,
      serial,
      vehicle,
      assignment_id,
      manual: false,
      rssi: network.rssi,
      deviceId,
    });
  };

  const handleManualEntry = () => {
    navigation.navigate("WiFiPasswordMain", {
      ssid: "",
      serial,
      vehicle,
      assignment_id,
      manual: true,
      deviceId,
    });
  };

  const getSignalBars = (rssi) => {
    if (rssi >= -50) return "████░";
    if (rssi >= -60) return "███░░";
    if (rssi >= -70) return "██░░░";
    if (rssi >= -80) return "█░░░░";
    return "░░░░░";
  };

  const getEncryptionText = (enc) => {
    if (enc === 0 || enc === "OPEN") return t("wifi.encOpen") || "Açık";
    if (enc === 2 || enc === "WPA") return "WPA";
    if (enc === 3 || enc === "WPA2") return "WPA2";
    if (enc === 4 || enc === "WPA3") return "WPA3";
    return t("wifi.encSecured") || "Şifreli";
  };

  // ── Loading state ──
  if (scanning && wifiList.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>
          {t("wifi.scanning") || "WiFi ağları taranıyor..."}
        </Text>
        <Text style={styles.loadingSubtext}>
          {t("wifi.scanDuration") || "Bu 5-10 saniye sürebilir"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("wifi.selectNetwork") || "WiFi Seçin"}
        </Text>
        <Text style={styles.subtitle}>
          {t("wifi.connectDevice") || "Cihazı internete bağlayalım"}
        </Text>
        <Text style={styles.vehicleInfo}>
          {t("wifi.vehicle") || "Araç"}:{" "}
          {vehicle?.plate || vehicle?.plate_no || "N/A"}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={scanning}
            onRefresh={scanWifiNetworks}
            colors={[COLORS.PRIMARY]}
          />
        }
      >
        {wifiList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {t("wifi.noNetworks") || "WiFi ağı bulunamadı"}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={scanWifiNetworks}
              activeOpacity={0.85}
            >
              <Text style={styles.retryButtonText}>
                {t("wifi.retry") || "Yeniden Dene"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          wifiList.map((network, index) => {
            const is5GHz = network.channel && network.channel > 14;

            return (
              <TouchableOpacity
                key={`${network.ssid}-${index}`}
                style={[styles.wifiCard, is5GHz && styles.wifiCardDisabled]}
                onPress={() => handleWifiSelect(network)}
                disabled={is5GHz || scanning}
                activeOpacity={0.7}
              >
                <View style={styles.wifiIcon}>
                  <Text style={styles.wifiIconText}>📶</Text>
                </View>

                <View style={styles.wifiInfo}>
                  <Text style={styles.wifiSsid} numberOfLines={1}>
                    {network.ssid}
                  </Text>
                  <View style={styles.wifiDetails}>
                    <Text style={styles.wifiDetailText}>
                      {getSignalBars(network.rssi)} •{" "}
                      {getEncryptionText(network.enc || network.encryption)}
                    </Text>
                    {is5GHz && (
                      <Text style={styles.unsupportedText}>
                        • 5GHz ({t("wifi.unsupported") || "Desteklenmiyor"})
                      </Text>
                    )}
                  </View>
                </View>

                {!is5GHz && (
                  <View style={styles.arrowIcon}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={handleManualEntry}
          disabled={scanning}
          activeOpacity={0.85}
        >
          <Text style={styles.manualButtonText}>
            🔑 {t("wifi.manualEntry") || "Manuel Giriş"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rescanButton}
          onPress={scanWifiNetworks}
          disabled={scanning}
          activeOpacity={0.85}
        >
          <Text style={styles.rescanButtonText}>
            {scanning
              ? t("wifi.scanningShort") || "Taranıyor..."
              : `🔄 ${t("wifi.rescan") || "Yeniden Tara"}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WiFiPickerScreen;
