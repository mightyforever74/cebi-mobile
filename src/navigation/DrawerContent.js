// src/navigation/DrawerContent.js
// TulipFleet - Custom Drawer Content
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği
// Updated: 17 Ocak 2026 - i18n + Language selector in header (korundu)

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { LANGUAGES } from "../locales/i18n";
import { taskOffersAPI } from "../services/api";

// --- helper: #RRGGBB => #RRGGBBAA ---
const withAlpha = (hex, alpha01) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  const a = Math.max(0, Math.min(1, alpha01));
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${alpha}`;
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND ?? COLORS.WHITE,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER_COLOR ?? COLORS.BORDER,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    logo: {
      fontSize: 24,
      fontWeight: "bold",
      color: COLORS.PRIMARY,
    },
    langButton: {
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.08),
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.PRIMARY, 0.18),
    },
    langFlag: {
      fontSize: 24,
    },
    subtitle: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 4,
    },

    userSection: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: COLORS.BACKGROUND ?? COLORS.WHITE,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
    },
    superAdminAvatar: {
      backgroundColor: COLORS.GRADIENT_START ?? COLORS.LABEL ?? COLORS.PRIMARY,
    },
    avatarText: {
      color: COLORS.WHITE,
      fontSize: 20,
      fontWeight: "bold",
    },
    userInfo: {
      marginLeft: 12,
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    userRole: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    superAdminRole: {
      color: COLORS.GRADIENT_START ?? COLORS.LABEL ?? COLORS.PRIMARY,
      fontWeight: "600",
    },

    divider: {
      height: 1,
      backgroundColor: COLORS.DIVIDER ?? COLORS.BORDER_COLOR ?? COLORS.BORDER,
      marginHorizontal: 20,
    },

    menuContainer: {
      flex: 1,
      paddingTop: 8,
      backgroundColor: COLORS.BACKGROUND ?? COLORS.WHITE,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginHorizontal: 8,
      borderRadius: 8,
    },
    menuItemFocused: {
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.1),
    },
    menuIcon: {
      fontSize: 20,
      width: 32,
    },
    menuText: {
      fontSize: 15,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "500",
    },
    menuTextFocused: {
      color: COLORS.PRIMARY,
      fontWeight: "600",
    },
    badge: {
      marginLeft: "auto",
      backgroundColor: COLORS.ERROR,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 24,
      alignItems: "center",
    },
    badgeText: {
      color: COLORS.WHITE,
      fontSize: 12,
      fontWeight: "700",
    },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER ?? COLORS.BORDER_COLOR ?? COLORS.BORDER,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    logoutIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    logoutText: {
      fontSize: 15,
      color: COLORS.ERROR,
      fontWeight: "500",
    },
    version: {
      fontSize: 11,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: 8,
    },

    // Language Modal Styles
    langModalOverlay: {
      flex: 1,
      backgroundColor: withAlpha(COLORS.BLACK, 0.5),
      justifyContent: "flex-end",
    },
    langModalContent: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "70%",
      borderWidth: 1,
      borderColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    langModalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      textAlign: "center",
      marginBottom: 16,
    },
    langItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.25) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    langItemActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    langItemFlag: {
      fontSize: 24,
      marginRight: 12,
    },
    langItemName: {
      fontSize: 16,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      flex: 1,
    },
    langItemNameActive: {
      color: COLORS.WHITE,
      fontWeight: "600",
    },
    checkmark: {
      fontSize: 18,
      color: COLORS.WHITE,
      fontWeight: "bold",
    },
    langCloseBtn: {
      backgroundColor: COLORS.MUTED,
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 12,
    },
    langCloseBtnText: {
      color: COLORS.WHITE,
      fontSize: 16,
      fontWeight: "600",
    },
  });

// ============================================
// MENU ITEM COMPONENT
// ============================================
const DrawerMenuItem = ({
  title,
  icon,
  focused,
  onPress,
  badgeCount,
  styles,
}) => {
  return (
    <TouchableOpacity
      style={[styles.menuItem, focused && styles.menuItemFocused]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuText, focused && styles.menuTextFocused]}>
        {title}
      </Text>

      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// MAIN DRAWER CONTENT
// ============================================
const DrawerContent = ({ navigation, state }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [offersCount, setOffersCount] = useState(0);
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Get current route name (Drawer level)
  const currentDrawerRoute = state?.routes?.[state.index]?.name || "";

  // Try to get nested stack route for better highlight
  const nestedState = state?.routes?.[state.index]?.state;
  const currentStackRoute =
    nestedState?.routes?.[nestedState.index]?.name || "";

  const role = user?.role?.toLowerCase();
  const isSuperAdmin = role === "super_admin";
  const isAdmin =
    role === "admin" || role === "company_admin" || role === "super_admin";

  // Current language
  const currentLang =
    LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  // Change language
  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setLangModalVisible(false);
  };

  // Fetch pending task offers count
  const fetchOffersCount = async () => {
    try {
      const res = await taskOffersAPI.getOffers("pending");
      let count = 0;

      if (Array.isArray(res)) {
        count = res.length;
      } else if (res) {
        const list = Array.isArray(res.offers)
          ? res.offers
          : Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.items)
              ? res.items
              : [];
        count = list.length || (typeof res.total === "number" ? res.total : 0);
      }

      setOffersCount(count);
    } catch (e) {
      // Silent fail; keep badge hidden
      setOffersCount(0);
    }
  };

  // Refresh offers count on mount and focus
  useEffect(() => {
    fetchOffersCount();
    const unsubscribe = navigation.addListener?.("focus", fetchOffersCount);
    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // CRITICAL FIX: Nested Navigation Handler
  // ============================================
  const handleMenuPress = (item) => {
    if (isAdmin) {
      // ADMIN NAVIGATION
      if (item.screen === "AdminHome" || item.screen === "AdminDashboard") {
        navigation.navigate("AdminHome");
      } else {
        navigation.navigate("AdminHome", { screen: item.screen });
      }
    } else {
      // DRIVER NAVIGATION - Direkt navigate
      navigation.navigate(item.screen);
    }
  };

  // ============================================
  // MENU ITEMS - Role-based with i18n
  // ============================================
  const menuItems = useMemo(() => {
    if (isSuperAdmin) {
      return [
        {
          title: t("navigation.dashboard"),
          icon: "📊",
          screen: "AdminDashboard",
        },
        { title: t("navigation.companies"), icon: "🏢", screen: "Companies" },
        { title: t("navigation.vehicles"), icon: "🚗", screen: "Vehicles" },
        { title: t("navigation.drivers"), icon: "👥", screen: "Drivers" },
        { title: t("navigation.tasks"), icon: "📋", screen: "Tasks" },
        { title: t("navigation.alerts"), icon: "🔔", screen: "Alerts" },
        { title: t("navigation.fleetMap"), icon: "🗺️", screen: "FleetMap" },
        { title: t("navigation.settings"), icon: "⚙️", screen: "Settings" },
      ];
    }

    if (isAdmin) {
      return [
        {
          title: t("navigation.dashboard"),
          icon: "📊",
          screen: "AdminDashboard",
        },
        { title: t("navigation.vehicles"), icon: "🚗", screen: "Vehicles" },
        { title: t("navigation.drivers"), icon: "👥", screen: "Drivers" },
        { title: t("navigation.tasks"), icon: "📋", screen: "Tasks" },
        { title: t("navigation.alerts"), icon: "🔔", screen: "Alerts" },
        { title: t("navigation.fleetMap"), icon: "🗺️", screen: "FleetMap" },
        { title: t("navigation.settings"), icon: "⚙️", screen: "Settings" },
      ];
    }

    // DRIVER
    return [
      {
        title: t("navigation.dashboard"),
        icon: "🏠",
        screen: "DriverDashboard",
      },
      {
        title: t("navigation.myTasks"),
        icon: "📋",
        screen: "MyTasks",
        badgeCount: offersCount,
      },
      { title: t("navigation.myVehicle"), icon: "🚗", screen: "MyVehicle" },
      { title: t("navigation.profile"), icon: "👤", screen: "Profile" },
      { title: t("navigation.settings"), icon: "⚙️", screen: "Settings" },
    ];
  }, [isAdmin, isSuperAdmin, offersCount, t]);

  // ============================================
  // CHECK IF MENU ITEM IS FOCUSED
  // ============================================
  const isItemFocused = (item) => {
    if (currentStackRoute) return currentStackRoute === item.screen;

    if (isAdmin) {
      return (
        item.screen === "AdminDashboard" && currentDrawerRoute === "AdminHome"
      );
    }
    return (
      item.screen === "DriverDashboard" && currentDrawerRoute === "DriverHome"
    );
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result?.success) {
      console.log("✅ Logged out");
    }
  };

  // Get role display text
  const getRoleText = () => {
    if (isSuperAdmin) return `⭐ ${t("roles.superAdmin")}`;
    if (isAdmin) return t("roles.companyAdmin");
    return t("roles.driver");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Language Selector */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>🚛 TulipFleet</Text>
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => setLangModalVisible(true)}
          >
            <Text style={styles.langFlag}>{currentLang.flag}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>{t("drawer.fleetManagement")}</Text>
      </View>

      {/* User Info */}
      <View style={styles.userSection}>
        <View style={[styles.avatar, isSuperAdmin && styles.superAdminAvatar]}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user?.firstName || user?.email?.split("@")[0] || t("drawer.user")}
          </Text>
          <Text
            style={[styles.userRole, isSuperAdmin && styles.superAdminRole]}
          >
            {getRoleText()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Menu Items */}
      <ScrollView
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item, index) => (
          <DrawerMenuItem
            key={index}
            title={item.title}
            icon={item.icon}
            focused={isItemFocused(item)}
            onPress={() => handleMenuPress(item)}
            badgeCount={item.badgeCount || 0}
            styles={styles}
          />
        ))}
      </ScrollView>

      {/* Footer - Logout */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>{t("auth.logout")}</Text>
        </TouchableOpacity>
        <Text style={styles.version}>TulipFleet v1.0.0</Text>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.langModalOverlay}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>
              {t("settings.selectLanguage")}
            </Text>

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    item.code === i18n.language && styles.langItemActive,
                  ]}
                  onPress={() => changeLanguage(item.code)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.langItemFlag}>{item.flag}</Text>
                  <Text
                    style={[
                      styles.langItemName,
                      item.code === i18n.language && styles.langItemNameActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.code === i18n.language && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.langCloseBtn}
              onPress={() => setLangModalVisible(false)}
            >
              <Text style={styles.langCloseBtnText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DrawerContent;
