// src/screens/driver/DriverProfile.js
// TulipFleet - Sürücü Profil Ekranı
// Updated: 22 Ocak 2026 - Dark Mode Migration

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
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// ❌ KALDIRILDI: Local COLORS objesi

// ============================================
// makeStyles - BÜYÜK HARF TOKEN'LAR
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    profileCard: {
      backgroundColor: COLORS.PRIMARY,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xl,
      paddingHorizontal: COLORS.SPACING.headerPadding,
    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
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
      marginBottom: COLORS.SPACING.xs,
    },
    profileEmail: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.WHITE_80,
      marginBottom: COLORS.SPACING.md,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.WHITE_20,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
    },
    roleText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
    },
    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: COLORS.SPACING.md,
      marginTop: -COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginHorizontal: COLORS.SPACING.xs,
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.xl,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    statValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    statLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    sectionHeader: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingTop: COLORS.SPACING.lg,
      paddingBottom: COLORS.SPACING.sm,
    },
    sectionTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
      letterSpacing: 1,
    },
    settingGroup: {
      backgroundColor: COLORS.CARD,
      marginHorizontal: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.card,
      ...COLORS.SHADOWS.xs,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.md, // 16
      paddingHorizontal: COLORS.SPACING.md,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.sm, // 8 (was 10)
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md, // 16 (was 12)
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
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.DIVIDER,
      // 40(icon width) + 16(paddingHorizontal) + 16(icon marginRight) = 72
      marginLeft: 40 + COLORS.SPACING.md + COLORS.SPACING.md,
    },
    footer: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xl, // 32 (was 30)
    },
    footerText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    footerSubtext: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      marginTop: 4,
    },
  });

// ============================================
// COMPONENT
// ============================================
const DriverProfile = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Theme-aware light background helper (no hex hacks like `${color}15`)
  const getLightBg = (color) => {
    if (color === COLORS.SUCCESS) return COLORS.SUCCESS_LIGHT;
    if (color === COLORS.WARNING) return COLORS.WARNING_LIGHT;
    if (color === COLORS.ERROR) return COLORS.ERROR_LIGHT;
    if (color === COLORS.INFO) return COLORS.INFO_LIGHT;
    if (color === COLORS.PRIMARY) return COLORS.SECONDARY;
    return COLORS.DIVIDER;
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // ============================================
  // Nested Components (COLORS erişimi için içeride)
  // ============================================

  // Setting Item Component
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
          { backgroundColor: getLightBg(iconColor || COLORS.PRIMARY) },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor || COLORS.PRIMARY} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
      {showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
      )}
    </TouchableOpacity>
  );

  // Section Header Component
  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Stat Card Component
  const StatCard = ({ icon, iconColor, value, label }) => (
    <View style={styles.statCard}>
      <View
        style={[styles.statIcon, { backgroundColor: getLightBg(iconColor) }]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // ============================================
  // Handlers
  // ============================================

  const handleLogout = () => {
    Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  const handleChangePassword = () => {
    navigation.navigate("ChangePassword");
  };

  const handleSupport = () => {
    Alert.alert(t("profile.supportTitle"), t("profile.supportMessage"), [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("profile.sendEmail"),
        onPress: () => Linking.openURL("mailto:mightyforever74@gmail.com"),
      },
    ]);
  };

  const handleAbout = () => {
    Alert.alert(t("profile.aboutTitle"), t("profile.aboutMessage"), [
      { text: t("profile.ok") },
    ]);
  };

  // ============================================
  // Render
  // ============================================

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "S"}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user?.first_name ||
            user?.email?.split("@")[0] ||
            t("profile.driver")}
        </Text>
        <Text style={styles.profileEmail}>{user?.email || "-"}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="car" size={14} color={COLORS.WHITE} />
          <Text style={styles.roleText}>{t("profile.driver")}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatCard
          icon="checkmark-circle"
          iconColor={COLORS.SUCCESS}
          value="0"
          label={t("profile.completed")}
        />
        <StatCard
          icon="navigate"
          iconColor={COLORS.INFO}
          value="0"
          label={t("profile.totalKm")}
        />
        <StatCard
          icon="star"
          iconColor={COLORS.WARNING}
          value="-"
          label={t("profile.score")}
        />
      </View>

      {/* Account Settings */}
      <SectionHeader title={t("profile.account")} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="person-outline"
          iconColor={COLORS.PRIMARY}
          title={t("profile.editProfile")}
          subtitle={t("profile.editProfileSubtitle")}
          onPress={handleEditProfile}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="lock-closed-outline"
          iconColor={COLORS.WARNING}
          title={t("profile.changePassword")}
          subtitle={t("profile.changePasswordSubtitle")}
          onPress={handleChangePassword}
        />
      </View>

      {/* Notifications */}
      <SectionHeader title={t("profile.notifications")} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="notifications-outline"
          iconColor={COLORS.INFO}
          title={t("profile.notificationsTitle")}
          subtitle={t("profile.notificationsSubtitle")}
          showArrow={false}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.MUTED, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="location-outline"
          iconColor={COLORS.SUCCESS}
          title={t("profile.locationSharing")}
          subtitle={t("profile.locationSubtitle")}
          showArrow={false}
          rightElement={
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: COLORS.MUTED, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
      </View>

      {/* Support */}
      <SectionHeader title={t("profile.support")} />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="help-circle-outline"
          iconColor={COLORS.INFO}
          title={t("profile.help")}
          subtitle={t("profile.helpSubtitle")}
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="chatbubble-outline"
          iconColor={COLORS.SUCCESS}
          title={t("profile.contactUs")}
          subtitle="mightyforever74@gmail.com"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="information-circle-outline"
          iconColor={COLORS.TEXT_SECONDARY}
          title={t("profile.about")}
          subtitle={`${t("profile.version")} 1.0.0`}
          onPress={handleAbout}
        />
      </View>

      {/* Logout */}
      <View style={styles.settingGroup}>
        <SettingItem
          icon="log-out-outline"
          iconColor={COLORS.ERROR}
          title={t("profile.logout")}
          subtitle={t("profile.logoutSubtitle")}
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

// ❌ ESKİ StyleSheet SİLİNDİ - artık makeStyles kullanılıyor

export default DriverProfile;
