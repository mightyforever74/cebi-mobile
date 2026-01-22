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
      paddingVertical: 30,
      paddingHorizontal: 20,
    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: "bold",
      color: COLORS.PRIMARY,
    },
    profileName: {
      fontSize: 22,
      fontWeight: "bold",
      color: COLORS.WHITE,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 12,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
    },
    roleText: {
      color: COLORS.WHITE,
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 6,
    },
    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: 12,
      marginTop: -20,
      marginBottom: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.CARD,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 4,
      alignItems: "center",
      shadowColor: COLORS.SHADOW,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT,
    },
    statLabel: {
      fontSize: 11,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: COLORS.TEXT_SECONDARY,
      letterSpacing: 1,
    },
    settingGroup: {
      backgroundColor: COLORS.CARD,
      marginHorizontal: 12,
      borderRadius: 12,
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
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.DIVIDER,
      marginLeft: 68,
    },
    footer: {
      alignItems: "center",
      paddingVertical: 30,
    },
    footerText: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: "500",
    },
    footerSubtext: {
      fontSize: 12,
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
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

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
          { backgroundColor: `${iconColor || COLORS.PRIMARY}15` },
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
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
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
        onPress: () => Linking.openURL("mailto:support@tulipfleet.com"),
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
          subtitle="support@tulipfleet.com"
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
