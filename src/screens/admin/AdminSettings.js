// src/screens/admin/AdminSettings.js
// TulipFleet - Admin Ayarlar EkranÄ± (DriverSettings seviyesi - Full Featured)
// Updated: 23 Ocak 2026

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
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import LanguageSelector from "../../components/LanguageSelector";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { userAPI } from "../../services/api";

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATIONS_ENABLED: "@settings_notifications",
  ALERT_NOTIFICATIONS: "@settings_alert_notifications",
  TASK_NOTIFICATIONS: "@settings_task_notifications",
  SOUND_ENABLED: "@settings_sound",
  VIBRATION_ENABLED: "@settings_vibration",
  LOCATION_ENABLED: "@settings_location",
};

// Base URL
const BASE_URL = "https://tulipfleet.com";

// ============================================
// makeStyles
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

    // Profile Card
    profileCard: {
      backgroundColor: COLORS.PRIMARY,
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: COLORS.SPACING.lg,
    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    avatarText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
    },
    profileName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.WHITE,
      opacity: 0.8,
      marginBottom: COLORS.SPACING.sm,
    },
    roleBadge: {
      backgroundColor: COLORS.WHITE,
      opacity: 0.2,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: 6,
      borderRadius: COLORS.RADIUS.xl,
    },
    roleText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Section Header
    sectionHeader: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingTop: 24,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      letterSpacing: 1,
      color: COLORS.TEXT_SECONDARY,
    },

    // Setting Group
    settingGroup: {
      marginHorizontal: 12,
      borderRadius: COLORS.RADIUS.md,
      backgroundColor: COLORS.SURFACE,
      ...COLORS.SHADOWS.card,
    },

    // Setting Item
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: COLORS.SPACING.md,
      backgroundColor: COLORS.SURFACE,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.md,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT,
    },
    settingSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      marginTop: 2,
      color: COLORS.TEXT_SECONDARY,
    },

    // Divider
    divider: {
      height: 1,
      marginLeft: 68,
      backgroundColor: COLORS.DIVIDER,
    },

    // Footer
    footer: {
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: COLORS.SPACING.lg,
    },
    footerText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_SECONDARY,
    },
    footerSubtext: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      marginTop: 4,
      color: COLORS.MUTED,
    },
    footerEmail: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      marginTop: COLORS.SPACING.sm,
      color: COLORS.MUTED,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.lg,
      padding: 24,
      width: "90%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      textAlign: "center",
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT,
      marginBottom: 6,
      marginTop: COLORS.SPACING.sm,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      backgroundColor: COLORS.SURFACE,
    },
    modalButtons: {
      flexDirection: "row",
      // gap removed
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
    },
    modalButtonCancel: {
      backgroundColor: COLORS.SECONDARY,
    },
    modalButtonCancelText: {
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
    },
    modalButtonSave: {
      backgroundColor: COLORS.PRIMARY,
    },
    modalButtonSaveText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
    },
  });

// ============================================
// Main Component
// ============================================
const AdminSettings = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  // Theme context
  const { COLORS, theme, setTheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDark = theme === "dark";

  // Loading states
  const [loading, setLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);

  // Bildirim ayarlarÄ±
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [alertNotifications, setAlertNotifications] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Konum
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [locationPermission, setLocationPermission] = useState(null);

  // Modal state
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile edit state
  const [firstName, setFirstName] = useState(
    user?.firstName || user?.first_name || ""
  );
  const [lastName, setLastName] = useState(
    user?.lastName || user?.last_name || ""
  );
  const [phone, setPhone] = useState(user?.phone || "");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ============================================
  // Nested Components
  // ============================================

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

  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // ============================================
  // Settings Logic
  // ============================================

  // AyarlarÄ± yÃ¼kle
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
      if (settings[STORAGE_KEYS.ALERT_NOTIFICATIONS] !== undefined) {
        setAlertNotifications(settings[STORAGE_KEYS.ALERT_NOTIFICATIONS]);
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
            "Bildirim izni verilmedi. Ayarlardan etkinleÅŸtirebilirsiniz.",
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("settings.openSettings") || "AyarlarÄ± AÃ§",
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
      setAlertNotifications(false);
      setTaskNotifications(false);
      setSoundEnabled(false);
      setVibrationEnabled(false);
      await saveSetting(STORAGE_KEYS.ALERT_NOTIFICATIONS, false);
      await saveSetting(STORAGE_KEYS.TASK_NOTIFICATIONS, false);
      await saveSetting(STORAGE_KEYS.SOUND_ENABLED, false);
      await saveSetting(STORAGE_KEYS.VIBRATION_ENABLED, false);
    }
  };

  const handleAlertNotificationsToggle = async (value) => {
    setAlertNotifications(value);
    await saveSetting(STORAGE_KEYS.ALERT_NOTIFICATIONS, value);
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
            "Konum izni verilmedi. Ayarlardan etkinleÅŸtirebilirsiniz.",
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("settings.openSettings") || "AyarlarÄ± AÃ§",
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
        "GPS doÄŸruluÄŸu cihaz ayarlarÄ±ndan yÃ¶netilir.",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.openSettings") || "AyarlarÄ± AÃ§",
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

  // Dark Mode toggle
  const handleDarkModeToggle = async (value) => {
    await setTheme(value ? "dark" : "light");
  };

  const handleClearCache = () => {
    Alert.alert(
      t("settings.clearCacheTitle") || "Ã–nbelleÄŸi Temizle",
      t("settings.clearCacheMessage") ||
        "Uygulama Ã¶nbelleÄŸini temizlemek istediÄŸinize emin misiniz?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.clear") || "Temizle",
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
                t("common.success") || "BaÅŸarÄ±lÄ±",
                (t("settings.cacheCleared") || "Ã–nbellek temizlendi") +
                  ` (${cacheKeys.length} ${t("settings.itemsCleared") || "Ã¶ÄŸe"})`
              );
            } catch (error) {
              console.error("Cache clear error:", error);
              Alert.alert(
                t("common.error") || "Hata",
                t("settings.cacheClearFailed") || "Ã–nbellek temizlenemedi"
              );
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  // âœ… YENÄ° KOD
  const handleHelpCenter = () => {
    navigation.navigate("HelpCenterScreen");
  };

  const handleSupport = () => {
    const subject = encodeURIComponent("TulipFleet Admin App - Destek Talebi");
    const body = encodeURIComponent(
      `\n\n---\nKullanÄ±cÄ±: ${user?.email || "N/A"}\nRol: Admin\nPlatform: ${Platform.OS}\nVersiyon: 1.0.0`
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
    Alert.alert(
      t("settings.logout") || "Ã‡Ä±kÄ±ÅŸ Yap",
      t("settings.logoutConfirm") ||
        "Ã‡Ä±kÄ±ÅŸ yapmak istediÄŸinize emin misiniz?",
      [
        { text: t("common.cancel") || "Ä°ptal", style: "cancel" },
        {
          text: t("settings.logout") || "Ã‡Ä±kÄ±ÅŸ Yap",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ]
    );
  };

  // Profil kaydetme
  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert(
        t("common.error") || "Hata",
        t("settings.firstNameRequired") || "Ad alanÄ± zorunludur"
      );
      return;
    }

    setSaving(true);
    try {
      await userAPI.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });

      Alert.alert(
        t("common.success") || "BaÅŸarÄ±lÄ±",
        t("settings.profileUpdated") || "Profil gÃ¼ncellendi"
      );
      setEditProfileModal(false);
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert(
        t("common.error") || "Hata",
        error?.response?.data?.error ||
          t("settings.profileUpdateFailed") ||
          "Profil gÃ¼ncellenemedi"
      );
    } finally {
      setSaving(false);
    }
  };

  // Åžifre deÄŸiÅŸtirme
  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        t("common.error") || "Hata",
        t("settings.allFieldsRequired") || "TÃ¼m alanlar zorunludur"
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        t("common.error") || "Hata",
        t("settings.passwordTooShort") ||
          "Yeni ÅŸifre en az 6 karakter olmalÄ±dÄ±r"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("common.error") || "Hata",
        t("settings.passwordsDoNotMatch") || "Åžifreler eÅŸleÅŸmiyor"
      );
      return;
    }

    setSaving(true);
    try {
      await userAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      Alert.alert(
        t("common.success") || "BaÅŸarÄ±lÄ±",
        t("settings.passwordChanged") || "Åžifre deÄŸiÅŸtirildi"
      );
      setChangePasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);
      const errMsg = (error?.response?.data?.error || "").toLowerCase();
      const isWrongPassword =
        error?.response?.status === 401 ||
        error?.response?.status === 403 ||
        errMsg.includes("incorrect") ||
        errMsg.includes("wrong") ||
        errMsg.includes("invalid") ||
        errMsg.includes("current") ||
        errMsg.includes("required");
      Alert.alert(
        t("common.error") || "Hata",
        isWrongPassword
          ? t("settings.wrongCurrentPassword") || "Mevcut şifre yanlış"
          : t("settings.passwordChangeFailed") || "Şifre değiştirilemedi"
      );
    } finally {
      setSaving(false);
    }
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

  const displayName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || user?.email?.split("@")[0] || "Admin";

  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : displayName.substring(0, 2).toUpperCase();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileEmail}>{user?.email || ""}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {t("settings.adminRole") || "YÃ–NETÄ°CÄ°"}
          </Text>
        </View>
      </View>

      {/* Hesap */}
      <SectionHeader title={t("settings.sections.account") || "HESAP"} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="person-outline"
          iconColor={COLORS.PRIMARY}
          title={t("settings.editProfile") || "Profili DÃ¼zenle"}
          subtitle={
            t("settings.editProfileSubtitle") || "Ä°sim, telefon bilgileri"
          }
          onPress={() => setEditProfileModal(true)}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="lock-closed-outline"
          iconColor={COLORS.WARNING}
          title={t("settings.changePassword") || "Åžifre DeÄŸiÅŸtir"}
          subtitle={
            t("settings.changePasswordSubtitle") || "GÃ¼venlik ayarlarÄ±"
          }
          onPress={() => setChangePasswordModal(true)}
        />
      </View>

      {/* Bildirimler */}
      <SectionHeader
        title={t("settings.sections.notifications") || "BÄ°LDÄ°RÄ°MLER"}
      />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="notifications-outline"
          iconColor={COLORS.PRIMARY}
          title={t("settings.pushNotifications") || "Push Bildirimleri"}
          subtitle={t("settings.receiveAlerts") || "TÃ¼m bildirimleri al"}
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
              icon="warning-outline"
              iconColor={COLORS.ERROR}
              title={t("settings.alertNotifications") || "UyarÄ± Bildirimleri"}
              subtitle={
                t("settings.criticalAlerts") || "Kritik uyarÄ±lar ve alarmlar"
              }
              showArrow={false}
              rightElement={
                <Switch
                  value={alertNotifications}
                  onValueChange={handleAlertNotificationsToggle}
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
              icon="clipboard-outline"
              iconColor={COLORS.WARNING}
              title={t("settings.taskNotifications") || "GÃ¶rev Bildirimleri"}
              subtitle={
                t("settings.taskUpdates") || "GÃ¶rev durumu gÃ¼ncellemeleri"
              }
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
              title={t("settings.sound") || "Ses"}
              subtitle={t("settings.notificationSounds") || "Bildirim sesleri"}
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
              title={t("settings.vibration") || "TitreÅŸim"}
              subtitle={
                t("settings.notificationVibration") || "Bildirim titreÅŸimi"
              }
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

      {/* Konum */}
      <SectionHeader title={t("settings.sections.location") || "KONUM"} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="location-outline"
          iconColor={COLORS.SUCCESS}
          title={t("settings.locationService") || "Konum Servisi"}
          subtitle={
            locationPermission === "granted"
              ? t("settings.locationGranted") || "Ä°zin verildi âœ“"
              : t("settings.requiredForTracking") ||
                "AraÃ§ takibi iÃ§in gerekli"
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
          title={t("settings.gpsAccuracy") || "GPS DoÄŸruluÄŸu"}
          subtitle={t("settings.highAccuracy") || "YÃ¼ksek doÄŸruluk"}
          onPress={handleGPSAccuracy}
        />
      </View>

      {/* Uygulama */}
      <SectionHeader title={t("settings.sections.app") || "UYGULAMA"} />
      <View style={styles.settingGroup}>
        <LanguageSelector />
        <View style={styles.divider} />

        <SettingItem
          icon={isDark ? "moon" : "sunny"}
          iconColor={isDark ? COLORS.WARNING : COLORS.TEXT}
          title={t("settings.darkMode") || "KaranlÄ±k Mod"}
          subtitle={
            isDark
              ? t("settings.darkModeOn") || "AÃ§Ä±k ðŸŒ™"
              : t("settings.darkModeOff") || "KapalÄ± â˜€ï¸"
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
          title={t("settings.clearCache") || "Ã–nbelleÄŸi Temizle"}
          subtitle={
            t("settings.clearCacheSubtitle") || "GeÃ§ici dosyalarÄ± temizle"
          }
          onPress={handleClearCache}
          loading={clearingCache}
          showArrow={!clearingCache}
        />
      </View>

      {/* Destek */}
      <SectionHeader title={t("settings.sections.support") || "DESTEK"} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="help-circle-outline"
          iconColor={COLORS.INFO}
          title={t("settings.helpCenter") || "YardÄ±m Merkezi"}
          subtitle={
            t("settings.helpCenterSubtitle") || "SSS ve kullanÄ±m kÄ±lavuzu"
          }
          onPress={handleHelpCenter}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="chatbubble-outline"
          iconColor={COLORS.SUCCESS}
          title={t("settings.contactUs") || "Bize UlaÅŸÄ±n"}
          subtitle="info@tulipfleet.com"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="document-text-outline"
          iconColor={COLORS.TEXT_SECONDARY}
          title={t("settings.privacyPolicy") || "Gizlilik PolitikasÄ±"}
          subtitle={t("settings.usageTerms") || "KullanÄ±m koÅŸullarÄ±"}
          onPress={handlePrivacyPolicy}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="information-circle-outline"
          iconColor={COLORS.TEXT_SECONDARY}
          title={t("settings.aboutApp") || "Uygulama HakkÄ±nda"}
          subtitle={(t("settings.version") || "Versiyon") + " 1.0.0"}
          onPress={handleAbout}
        />
      </View>

      {/* Ã‡Ä±kÄ±ÅŸ */}
      <View style={styles.settingGroup}>
        <SettingItem
          icon="log-out-outline"
          iconColor={COLORS.ERROR}
          title={t("settings.logout") || "Ã‡Ä±kÄ±ÅŸ Yap"}
          subtitle={t("settings.logoutSubtitle") || "HesabÄ±ndan Ã§Ä±kÄ±ÅŸ yap"}
          onPress={handleLogout}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TulipFleet v1.0.0</Text>
        <Text style={styles.footerSubtext}>Â© 2025 TulipFleet</Text>
        {user?.email && <Text style={styles.footerEmail}>{user.email}</Text>}
      </View>

      {/* Profil DÃ¼zenle Modal */}
      <Modal
        visible={editProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("settings.editProfile") || "Profili DÃ¼zenle"}
            </Text>

            <Text style={styles.inputLabel}>
              {t("settings.firstName") || "Ad"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t("settings.firstNamePlaceholder") || "AdÄ±nÄ±z"}
              placeholderTextColor={COLORS.PLACEHOLDER}
            />

            <Text style={styles.inputLabel}>
              {t("settings.lastName") || "Soyad"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t("settings.lastNamePlaceholder") || "SoyadÄ±nÄ±z"}
              placeholderTextColor={COLORS.PLACEHOLDER}
            />

            <Text style={styles.inputLabel}>
              {t("settings.phone") || "Telefon"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="05XX XXX XX XX"
              placeholderTextColor={COLORS.PLACEHOLDER}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditProfileModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalButtonCancelText}>
                  {t("common.cancel") || "Ä°ptal"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.modalButtonSaveText}>
                    {t("common.save") || "Kaydet"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Åžifre DeÄŸiÅŸtir Modal */}
      <Modal
        visible={changePasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("settings.changePassword") || "Åžifre DeÄŸiÅŸtir"}
            </Text>

            <Text style={styles.inputLabel}>
              {t("settings.currentPassword") || "Mevcut Åžifre"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={
                t("settings.currentPasswordPlaceholder") || "Mevcut ÅŸifreniz"
              }
              placeholderTextColor={COLORS.PLACEHOLDER}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>
              {t("settings.newPassword") || "Yeni Åžifre"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={
                t("settings.newPasswordPlaceholder") || "En az 6 karakter"
              }
              placeholderTextColor={COLORS.PLACEHOLDER}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>
              {t("settings.confirmPassword") || "Yeni Åžifre (Tekrar)"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={
                t("settings.confirmPasswordPlaceholder") ||
                "Yeni ÅŸifrenizi tekrarlayÄ±n"
              }
              placeholderTextColor={COLORS.PLACEHOLDER}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setChangePasswordModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalButtonCancelText}>
                  {t("common.cancel") || "Ä°ptal"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSavePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.modalButtonSaveText}>
                    {t("settings.change") || "DeÄŸiÅŸtir"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPrivacyModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.BACKGROUND }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: COLORS.SPACING.md,
              paddingTop: Platform.OS === "ios" ? 56 : COLORS.SPACING.lg,
              paddingBottom: COLORS.SPACING.md,
              backgroundColor: COLORS.SURFACE,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.DIVIDER,
            }}
          >
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.xl,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
              }}
            >
              {t("settings.privacyPolicy") || "Privacy Policy"}
            </Text>
            <TouchableOpacity
              onPress={() => setPrivacyModal(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: COLORS.CARD,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: COLORS.SPACING.lg,
              paddingBottom: 40,
            }}
          >
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.sm,
                color: COLORS.MUTED,
                marginBottom: COLORS.SPACING.md,
              }}
            >
              {t("privacy.lastUpdated") || "Last updated"}: 01.03.2026
            </Text>

            {/* Section 1 */}
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.lg,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
                marginBottom: COLORS.SPACING.sm,
              }}
            >
              {t("privacy.s1Title") || "1. Introduction"}
            </Text>
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.md,
                color: COLORS.TEXT_SECONDARY,
                lineHeight: 22,
                marginBottom: COLORS.SPACING.lg,
              }}
            >
              {t("privacy.s1Body") ||
                'TulipFleet ("we", "our", "us") operates a fleet management platform including mobile applications and IoT devices. This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with the General Data Protection Regulation (GDPR) and applicable data protection laws.'}
            </Text>

            {/* Section 2 */}
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.lg,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
                marginBottom: COLORS.SPACING.sm,
              }}
            >
              {t("privacy.s2Title") || "2. Data We Collect"}
            </Text>
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.md,
                color: COLORS.TEXT_SECONDARY,
                lineHeight: 22,
                marginBottom: COLORS.SPACING.lg,
              }}
            >
              {t("privacy.s2Body") ||
                "We collect the following categories of data:\n\n\u2022 Account Information: Name, email address, phone number, company name\n\u2022 Vehicle Data: License plate, brand, model, fuel type, mileage\n\u2022 Location Data: Real-time GPS coordinates from IoT devices installed in vehicles\n\u2022 Driving Data: Speed, acceleration events, braking patterns, route history\n\u2022 Device Data: ESP32 device identifiers, firmware version, connectivity status\n\u2022 Usage Data: App usage patterns, feature interactions, login timestamps"}
            </Text>

            {/* Section 3 */}
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.lg,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
                marginBottom: COLORS.SPACING.sm,
              }}
            >
              {t("privacy.s3Title") || "3. How We Use Your Data"}
            </Text>
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.md,
                color: COLORS.TEXT_SECONDARY,
                lineHeight: 22,
                marginBottom: COLORS.SPACING.lg,
              }}
            >
              {t("privacy.s3Body") ||
                "Your data is used for:\n\n\u2022 Fleet Management: Real-time vehicle tracking, route optimization, task assignment\n\u2022 Safety Monitoring: Detecting hard braking, acceleration, and impact events\n\u2022 Reporting: Generating fleet performance reports, fuel consumption analytics\n\u2022 Communication: Push notifications for task updates, alerts, and system messages\n\u2022 Service Improvement: Analyzing usage patterns to improve the platform"}
            </Text>

            {/* Section 4 */}
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.lg,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
                marginBottom: COLORS.SPACING.sm,
              }}
            >
              {t("privacy.s4Title") || "4. Data Storage & Security"}
            </Text>
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.md,
                color: COLORS.TEXT_SECONDARY,
                lineHeight: 22,
                marginBottom: COLORS.SPACING.lg,
              }}
            >
              {t("privacy.s4Body") ||
                "\u2022 All data is stored on secure servers located within the European Union (Hetzner, Germany)\n\u2022 Data transmission is encrypted using TLS/SSL\n\u2022 MQTT communication uses TLS encryption\n\u2022 Passwords are hashed using bcrypt\n\u2022 JWT tokens are used for authentication with automatic expiry\n\u2022 Location data is retained for 7 days, then automatically purged\n\u2022 Regular security audits and penetration testing are conducted"}
            </Text>

            {/* Section 5 */}
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.lg,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
                marginBottom: COLORS.SPACING.sm,
              }}
            >
              {t("privacy.s5Title") || "5. Data Sharing"}
            </Text>
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.md,
                color: COLORS.TEXT_SECONDARY,
                lineHeight: 22,
                marginBottom: COLORS.SPACING.lg,
              }}
            >
              {t("privacy.s5Body") ||
                "We do not sell your personal data to third parties. Data may be shared with:\n\n\u2022 Your Company Admin: Fleet managers can view vehicle and driver data within their organization\n\u2022 Google Maps API: For route calculation and map display (anonymized)\n\u2022 Firebase: For push notification delivery\n\u2022 Legal Requirements: When required by law or legal proceedings"}
            </Text>

            {/* Section 6 */}
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.lg,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
                marginBottom: COLORS.SPACING.sm,
              }}
            >
              {t("privacy.s6Title") || "6. Your Rights (GDPR)"}
            </Text>
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.md,
                color: COLORS.TEXT_SECONDARY,
                lineHeight: 22,
                marginBottom: COLORS.SPACING.lg,
              }}
            >
              {t("privacy.s6Body") ||
                "Under GDPR, you have the right to:\n\n\u2022 Access: Request a copy of your personal data\n\u2022 Rectification: Correct inaccurate personal data\n\u2022 Erasure: Request deletion of your personal data\n\u2022 Portability: Receive your data in a structured, machine-readable format\n\u2022 Restriction: Restrict the processing of your data\n\u2022 Objection: Object to data processing based on legitimate interests\n\nTo exercise these rights, contact us at: destek@tulipfleet.com"}
            </Text>

            {/* Section 7 */}
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.lg,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
                marginBottom: COLORS.SPACING.sm,
              }}
            >
              {t("privacy.s7Title") || "7. Contact"}
            </Text>
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.md,
                color: COLORS.TEXT_SECONDARY,
                lineHeight: 22,
                marginBottom: COLORS.SPACING.lg,
              }}
            >
              {t("privacy.s7Body") ||
                "TulipFleet\nEmail: destek@tulipfleet.com\nWebsite: https://tulipfleet.com\n\n\u00A9 2025-2026 TulipFleet. All rights reserved."}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default AdminSettings;
