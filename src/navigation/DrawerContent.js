// src/navigation/DrawerContent.js
// TulipFleet - Custom Drawer Content
// FIXED: Nested navigation için handleMenuPress
// UPDATED: Super Admin - Şirketler menüsü eklendi

import { Text } from "galio-framework";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/config";
import { useAuth } from "../context/AuthContext";

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

  // ============================================
  // 🔴 CRITICAL FIX: Nested Navigation Handler
  // ============================================
  const handleMenuPress = (item) => {
    if (isAdmin) {
      // ADMIN NAVIGATION
      if (item.screen === "AdminHome" || item.screen === "AdminDashboard") {
        // Ana ekran - direkt navigate
        navigation.navigate("AdminHome");
      } else {
        // Nested stack ekranları - AdminHome içine navigate
        navigation.navigate("AdminHome", { screen: item.screen });
      }
    } else {
      // DRIVER NAVIGATION
      if (item.screen === "DriverHome" || item.screen === "DriverDashboard") {
        // Ana ekran - direkt navigate
        navigation.navigate("DriverHome");
      } else {
        // Nested stack ekranları - DriverHome içine navigate
        navigation.navigate("DriverHome", { screen: item.screen });
      }
    }
  };

  // ============================================
  // MENU ITEMS - Role-based
  // ============================================
  const getMenuItems = () => {
    if (isSuperAdmin) {
      // SUPER ADMIN - Şirketler menüsü dahil
      return [
        { title: "Kontrol Paneli", icon: "📊", screen: "AdminDashboard" },
        { title: "🏢 Şirketler", icon: "🏢", screen: "Companies" }, // ← SUPER ADMIN ONLY
        { title: "Araçlar", icon: "🚗", screen: "Vehicles" },
        { title: "Sürücüler", icon: "👥", screen: "Drivers" },
        { title: "Görevler", icon: "📋", screen: "Tasks" },
        { title: "Uyarılar", icon: "🔔", screen: "Alerts" },
        { title: "Fleet Haritası", icon: "🗺️", screen: "FleetMap" },
        { title: "Ayarlar", icon: "⚙️", screen: "Settings" },
      ];
    }

    if (isAdmin) {
      // COMPANY ADMIN - Normal admin menüsü
      return [
        { title: "Kontrol Paneli", icon: "📊", screen: "AdminDashboard" },
        { title: "Araçlar", icon: "🚗", screen: "Vehicles" },
        { title: "Sürücüler", icon: "👥", screen: "Drivers" },
        { title: "Görevler", icon: "📋", screen: "Tasks" },
        { title: "Uyarılar", icon: "🔔", screen: "Alerts" },
        { title: "Fleet Haritası", icon: "🗺️", screen: "FleetMap" },
        { title: "Ayarlar", icon: "⚙️", screen: "Settings" },
      ];
    }

    // DRIVER
    return [
      { title: "Ana Sayfa", icon: "🏠", screen: "DriverDashboard" },
      { title: "Görevlerim", icon: "📋", screen: "MyTasks" },
      { title: "Aracım", icon: "🚗", screen: "MyVehicle" },
      { title: "Profil", icon: "👤", screen: "Profile" },
      { title: "Ayarlar", icon: "⚙️", screen: "Settings" },
    ];
  };

  // ============================================
  // CHECK IF MENU ITEM IS FOCUSED
  // ============================================
  const isItemFocused = (item) => {
    // Check nested stack route first (more accurate)
    if (currentStackRoute) {
      return currentStackRoute === item.screen;
    }

    // Fallback: Check if we're on the home screen
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
      console.log("✅ Çıkış yapıldı");
    }
  };

  const menuItems = getMenuItems();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🚛 TulipFleet</Text>
        <Text style={styles.subtitle}>Filo Yönetim Sistemi</Text>
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
            {user?.firstName || user?.email?.split("@")[0] || "Kullanıcı"}
          </Text>
          <Text
            style={[styles.userRole, isSuperAdmin && styles.superAdminRole]}
          >
            {isSuperAdmin ? "⭐ Süper Admin" : isAdmin ? "Yönetici" : "Sürücü"}
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
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
        <Text style={styles.version}>TulipFleet v1.0.0</Text>
      </View>
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
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
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
    backgroundColor: "#8b5cf6", // Purple for super admin
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
  sectionDivider: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 1,
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
});

export default DrawerContent;
