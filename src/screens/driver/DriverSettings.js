// src/screens/driver/DriverSettings.js
// TulipFleet - Sürücü Ayarlar Ekranı
// Updated: 22 Ocak 2026 - Dark Mode v3 (makeStyles pattern)

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
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// Storage keys (Dark mode hariç - o ThemeContext'te)
const STORAGE_KEYS = {
  NOTIFICATIONS_ENABLED: "@settings_notifications",
  TASK_NOTIFICATIONS: "@settings_task_notifications",
  SOUND_ENABLED: "@settings_sound",
  VIBRATION_ENABLED: "@settings_vibration",
  LOCATION_ENABLED: "@settings_location",
};

// Base URL
const BASE_URL = "https://tulipfleet.com";

// ============================================
// makeStyles - BÜYÜK HARF TOKEN'LAR
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 1,
      color: COLORS.TEXT_SECONDARY,
    },
    settingGroup: {
      marginHorizontal: 12,
      borderRadius: 12,
      backgroundColor: COLORS.SURFACE,
      shadowColor: COLORS.SHADOW,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: COLORS.SURFACE,
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
      color: COLORS.TEXT,
    },
    settingSubtitle: {
      fontSize: 12,
      marginTop: 2,
      color: COLORS.TEXT_SECONDARY,
    },
    divider: {
      height: 1,
      marginLeft: 68,
      backgroundColor: COLORS.DIVIDER,
    },
    footer: {
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 20,
    },
    footerText: {
      fontSize: 14,
      fontWeight: "500",
      color: COLORS.TEXT_SECONDARY,
    },
    footerSubtext: {
      fontSize: 12,
      marginTop: 4,
      color: COLORS.MUTED,
    },
    footerEmail: {
      fontSize: 11,
      marginTop: 8,
      color: COLORS.MUTED,
    },
  });

// ============================================
// Main Component
// ============================================
const DriverSettings = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  // Theme context
  const { COLORS, isDark, setTheme } = useTheme();
  const styles = useThemedStyles(makeStyles);

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

  // ============================================
  // Nested Components (COLORS erişimi için içeride)
  // ============================================

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
          { backgroundColor: `${iconColor || COLORS.PRIMARY}15` },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor || COLORS.PRIMARY} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
      ) : (
        rightElement
      )}
      {showArrow && onPress && !loading && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
      )}
    </TouchableOpacity>
  );

  // Bölüm Başlığı
  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // ============================================
  // Settings Logic
  // ============================================

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

  const handleTaskNotificationsToggle = async (value) => {
    setTaskNotifications(value);
    await saveSetting(STORAGE_KEYS.TASK_NOTIFICATIONS, value);
  };

  const handleSoundToggle = async (value) => {
    setSoundEnabled(value);
    await saveSetting(STORAGE_KEYS.SOUND_ENABLED, value);
  };

  const handleVibrationToggle = async (value) => {
    setVibrationEnabled(value);
    await saveSetting(STORAGE_KEYS.VIBRATION_ENABLED, value);
  };

  const handleLocationToggle = async (value) => {
    if (value) {
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

  // Dark Mode toggle - ThemeContext kullanarak
  const handleDarkModeToggle = async (value) => {
    await setTheme(value);
  };

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

  const handleHelpCenter = () => {
    const url = `${BASE_URL}/${currentLang}/help`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening help center:", err)
    );
  };

  const handleSupport = () => {
    const subject = encodeURIComponent("TulipFleet Mobile App - Destek Talebi");
    const body = encodeURIComponent(
      `\n\n---\nKullanıcı: ${user?.email || "N/A"}\nPlatform: ${Platform.OS}\nVersiyon: 1.0.0`
    );
    Linking.openURL(
      `mailto:support@tulipfleet.com?subject=${subject}&body=${body}`
    );
  };

  const handlePrivacyPolicy = () => {
    const url = `${BASE_URL}/${currentLang}/privacy`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening privacy policy:", err)
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "TulipFleet",
      `${t("settings.version")} 1.0.0\n\n${t("settings.aboutDescription") || "TulipFleet, filo yönetimi için tasarlanmış profesyonel bir uygulamadır."}\n\n© 2025 TulipFleet`,
      [{ text: t("common.ok") }]
    );
  };

  const handleLogout = () => {
    Alert.alert(t("settings.logout"), t("settings.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
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
          iconColor={COLORS.PRIMARY}
          title={t("settings.pushNotifications")}
          subtitle={t("settings.receiveAlerts")}
          showArrow={false}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: COLORS.SWITCH_OFF, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />

        {notificationsEnabled && (
          <>
            <View style={styles.divider} />
            <SettingItem
              icon="clipboard-outline"
              iconColor={COLORS.WARNING}
              title={t("settings.taskNotifications")}
              subtitle={t("settings.newTaskAssignments")}
              showArrow={false}
              rightElement={
                <Switch
                  value={taskNotifications}
                  onValueChange={handleTaskNotificationsToggle}
                  trackColor={{
                    false: COLORS.SWITCH_OFF,
                    true: COLORS.PRIMARY,
                  }}
                  thumbColor={COLORS.WHITE}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="volume-high-outline"
              iconColor={COLORS.SUCCESS}
              title={t("settings.sound")}
              subtitle={t("settings.notificationSounds")}
              showArrow={false}
              rightElement={
                <Switch
                  value={soundEnabled}
                  onValueChange={handleSoundToggle}
                  trackColor={{
                    false: COLORS.SWITCH_OFF,
                    true: COLORS.PRIMARY,
                  }}
                  thumbColor={COLORS.WHITE}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="phone-portrait-outline"
              iconColor={COLORS.TEXT_SECONDARY}
              title={t("settings.vibration")}
              subtitle={t("settings.notificationVibration")}
              showArrow={false}
              rightElement={
                <Switch
                  value={vibrationEnabled}
                  onValueChange={handleVibrationToggle}
                  trackColor={{
                    false: COLORS.SWITCH_OFF,
                    true: COLORS.PRIMARY,
                  }}
                  thumbColor={COLORS.WHITE}
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
          iconColor={COLORS.SUCCESS}
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
              trackColor={{ false: COLORS.SWITCH_OFF, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="navigate-outline"
          iconColor={COLORS.INFO}
          title={t("settings.gpsAccuracy")}
          subtitle={t("settings.highAccuracy")}
          onPress={handleGPSAccuracy}
        />
      </View>

      {/* Uygulama Ayarları */}
      <SectionHeader title={t("settings.sections.app")} />
      <View style={styles.settingGroup}>
        <LanguageSelector />
        <View style={styles.divider} />

        {/* Karanlık Mod */}
        <SettingItem
          icon="moon-outline"
          iconColor={isDark ? COLORS.WARNING : COLORS.TEXT}
          title={t("settings.darkMode")}
          subtitle={
            isDark ? t("settings.darkModeOn") : t("settings.darkModeOff")
          }
          showArrow={false}
          rightElement={
            <Switch
              value={isDark}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: COLORS.SWITCH_OFF, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="trash-outline"
          iconColor={COLORS.ERROR}
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
          iconColor={COLORS.INFO}
          title={t("settings.helpCenter")}
          subtitle={t("settings.helpCenterSubtitle")}
          onPress={handleHelpCenter}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="chatbubble-outline"
          iconColor={COLORS.SUCCESS}
          title={t("settings.contactUs")}
          subtitle="support@tulipfleet.com"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="document-text-outline"
          iconColor={COLORS.TEXT_SECONDARY}
          title={t("settings.privacyPolicy")}
          subtitle={t("settings.usageTerms")}
          onPress={handlePrivacyPolicy}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="information-circle-outline"
          iconColor={COLORS.TEXT_SECONDARY}
          title={t("settings.aboutApp")}
          subtitle={t("settings.version") + " 1.0.0"}
          onPress={handleAbout}
        />
      </View>

      {/* Çıkış */}
      <View style={styles.settingGroup}>
        <SettingItem
          icon="log-out-outline"
          iconColor={COLORS.ERROR}
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

// ❌ ESKİ StyleSheet SİLİNDİ - artık makeStyles kullanılıyor

export default DriverSettings;
