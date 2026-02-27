// src/screens/driver/LEDIndicatorsScreen.js
// TulipFleet - LED Göstergeleri Ekranı
// Updated: UI System Guide v3 uyumlu
// GPIO4 (Mavi/WiFi) + GPIO5 (Kırmızı/GPS)

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
import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// LED Colors - fiziksel LED renkleri (donanım sabiti)
const LED_HW_COLORS = {
  blue: "#11CDEF",
  red: "#F5365C",
};

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
    pattern: "medium",
    statusKey: "led.wifiConnecting",
    meaningKey: "led.wifiConnectingMeaning",
  },
];

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
    pattern: "fast",
    statusKey: "led.gpsSearching",
    meaningKey: "led.gpsSearchingMeaning",
  },
];

const getStatusCombinations = (COLORS) => [
  {
    id: "both-on",
    wifiColor: "blue",
    wifiPattern: "solid",
    gpsColor: "red",
    gpsPattern: "solid",
    statusKey: "led.statusAllOk",
    meaningKey: "led.statusAllOkMeaning",
    icon: "checkmark-circle",
    iconColor: COLORS.SUCCESS,
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
    iconColor: COLORS.INFO,
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
    iconColor: COLORS.ERROR,
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
    iconColor: COLORS.WARNING,
  },
];

const AnimatedLED = ({ color, pattern, size = 20 }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const ledColor = LED_HW_COLORS[color] || LED_HW_COLORS.blue;

  useEffect(() => {
    let animation;
    opacity.setValue(1);
    if (pattern === "solid") {
      opacity.setValue(1);
    } else if (pattern === "medium") {
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
      if (animation) animation.stop();
    };
  }, [pattern, opacity]);

  return (
    <View
      style={{
        width: size * 2,
        height: size * 2,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: ledColor,
          opacity,
          shadowColor: ledColor,
          shadowOpacity: 0.8,
          shadowRadius: 10,
          elevation: 5,
          zIndex: 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 1.8,
          height: size * 1.8,
          borderRadius: size * 0.9,
          backgroundColor: `${ledColor}30`,
          zIndex: 1,
        }}
      />
    </View>
  );
};

const LEDCard = ({ item, t, styles }) => (
  <Card variant="flat" style={styles.ledCard}>
    <View style={styles.ledCardInner}>
      <View style={styles.cardLeft}>
        <AnimatedLED color={item.color} pattern={item.pattern} />
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.statusText, { color: LED_HW_COLORS[item.color] }]}>
          {t(item.statusKey)}
        </Text>
        <Text style={styles.meaningText}>{t(item.meaningKey)}</Text>
      </View>
    </View>
  </Card>
);

const StatusCard = ({ item, t, COLORS, styles }) => (
  <Card variant="flat" style={styles.statusCardOuter}>
    <View style={styles.statusCardInner}>
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
  </Card>
);

const LEDIndicatorsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const STATUS_COMBINATIONS = getStatusCombinations(COLORS);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("led.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>{t("led.quickStatus")}</Text>
          </View>
          {STATUS_COMBINATIONS.map((item) => (
            <StatusCard
              key={item.id}
              item={item}
              t={t}
              COLORS={COLORS}
              styles={styles}
            />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wifi" size={20} color={LED_HW_COLORS.blue} />
            <Text style={styles.sectionTitle}>{t("led.wifiLed")}</Text>
            <Text style={styles.gpioTag}>GPIO4</Text>
          </View>
          {WIFI_LED_DATA.map((item) => (
            <LEDCard key={item.id} item={item} t={t} styles={styles} />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate" size={20} color={LED_HW_COLORS.red} />
            <Text style={styles.sectionTitle}>{t("led.gpsLed")}</Text>
            <Text style={styles.gpioTag}>GPIO5</Text>
          </View>
          {GPS_LED_DATA.map((item) => (
            <LEDCard key={item.id} item={item} t={t} styles={styles} />
          ))}
        </View>

        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={20} color={COLORS.INFO} />
          <Text style={styles.infoNoteText}>{t("led.infoNote")}</Text>
        </View>
        <View style={{ height: COLORS.SPACING.xl }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: COLORS.SPACING.md,
      paddingTop: Platform.OS === "ios" ? 48 : COLORS.SPACING.md,
      paddingBottom: COLORS.SPACING.md,
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { ...COLORS.TYPOGRAPHY.styles.h4, color: COLORS.TEXT_PRIMARY },
    content: { flex: 1 },
    deviceSection: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.lg,
      backgroundColor: COLORS.DEFAULT,
    },
    deviceBox: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.lg,
      paddingHorizontal: COLORS.SPACING.xl,
      alignItems: "center",
      borderWidth: 2,
      borderColor: COLORS.DIVIDER,
    },
    deviceTitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.MUTED,
      marginBottom: COLORS.SPACING.md,
      letterSpacing: 1,
    },
    deviceLeds: { flexDirection: "row", justifyContent: "center" },
    ledGroup: { alignItems: "center", marginHorizontal: COLORS.SPACING.lg },
    ledLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.sm,
    },
    gpioLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    deviceSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.md,
    },
    section: {
      marginHorizontal: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.sm,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
      paddingLeft: COLORS.SPACING.xs,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.label,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.sm,
      flex: 1,
    },
    gpioTag: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      backgroundColor: COLORS.BACKGROUND,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 2,
      borderRadius: COLORS.RADIUS.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    ledCard: { marginBottom: COLORS.SPACING.sm },
    ledCardInner: { flexDirection: "row", alignItems: "center" },
    cardLeft: { marginRight: COLORS.SPACING.md },
    cardRight: { flex: 1 },
    statusText: {
      ...COLORS.TYPOGRAPHY.styles.label,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      marginBottom: COLORS.SPACING.xs,
    },
    meaningText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 18,
    },
    statusCardOuter: { marginBottom: COLORS.SPACING.sm },
    statusCardInner: { flexDirection: "row", alignItems: "center" },
    statusLeds: {
      flexDirection: "row",
      marginRight: COLORS.SPACING.md,
      paddingRight: COLORS.SPACING.md,
      borderRightWidth: 1,
      borderRightColor: COLORS.DIVIDER,
    },
    miniLedGroup: { alignItems: "center", marginRight: COLORS.SPACING.sm },
    miniLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    statusInfo: { flex: 1 },
    statusHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    statusTitle: {
      ...COLORS.TYPOGRAPHY.styles.label,
      marginLeft: COLORS.SPACING.xs,
    },
    statusMeaning: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 16,
    },
    infoNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: COLORS.INFO_LIGHT,
      marginHorizontal: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.sm,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
    },
    infoNoteText: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.INFO,
      marginLeft: COLORS.SPACING.sm,
      lineHeight: 18,
    },
  });

export default LEDIndicatorsScreen;
