// src/navigation/DrawerContent.js
// TulipFleet - Custom Drawer Content
// Updated: 11 Şubat 2026 - Theme token cleanup (UI System Guide v3)
// ✅ SPACING/RADIUS/TYPOGRAPHY tokens, no withAlpha, no ?? fallback chains
// ✅ DEBUG text removed, inline styles removed, dark mode ready

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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

// ============================================
// makeStyles - THEME TOKENS
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },

    // ── Header ──
    header: {
      paddingHorizontal: COLORS.SPACING.lg, // 24
      paddingVertical: COLORS.SPACING.lg, // 24
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
      backgroundColor: COLORS.SURFACE,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    logo: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.PRIMARY,
    },
    langButton: {
      backgroundColor: COLORS.SECONDARY,
      padding: COLORS.SPACING.sm, // 8
      borderRadius: COLORS.RADIUS.sm, // 8
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },
    langFlag: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl, // 24
    },
    subtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs, // 4
    },

    // ── User Section ──
    userSection: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.lg, // 24
      paddingVertical: COLORS.SPACING.md, // 16
      backgroundColor: COLORS.BACKGROUND,
    },
    avatar: {
      width: COLORS.SPACING.buttonHeight, // 48
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.SPACING.lg, // 24 (circle)
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
    },
    superAdminAvatar: {
      backgroundColor: COLORS.LABEL,
    },
    avatarText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.h4,
    },
    userInfo: {
      marginLeft: COLORS.SPACING.md, // 16
      flex: 1,
    },
    userName: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    userRole: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    superAdminRole: {
      color: COLORS.LABEL,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Divider ──
    divider: {
      height: 1,
      backgroundColor: COLORS.DIVIDER,
      marginHorizontal: COLORS.SPACING.lg, // 24
    },

    // ── Menu ──
    menuContainer: {
      flex: 1,
      paddingTop: COLORS.SPACING.sm, // 8
      backgroundColor: COLORS.BACKGROUND,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.md, // 16
      paddingHorizontal: COLORS.SPACING.lg, // 24
      marginHorizontal: COLORS.SPACING.sm, // 8
      borderRadius: COLORS.RADIUS.sm, // 8
    },
    menuItemFocused: {
      backgroundColor: COLORS.SECONDARY,
    },
    menuIcon: {
      marginRight: COLORS.SPACING.md, // 16
    },
    menuText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg, // 16
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    menuTextFocused: {
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Badge ──
    badge: {
      marginLeft: "auto",
      backgroundColor: COLORS.ERROR,
      paddingHorizontal: COLORS.SPACING.sm, // 8
      paddingVertical: COLORS.SPACING.xs, // 4
      borderRadius: COLORS.RADIUS.sm, // 8
      minWidth: COLORS.SPACING.lg, // 24
      alignItems: "center",
    },
    badgeText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // ── Footer ──
    footer: {
      paddingHorizontal: COLORS.SPACING.lg, // 24
      paddingTop: COLORS.SPACING.md, // 16
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      backgroundColor: COLORS.SURFACE,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.md, // 16
    },
    logoutIcon: {
      marginRight: COLORS.SPACING.md, // 16
    },
    logoutText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg, // 16
      color: COLORS.ERROR,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    version: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs, // 10
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm, // 8
    },

    // ── Language Modal ──
    langModalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "flex-end",
    },
    langModalContent: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl, // 20
      borderTopRightRadius: COLORS.RADIUS.xl, // 20
      padding: COLORS.SPACING.lg, // 24
      maxHeight: "70%",
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      ...COLORS.SHADOWS.modal,
    },
    langModalTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT,
      textAlign: "center",
      marginBottom: COLORS.SPACING.md, // 16
    },
    langItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.sm, // 8
      marginBottom: COLORS.SPACING.sm, // 8
      backgroundColor: COLORS.SECONDARY,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },
    langItemActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    langItemFlag: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl, // 24
      marginRight: COLORS.SPACING.md, // 16
    },
    langItemName: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
      flex: 1,
    },
    langItemNameActive: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    checkmark: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl, // 20
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    langCloseBtn: {
      backgroundColor: COLORS.MUTED,
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.sm, // 8
      alignItems: "center",
      justifyContent: "center",
      marginTop: COLORS.SPACING.md, // 16
    },
    langCloseBtnText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.button,
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
  COLORS,
}) => {
  return (
    <TouchableOpacity
      style={[styles.menuItem, focused && styles.menuItemFocused]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={22}
        color={focused ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
        style={styles.menuIcon}
      />
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
  const [, forceUpdate] = useState(0);

  // Re-render drawer when language changes from ANY screen
  useEffect(() => {
    const onLangChanged = () => forceUpdate((n) => n + 1);
    i18n.on("languageChanged", onLangChanged);
    return () => i18n.off("languageChanged", onLangChanged);
  }, [i18n]);

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

  // Change language with force re-render
  const changeLanguage = async (langCode) => {
    await i18n.changeLanguage(langCode);
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
  // MENU ITEMS - Role-based with i18n (NO useMemo - always recalculate)
  // ============================================

  const getMenuItems = () => {
    if (isSuperAdmin) {
      return [
        {
          title: t("navigation.dashboard"),
          icon: "stats-chart-outline",
          screen: "AdminDashboard",
        },
        {
          title: t("navigation.companies"),
          icon: "business-outline",
          screen: "Companies",
        },
        {
          title: t("navigation.vehicles"),
          icon: "car-sport-outline",
          screen: "Vehicles",
        },
        {
          title: t("navigation.drivers"),
          icon: "people-outline",
          screen: "AdminDrivers",
        },
        {
          title: t("navigation.tasks"),
          icon: "clipboard-outline",
          screen: "Tasks",
        },
        {
          title: t("navigation.alerts"),
          icon: "notifications-outline",
          screen: "Alerts",
        },
        {
          title: t("navigation.fleetMap"),
          icon: "map-outline",
          screen: "FleetMap",
        },
        {
          title: t("navigation.settings"),
          icon: "settings-outline",
          screen: "Settings",
        },
      ];
    }

    if (isAdmin) {
      return [
        {
          title: t("navigation.dashboard"),
          icon: "stats-chart-outline",
          screen: "AdminDashboard",
        },
        {
          title: t("navigation.vehicles"),
          icon: "car-sport-outline",
          screen: "Vehicles",
        },
        {
          title: t("navigation.drivers"),
          icon: "people-outline",
          screen: "AdminDrivers",
        },
        {
          title: t("navigation.tasks"),
          icon: "clipboard-outline",
          screen: "Tasks",
        },
        {
          title: t("navigation.alerts"),
          icon: "notifications-outline",
          screen: "Alerts",
        },
        {
          title: t("navigation.fleetMap"),
          icon: "map-outline",
          screen: "FleetMap",
        },
        {
          title: t("navigation.settings"),
          icon: "settings-outline",
          screen: "Settings",
        },
      ];
    }

    // DRIVER
    return [
      {
        title: t("navigation.dashboard"),
        icon: "speedometer-outline",
        screen: "DriverDashboard",
      },
      {
        title: t("navigation.myTasks"),
        icon: "clipboard-outline",
        screen: "MyTasks",
        badgeCount: offersCount,
      },
      {
        title: t("navigation.myVehicle"),
        icon: "car-sport-outline",
        screen: "MyVehicle",
      },
      {
        title: t("navigation.profile"),
        icon: "person-outline",
        screen: "Profile",
      },
      {
        title: t("navigation.settings"),
        icon: "settings-outline",
        screen: "Settings",
      },
    ];
  };

  const menuItems = getMenuItems();

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
          <Text style={styles.logo}>TulipFleet</Text>
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
            COLORS={COLORS}
          />
        ))}
      </ScrollView>

      {/* Footer - Logout */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={20}
            color={COLORS.ERROR}
            style={styles.logoutIcon}
          />
          <Text style={styles.logoutText}>{t("auth.logout")}</Text>
        </TouchableOpacity>
        <Text style={styles.version}>TulipFleet v2.1.0</Text>
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
