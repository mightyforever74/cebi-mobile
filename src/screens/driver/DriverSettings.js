// src/screens/driver/DriverSettings.js
// TulipFleet - Sürücü Ayarlar Ekranı
// Updated: 17 Ocak 2026 - i18n çoklu dil desteği eklendi
import LanguageSelector from "../../components/LanguageSelector";

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

  // Karanlık mod
  const [darkMode, setDarkMode] = useState(false);

  // Çıkış yap
  const handleLogout = () => {
    Alert.alert(
      t("settings.logoutConfirmTitle"),
      t("settings.logoutConfirmMessage"),
      [
        { text: t("settings.cancel"), style: "cancel" },
        {
          text: t("settings.logout"),
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // Push bildirimleri toggle
  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
    if (!value) {
      setTaskNotifications(false);
      setSoundEnabled(false);
      setVibrationEnabled(false);
    }
  };

  // Karanlık mod toggle
  const handleDarkModeToggle = (value) => {
    setDarkMode(value);
    Alert.alert(
      t("settings.darkMode"),
      value ? t("settings.darkModeEnabled") : t("settings.darkModeDisabled")
    );
  };

  // Destek
  const handleSupport = () => {
    Alert.alert(t("settings.supportTitle"), t("settings.supportMessage"), [
      { text: t("settings.cancel"), style: "cancel" },
      {
        text: t("settings.sendEmail"),
        onPress: () => Linking.openURL("mailto:support@tulipfleet.com"),
      },
    ]);
  };

  // Hakkında
  const handleAbout = () => {
    Alert.alert(t("settings.aboutTitle"), t("settings.aboutMessage"), [
      { text: t("common.ok") },
    ]);
  };

  // Önbellek temizle
  const handleClearCache = () => {
    Alert.alert(
      t("settings.clearCacheTitle"),
      t("settings.clearCacheMessage"),
      [
        { text: t("settings.cancel"), style: "cancel" },
        {
          text: t("settings.clear"),
          onPress: () =>
            Alert.alert(t("common.success"), t("settings.cacheCleared")),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Bildirim Ayarları */}
      <SectionHeader title={t("settings.sections.notifications")} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="notifications-outline"
          iconColor={COLORS.info}
          title={t("settings.pushNotifications")}
          subtitle={t("settings.allNotifications")}
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
              title={t("settings.taskNotifications")}
              subtitle={t("settings.newTaskAssignments")}
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
              title={t("settings.sound")}
              subtitle={t("settings.notificationSounds")}
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
              title={t("settings.vibration")}
              subtitle={t("settings.notificationVibration")}
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
      <SectionHeader title={t("settings.sections.location")} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="location-outline"
          iconColor={COLORS.success}
          title={t("settings.locationService")}
          subtitle={t("settings.requiredForTracking")}
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
          title={t("settings.gpsAccuracy")}
          subtitle={t("settings.highAccuracy")}
          onPress={() =>
            Alert.alert(t("settings.gpsAccuracy"), t("settings.gpsComingSoon"))
          }
        />
      </View>

      {/* Uygulama Ayarları */}
      <SectionHeader title={t("settings.sections.app")} />
      <View style={styles.settingGroup}>
        {/* Language Selector */}
        <LanguageSelector />
        <View style={styles.divider} />
        {/* Karanlık Mod */}
        <SettingItem
          icon="moon-outline"
          iconColor={COLORS.dark}
          title={t("settings.darkMode")}
          subtitle={
            darkMode ? t("settings.darkModeOn") : t("settings.darkModeOff")
          }
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
          title={t("settings.clearCache")}
          subtitle={t("settings.clearCacheSubtitle")}
          onPress={handleClearCache}
        />
      </View>

      {/* Destek */}
      <SectionHeader title={t("settings.sections.support")} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="help-circle-outline"
          iconColor={COLORS.info}
          title={t("settings.helpCenter")}
          subtitle={t("settings.helpCenterSubtitle")}
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="chatbubble-outline"
          iconColor={COLORS.success}
          title={t("settings.contactUs")}
          subtitle="support@tulipfleet.com"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="document-text-outline"
          iconColor={COLORS.secondary}
          title={t("settings.privacyPolicy")}
          subtitle={t("settings.usageTerms")}
          onPress={() =>
            Alert.alert(
              t("settings.privacyPolicy"),
              t("settings.privacyComingSoon")
            )
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="information-circle-outline"
          iconColor={COLORS.secondary}
          title={t("settings.aboutApp")}
          subtitle={t("settings.version") + " 1.0.0"}
          onPress={handleAbout}
        />
      </View>

      {/* Çıkış */}
      <View style={styles.settingGroup}>
        <SettingItem
          icon="log-out-outline"
          iconColor={COLORS.danger}
          title={t("settings.logout")}
          subtitle={t("settings.logoutSubtitle")}
          onPress={handleLogout}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TulipFleet v1.0.0</Text>
        <Text style={styles.footerSubtext}>© 2025 TulipFleet</Text>
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
