// src/screens/driver/DriverSettings.js
// TulipFleet - Sürücü Ayarlar Ekranı
// Updated: 21 Ocak 2026 - Tam çalışan ayarlar (AsyncStorage, permissions, cache)

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LanguageSelector from "../../components/LanguageSelector";
import { useAuth } from "../../context/AuthContext";

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATIONS_ENABLED: "@settings_notifications",
  TASK_NOTIFICATIONS: "@settings_task_notifications",
  SOUND_ENABLED: "@settings_sound",
  VIBRATION_ENABLED: "@settings_vibration",
  LOCATION_ENABLED: "@settings_location",
  DARK_MODE: "@settings_dark_mode",
};

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

// Privacy Policy URL
const PRIVACY_POLICY_URL = "https://tulipfleet.com/privacy";
const TERMS_URL = "https://tulipfleet.com/terms";

// Ayar Öğesi
const SettingItem = ({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showArrow = true,
  loading = false,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress || loading}
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
    {loading ? (
      <ActivityIndicator size="small" color={COLORS.primary} />
    ) : (
      rightElement
    )}
    {showArrow && onPress && !loading && (
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

  // Loading states
  const [loading, setLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);

  // Bildirim ayarları
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Konum
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [locationPermission, setLocationPermission] = useState(null);

  // Karanlık mod
  const [darkMode, setDarkMode] = useState(false);

  // Ayarları yükle
  const loadSettings = useCallback(async () => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const results = await AsyncStorage.multiGet(keys);

      const settings = {};
      results.forEach(([key, value]) => {
        if (value !== null) {
          settings[key] = JSON.parse(value);
        }
      });

      // State'leri güncelle
      if (settings[STORAGE_KEYS.NOTIFICATIONS_ENABLED] !== undefined) {
        setNotificationsEnabled(settings[STORAGE_KEYS.NOTIFICATIONS_ENABLED]);
      }
      if (settings[STORAGE_KEYS.TASK_NOTIFICATIONS] !== undefined) {
        setTaskNotifications(settings[STORAGE_KEYS.TASK_NOTIFICATIONS]);
      }
      if (settings[STORAGE_KEYS.SOUND_ENABLED] !== undefined) {
        setSoundEnabled(settings[STORAGE_KEYS.SOUND_ENABLED]);
      }
      if (settings[STORAGE_KEYS.VIBRATION_ENABLED] !== undefined) {
        setVibrationEnabled(settings[STORAGE_KEYS.VIBRATION_ENABLED]);
      }
      if (settings[STORAGE_KEYS.LOCATION_ENABLED] !== undefined) {
        setLocationEnabled(settings[STORAGE_KEYS.LOCATION_ENABLED]);
      }
      if (settings[STORAGE_KEYS.DARK_MODE] !== undefined) {
        setDarkMode(settings[STORAGE_KEYS.DARK_MODE]);
      }

      // Konum izni kontrolü
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Ayar kaydet helper
  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Error saving setting:", error);
      return false;
    }
  };

  // Push bildirimleri toggle
  const handleNotificationsToggle = async (value) => {
    if (value) {
      // Bildirim izni iste
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          t("settings.notifications"),
          t("settings.notificationPermissionDenied") ||
            "Bildirim izni verilmedi. Ayarlardan etkinleştirebilirsiniz.",
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("settings.openSettings") || "Ayarları Aç",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }
    }

    setNotificationsEnabled(value);
    await saveSetting(STORAGE_KEYS.NOTIFICATIONS_ENABLED, value);

    if (!value) {
      setTaskNotifications(false);
      setSoundEnabled(false);
      setVibrationEnabled(false);
      await saveSetting(STORAGE_KEYS.TASK_NOTIFICATIONS, false);
      await saveSetting(STORAGE_KEYS.SOUND_ENABLED, false);
      await saveSetting(STORAGE_KEYS.VIBRATION_ENABLED, false);
    }
  };

  // Task notifications toggle
  const handleTaskNotificationsToggle = async (value) => {
    setTaskNotifications(value);
    await saveSetting(STORAGE_KEYS.TASK_NOTIFICATIONS, value);
  };

  // Sound toggle
  const handleSoundToggle = async (value) => {
    setSoundEnabled(value);
    await saveSetting(STORAGE_KEYS.SOUND_ENABLED, value);
  };

  // Vibration toggle
  const handleVibrationToggle = async (value) => {
    setVibrationEnabled(value);
    await saveSetting(STORAGE_KEYS.VIBRATION_ENABLED, value);
  };

  // Konum servisi toggle
  const handleLocationToggle = async (value) => {
    if (value) {
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status !== "granted") {
        Alert.alert(
          t("settings.locationService"),
          t("settings.locationPermissionDenied") ||
            "Konum izni verilmedi. Ayarlardan etkinleştirebilirsiniz.",
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("settings.openSettings") || "Ayarları Aç",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }
    }

    setLocationEnabled(value);
    await saveSetting(STORAGE_KEYS.LOCATION_ENABLED, value);
  };

  // GPS Accuracy ayarları
  const handleGPSAccuracy = () => {
    Alert.alert(
      t("settings.gpsAccuracy"),
      t("settings.gpsAccuracyMessage") ||
        "GPS doğruluğu cihaz ayarlarından yönetilir.",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.openSettings") || "Ayarları Aç",
          onPress: () => {
            if (Platform.OS === "ios") {
              Linking.openURL("app-settings:");
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  // Karanlık mod toggle
  const handleDarkModeToggle = async (value) => {
    setDarkMode(value);
    await saveSetting(STORAGE_KEYS.DARK_MODE, value);

    // TODO: Global theme context ile entegre edilecek
    Alert.alert(
      t("settings.darkMode"),
      value ? t("settings.darkModeEnabled") : t("settings.darkModeDisabled")
    );
  };

  // Önbellek temizle - GERÇEK
  const handleClearCache = () => {
    Alert.alert(
      t("settings.clearCacheTitle"),
      t("settings.clearCacheMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.clear"),
          style: "destructive",
          onPress: async () => {
            setClearingCache(true);
            try {
              // AsyncStorage'dan geçici verileri temizle (ayarları koruyarak)
              const allKeys = await AsyncStorage.getAllKeys();
              const cacheKeys = allKeys.filter(
                (key) =>
                  !key.startsWith("@settings_") &&
                  !key.startsWith("@auth_") &&
                  !key.startsWith("@user_") &&
                  key !== "accessToken" &&
                  key !== "refreshToken"
              );

              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }

              // Image cache temizleme (eğer expo-image kullanılıyorsa)
              // await Image.clearDiskCache();
              // await Image.clearMemoryCache();

              Alert.alert(
                t("common.success"),
                t("settings.cacheCleared") +
                  ` (${cacheKeys.length} ${t("settings.itemsCleared") || "öğe"})`
              );
            } catch (error) {
              console.error("Cache clear error:", error);
              Alert.alert(
                t("common.error"),
                t("settings.cacheClearFailed") || "Önbellek temizlenemedi"
              );
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  // Destek
  const handleSupport = () => {
    Alert.alert(t("settings.supportTitle"), t("settings.supportMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.sendEmail"),
        onPress: () =>
          Linking.openURL(
            "mailto:support@tulipfleet.com?subject=TulipFleet%20Destek"
          ),
      },
    ]);
  };

  // Yardım Merkezi - yeni ekrana git
  const handleHelpCenter = () => {
    navigation.navigate("HelpCenterScreen");
  };

  // Gizlilik Politikası - URL aç
  const handlePrivacyPolicy = async () => {
    try {
      const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (canOpen) {
        await Linking.openURL(PRIVACY_POLICY_URL);
      } else {
        Alert.alert(
          t("settings.privacyPolicy"),
          t("settings.privacyPolicyText") ||
            "Gizlilik politikamız web sitemizde mevcuttur: tulipfleet.com/privacy"
        );
      }
    } catch (error) {
      Alert.alert(t("common.error"), "Link açılamadı");
    }
  };

  // Hakkında
  const handleAbout = () => {
    Alert.alert(t("settings.aboutTitle"), t("settings.aboutMessage"), [
      { text: t("common.ok") },
    ]);
  };

  // Çıkış yap
  const handleLogout = () => {
    Alert.alert(
      t("settings.logoutConfirmTitle"),
      t("settings.logoutConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
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

  // Loading durumu
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
                  onValueChange={handleTaskNotificationsToggle}
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
                  onValueChange={handleSoundToggle}
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
                  onValueChange={handleVibrationToggle}
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
          subtitle={
            locationPermission === "granted"
              ? t("settings.locationGranted") || "İzin verildi ✓"
              : t("settings.requiredForTracking")
          }
          showArrow={false}
          rightElement={
            <Switch
              value={locationEnabled && locationPermission === "granted"}
              onValueChange={handleLocationToggle}
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
          onPress={handleGPSAccuracy}
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
          loading={clearingCache}
          showArrow={!clearingCache}
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
          onPress={handleHelpCenter}
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
          onPress={handlePrivacyPolicy}
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
        {user?.email && <Text style={styles.footerEmail}>{user.email}</Text>}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  footerEmail: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 8,
  },
});

export default DriverSettings;
