// src/screens/admin/AdminSettings.js
// TulipFleet - Admin Ayarlar Ekranı (DriverSettings seviyesi - Full Featured)
// Updated: 11 Şubat 2026 - Theme token cleanup (UI System Guide v3)
// ✅ SPACING/RADIUS/SHADOWS/TYPOGRAPHY tokens
// ✅ rgba → COLORS.OVERLAY, gap → marginRight, hex concat → getLightBg
// ⚠️ Component logic'e dokunulmadı (sadece style + icon backgroundColor fix)

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

    // Profile Card
    profileCard: {
      backgroundColor: COLORS.PRIMARY,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xl, // 32
      paddingHorizontal: COLORS.SPACING.lg, // 24
    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: COLORS.RADIUS.full, // circle
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md, // 16
    },
    avatarText: {
      ...COLORS.TYPOGRAPHY.styles.h1,
      color: COLORS.PRIMARY,
    },
    profileName: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.WHITE,
      marginBottom: COLORS.SPACING.xs, // 4
    },
    profileEmail: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.WHITE,
      opacity: 0.8,
      marginBottom: COLORS.SPACING.md, // 16
    },
    roleBadge: {
      backgroundColor: COLORS.WHITE,
      opacity: 0.2,
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingVertical: COLORS.SPACING.sm, // 8
      borderRadius: COLORS.RADIUS.full,
    },
    roleText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
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
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
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
      marginLeft: COLORS.SPACING.xxl + COLORS.SPACING.md + COLORS.SPACING.md,
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
      fontSize: COLORS.TYPOGRAPHY.sizes.xs, // 10 (closest to 11)
      marginTop: COLORS.SPACING.sm, // 8
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
      borderRadius: COLORS.RADIUS.modal, // 16
      padding: COLORS.SPACING.lg, // 24
      width: "90%",
      maxWidth: 400,
      ...COLORS.SHADOWS.modal,
    },
    modalTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      textAlign: "center",
      marginBottom: COLORS.SPACING.lg, // 24
    },
    inputLabel: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm, // 8
      marginTop: COLORS.SPACING.md, // 16
    },
    modalInput: {
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      borderRadius: COLORS.RADIUS.input, // 8
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingVertical: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
      backgroundColor: COLORS.INPUT_BG,
    },
    modalButtons: {
      flexDirection: "row",
      marginTop: COLORS.SPACING.lg, // 24
    },
    modalButton: {
      flex: 1,
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button, // 8
      alignItems: "center",
      justifyContent: "center",
    },
    modalButtonCancel: {
      backgroundColor: COLORS.SECONDARY,
      marginRight: COLORS.SPACING.sm, // 8 (gap yerine)
    },
    modalButtonCancelText: {
      color: COLORS.TEXT,
      ...COLORS.TYPOGRAPHY.styles.button,
    },
    modalButtonSave: {
      backgroundColor: COLORS.PRIMARY,
    },
    modalButtonSaveText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.button,
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

  // Bildirim ayarları
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

  // Dark Mode toggle
  const handleDarkModeToggle = async (value) => {
    await setTheme(value ? "dark" : "light");
  };

  const handleClearCache = () => {
    Alert.alert(
      t("settings.clearCacheTitle") || "Önbelleği Temizle",
      t("settings.clearCacheMessage") ||
        "Uygulama önbelleğini temizlemek istediğinize emin misiniz?",
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
                t("common.success") || "Başarılı",
                (t("settings.cacheCleared") || "Önbellek temizlendi") +
                  ` (${cacheKeys.length} ${t("settings.itemsCleared") || "öğe"})`
              );
            } catch (error) {
              console.error("Cache clear error:", error);
              Alert.alert(
                t("common.error") || "Hata",
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
    const subject = encodeURIComponent("TulipFleet Admin App - Destek Talebi");
    const body = encodeURIComponent(
      `\n\n---\nKullanıcı: ${user?.email || "N/A"}\nRol: Admin\nPlatform: ${Platform.OS}\nVersiyon: 2.1.0`
    );
    Linking.openURL(
      `mailto:mightyforever74@gmail.com?subject=${subject}&body=${body}`
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
      `${t("settings.version") || "Versiyon"} 2.1.0\n\n${t("settings.aboutDescription") || "TulipFleet, filo yönetimi için tasarlanmış profesyonel bir uygulamadır."}\n\n© 2025 TulipFleet`,
      [{ text: t("common.ok") || "Tamam" }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t("settings.logout") || "Çıkış Yap",
      t("settings.logoutConfirm") || "Çıkış yapmak istediğinize emin misiniz?",
      [
        { text: t("common.cancel") || "İptal", style: "cancel" },
        {
          text: t("settings.logout") || "Çıkış Yap",
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
        t("settings.firstNameRequired") || "Ad alanı zorunludur"
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
        t("common.success") || "Başarılı",
        t("settings.profileUpdated") || "Profil güncellendi"
      );
      setEditProfileModal(false);
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert(
        t("common.error") || "Hata",
        error?.response?.data?.error ||
          t("settings.profileUpdateFailed") ||
          "Profil güncellenemedi"
      );
    } finally {
      setSaving(false);
    }
  };

  // Şifre değiştirme
  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        t("common.error") || "Hata",
        t("settings.allFieldsRequired") || "Tüm alanlar zorunludur"
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        t("common.error") || "Hata",
        t("settings.passwordTooShort") ||
          "Yeni şifre en az 6 karakter olmalıdır"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("common.error") || "Hata",
        t("settings.passwordsDoNotMatch") || "Şifreler eşleşmiyor"
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
        t("common.success") || "Başarılı",
        t("settings.passwordChanged") || "Şifre değiştirildi"
      );
      setChangePasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);
      Alert.alert(
        t("common.error") || "Hata",
        error?.response?.data?.error ||
          t("settings.passwordChangeFailed") ||
          "Şifre değiştirilemedi"
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
            {t("settings.adminRole") || "YÖNETİCİ"}
          </Text>
        </View>
      </View>

      {/* Hesap */}
      <SectionHeader title={t("settings.sections.account") || "HESAP"} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="person-outline"
          iconColor={COLORS.PRIMARY}
          title={t("settings.editProfile") || "Profili Düzenle"}
          subtitle={
            t("settings.editProfileSubtitle") || "İsim, telefon bilgileri"
          }
          onPress={() => setEditProfileModal(true)}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="lock-closed-outline"
          iconColor={COLORS.WARNING}
          title={t("settings.changePassword") || "Şifre Değiştir"}
          subtitle={t("settings.changePasswordSubtitle") || "Güvenlik ayarları"}
          onPress={() => setChangePasswordModal(true)}
        />
      </View>

      {/* Bildirimler */}
      <SectionHeader
        title={t("settings.sections.notifications") || "BİLDİRİMLER"}
      />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="notifications-outline"
          iconColor={COLORS.PRIMARY}
          title={t("settings.pushNotifications") || "Push Bildirimleri"}
          subtitle={t("settings.receiveAlerts") || "Tüm bildirimleri al"}
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
              title={t("settings.alertNotifications") || "Uyarı Bildirimleri"}
              subtitle={
                t("settings.criticalAlerts") || "Kritik uyarılar ve alarmlar"
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
              title={t("settings.taskNotifications") || "Görev Bildirimleri"}
              subtitle={
                t("settings.taskUpdates") || "Görev durumu güncellemeleri"
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
              title={t("settings.vibration") || "Titreşim"}
              subtitle={
                t("settings.notificationVibration") || "Bildirim titreşimi"
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
              ? t("settings.locationGranted") || "İzin verildi ✓"
              : t("settings.requiredForTracking") || "Araç takibi için gerekli"
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
          title={t("settings.gpsAccuracy") || "GPS Doğruluğu"}
          subtitle={t("settings.highAccuracy") || "Yüksek doğruluk"}
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
          title={t("settings.darkMode") || "Karanlık Mod"}
          subtitle={
            isDark
              ? t("settings.darkModeOn") || "Açık"
              : t("settings.darkModeOff") || "Kapalı"
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
          title={t("settings.clearCache") || "Önbelleği Temizle"}
          subtitle={
            t("settings.clearCacheSubtitle") || "Geçici dosyaları temizle"
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
          title={t("settings.helpCenter") || "Yardım Merkezi"}
          subtitle={
            t("settings.helpCenterSubtitle") || "SSS ve kullanım kılavuzu"
          }
          onPress={handleHelpCenter}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="chatbubble-outline"
          iconColor={COLORS.SUCCESS}
          title={t("settings.contactUs") || "Bize Ulaşın"}
          subtitle="mightyforever74@gmail.com"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="document-text-outline"
          iconColor={COLORS.TEXT_SECONDARY}
          title={t("settings.privacyPolicy") || "Gizlilik Politikası"}
          subtitle={t("settings.usageTerms") || "Kullanım koşulları"}
          onPress={handlePrivacyPolicy}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="information-circle-outline"
          iconColor={COLORS.TEXT_SECONDARY}
          title={t("settings.aboutApp") || "Uygulama Hakkında"}
          subtitle={(t("settings.version") || "Versiyon") + " 2.1.0"}
          onPress={handleAbout}
        />
      </View>

      {/* Çıkış */}
      <View style={styles.settingGroup}>
        <SettingItem
          icon="log-out-outline"
          iconColor={COLORS.ERROR}
          title={t("settings.logout") || "Çıkış Yap"}
          subtitle={t("settings.logoutSubtitle") || "Hesabından çıkış yap"}
          onPress={handleLogout}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TulipFleet v2.1.0</Text>
        <Text style={styles.footerSubtext}>© 2025 TulipFleet</Text>
        {user?.email && <Text style={styles.footerEmail}>{user.email}</Text>}
      </View>

      {/* Profil Düzenle Modal */}
      <Modal
        visible={editProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("settings.editProfile") || "Profili Düzenle"}
            </Text>

            <Text style={styles.inputLabel}>
              {t("settings.firstName") || "Ad"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t("settings.firstNamePlaceholder") || "Adınız"}
              placeholderTextColor={COLORS.PLACEHOLDER}
            />

            <Text style={styles.inputLabel}>
              {t("settings.lastName") || "Soyad"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t("settings.lastNamePlaceholder") || "Soyadınız"}
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
                  {t("common.cancel") || "İptal"}
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

      {/* Şifre Değiştir Modal */}
      <Modal
        visible={changePasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("settings.changePassword") || "Şifre Değiştir"}
            </Text>

            <Text style={styles.inputLabel}>
              {t("settings.currentPassword") || "Mevcut Şifre"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={
                t("settings.currentPasswordPlaceholder") || "Mevcut şifreniz"
              }
              placeholderTextColor={COLORS.PLACEHOLDER}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>
              {t("settings.newPassword") || "Yeni Şifre"}
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
              {t("settings.confirmPassword") || "Yeni Şifre (Tekrar)"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={
                t("settings.confirmPasswordPlaceholder") ||
                "Yeni şifrenizi tekrarlayın"
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
                  {t("common.cancel") || "İptal"}
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
                    {t("settings.change") || "Değiştir"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default AdminSettings;
