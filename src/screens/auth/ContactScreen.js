// src/screens/auth/ContactScreen.js
// TulipFleet - Bize Ulaşın (Hesabı olmayanlar için iletişim)
// Created: 05 Şubat 2026
// Updated: UI System Guide v3 uyumlu

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const ContactScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const handleEmail = () => {
    const subject = encodeURIComponent(
      t("auth.contactEmailSubject") || "TulipFleet - Hesap Başvurusu"
    );
    const body = encodeURIComponent(
      t("auth.contactEmailBody") ||
        "Merhaba,\n\nTulipFleet uygulaması için hesap açmak istiyorum.\n\nŞirket Adı:\nİletişim Kişisi:\nTelefon:\nAraç Sayısı:\n\nTeşekkürler."
    );
    Linking.openURL(
      `mailto:info@tulipfleet.com?subject=${subject}&body=${body}`
    );
  };

  const handlePhone = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert(
        t("common.error") || "Hata",
        t("auth.callNotAvailable") || "Arama yapılamıyor"
      );
    });
  };

  const handleWhatsApp = (number) => {
    const cleanNumber = number.replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      t("auth.whatsappMessage") ||
        "Merhaba, TulipFleet hakkında bilgi almak istiyorum."
    );
    Linking.openURL(
      `whatsapp://send?phone=${cleanNumber}&text=${message}`
    ).catch(() => {
      Linking.openURL(`https://wa.me/${cleanNumber}?text=${message}`);
    });
  };

  const handleWebsite = () => {
    Linking.openURL("https://tulipfleet.com");
  };

  // ============================================
  // Contact Card Component
  // ============================================
  const ContactCard = ({
    icon,
    iconColor,
    title,
    subtitle,
    onPress,
    actionIcon,
  }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.contactIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons
        name={actionIcon || "chevron-forward"}
        size={20}
        color={COLORS.TEXT_SECONDARY}
      />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        <Text style={styles.backText}>
          {t("auth.backToLogin") || "Giriş Ekranı"}
        </Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="chatbubbles-outline"
            size={48}
            color={COLORS.PRIMARY}
          />
        </View>
        <Text style={styles.headerTitle}>
          {t("auth.contactTitle") || "Bize Ulaşın"}
        </Text>
        <Text style={styles.headerDescription}>
          {t("auth.contactDescription") ||
            "TulipFleet'e katılmak veya bilgi almak için bizimle iletişime geçin. Hesap açma işlemi yönetici tarafından yapılmaktadır."}
        </Text>
      </View>

      {/* Contact Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("auth.contactMethods") || "İLETİŞİM KANALLARI"}
        </Text>

        <ContactCard
          icon="mail-outline"
          iconColor={COLORS.INFO}
          title="E-posta"
          subtitle="info@tulipfleet.com"
          onPress={handleEmail}
          actionIcon="open-outline"
        />

        <ContactCard
          icon="call-outline"
          iconColor={COLORS.SUCCESS}
          title={t("auth.phoneNL") || "Telefon (NL)"}
          subtitle="+31 6 8367 4537"
          onPress={() => handlePhone("+31683674537")}
          actionIcon="call-outline"
        />

        <ContactCard
          icon="call-outline"
          iconColor={COLORS.SUCCESS}
          title={t("auth.phoneTR") || "Telefon (TR)"}
          subtitle="+90 533 325 6180"
          onPress={() => handlePhone("+905333256180")}
          actionIcon="call-outline"
        />

        <ContactCard
          icon="logo-whatsapp"
          iconColor={COLORS.SUCCESS}
          title="WhatsApp"
          subtitle="+31 6 8367 4537"
          onPress={() => handleWhatsApp("+31683674537")}
          actionIcon="open-outline"
        />

        <ContactCard
          icon="globe-outline"
          iconColor={COLORS.PRIMARY}
          title={t("auth.website") || "Web Sitesi"}
          subtitle="tulipfleet.com"
          onPress={handleWebsite}
          actionIcon="open-outline"
        />
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle"
          size={24}
          color={COLORS.PRIMARY}
          style={styles.infoIcon}
        />
        <Text style={styles.infoText}>
          {t("auth.contactInfo") ||
            "TulipFleet hesabınız şirket yöneticiniz tarafından oluşturulur. Hesabınız oluşturulduktan sonra giriş bilgileriniz e-posta ile gönderilecektir."}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TulipFleet</Text>
        <Text style={styles.footerSubtext}>© 2026 TulipFleet</Text>
      </View>
    </ScrollView>
  );
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
      paddingHorizontal: COLORS.SPACING.md,
      paddingTop: 56, // SafeArea (8px grid: 7*8)
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.lg,
    },
    backText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.sm,
    },
    header: {
      alignItems: "center",
      marginBottom: COLORS.SPACING.xl,
    },
    headerIcon: {
      marginBottom: COLORS.SPACING.md,
    },
    headerTitle: {
      ...COLORS.TYPOGRAPHY.styles.h2,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    headerDescription: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: COLORS.SPACING.sm,
    },
    section: {
      marginBottom: COLORS.SPACING.lg,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      letterSpacing: 1,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm,
      paddingLeft: COLORS.SPACING.xs,
    },
    contactCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.CARD,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.xs,
    },
    contactIcon: {
      width: 44, // 8px grid
      height: 44,
      borderRadius: COLORS.RADIUS.card,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
    },
    contactContent: {
      flex: 1,
    },
    contactTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
    },
    contactSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    infoBox: {
      flexDirection: "row",
      backgroundColor: COLORS.INFO_LIGHT,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      borderWidth: 1,
      borderColor: COLORS.INFO_LIGHT,
      marginBottom: COLORS.SPACING.lg,
    },
    infoIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    infoText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.INFO,
      lineHeight: 20,
      flex: 1,
    },
    footer: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.lg,
    },
    footerText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_SECONDARY,
    },
    footerSubtext: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
  });

export default ContactScreen;
