// src/navigation/DrawerContent.js
// TulipFleet - Custom Drawer Content
// Updated: 17 Ocak 2026 - i18n + Language selector in header

import { useState } from "react";
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
import { COLORS } from "../constants/config";
import { useAuth } from "../context/AuthContext";
import { LANGUAGES } from "../locales/i18n";

// ============================================
// MENU ITEM COMPONENT
// ============================================
const DrawerMenuItem = ({ title, icon, focused, onPress }) => {
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

  // Language Modal State
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
    // DRIVER NAVIGATION
    if (item.screen === "DriverHome" || item.screen === "DriverDashboard") {
      navigation.navigate("DriverHome");
    } else if (item.nestedScreen) {
      // ← YENİ: Nested screen varsa onu da geç
      navigation.navigate("DriverHome", { 
        screen: item.screen,
        params: { screen: item.nestedScreen }
      });
    } else {
      navigation.navigate("DriverHome", { screen: item.screen });
    }
  }
};

  // ============================================
  // MENU ITEMS - Role-based with i18n
  // ============================================
  const getMenuItems = () => {
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
      { title: t("navigation.dashboard"), icon: "🏠", screen: "DriverDashboard" },
      { title: t("navigation.myTasks"), icon: "📋", screen: "MyTasks", nestedScreen: "DriverTasksScreen" }, 
      { title: t("navigation.myVehicle"), icon: "🚗", screen: "MyVehicle" },
      { title: t("navigation.profile"), icon: "👤", screen: "Profile" },
      { title: t("navigation.settings"), icon: "⚙️", screen: "Settings" },
    ];
  };

  // ============================================
  // CHECK IF MENU ITEM IS FOCUSED
  // ============================================
  const isItemFocused = (item) => {
    if (currentStackRoute) {
      return currentStackRoute === item.screen;
    }

    if (isAdmin) {
      return (
        item.screen === "AdminDashboard" && currentDrawerRoute === "AdminHome"
      );
    } else {
      return (
        item.screen === "DriverDashboard" && currentDrawerRoute === "DriverHome"
      );
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log("✅ Logged out");
    }
  };

  const menuItems = getMenuItems();

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
          {/* Language Button */}
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

      {/* Divider */}
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

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  langButton: {
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
  },
  langFlag: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  superAdminAvatar: {
    backgroundColor: "#8b5cf6",
  },
  avatarText: {
    color: COLORS.white,
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
    color: COLORS.text,
  },
  userRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  superAdminRole: {
    color: "#8b5cf6",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 8,
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
    backgroundColor: `${COLORS.primary}15`,
  },
  menuIcon: {
    fontSize: 20,
    width: 32,
  },
  menuText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
  },
  menuTextFocused: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    color: COLORS.danger,
    fontWeight: "500",
  },
  version: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  // Language Modal Styles
  langModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  langModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#32325D",
    textAlign: "center",
    marginBottom: 16,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F7FAFC",
  },
  langItemActive: {
    backgroundColor: COLORS.primary,
  },
  langItemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  langItemName: {
    fontSize: 16,
    color: "#32325D",
    flex: 1,
  },
  langItemNameActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 18,
    color: "#FFF",
    fontWeight: "bold",
  },
  langCloseBtn: {
    backgroundColor: "#8898AA",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  langCloseBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DrawerContent;
