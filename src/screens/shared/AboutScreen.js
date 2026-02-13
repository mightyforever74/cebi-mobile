// src/screens/shared/AboutScreen.js
// TulipFleet - Hakkında Ekranı
// Built with Claude Opus 4.5 by Anthropic

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const APP_VERSION = "1.0.0";
const BUILD_DATE = "Şubat 2026";

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    // Hero Section
    heroSection: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
      backgroundColor: COLORS.PRIMARY,
    },
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: 24,
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    logoEmoji: {
      fontSize: 56,
    },
    appName: {
      fontSize: 32,
      fontWeight: "bold",
      color: COLORS.WHITE,
      letterSpacing: 1,
    },
    appTagline: {
      fontSize: 16,
      color: "rgba(255,255,255,0.8)",
      marginTop: 8,
      textAlign: "center",
    },
    versionBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginTop: 16,
    },
    versionText: {
      fontSize: 14,
      color: COLORS.WHITE,
      fontWeight: "600",
    },

    // Info Cards
    cardSection: {
      padding: 16,
    },
    card: {
      backgroundColor: COLORS.CARD,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: COLORS.SHADOW,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT,
      marginBottom: 12,
    },
    cardText: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 22,
    },

    // Built With Section
    builtWithCard: {
      backgroundColor: COLORS.CARD,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: COLORS.PRIMARY,
    },
    builtWithHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    builtWithIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: "#F7F0E6",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    builtWithTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT,
    },
    builtWithSubtitle: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    builtWithText: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 22,
    },
    anthropicBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F7F0E6",
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginTop: 16,
    },
    anthropicText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#CC785C",
      marginLeft: 8,
    },

    // Features List
    featuresList: {
      marginTop: 8,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    featureIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    featureText: {
      fontSize: 14,
      color: COLORS.TEXT,
      flex: 1,
    },

    // Links Section
    linksSection: {
      marginTop: 8,
    },
    linkItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    linkIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    linkText: {
      fontSize: 15,
      color: COLORS.TEXT,
      flex: 1,
    },
    linkArrow: {
      opacity: 0.5,
    },

    // Footer
    footer: {
      alignItems: "center",
      paddingVertical: 24,
      paddingHorizontal: 20,
    },
    footerText: {
      fontSize: 12,
      color: COLORS.MUTED,
      textAlign: "center",
      lineHeight: 20,
    },
    copyright: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 8,
    },
  });

const AboutScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const features = [
    {
      icon: "location",
      color: COLORS.PRIMARY,
      text: t("about.featureTracking", "Gerçek zamanlı GPS takibi"),
    },
    {
      icon: "car",
      color: COLORS.INFO,
      text: t("about.featureFleet", "Filo yönetimi"),
    },
    {
      icon: "clipboard",
      color: COLORS.SUCCESS,
      text: t("about.featureTasks", "Görev atama ve takibi"),
    },
    {
      icon: "speedometer",
      color: COLORS.WARNING,
      text: t("about.featureFuel", "Yakıt ve kilometre takibi"),
    },
    {
      icon: "hardware-chip",
      color: COLORS.ERROR,
      text: t("about.featureESP32", "ESP32 IoT entegrasyonu"),
    },
  ];

  const links = [
    {
      icon: "globe-outline",
      color: COLORS.PRIMARY,
      text: t("about.website", "Web Sitesi"),
      url: "https://tulipfleet.com",
    },
    {
      icon: "mail-outline",
      color: COLORS.INFO,
      text: t("about.contact", "İletişim"),
      url: "mailto:destek@tulipfleet.com",
    },
    {
      icon: "document-text-outline",
      color: COLORS.SUCCESS,
      text: t("about.privacyPolicy", "Gizlilik Politikası"),
      url: "https://tulipfleet.com/privacy",
    },
    {
      icon: "shield-checkmark-outline",
      color: COLORS.WARNING,
      text: t("about.termsOfService", "Kullanım Şartları"),
      url: "https://tulipfleet.com/terms",
    },
  ];

  const handleLinkPress = (url) => {
    Linking.openURL(url).catch((err) => console.error("Link açılamadı:", err));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🚛</Text>
        </View>
        <Text style={styles.appName}>TulipFleet</Text>
        <Text style={styles.appTagline}>
          {t("about.tagline", "Profesyonel Filo Yönetim Sistemi")}
        </Text>
        <View style={styles.versionBadge}>
          <Ionicons name="information-circle" size={16} color="#FFF" />
          <Text style={styles.versionText}>
            {"  "}v{APP_VERSION} • {BUILD_DATE}
          </Text>
        </View>
      </View>

      {/* Cards Section */}
      <View style={styles.cardSection}>
        {/* About Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("about.aboutTitle", "TulipFleet Hakkında")}
          </Text>
          <Text style={styles.cardText}>
            {t(
              "about.aboutText",
              "TulipFleet, lojistik şirketleri için geliştirilmiş kapsamlı bir filo yönetim platformudur. Gerçek zamanlı araç takibi, sürücü yönetimi, görev atama ve yakıt takibi gibi özelliklerle filonuzu verimli bir şekilde yönetmenizi sağlar."
            )}
          </Text>
        </View>

        {/* Built with Claude Card */}
        <View style={styles.builtWithCard}>
          <View style={styles.builtWithHeader}>
            <View style={styles.builtWithIcon}>
              <Text style={{ fontSize: 28 }}>🤖</Text>
            </View>
            <View>
              <Text style={styles.builtWithTitle}>
                {t("about.builtWith", "Yapay Zeka ile Geliştirildi")}
              </Text>
              <Text style={styles.builtWithSubtitle}>
                {t("about.aiPowered", "AI-Powered Development")}
              </Text>
            </View>
          </View>
          <Text style={styles.builtWithText}>
            {t(
              "about.claudeDescription",
              "Bu uygulama, Anthropic tarafından geliştirilen Claude Opus 4.5 yapay zeka modeli ile tasarlanıp kodlanmıştır. Modern yazılım geliştirme ve yapay zeka işbirliğinin bir örneği olarak ortaya çıkmıştır."
            )}
          </Text>
          <View style={styles.anthropicBadge}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <Text style={styles.anthropicText}>
              Built with Claude Opus 4.5 by Anthropic
            </Text>
          </View>
        </View>

        {/* Features Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("about.features", "Özellikler")}
          </Text>
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: `${feature.color}15` },
                  ]}
                >
                  <Ionicons
                    name={feature.icon}
                    size={18}
                    color={feature.color}
                  />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Links Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("about.links", "Bağlantılar")}
          </Text>
          <View style={styles.linksSection}>
            {links.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.linkItem,
                  index === links.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => handleLinkPress(link.url)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.linkIcon,
                    { backgroundColor: `${link.color}15` },
                  ]}
                >
                  <Ionicons name={link.icon} size={20} color={link.color} />
                </View>
                <Text style={styles.linkText}>{link.text}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.MUTED}
                  style={styles.linkArrow}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t("about.madeWith", "Türkiye'de ❤️ ve ☕ ile yapıldı")}
        </Text>
        <Text style={styles.copyright}>
          © 2026 TulipFleet.{" "}
          {t("about.allRightsReserved", "Tüm hakları saklıdır.")}
        </Text>
      </View>
    </ScrollView>
  );
};

export default AboutScreen;
