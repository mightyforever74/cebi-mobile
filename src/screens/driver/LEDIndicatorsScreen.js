// src/screens/driver/LEDIndicatorsScreen.js
// TulipFleet - LED Göstergeleri Ekranı
// Updated: 21 Ocak 2026 - GPIO4 (Mavi/WiFi) + GPIO5 (Kırmızı/GPS)

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Theme colors
const COLORS = {
  primary: "#5E72E4",
  success: "#2DCE89",
  warning: "#FB6340",
  danger: "#F5365C",
  info: "#11CDEF",
  secondary: "#8392AB",
  background: "#F4F5F7",
  white: "#FFFFFF",
  dark: "#172B4D",
  muted: "#ADB5BD",
  border: "#E9ECEF",
};

// LED Colors
const LED_COLORS = {
  blue: "#11CDEF",
  red: "#F5365C",
};

// WiFi LED States (GPIO4 - Mavi)
const WIFI_LED_DATA = [
  {
    id: "wifi-blue-solid",
    color: "blue",
    pattern: "solid",
    statusKey: "led.wifiConnected",
    meaningKey: "led.wifiConnectedMeaning",
  },
  {
    id: "wifi-blue-blink",
    color: "blue",
    pattern: "medium", // 500ms
    statusKey: "led.wifiConnecting",
    meaningKey: "led.wifiConnectingMeaning",
  },
];

// GPS LED States (GPIO5 - Kırmızı)
const GPS_LED_DATA = [
  {
    id: "gps-red-solid",
    color: "red",
    pattern: "solid",
    statusKey: "led.gpsFixed",
    meaningKey: "led.gpsFixedMeaning",
  },
  {
    id: "gps-red-blink",
    color: "red",
    pattern: "fast", // 300ms
    statusKey: "led.gpsSearching",
    meaningKey: "led.gpsSearchingMeaning",
  },
];

// Status combinations for quick reference
const STATUS_COMBINATIONS = [
  {
    id: "both-on",
    wifiColor: "blue",
    wifiPattern: "solid",
    gpsColor: "red",
    gpsPattern: "solid",
    statusKey: "led.statusAllOk",
    meaningKey: "led.statusAllOkMeaning",
    icon: "checkmark-circle",
    iconColor: COLORS.success,
  },
  {
    id: "wifi-blink",
    wifiColor: "blue",
    wifiPattern: "medium",
    gpsColor: "red",
    gpsPattern: "solid",
    statusKey: "led.statusNoWifi",
    meaningKey: "led.statusNoWifiMeaning",
    icon: "wifi-outline",
    iconColor: COLORS.info,
  },
  {
    id: "gps-blink",
    wifiColor: "blue",
    wifiPattern: "solid",
    gpsColor: "red",
    gpsPattern: "fast",
    statusKey: "led.statusNoGps",
    meaningKey: "led.statusNoGpsMeaning",
    icon: "navigate-outline",
    iconColor: COLORS.danger,
  },
  {
    id: "both-blink",
    wifiColor: "blue",
    wifiPattern: "medium",
    gpsColor: "red",
    gpsPattern: "fast",
    statusKey: "led.statusBothIssue",
    meaningKey: "led.statusBothIssueMeaning",
    icon: "warning-outline",
    iconColor: COLORS.warning,
  },
];

// Animated LED Component
const AnimatedLED = ({ color, pattern, size = 20 }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const ledColor = LED_COLORS[color] || LED_COLORS.blue;

  useEffect(() => {
    let animation;
    opacity.setValue(1);

    if (pattern === "solid") {
      // No animation - solid ON
      opacity.setValue(1);
    } else if (pattern === "medium") {
      // 500ms blink (WiFi connecting)
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.1,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else if (pattern === "fast") {
      // 300ms blink (GPS searching)
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.1,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [pattern, opacity]);

  return (
    <View style={[styles.ledContainer, { width: size * 2, height: size * 2 }]}>
      <Animated.View
        style={[
          styles.led,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: ledColor,
            opacity,
            shadowColor: ledColor,
            shadowOpacity: 0.8,
            shadowRadius: 10,
            elevation: 5,
          },
        ]}
      />
      <View
        style={[
          styles.ledGlow,
          {
            width: size * 1.8,
            height: size * 1.8,
            borderRadius: size * 0.9,
            backgroundColor: `${ledColor}30`,
          },
        ]}
      />
    </View>
  );
};

// LED Status Card
const LEDCard = ({ item, t }) => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <AnimatedLED color={item.color} pattern={item.pattern} />
    </View>
    <View style={styles.cardRight}>
      <Text style={[styles.statusText, { color: LED_COLORS[item.color] }]}>
        {t(item.statusKey)}
      </Text>
      <Text style={styles.meaningText}>{t(item.meaningKey)}</Text>
    </View>
  </View>
);

// Status Combination Card
const StatusCard = ({ item, t }) => (
  <View style={styles.statusCard}>
    <View style={styles.statusLeds}>
      <View style={styles.miniLedGroup}>
        <AnimatedLED
          color={item.wifiColor}
          pattern={item.wifiPattern}
          size={12}
        />
        <Text style={styles.miniLabel}>WiFi</Text>
      </View>
      <View style={styles.miniLedGroup}>
        <AnimatedLED
          color={item.gpsColor}
          pattern={item.gpsPattern}
          size={12}
        />
        <Text style={styles.miniLabel}>GPS</Text>
      </View>
    </View>
    <View style={styles.statusInfo}>
      <View style={styles.statusHeader}>
        <Ionicons name={item.icon} size={18} color={item.iconColor} />
        <Text style={[styles.statusTitle, { color: item.iconColor }]}>
          {t(item.statusKey)}
        </Text>
      </View>
      <Text style={styles.statusMeaning}>{t(item.meaningKey)}</Text>
    </View>
  </View>
);

const LEDIndicatorsScreen = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("led.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Device Illustration */}
        <View style={styles.deviceSection}>
          <View style={styles.deviceBox}>
            <Text style={styles.deviceTitle}>TulipFleet GPS Tracker</Text>
            <View style={styles.deviceLeds}>
              <View style={styles.ledGroup}>
                <AnimatedLED color="blue" pattern="solid" size={16} />
                <Text style={styles.ledLabel}>WiFi</Text>
                <Text style={styles.gpioLabel}>GPIO4</Text>
              </View>
              <View style={styles.ledGroup}>
                <AnimatedLED color="red" pattern="solid" size={16} />
                <Text style={styles.ledLabel}>GPS</Text>
                <Text style={styles.gpioLabel}>GPIO5</Text>
              </View>
            </View>
          </View>
          <Text style={styles.deviceSubtitle}>{t("led.deviceSubtitle")}</Text>
        </View>

        {/* Quick Status Reference */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t("led.quickStatus")}</Text>
          </View>
          {STATUS_COMBINATIONS.map((item) => (
            <StatusCard key={item.id} item={item} t={t} />
          ))}
        </View>

        {/* WiFi LED Section (GPIO4 - Blue) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wifi" size={20} color={LED_COLORS.blue} />
            <Text style={styles.sectionTitle}>{t("led.wifiLed")}</Text>
            <Text style={styles.gpioTag}>GPIO4</Text>
          </View>
          {WIFI_LED_DATA.map((item) => (
            <LEDCard key={item.id} item={item} t={t} />
          ))}
        </View>

        {/* GPS LED Section (GPIO5 - Red) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate" size={20} color={LED_COLORS.red} />
            <Text style={styles.sectionTitle}>{t("led.gpsLed")}</Text>
            <Text style={styles.gpioTag}>GPIO5</Text>
          </View>
          {GPS_LED_DATA.map((item) => (
            <LEDCard key={item.id} item={item} t={t} />
          ))}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.infoNoteText}>{t("led.infoNote")}</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.dark,
  },
  content: {
    flex: 1,
  },

  // Device Illustration
  deviceSection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: COLORS.dark,
  },
  deviceBox: {
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 20,
    paddingHorizontal: 30,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A5568",
  },
  deviceTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 16,
    letterSpacing: 1,
  },
  deviceLeds: {
    flexDirection: "row",
    gap: 50,
  },
  ledGroup: {
    alignItems: "center",
  },
  ledLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 8,
    fontWeight: "600",
  },
  gpioLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  deviceSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 16,
  },

  // Sections
  section: {
    margin: 12,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginLeft: 8,
    flex: 1,
  },
  gpioTag: {
    fontSize: 10,
    color: COLORS.muted,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "600",
  },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLeft: {
    marginRight: 16,
  },
  cardRight: {
    flex: 1,
  },
  ledContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  led: {
    zIndex: 2,
  },
  ledGlow: {
    position: "absolute",
    zIndex: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 13,
    color: COLORS.secondary,
    lineHeight: 18,
  },

  // Status Cards
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusLeds: {
    flexDirection: "row",
    gap: 12,
    marginRight: 14,
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  miniLedGroup: {
    alignItems: "center",
  },
  miniLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 4,
    fontWeight: "500",
  },
  statusInfo: {
    flex: 1,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  statusMeaning: {
    fontSize: 12,
    color: COLORS.secondary,
    lineHeight: 16,
  },

  // Info Note
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${COLORS.info}15`,
    margin: 12,
    padding: 14,
    borderRadius: 10,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    marginLeft: 10,
    lineHeight: 18,
  },
});

export default LEDIndicatorsScreen;
