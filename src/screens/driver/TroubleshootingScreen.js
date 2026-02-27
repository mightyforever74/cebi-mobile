// src/screens/driver/TroubleshootingScreen.js
// TulipFleet - Sorun Giderme Ekranı
// Updated: UI System Guide v3 uyumlu

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
import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const getTroubleshootingData = (COLORS) => [
  {
    id: "power",
    icon: "power-outline",
    color: COLORS.ERROR,
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
    color: COLORS.WARNING,
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
    color: COLORS.INFO,
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
    color: COLORS.PRIMARY,
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
    color: COLORS.SUCCESS,
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
    color: COLORS.TEXT_SECONDARY,
    problemKey: "troubleshooting.problems.appCrash",
    solutionKey: "troubleshooting.solutions.appCrash",
    steps: [
      "troubleshooting.steps.updateApp",
      "troubleshooting.steps.clearCache",
      "troubleshooting.steps.reinstall",
    ],
  },
];

const TroubleshootingCard = ({
  item,
  expanded,
  onToggle,
  t,
  COLORS,
  styles,
}) => (
  <Card variant="flat" style={styles.troubleCard}>
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
        color={COLORS.MUTED}
      />
    </TouchableOpacity>
    {expanded && (
      <View style={styles.cardContent}>
        <View style={styles.solutionHeader}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.SUCCESS} />
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
  </Card>
);

const TroubleshootingScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [expandedId, setExpandedId] = useState(null);
  const TROUBLESHOOTING_DATA = getTroubleshootingData(COLORS);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("troubleshooting.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={COLORS.INFO} />
          <Text style={styles.infoBannerText}>
            {t("troubleshooting.tapToExpand")}
          </Text>
        </View>

        {TROUBLESHOOTING_DATA.map((item) => (
          <TroubleshootingCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() =>
              setExpandedId(expandedId === item.id ? null : item.id)
            }
            t={t}
            COLORS={COLORS}
            styles={styles}
          />
        ))}

        <Card variant="flat" style={styles.helpCard}>
          <View style={styles.helpInner}>
            <Ionicons name="help-buoy" size={32} color={COLORS.PRIMARY} />
            <Text style={styles.helpTitle}>
              {t("troubleshooting.stillNeedHelp")}
            </Text>
            <Text style={styles.helpText}>
              {t("troubleshooting.contactUs")}
            </Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactEmail}>mightyforever74@gmail.com</Text>
            </View>
          </View>
        </Card>
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
    content: { flex: 1, padding: COLORS.SPACING.sm },
    infoBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.INFO_LIGHT,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.md,
    },
    infoBannerText: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.INFO,
      marginLeft: COLORS.SPACING.sm,
    },
    troubleCard: { marginBottom: COLORS.SPACING.sm, overflow: "hidden" },
    cardHeader: { flexDirection: "row", alignItems: "center" },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.card,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    cardTitleContainer: { flex: 1 },
    problemText: {
      ...COLORS.TYPOGRAPHY.styles.label,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_PRIMARY,
    },
    cardContent: {
      paddingTop: COLORS.SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      marginTop: COLORS.SPACING.md,
    },
    solutionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    solutionTitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.SUCCESS,
      marginLeft: COLORS.SPACING.xs,
    },
    solutionText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
      lineHeight: 20,
    },
    stepsContainer: {
      marginTop: COLORS.SPACING.md,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
    },
    stepsTitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.sm,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    stepNumberText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    stepText: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
      lineHeight: 22,
    },
    helpCard: { marginTop: COLORS.SPACING.sm },
    helpInner: { alignItems: "center" },
    helpTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.sm,
    },
    helpText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
      textAlign: "center",
    },
    contactInfo: { marginTop: COLORS.SPACING.sm },
    contactEmail: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.PRIMARY,
    },
  });

export default TroubleshootingScreen;
