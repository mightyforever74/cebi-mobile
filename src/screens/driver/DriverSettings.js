// src/screens/driver/DriverSettings.js
// TulipFleet - Sürücü Ayarlar Ekranı
// Updated: 11 Şubat 2026 - Theme token cleanup (UI System Guide v3)
// ✅ SPACING/RADIUS/SHADOWS/TYPOGRAPHY tokens
// ✅ hex concat → getLightBg, 8px grid, dark mode ready

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
  Modal,
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
// makeStyles - THEME TOKENS
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

    // Section Header
    sectionHeader: {
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingTop: COLORS.SPACING.lg, // 24
      paddingBottom: COLORS.SPACING.sm, // 8
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      letterSpacing: 1,
      color: COLORS.TEXT_SECONDARY,
    },

    // Setting Group
    settingGroup: {
      marginHorizontal: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.card, // 12
      backgroundColor: COLORS.SURFACE,
      ...COLORS.SHADOWS.xs,
    },

    // Setting Item
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.md, // 16
      paddingHorizontal: COLORS.SPACING.md, // 16
      backgroundColor: COLORS.SURFACE,
    },
    settingIcon: {
      width: COLORS.SPACING.xxl, // 40
      height: COLORS.SPACING.xxl, // 40
      borderRadius: COLORS.RADIUS.sm, // 8
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md, // 16
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg, // 16
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT,
    },
    settingSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      marginTop: 2,
      color: COLORS.TEXT_SECONDARY,
    },

    // Divider
    divider: {
      height: 1,
      marginLeft: 72, // hesaplanmış: icon(40) + marginRight(16) + paddingLeft(16) ≈ 68
      backgroundColor: COLORS.DIVIDER,
    },

    // Footer
    footer: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xl, // 32
      paddingHorizontal: COLORS.SPACING.lg, // 24
    },
    footerText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_SECONDARY,
    },
    footerSubtext: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      marginTop: COLORS.SPACING.xs, // 4
      color: COLORS.MUTED,
    },
    footerEmail: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs, // 10
      marginTop: COLORS.SPACING.sm, // 8
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
  const [privacyModal, setPrivacyModal] = useState(false);

  // ============================================
  // Helpers
  // ============================================
  const getLightBg = (color) => {
    if (color === COLORS.SUCCESS) return COLORS.SUCCESS_LIGHT;
    if (color === COLORS.WARNING) return COLORS.WARNING_LIGHT;
    if (color === COLORS.ERROR) return COLORS.ERROR_LIGHT;
    if (color === COLORS.INFO) return COLORS.INFO_LIGHT;
    if (color === COLORS.PRIMARY) return COLORS.SECONDARY;
    return COLORS.DIVIDER;
  };

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
          { backgroundColor: getLightBg(iconColor || COLORS.PRIMARY) },
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
    await setTheme(value ? "dark" : "light");
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
    navigation.navigate("HelpCenterScreen");
  };

  const handleSupport = () => {
    const subject = encodeURIComponent("TulipFleet Mobile App - Destek Talebi");
    const body = encodeURIComponent(
      `\n\n---\nKullanıcı: ${user?.email || "N/A"}\nPlatform: ${Platform.OS}\nVersiyon: 2.1.0`
    );
    Linking.openURL(
      `mailto:info@tulipfleet.com?subject=${subject}&body=${body}`
    );
  };

  const handlePrivacyPolicy = () => {
    setPrivacyModal(true);
  };

  const handleAbout = () => {
    navigation.navigate("About");
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
          subtitle="info@tulipfleet.com"
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
          subtitle={t("settings.version") + " 2.1.0"}
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
        <Text style={styles.footerText}>TulipFleet v2.1.0</Text>
        <Text style={styles.footerSubtext}>© 2025 TulipFleet</Text>
        {user?.email && <Text style={styles.footerEmail}>{user.email}</Text>}
      </View>

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPrivacyModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.BACKGROUND }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: COLORS.SPACING.md,
            paddingTop: Platform.OS === "ios" ? 56 : COLORS.SPACING.lg,
            paddingBottom: COLORS.SPACING.md,
            backgroundColor: COLORS.SURFACE,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.DIVIDER,
          }}>
            <Text style={{
              fontSize: COLORS.TYPOGRAPHY.sizes.xl,
              fontWeight: COLORS.TYPOGRAPHY.weights.bold,
              color: COLORS.TEXT,
            }}>
              {t("settings.privacyPolicy") || "Privacy Policy"}
            </Text>
            <TouchableOpacity
              onPress={() => setPrivacyModal(false)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: COLORS.CARD,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: COLORS.SPACING.lg, paddingBottom: 40 }}>
            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.MUTED, marginBottom: COLORS.SPACING.md }}>
              Last updated: 01.03.2026
            </Text>

            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginBottom: COLORS.SPACING.sm }}>
              1. Introduction
            </Text>
            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, lineHeight: 22, marginBottom: COLORS.SPACING.lg }}>
              {"TulipFleet (\"we\", \"our\", \"us\") operates a fleet management platform including mobile applications and IoT devices. This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with the General Data Protection Regulation (GDPR) and applicable data protection laws."}
            </Text>

            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginBottom: COLORS.SPACING.sm }}>
              2. Data We Collect
            </Text>
            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, lineHeight: 22, marginBottom: COLORS.SPACING.lg }}>
              {"• Account Information: Name, email, phone, company\n• Vehicle Data: Plate, brand, model, fuel type, mileage\n• Location Data: Real-time GPS from IoT devices\n• Driving Data: Speed, acceleration, braking, routes\n• Device Data: ESP32 identifiers, firmware, connectivity\n• Usage Data: App patterns, login timestamps"}
            </Text>

            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginBottom: COLORS.SPACING.sm }}>
              3. How We Use Your Data
            </Text>
            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, lineHeight: 22, marginBottom: COLORS.SPACING.lg }}>
              {"• Fleet Management: Vehicle tracking, route optimization\n• Safety Monitoring: Hard braking, acceleration events\n• Reporting: Performance reports, fuel analytics\n• Communication: Push notifications for tasks and alerts\n• Service Improvement: Usage analysis"}
            </Text>

            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginBottom: COLORS.SPACING.sm }}>
              4. Data Storage & Security
            </Text>
            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, lineHeight: 22, marginBottom: COLORS.SPACING.lg }}>
              {"• Servers located in the EU (Germany)\n• TLS/SSL encryption for all data\n• MQTT with TLS encryption\n• Passwords hashed with bcrypt\n• JWT authentication with auto-expiry\n• Location data retained 7 days\n• Regular security audits"}
            </Text>

            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginBottom: COLORS.SPACING.sm }}>
              5. Data Sharing
            </Text>
            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, lineHeight: 22, marginBottom: COLORS.SPACING.lg }}>
              {"We do not sell your personal data.\n\n• Your Company Admin can view fleet data\n• Google Maps API for routing\n• Firebase for push notifications\n• Legal requirements when applicable"}
            </Text>

            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginBottom: COLORS.SPACING.sm }}>
              6. Your Rights (GDPR)
            </Text>
            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, lineHeight: 22, marginBottom: COLORS.SPACING.lg }}>
              {"• Access: Request a copy of your data\n• Rectification: Correct inaccurate data\n• Erasure: Request deletion\n• Portability: Receive data in structured format\n• Restriction: Restrict processing\n• Objection: Object to processing\n\nContact: destek@tulipfleet.com"}
            </Text>

            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginBottom: COLORS.SPACING.sm }}>
              7. Contact
            </Text>
            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, lineHeight: 22, marginBottom: COLORS.SPACING.lg }}>
              {"TulipFleet\nEmail: destek@tulipfleet.com\nWeb: https://tulipfleet.com\n\n© 2025-2026 TulipFleet. All rights reserved."}
            </Text>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  );
};

export default DriverSettings;
