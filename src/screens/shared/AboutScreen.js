// src/screens/shared/AboutScreen.js
// TulipFleet - Hakkında Ekranı
// Built with Claude Opus 4.5 by Anthropic
// Updated: UI System Guide v3 uyumlu

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
import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const APP_VERSION = "1.0.0";
const BUILD_DATE = "Şubat 2026";

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
          <Ionicons name="information-circle" size={16} color={COLORS.WHITE} />
          <Text style={styles.versionText}>
            {"  "}v{APP_VERSION} • {BUILD_DATE}
          </Text>
        </View>
      </View>

      {/* Cards Section */}
      <View style={styles.cardSection}>
        {/* About Card */}
        <Card variant="flat" style={styles.cardMargin}>
          <Text style={styles.cardTitle}>
            {t("about.aboutTitle", "TulipFleet Hakkında")}
          </Text>
          <Text style={styles.cardText}>
            {t(
              "about.aboutText",
              "TulipFleet, lojistik şirketleri için geliştirilmiş kapsamlı bir filo yönetim platformudur. Gerçek zamanlı araç takibi, sürücü yönetimi, görev atama ve yakıt takibi gibi özelliklerle filonuzu verimli bir şekilde yönetmenizi sağlar."
            )}
          </Text>
        </Card>

        {/* Built with Claude Card */}
        <Card variant="flat" style={styles.builtWithCard}>
          <View style={styles.builtWithHeader}>
            <View style={styles.builtWithIcon}>
              <Text style={styles.emojiText}>🤖</Text>
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
            <Text style={styles.emojiSmall}>✨</Text>
            <Text style={styles.anthropicText}>
              Built with Claude Opus 4.5 by Anthropic
            </Text>
          </View>
        </Card>

        {/* Features Card */}
        <Card variant="flat" style={styles.cardMargin}>
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
        </Card>

        {/* Links Card */}
        <Card variant="flat" style={styles.cardMargin}>
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
        </Card>
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

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    scrollContent: {
      paddingBottom: COLORS.SPACING.xxl,
    },
    // Hero Section
    heroSection: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xxl,
      paddingHorizontal: COLORS.SPACING.md,
      backgroundColor: COLORS.PRIMARY,
    },
    logoContainer: {
      width: 96, // 8px grid: 12*8
      height: 96,
      borderRadius: COLORS.RADIUS.xxl,
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
      ...COLORS.SHADOWS.lg,
    },
    logoEmoji: {
      fontSize: 56,
    },
    appName: {
      ...COLORS.TYPOGRAPHY.styles.h1,
      color: COLORS.WHITE,
      letterSpacing: 1,
    },
    appTagline: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.WHITE_80,
      marginTop: COLORS.SPACING.sm,
      textAlign: "center",
    },
    versionBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.WHITE_20,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xl,
      marginTop: COLORS.SPACING.md,
    },
    versionText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.WHITE,
    },

    // Cards Section
    cardSection: {
      padding: COLORS.SPACING.md,
    },
    cardMargin: {
      marginBottom: COLORS.SPACING.md,
    },
    cardTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    cardText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 22,
    },

    // Built With Card
    builtWithCard: {
      marginBottom: COLORS.SPACING.md,
      borderWidth: 2,
      borderColor: COLORS.PRIMARY,
    },
    builtWithHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
    },
    builtWithIcon: {
      width: 48, // 8px grid: 6*8
      height: 48,
      borderRadius: COLORS.RADIUS.card,
      backgroundColor: COLORS.WARNING_LIGHT,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    emojiText: {
      fontSize: 28,
    },
    emojiSmall: {
      fontSize: 20,
    },
    builtWithTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_PRIMARY,
    },
    builtWithSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    builtWithText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 22,
    },
    anthropicBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.WARNING_LIGHT,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      marginTop: COLORS.SPACING.md,
    },
    anthropicText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.WARNING,
      marginLeft: COLORS.SPACING.sm,
    },

    // Features List
    featuresList: {
      marginTop: COLORS.SPACING.sm,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    featureIcon: {
      width: 32, // 8px grid: 4*8
      height: 32,
      borderRadius: COLORS.RADIUS.button,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    featureText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
      flex: 1,
    },

    // Links Section
    linksSection: {
      marginTop: COLORS.SPACING.sm,
    },
    linkItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm + COLORS.SPACING.xs, // 12
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    linkIcon: {
      width: 40, // 8px grid: 5*8
      height: 40,
      borderRadius: COLORS.RADIUS.sm,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    linkText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_PRIMARY,
      flex: 1,
    },
    linkArrow: {
      opacity: 0.5,
    },

    // Footer
    footer: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.lg,
      paddingHorizontal: COLORS.SPACING.md,
    },
    footerText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      textAlign: "center",
      lineHeight: 20,
    },
    copyright: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.sm,
    },
  });

export default AboutScreen;
