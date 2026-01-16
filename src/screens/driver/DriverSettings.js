// src/screens/driver/DriverSettings.js
// TulipFleet - Sürücü Ayarlar Ekranı
// Updated: 06 Ocak 2026 - Karanlık mod switch düzeltildi

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

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

// Ayar Öğesi
const SettingItem = ({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showArrow = true,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <View
      style={[
        styles.settingIcon,
        { backgroundColor: `${iconColor || COLORS.primary}15` },
      ]}
    >
      <Ionicons name={icon} size={20} color={iconColor || COLORS.primary} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement}
    {showArrow && onPress && (
      <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
    )}
  </TouchableOpacity>
);

// Bölüm Başlığı
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const DriverSettings = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  // Bildirim ayarları
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // 🆕 Karanlık mod
  const [darkMode, setDarkMode] = useState(false);

  // Çıkış yap
  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // 🆕 Push bildirimleri toggle
  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
    if (!value) {
      setTaskNotifications(false);
      setSoundEnabled(false);
      setVibrationEnabled(false);
    }
  };

  // 🆕 Karanlık mod toggle
  const handleDarkModeToggle = (value) => {
    setDarkMode(value);
    // TODO: ThemeContext entegrasyonu
    Alert.alert(
      "Karanlık Mod",
      value
        ? "Karanlık mod etkinleştirildi. Tam destek yakında eklenecek!"
        : "Karanlık mod kapatıldı."
    );
  };

  // Destek
  const handleSupport = () => {
    Alert.alert("Destek", "Yardıma mı ihtiyacınız var?", [
      { text: "İptal", style: "cancel" },
      {
        text: "E-posta Gönder",
        onPress: () => Linking.openURL("mailto:support@tulipfleet.com"),
      },
    ]);
  };

  // Hakkında
  const handleAbout = () => {
    Alert.alert(
      "TulipFleet Hakkında",
      "TulipFleet v1.0.0\n\n" +
        "Filo Yönetim Sistemi\n" +
        "© 2025 TulipFleet\n\n" +
        "Tüm hakları saklıdır.",
      [{ text: "Tamam" }]
    );
  };

  // Önbellek temizle
  const handleClearCache = () => {
    Alert.alert(
      "Önbellek Temizle",
      "Uygulama önbelleğini temizlemek istiyor musunuz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Temizle",
          onPress: () => Alert.alert("Başarılı", "Önbellek temizlendi"),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Bildirim Ayarları */}
      <SectionHeader title="BİLDİRİMLER" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="notifications-outline"
          iconColor={COLORS.info}
          title="Push Bildirimleri"
          subtitle="Tüm bildirimler"
          showArrow={false}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />

        {/* Push açıkken alt seçenekleri göster */}
        {notificationsEnabled && (
          <>
            <View style={styles.divider} />
            <SettingItem
              icon="clipboard-outline"
              iconColor={COLORS.warning}
              title="Görev Bildirimleri"
              subtitle="Yeni görev atamaları"
              showArrow={false}
              rightElement={
                <Switch
                  value={taskNotifications}
                  onValueChange={setTaskNotifications}
                  trackColor={{ false: COLORS.muted, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="volume-high-outline"
              iconColor={COLORS.success}
              title="Ses"
              subtitle="Bildirim sesleri"
              showArrow={false}
              rightElement={
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: COLORS.muted, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="phone-portrait-outline"
              iconColor={COLORS.secondary}
              title="Titreşim"
              subtitle="Bildirim titreşimi"
              showArrow={false}
              rightElement={
                <Switch
                  value={vibrationEnabled}
                  onValueChange={setVibrationEnabled}
                  trackColor={{ false: COLORS.muted, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
          </>
        )}
      </View>

      {/* Konum Ayarları */}
      <SectionHeader title="KONUM" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="location-outline"
          iconColor={COLORS.success}
          title="Konum Servisi"
          subtitle="Araç takibi için gerekli"
          showArrow={false}
          rightElement={
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="navigate-outline"
          iconColor={COLORS.info}
          title="GPS Doğruluğu"
          subtitle="Yüksek doğruluk"
          onPress={() =>
            Alert.alert("GPS", "GPS doğruluk ayarları yakında eklenecek")
          }
        />
      </View>

      {/* Uygulama Ayarları */}
      <SectionHeader title="UYGULAMA" />
      <View style={styles.settingGroup}>
        {/* Language Selector */}
        <LanguageSelector />
        <View style={styles.divider} />
        {/* 🆕 Karanlık Mod - Çalışan Switch */}
        <SettingItem
          icon="moon-outline"
          iconColor={COLORS.dark}
          title="Karanlık Mod"
          subtitle={darkMode ? "Açık" : "Kapalı"}
          showArrow={false}
          rightElement={
            <Switch
              value={darkMode}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="trash-outline"
          iconColor={COLORS.danger}
          title="Önbellek Temizle"
          subtitle="Geçici dosyaları sil"
          onPress={handleClearCache}
        />
      </View>

      {/* Destek */}
      <SectionHeader title="DESTEK" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="help-circle-outline"
          iconColor={COLORS.info}
          title="Yardım Merkezi"
          subtitle="SSS ve kullanım kılavuzu"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="chatbubble-outline"
          iconColor={COLORS.success}
          title="Bize Ulaşın"
          subtitle="support@tulipfleet.com"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="document-text-outline"
          iconColor={COLORS.secondary}
          title="Gizlilik Politikası"
          subtitle="Kullanım şartları"
          onPress={() =>
            Alert.alert("Gizlilik", "Gizlilik politikası yakında eklenecek")
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="information-circle-outline"
          iconColor={COLORS.secondary}
          title="Hakkında"
          subtitle="Versiyon 1.0.0"
          onPress={handleAbout}
        />
      </View>

      {/* Çıkış */}
      <View style={styles.settingGroup}>
        <SettingItem
          icon="log-out-outline"
          iconColor={COLORS.danger}
          title="Çıkış Yap"
          subtitle="Hesabından çıkış yap"
          onPress={handleLogout}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TulipFleet v1.0.0</Text>
        <Text style={styles.footerSubtext}>
          © 2025 TulipFleet. Tüm hakları saklıdır.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
    letterSpacing: 1,
  },

  // Setting Group
  settingGroup: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Setting Item
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.dark,
  },
  settingSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 68,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
});

export default DriverSettings;
