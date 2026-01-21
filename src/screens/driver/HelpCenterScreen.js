// src/screens/driver/HelpCenterScreen.js
// TulipFleet - Yardım Merkezi (PDF Kılavuz)
// Created: 21 Ocak 2026

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const { width, height } = Dimensions.get("window");

// Theme colors
const COLORS = {
  primary: "#5E72E4",
  success: "#2DCE89",
  warning: "#FB6340",
  info: "#11CDEF",
  secondary: "#8392AB",
  background: "#F4F5F7",
  white: "#FFFFFF",
  dark: "#172B4D",
  muted: "#ADB5BD",
  border: "#E9ECEF",
};

// Quick help topics
const QUICK_TOPICS = [
  {
    id: "troubleshooting",
    icon: "build-outline",
    color: COLORS.warning,
    titleKey: "help.troubleshooting",
    screen: "TroubleshootingScreen",
  },
  {
    id: "led",
    icon: "bulb-outline",
    color: COLORS.success,
    titleKey: "help.ledIndicators",
    screen: "LEDIndicatorsScreen",
  },
  {
    id: "contact",
    icon: "call-outline",
    color: COLORS.info,
    titleKey: "help.contactSupport",
    action: "contact",
  },
];

const HelpCenterScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const [pdfLoading, setPdfLoading] = useState(true);
  const [showPdf, setShowPdf] = useState(false);

  // PDF URL by locale (fallback to Turkish until others are available)
  const PDF_URLS = {
    tr: "https://tulipfleet.com/docs/kullanim-kilavuzu.pdf",
  };
  const currentLang = (i18n?.language || "tr").split("-")[0];
  const PDF_URL = PDF_URLS[currentLang] || PDF_URLS.tr;

  // Google Docs Viewer ile PDF gösterme
  const pdfViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(PDF_URL)}`;

  const handleTopicPress = (topic) => {
    if (topic.screen) {
      navigation.navigate(topic.screen);
    } else if (topic.action === "contact") {
      // Contact support action
      navigation.navigate("DriverSettings");
    }
  };

  const QuickTopicCard = ({ topic }) => (
    <TouchableOpacity
      style={styles.topicCard}
      onPress={() => handleTopicPress(topic)}
      activeOpacity={0.7}
    >
      <View style={[styles.topicIcon, { backgroundColor: `${topic.color}15` }]}>
        <Ionicons name={topic.icon} size={24} color={topic.color} />
      </View>
      <Text style={styles.topicTitle}>{t(topic.titleKey)}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>{t("help.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>{t("help.heroTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("help.heroSubtitle")}</Text>
        </View>

        {/* Quick Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("help.quickHelp")}</Text>
          {QUICK_TOPICS.map((topic) => (
            <QuickTopicCard key={topic.id} topic={topic} />
          ))}
        </View>

        {/* User Manual Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("help.userManual")}</Text>
          <TouchableOpacity
            style={styles.manualCard}
            onPress={() => setShowPdf(!showPdf)}
            activeOpacity={0.7}
          >
            <View style={styles.manualCardContent}>
              <View
                style={[
                  styles.topicIcon,
                  { backgroundColor: `${COLORS.primary}15` },
                ]}
              >
                <Ionicons
                  name="document-text"
                  size={24}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.manualInfo}>
                <Text style={styles.manualTitle}>TulipFleet GPS Tracker</Text>
                <Text style={styles.manualSubtitle}>
                  {t("help.version")} 4.3 • PDF
                </Text>
              </View>
            </View>
            <View style={styles.manualAction}>
              <Ionicons
                name={showPdf ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.manualActionText}>
                {showPdf ? t("help.hide") : t("help.view")}
              </Text>
            </View>
          </TouchableOpacity>

          {/* PDF Viewer */}
          {showPdf && (
            <View style={styles.pdfContainer}>
              {pdfLoading && (
                <View style={styles.pdfLoading}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>{t("help.loadingPdf")}</Text>
                </View>
              )}
              <WebView
                source={{ uri: pdfViewerUrl }}
                style={[styles.pdfViewer, pdfLoading && { opacity: 0 }]}
                onLoadEnd={() => setPdfLoading(false)}
                onError={() => setPdfLoading(false)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
              />
            </View>
          )}
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>{t("help.needMoreHelp")}</Text>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.contactText}>support@tulipfleet.com</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.contactText}>+31 6 8367 4537 (NL)</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.contactText}>+90 533 325 6180 (TR)</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="globe-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.contactText}>www.tulipfleet.com/support</Text>
          </View>
        </View>

        {/* Footer spacing */}
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
  heroSection: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topicIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topicTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.dark,
  },
  manualCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  manualCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  manualInfo: {
    flex: 1,
  },
  manualTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  manualSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },
  manualAction: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: "center",
  },
  manualActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
    marginLeft: 6,
  },
  pdfContainer: {
    height: 400,
    marginTop: 12,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
  pdfViewer: {
    flex: 1,
  },
  pdfLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.secondary,
  },
  contactSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 16,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.dark,
    marginLeft: 10,
  },
});

export default HelpCenterScreen;
