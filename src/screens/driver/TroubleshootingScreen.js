// src/screens/driver/TroubleshootingScreen.js
// TulipFleet - Sorun Giderme Ekranı
// Created: 21 Ocak 2026

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
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

// Troubleshooting data
const TROUBLESHOOTING_DATA = [
  {
    id: "power",
    icon: "power-outline",
    color: COLORS.danger,
    problemKey: "troubleshooting.problems.noPower",
    solutionKey: "troubleshooting.solutions.noPower",
    steps: [
      "troubleshooting.steps.checkPowerConnection",
      "troubleshooting.steps.checkFuse",
      "troubleshooting.steps.checkVoltage",
    ],
  },
  {
    id: "gps",
    icon: "navigate-outline",
    color: COLORS.warning,
    problemKey: "troubleshooting.problems.noGps",
    solutionKey: "troubleshooting.solutions.noGps",
    steps: [
      "troubleshooting.steps.moveOutdoors",
      "troubleshooting.steps.checkAntenna",
      "troubleshooting.steps.avoidMetal",
    ],
  },
  {
    id: "wifi",
    icon: "wifi-outline",
    color: COLORS.info,
    problemKey: "troubleshooting.problems.noWifi",
    solutionKey: "troubleshooting.solutions.noWifi",
    steps: [
      "troubleshooting.steps.checkPassword",
      "troubleshooting.steps.use24Ghz",
      "troubleshooting.steps.checkSignal",
    ],
  },
  {
    id: "ble",
    icon: "bluetooth-outline",
    color: COLORS.primary,
    problemKey: "troubleshooting.problems.noBle",
    solutionKey: "troubleshooting.solutions.noBle",
    steps: [
      "troubleshooting.steps.restartDevice",
      "troubleshooting.steps.connect60sec",
      "troubleshooting.steps.enableBluetooth",
    ],
  },
  {
    id: "location",
    icon: "location-outline",
    color: COLORS.success,
    problemKey: "troubleshooting.problems.noUpdate",
    solutionKey: "troubleshooting.solutions.noUpdate",
    steps: [
      "troubleshooting.steps.checkInternet",
      "troubleshooting.steps.checkServer",
      "troubleshooting.steps.restartApp",
    ],
  },
  {
    id: "app",
    icon: "phone-portrait-outline",
    color: COLORS.secondary,
    problemKey: "troubleshooting.problems.appCrash",
    solutionKey: "troubleshooting.solutions.appCrash",
    steps: [
      "troubleshooting.steps.updateApp",
      "troubleshooting.steps.clearCache",
      "troubleshooting.steps.reinstall",
    ],
  },
];

const TroubleshootingCard = ({ item, expanded, onToggle, t }) => (
  <View style={styles.card}>
    <TouchableOpacity
      style={styles.cardHeader}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}
      >
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>
      <View style={styles.cardTitleContainer}>
        <Text style={styles.problemText}>{t(item.problemKey)}</Text>
      </View>
      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={20}
        color={COLORS.muted}
      />
    </TouchableOpacity>

    {expanded && (
      <View style={styles.cardContent}>
        <View style={styles.solutionHeader}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.solutionTitle}>
            {t("troubleshooting.solution")}
          </Text>
        </View>
        <Text style={styles.solutionText}>{t(item.solutionKey)}</Text>

        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>
            {t("troubleshooting.stepsToTry")}
          </Text>
          {item.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{t(step)}</Text>
            </View>
          ))}
        </View>
      </View>
    )}
  </View>
);

const TroubleshootingScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

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
        <Text style={styles.headerTitle}>{t("troubleshooting.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={COLORS.info} />
          <Text style={styles.infoBannerText}>
            {t("troubleshooting.tapToExpand")}
          </Text>
        </View>

        {/* Troubleshooting Cards */}
        {TROUBLESHOOTING_DATA.map((item) => (
          <TroubleshootingCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => toggleExpand(item.id)}
            t={t}
          />
        ))}

        {/* Still Need Help */}
        <View style={styles.helpSection}>
          <Ionicons name="help-buoy" size={32} color={COLORS.primary} />
          <Text style={styles.helpTitle}>
            {t("troubleshooting.stillNeedHelp")}
          </Text>
          <Text style={styles.helpText}>{t("troubleshooting.contactUs")}</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactEmail}>
              📧 mightyforever74@gmail.com
            </Text>
          </View>
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
    padding: 12,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.info}15`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    marginLeft: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  problemText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  solutionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  solutionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.success,
    marginLeft: 6,
  },
  solutionText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
  },
  stepsContainer: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 22,
  },
  helpSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginTop: 10,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 12,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.secondary,
    marginTop: 6,
    textAlign: "center",
  },
  contactInfo: {
    marginTop: 12,
  },
  contactEmail: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
});

export default TroubleshootingScreen;
