// src/screens/auth/ContactScreen.js
// TulipFleet - Bize Ulaşın (Hesabı olmayanlar için iletişim)
// Created: 05 Şubat 2026

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
import { COLORS } from "../../constants/config";

const ContactScreen = ({ navigation }) => {
  const { t } = useTranslation();

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
      // WhatsApp yoksa normal link aç
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
        color={COLORS.textSecondary}
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
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
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
            color={COLORS.primary}
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
          iconColor="#3B82F6"
          title="E-posta"
          subtitle="info@tulipfleet.com"
          onPress={handleEmail}
          actionIcon="open-outline"
        />

        <ContactCard
          icon="call-outline"
          iconColor="#10B981"
          title={t("auth.phoneNL") || "Telefon (NL)"}
          subtitle="+31 6 8367 4537"
          onPress={() => handlePhone("+31683674537")}
          actionIcon="call-outline"
        />

        <ContactCard
          icon="call-outline"
          iconColor="#10B981"
          title={t("auth.phoneTR") || "Telefon (TR)"}
          subtitle="+90 533 325 6180"
          onPress={() => handlePhone("+905333256180")}
          actionIcon="call-outline"
        />

        <ContactCard
          icon="logo-whatsapp"
          iconColor="#25D366"
          title="WhatsApp"
          subtitle="+31 6 8367 4537"
          onPress={() => handleWhatsApp("+31683674537")}
          actionIcon="open-outline"
        />

        <ContactCard
          icon="globe-outline"
          iconColor="#8B5CF6"
          title={t("auth.website") || "Web Sitesi"}
          subtitle="tulipfleet.com"
          onPress={handleWebsite}
          actionIcon="open-outline"
        />
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color={COLORS.primary} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  headerDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: COLORS.textSecondary,
    marginBottom: 12,
    paddingLeft: 4,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  contactSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default ContactScreen;
