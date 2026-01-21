// src/screens/driver/LEDIndicatorsScreen.js
// TulipFleet - LED Göstergeleri Ekranı
// Created: 21 Ocak 2026

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
  green: "#2DCE89",
  blue: "#11CDEF",
  yellow: "#FFC107",
  red: "#F5365C",
};

// LED Data
const LED_DATA = [
  {
    id: "green-solid",
    color: "green",
    pattern: "solid",
    statusKey: "led.greenSolid",
    meaningKey: "led.greenSolidMeaning",
    icon: "checkmark-circle",
  },
  {
    id: "green-slow",
    color: "green",
    pattern: "slow",
    statusKey: "led.greenSlow",
    meaningKey: "led.greenSlowMeaning",
    icon: "wifi",
  },
  {
    id: "blue-fast",
    color: "blue",
    pattern: "fast",
    statusKey: "led.blueFast",
    meaningKey: "led.blueFastMeaning",
    icon: "bluetooth",
  },
  {
    id: "blue-solid",
    color: "blue",
    pattern: "solid",
    statusKey: "led.blueSolid",
    meaningKey: "led.blueSolidMeaning",
    icon: "link",
  },
  {
    id: "yellow-blink",
    color: "yellow",
    pattern: "slow",
    statusKey: "led.yellowBlink",
    meaningKey: "led.yellowBlinkMeaning",
    icon: "navigate",
  },
  {
    id: "red-solid",
    color: "red",
    pattern: "solid",
    statusKey: "led.redSolid",
    meaningKey: "led.redSolidMeaning",
    icon: "alert-circle",
  },
  {
    id: "red-fast",
    color: "red",
    pattern: "fast",
    statusKey: "led.redFast",
    meaningKey: "led.redFastMeaning",
    icon: "close-circle",
  },
];

// Animated LED Component
const AnimatedLED = ({ color, pattern }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const ledColor = LED_COLORS[color] || LED_COLORS.green;

  useEffect(() => {
    let animation;

    if (pattern === "solid") {
      // Solid - no animation
      opacity.setValue(1);
    } else if (pattern === "slow") {
      // Slow blink - 1 second interval
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else if (pattern === "fast") {
      // Fast blink - 300ms interval
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
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
    <View style={styles.ledContainer}>
      <Animated.View
        style={[
          styles.led,
          {
            backgroundColor: ledColor,
            opacity,
            shadowColor: ledColor,
            shadowOpacity: 0.8,
            shadowRadius: 10,
            elevation: 5,
          },
        ]}
      />
      <View style={[styles.ledGlow, { backgroundColor: `${ledColor}30` }]} />
    </View>
  );
};

const LEDCard = ({ item, t }) => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <AnimatedLED color={item.color} pattern={item.pattern} />
    </View>
    <View style={styles.cardRight}>
      <View style={styles.statusRow}>
        <Ionicons
          name={item.icon}
          size={16}
          color={LED_COLORS[item.color]}
          style={styles.statusIcon}
        />
        <Text style={styles.statusText}>{t(item.statusKey)}</Text>
      </View>
      <Text style={styles.meaningText}>{t(item.meaningKey)}</Text>
    </View>
  </View>
);

const LEDIndicatorsScreen = ({ navigation }) => {
  const { t } = useTranslation();

  // Group LEDs by color
  const greenLeds = LED_DATA.filter((l) => l.color === "green");
  const blueLeds = LED_DATA.filter((l) => l.color === "blue");
  const yellowLeds = LED_DATA.filter((l) => l.color === "yellow");
  const redLeds = LED_DATA.filter((l) => l.color === "red");

  const LEDSection = ({ title, color, leds }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View
          style={[styles.sectionDot, { backgroundColor: LED_COLORS[color] }]}
        />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {leds.map((item) => (
        <LEDCard key={item.id} item={item} t={t} />
      ))}
    </View>
  );

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
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeds}>
            <AnimatedLED color="green" pattern="solid" />
            <AnimatedLED color="blue" pattern="fast" />
            <AnimatedLED color="yellow" pattern="slow" />
            <AnimatedLED color="red" pattern="solid" />
          </View>
          <Text style={styles.heroTitle}>{t("led.heroTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("led.heroSubtitle")}</Text>
        </View>

        {/* LED Sections */}
        <LEDSection title={t("led.green")} color="green" leds={greenLeds} />
        <LEDSection title={t("led.blue")} color="blue" leds={blueLeds} />
        <LEDSection title={t("led.yellow")} color="yellow" leds={yellowLeds} />
        <LEDSection title={t("led.red")} color="red" leds={redLeds} />

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
  hero: {
    backgroundColor: COLORS.dark,
    padding: 24,
    alignItems: "center",
  },
  heroLeds: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
  section: {
    margin: 12,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
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
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  led: {
    width: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 2,
  },
  ledGlow: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    zIndex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  meaningText: {
    fontSize: 13,
    color: COLORS.secondary,
    lineHeight: 18,
  },
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
