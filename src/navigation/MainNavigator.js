// ============================================================================
// DRAWER STYLES
// ============================================================================
// src/navigation/MainNavigator.js
// TulipFleet - Professional Navigation with Stable Route Keys
// Updated: 06 Ocak 2026 - Argon Pro compatible, stable route names
//
// ÖNEMLI DEĞİŞİKLİKLER:
// 1. Route name'ler stabil key oldu (DriverHome, DriverTasks vs)
// 2. Emoji yerine drawerLabel + drawerIcon kullanılıyor
// 3. CustomDrawerContent descriptors'tan label okuyor
// 4. Stack Navigator'lar eklendi (TaskDetail, TaskOffers vs için)

import { Ionicons } from "@expo/vector-icons";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

// ============================================
// SCREEN IMPORTS
// ============================================

// Super Admin Screens
import SuperAdminCompaniesScreen from "../screens/superadmin/SuperAdminCompaniesScreen";
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";

// Admin Screens
import AdminAlerts from "../screens/admin/AdminAlerts";
import AdminDashboard from "../screens/admin/AdminDashboard";
import AdminDrivers from "../screens/admin/AdminDrivers";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import AdminSettings from "../screens/admin/AdminSettings";
import AdminTasks from "../screens/admin/AdminTasks";
import AdminVehicles from "../screens/admin/AdminVehicles";
import CreateDriverScreen from "../screens/admin/CreateDriverScreen";
import CreateTaskScreen from "../screens/admin/CreateTaskScreen";
import CreateVehicleScreen from "../screens/admin/CreateVehicleScreen";
import EditDriverScreen from "../screens/admin/EditDriverScreen";
import EditTaskScreen from "../screens/admin/EditTaskScreen";
import EditVehicleScreen from "../screens/admin/EditVehicleScreen";
import FleetMapScreen from "../screens/admin/FleetMapScreen";
import VehicleTrackScreen from "../screens/admin/VehicleTrackScreen";

// Driver Screens
import DeviceSetupScreen from "../screens/driver/DeviceSetupScreen";
import DriverDashboard from "../screens/driver/DriverDashboard";
import DriverProfile from "../screens/driver/DriverProfile";
import DriverRouteMapScreen from "../screens/driver/DriverRouteMapScreen";
import DriverSettings from "../screens/driver/DriverSettings";
import DriverTaskDetail from "../screens/driver/DriverTaskDetail";
import DriverTasks from "../screens/driver/DriverTasks";
import DriverVehicle from "../screens/driver/DriverVehicle";
import TaskOfferDetail from "../screens/driver/TaskOfferDetail";
import TaskOffers from "../screens/driver/TaskOffers";
import VehiclePickerScreen from "../screens/driver/VehiclePickerScreen";
import WiFiPasswordScreen from "../screens/driver/WiFiPasswordScreen";
import WiFiPickerScreen from "../screens/driver/WiFiPickerScreen";
import AboutScreen from "../screens/shared/AboutScreen";

import { Image } from "react-native";

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// ============================================
// CONSTANTS
// ============================================

const COLORS = {
  superAdmin: "#8b5cf6",
  admin: "#5e72e4",
  driver: "#2dce89",
  text: "#525f7f",
  white: "#fff",
  border: "#f0f0f0",
  danger: "#f5365c",
  muted: "#8898aa",
};

// ============================================
// HAMBURGER MENU BUTTON
// ============================================

const HamburgerButton = ({ navigation }) => (
  <TouchableOpacity
    style={styles.hamburgerButton}
    onPress={() => navigation.openDrawer()}
  >
    <View style={styles.hamburgerLine} />
    <View style={styles.hamburgerLine} />
    <View style={styles.hamburgerLine} />
  </TouchableOpacity>
);

// ============================================
// SCREEN OPTIONS FACTORY
// ============================================

// Drawer screen options (with hamburger)
const getScreenOptions =
  (title, color) =>
  ({ navigation }) => ({
    title,
    headerStyle: {
      backgroundColor: color,
      elevation: 4,
      shadowOpacity: 0.3,
    },
    headerTintColor: COLORS.white,
    headerTitleStyle: {
      fontWeight: "bold",
      fontSize: 18,
    },
    headerLeft: () => <HamburgerButton navigation={navigation} />,
  });

// Stack screen options (with back button, no hamburger)
const getStackScreenOptions = (title, color) => ({
  title,
  headerStyle: {
    backgroundColor: color,
    elevation: 4,
    shadowOpacity: 0.3,
  },
  headerTintColor: COLORS.white,
  headerTitleStyle: {
    fontWeight: "bold",
    fontSize: 18,
  },
});

// ============================================
// CUSTOM DRAWER CONTENT (with descriptors label support)
// ============================================

const CustomDrawerContent = (props) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const getRoleColor = () => {
    switch (user?.role) {
      case "super_admin":
        return COLORS.superAdmin;
      case "company_admin":
        return COLORS.admin;
      case "driver":
        return COLORS.driver;
      default:
        return COLORS.admin;
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case "super_admin":
        return t("roles.superAdmin");
      case "company_admin":
        return t("roles.companyAdmin");
      case "driver":
        return t("roles.driver");
      default:
        return t("common.user");
    }
  };

  const handleLogout = () => {
    Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const roleColor = getRoleColor();

  return (
    <View style={styles.drawerContainer}>
      {/* Header */}
      <View style={[styles.drawerHeader, { backgroundColor: roleColor }]}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/bootsplash-logo.png")}
            style={{ width: 48, height: 48, resizeMode: "contain" }}
          />
        </View>
        <Text style={styles.drawerTitle}>TulipFleet</Text>
        <Text style={styles.drawerEmail}>
          {user?.email || "user@tulipfleet.com"}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel()}</Text>
        </View>
      </View>

      {/* Menu Items - Using descriptors for label */}
      <DrawerContentScrollView {...props} style={styles.menuContainer}>
        {props.state.routes.map((route, index) => {
          const focused = props.state.index === index;

          // ✅ descriptors'tan label ve icon al
          const { options } = props.descriptors[route.key];
          const label = options.drawerLabel ?? options.title ?? route.name;
          const IconComponent = options.drawerIcon;

          // Hidden screen'leri gösterme
          if (options.drawerItemStyle?.display === "none") {
            return null;
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={[
                styles.menuItem,
                focused && { backgroundColor: roleColor + "20" },
              ]}
              onPress={() => props.navigation.navigate(route.name)}
            >
              <View style={styles.menuItemContent}>
                {IconComponent && (
                  <View style={styles.menuIconContainer}>
                    {IconComponent({
                      color: focused ? roleColor : COLORS.text,
                      size: 20,
                    })}
                  </View>
                )}
                <Text
                  style={[
                    styles.menuText,
                    focused && { color: roleColor, fontWeight: "bold" },
                  ]}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
          <Text style={styles.logoutText}>{t("auth.logout")}</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>
          {t("settings.version", { version: "1.0.0" })}
        </Text>
      </View>
    </View>
  );
};

// ============================================
// DRIVER STACK NAVIGATORS (for nested screens)
// ============================================

const DriverTasksStack = () => {
  const primaryColor = COLORS.driver;
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DriverTasksList"
        component={DriverTasks}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={DriverTaskDetail}
        options={getStackScreenOptions(t("taskDetail.title"), primaryColor)}
      />
      <Stack.Screen
        name="TaskOffers"
        component={TaskOffers}
        options={getStackScreenOptions(t("taskOffers.title"), primaryColor)}
      />
      <Stack.Screen
        name="TaskOfferDetail"
        component={TaskOfferDetail}
        options={getStackScreenOptions(t("offerDetail.navTitle"), primaryColor)}
      />
    </Stack.Navigator>
  );
};

const DriverMapStack = () => {
  const primaryColor = COLORS.driver;

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DriverMapMain"
        component={DriverRouteMapScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// ADMIN STACK NAVIGATORS
// ============================================

const AdminVehiclesStack = () => {
  const primaryColor = COLORS.admin;
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminVehiclesList"
        component={AdminVehicles}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateVehicle"
        component={CreateVehicleScreen}
        options={getStackScreenOptions(t("createVehicle.navTitle"), primaryColor)}
      />
      <Stack.Screen
        name="EditVehicle"
        component={EditVehicleScreen}
        options={getStackScreenOptions(t("editVehicle.title"), primaryColor)}
      />
      <Stack.Screen
        name="VehicleTrack"
        component={VehicleTrackScreen}
        options={getStackScreenOptions(t("vehicleTrack.followTitle"), primaryColor)}
      />
    </Stack.Navigator>
  );
};

const AdminDriversStack = () => {
  const primaryColor = COLORS.admin;
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminDriversList"
        component={AdminDrivers}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateDriver"
        component={CreateDriverScreen}
        options={getStackScreenOptions(t("createDriver.title"), primaryColor)}
      />
      <Stack.Screen
        name="EditDriver"
        component={EditDriverScreen}
        options={getStackScreenOptions(t("editDriver.title"), primaryColor)}
      />
    </Stack.Navigator>
  );
};

const AdminTasksStack = () => {
  const primaryColor = COLORS.admin;
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminTasksList"
        component={AdminTasks}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={getStackScreenOptions(t("createTask.navTitle"), primaryColor)}
      />
      <Stack.Screen
        name="EditTask"
        component={EditTaskScreen}
        options={getStackScreenOptions(t("editTask.title"), primaryColor)}
      />
    </Stack.Navigator>
  );
};

const AdminMapStack = () => {
  const primaryColor = COLORS.admin;
  const { t } = useTranslation();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminMapMain"
        component={FleetMapScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VehicleTrack"
        component={VehicleTrackScreen}
        options={getStackScreenOptions(t("vehicleTrack.historyTitle"), primaryColor)}
      />
    </Stack.Navigator>
  );
};

// ============================================
// SUPER ADMIN NAVIGATOR
// ============================================

const SuperAdminNavigator = () => {
  const primaryColor = COLORS.superAdmin;
  const { t } = useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: COLORS.white,
          width: 280,
        },
        drawerActiveTintColor: primaryColor,
        drawerInactiveTintColor: COLORS.text,
        swipeEnabled: false,
      }}
    >
      <Drawer.Screen
        name="SuperAdminHome"
        component={SuperAdminDashboard}
        options={{
          ...getScreenOptions(t("navigator.superAdmin.dashboard"), primaryColor)(),
          drawerLabel: t("navigation.dashboard"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="SuperAdminCompanies"
        component={SuperAdminCompaniesScreen}
        options={{
          ...getScreenOptions(t("navigator.superAdmin.companies"), primaryColor)(),
          drawerLabel: t("navigation.companies"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="SuperAdminMap"
        component={PlaceholderScreen}
        options={{
          ...getScreenOptions(t("navigation.fleetMap"), primaryColor)(),
          drawerLabel: t("navigation.fleetMap"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="SuperAdminVehicles"
        component={PlaceholderScreen}
        options={{
          ...getScreenOptions(t("navigation.allVehicles"), primaryColor)(),
          drawerLabel: t("navigation.allVehicles"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="SuperAdminDrivers"
        component={PlaceholderScreen}
        options={{
          ...getScreenOptions(t("navigation.allDrivers"), primaryColor)(),
          drawerLabel: t("navigation.allDrivers"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="SuperAdminTasks"
        component={PlaceholderScreen}
        options={{
          ...getScreenOptions(t("navigation.allTasks"), primaryColor)(),
          drawerLabel: t("navigation.allTasks"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="SuperAdminAlerts"
        component={PlaceholderScreen}
        options={{
          ...getScreenOptions(t("navigation.systemAlerts"), primaryColor)(),
          drawerLabel: t("navigation.systemAlerts"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="SuperAdminSettings"
        component={PlaceholderScreen}
        options={{
          ...getScreenOptions(t("navigation.settings"), primaryColor)(),
          drawerLabel: t("navigation.settings"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// ============================================
// COMPANY ADMIN NAVIGATOR
// ============================================

const AdminNavigator = () => {
  const primaryColor = COLORS.admin;
  const { t } = useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: COLORS.white,
          width: 280,
        },
        drawerActiveTintColor: primaryColor,
        drawerInactiveTintColor: COLORS.text,
        swipeEnabled: false,
      }}
    >
      <Drawer.Screen
        name="AdminHome"
        component={AdminDashboard}
        options={{
          ...getScreenOptions(t("navigator.companyAdmin.dashboard"), primaryColor)(),
          drawerLabel: t("navigation.dashboard"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AdminMap"
        component={AdminMapStack}
        options={{
          ...getScreenOptions(t("navigation.fleetMap"), primaryColor)(),
          drawerLabel: t("navigation.fleetMap"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AdminVehicles"
        component={AdminVehiclesStack}
        options={{
          ...getScreenOptions(t("navigation.vehicles"), primaryColor)(),
          drawerLabel: t("navigation.vehicles"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AdminDrivers"
        component={AdminDriversStack}
        options={{
          ...getScreenOptions(t("navigation.drivers"), primaryColor)(),
          drawerLabel: t("navigation.drivers"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AdminTasks"
        component={AdminTasksStack}
        options={{
          ...getScreenOptions(t("navigation.tasks"), primaryColor)(),
          drawerLabel: t("navigation.tasks"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AdminAlerts"
        component={AdminAlerts}
        options={{
          ...getScreenOptions(t("navigation.alerts"), primaryColor)(),
          drawerLabel: t("navigation.alerts"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{
          ...getScreenOptions(t("navigation.reports"), primaryColor)(),
          drawerLabel: t("navigation.reports"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AdminSettings"
        component={AdminSettings}
        options={{
          ...getScreenOptions(t("navigation.settings"), primaryColor)(),
          drawerLabel: t("navigation.settings"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// ============================================
// DRIVER NAVIGATOR
// ============================================

const DriverNavigator = () => {
  const primaryColor = COLORS.driver;
  const { t } = useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: COLORS.white,
          width: 280,
        },
        drawerActiveTintColor: primaryColor,
        drawerInactiveTintColor: COLORS.text,
        swipeEnabled: false,
      }}
    >
      <Drawer.Screen
        name="DriverHome"
        component={DriverDashboard}
        options={{
          ...getScreenOptions("TulipFleet", primaryColor)(),
          drawerLabel: t("navigation.dashboard"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="DriverTasks"
        component={DriverTasksStack}
        options={{
          ...getScreenOptions(t("navigation.myTasks"), primaryColor)(),
          drawerLabel: t("navigation.myTasks"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="DriverMap"
        component={DriverMapStack}
        options={{
          ...getScreenOptions(t("navigation.map"), primaryColor)(),
          drawerLabel: t("navigation.map"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="DriverVehicle"
        component={DriverVehicle}
        options={{
          ...getScreenOptions(t("navigation.myVehicle"), primaryColor)(),
          drawerLabel: t("navigation.myVehicle"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="DriverProfile"
        component={DriverProfile}
        options={{
          ...getScreenOptions(t("navigator.driver.profile"), primaryColor)(),
          drawerLabel: t("navigator.driver.profile"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="DriverSettings"
        component={DriverSettings}
        options={{
          ...getScreenOptions(t("navigation.settings"), primaryColor)(),
          drawerLabel: t("navigation.settings"),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      {/* 🔒 Setup Flow Screens (Hidden in drawer) */}
      <Drawer.Screen
        name="DeviceSetup"
        component={DeviceSetupScreen}
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="VehiclePicker"
        component={VehiclePickerScreen}
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="WiFiPicker"
        component={WiFiPickerScreen}
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="WiFiPassword"
        component={WiFiPasswordScreen}
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer.Navigator>
  );
};

// ============================================
// PLACEHOLDER SCREEN
// ============================================

const PlaceholderScreen = ({ route }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name="construct-outline" size={60} color={COLORS.muted} />
      <Text style={styles.placeholderTitle}>
        {t("superadmin.nav.comingSoonTitle")}
      </Text>
      <Text style={styles.placeholderSubtitle}>{route.name}</Text>
      <Text style={styles.placeholderText}>
        {t("superadmin.nav.comingSoonBody")}
      </Text>
    </View>
  );
};

// ============================================
// MAIN NAVIGATOR (Role-based routing)
// ============================================

const MainNavigator = () => {
  const { user } = useAuth();

  const getNavigatorForRole = () => {
    switch (user?.role) {
      case "super_admin":
        return <SuperAdminNavigator />;
      case "company_admin":
        return <AdminNavigator />;
      case "driver":
        return <DriverNavigator />;
      default:
        return <DriverNavigator />;
    }
  };

  return getNavigatorForRole();
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Hamburger Button
  hamburgerButton: {
    marginLeft: 15,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  hamburgerLine: {
    width: 22,
    height: 3,
    backgroundColor: COLORS.white,
    marginVertical: 2,
    borderRadius: 2,
  },

  // Drawer
  drawerContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  drawerHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  drawerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  drawerEmail: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },

  // Menu
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIconContainer: {
    width: 28,
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: COLORS.text,
  },

  // Footer
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  versionText: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 11,
  },

  // Placeholder
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#32325d",
    marginTop: 20,
    marginBottom: 10,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: "#5e72e4",
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.muted,
  },
});

export default MainNavigator;
