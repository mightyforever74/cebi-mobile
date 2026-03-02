// src/navigation/AppNavigator.js
// TulipFleet - Role-Based Navigation
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliði
// Updated: 21 Ocak 2026 - Hardcoded labels (no i18n prefixes) (korundu)

import { Ionicons } from "@expo/vector-icons";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const Stack = createStackNavigator();

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";

// ============================================================================
// SUPER ADMIN SCREENS
// ============================================================================
import CompaniesScreen from "../screens/superadmin/CompaniesScreen";
import CompanyEditScreen from "../screens/superadmin/CompanyEditScreen";
import CreateCompanyScreen from "../screens/superadmin/CreateCompanyScreen";
import DeviceDetailScreen from "../screens/superadmin/DeviceDetailScreen";
import DeviceQRManagement from "../screens/superadmin/DeviceQRManagement";
import DevicesScreen from "../screens/superadmin/DevicesScreen";
import PlatformUsersScreen from "../screens/superadmin/PlatformUsersScreen";
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";
import SystemHealthScreen from "../screens/superadmin/SystemHealthScreen";

// ============================================================================
// COMPANY ADMIN SCREENS
// ============================================================================
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
import AdminFuelDashboard from "../screens/admin/fuel/AdminFuelDashboard";
import VehicleTrackScreen from "../screens/admin/VehicleTrackScreen";

// ============================================================================
// DRIVER SCREENS
// ============================================================================
import DriverDashboard from "../screens/driver/DriverDashboard";
import DriverProfile from "../screens/driver/DriverProfile";
import DriverRouteMapScreen from "../screens/driver/DriverRouteMapScreen";
import DriverSettings from "../screens/driver/DriverSettings";
import DriverTaskDetail from "../screens/driver/DriverTaskDetail";
import DriverTasks from "../screens/driver/DriverTasks";
import DriverVehicle from "../screens/driver/DriverVehicle";
import DriverWelcomeScreen from "../screens/driver/DriverWelcomeScreen";
import FuelEntryScreen from "../screens/driver/FuelEntryScreen";
import HelpCenterScreen from "../screens/driver/HelpCenterScreen";
import LEDIndicatorsScreen from "../screens/driver/LEDIndicatorsScreen";
import TaskOfferDetail from "../screens/driver/TaskOfferDetail";
import TaskOffers from "../screens/driver/TaskOffers";
import TroubleshootingScreen from "../screens/driver/TroubleshootingScreen";

// ============================================================================
// FAZ 4: DEVICE SETUP SCREEN (BLE + QR Activation)
// ============================================================================
import DeviceSetupScreen from "../screens/driver/DeviceSetupScreen";
import VehiclePickerScreen from "../screens/driver/VehiclePickerScreen";
import WiFiPasswordScreen from "../screens/driver/WiFiPasswordScreen";
import WiFiPickerScreen from "../screens/driver/WiFiPickerScreen";

// ============================================================================
// SHARED SCREENS
// ============================================================================
import ChangePasswordScreen from "../screens/shared/ChangePasswordScreen";
import EditProfileScreen from "../screens/shared/EditProfileScreen";

// ============================================================================
// DRAWER STYLES (makeStyles)
// ============================================================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    drawerContainer: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND || COLORS.WHITE,
    },
    drawerHeader: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.BORDER || "#E0E0E0",
    },
    avatarContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 24,
      fontWeight: "bold",
      color: COLORS.PRIMARY,
    },
    userInfo: {
      marginTop: 8,
    },
    userName: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.WHITE,
      marginBottom: 4,
    },
    roleBadge: {
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: "flex-start",
      marginTop: 4,
    },
    roleText: {
      fontSize: 12,
      fontWeight: "600",
      color: COLORS.WHITE,
    },
    companyName: {
      fontSize: 13,
      color: COLORS.WHITE,
      marginTop: 6,
      opacity: 0.9,
    },
    menuContainer: {
      flex: 1,
      paddingTop: 10,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginHorizontal: 10,
      marginVertical: 2,
      borderRadius: 8,
    },
    menuItemActive: {
      backgroundColor: COLORS.PRIMARY + "15",
    },
    menuText: {
      fontSize: 15,
      marginLeft: 12,
      color: COLORS.TEXT || COLORS.DEFAULT,
      fontWeight: "500",
    },
    menuTextActive: {
      color: COLORS.PRIMARY,
      fontWeight: "700",
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.BORDER || "#E0E0E0",
      marginVertical: 10,
      marginHorizontal: 20,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.ERROR || "#FF4444",
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginHorizontal: 10,
      marginVertical: 10,
      borderRadius: 8,
    },
    logoutText: {
      fontSize: 15,
      marginLeft: 10,
      color: COLORS.WHITE,
      fontWeight: "600",
    },
    versionText: {
      fontSize: 12,
      color: COLORS.MUTED || "#999",
      textAlign: "center",
      marginTop: 10,
      marginBottom: 20,
    },
  });

// ============================================================================
// CUSTOM DRAWER CONTENT (THEMED)
// ============================================================================
const CustomDrawerContent = ({ navigation, state, menuItems, headerColor }) => {
  const { user, logout } = useAuth();
  const { COLORS } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const [, forceUpdate] = useState(0);

  // Force re-render when language changes from Settings or anywhere
  useEffect(() => {
    const onLangChanged = () => forceUpdate((n) => n + 1);
    i18n.on("languageChanged", onLangChanged);
    return () => i18n.off("languageChanged", onLangChanged);
  }, [i18n]);

  const handleLogout = () => {
    Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const getRoleDisplayName = () => {
    switch (user?.role) {
      case "super_admin":
        return t("roles.superAdmin");
      case "company_admin":
        return t("roles.companyAdmin");
      case "driver":
        return t("roles.driver");
      default:
        return user?.role;
    }
  };

  const currentRoute = state.routes[state.index]?.name;

  return (
    <View style={styles.drawerContainer}>
      <View
        style={[
          styles.drawerHeader,
          { backgroundColor: headerColor || COLORS.PRIMARY },
        ]}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.first_name?.charAt(0) ||
              user?.email?.charAt(0)?.toUpperCase() ||
              "U"}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.email?.split("@")[0] || t("drawer.user")}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleDisplayName()}</Text>
          </View>

          {user?.company?.name ? (
            <Text style={styles.companyName} numberOfLines={1}>
              {user.company.name}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item) => {
          const isActive = currentRoute === item.name;
          const label = item.i18nKey ? t(item.i18nKey) : item.label;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => navigation.navigate(item.name)}
            >
              <Ionicons
                name={isActive ? item.icon.replace("-outline", "") : item.icon}
                size={22}
                color={
                  isActive ? COLORS.PRIMARY : (COLORS.HEADER ?? COLORS.MUTED)
                }
              />
              <Text
                style={[styles.menuText, isActive && styles.menuTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.WHITE} />
          <Text style={styles.logoutText}>{t("auth.logout")}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>TulipFleet v2.0.0</Text>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// HELPERS
// ============================================================================
// DRIVER NAVIGATOR
// ============================================================================

const SetupFlowStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DeviceSetupMain" component={DeviceSetupScreen} />
    <Stack.Screen name="VehiclePickerMain" component={VehiclePickerScreen} />
    <Stack.Screen name="WiFiPickerMain" component={WiFiPickerScreen} />
    <Stack.Screen name="WiFiPasswordMain" component={WiFiPasswordScreen} />
  </Stack.Navigator>
);

const DriverNavigator = () => {
  const { COLORS } = useTheme();
  const { t } = useTranslation();

  const headerColor = COLORS.SUCCESS; // önce #2DCE89
  const menuItems = [
    {
      name: "DriverDashboard",
      i18nKey: "navigation.dashboard",
      icon: "speedometer-outline",
    },
    { name: "MyTasks", i18nKey: "navigation.myTasks", icon: "list-outline" },
    {
      name: "Navigation",
      i18nKey: "navigation.navigation",
      icon: "navigate-outline",
    },
    {
      name: "FuelEntry",
      i18nKey: "navigation.fuelEntry",
      icon: "flame-outline",
    },
    {
      name: "MyVehicle",
      i18nKey: "navigation.myVehicle",
      icon: "car-sport-outline",
    },
    {
      name: "DeviceSetup",
      i18nKey: "navigation.deviceSetup",
      icon: "bluetooth-outline",
    },
    { name: "Profile", i18nKey: "navigation.profile", icon: "person-outline" },
    {
      name: "DriverSettings",
      i18nKey: "navigation.settings",
      icon: "settings-outline",
    },
    { name: "SOS", i18nKey: "navigation.sos", icon: "warning-outline" },
  ];

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={menuItems}
          headerColor={headerColor}
        />
      )}
      screenOptions={({ route }) => {
        const titles = {
          DriverDashboard: t("navigation.dashboard"),
          MyTasks: t("navigation.myTasks"),
          Navigation: t("navigation.navigation"),
          FuelEntry: t("navigation.fuelEntry"),
          MyVehicle: t("navigation.myVehicle"),
          DeviceSetup: t("navigation.deviceSetup"),
          Profile: t("navigation.profile"),
          DriverSettings: t("navigation.settings"),
          SOS: t("navigation.sos"),
        };
        return {
          headerStyle: { backgroundColor: headerColor, elevation: 4 },
          headerTintColor: COLORS.WHITE,
          headerTitleStyle: { fontWeight: "600" },
          drawerType: "front",
          swipeEnabled: true,
          drawerStyle: { width: 280 },
          title: titles[route.name] || route.name,
        };
      }}
    >
      <Drawer.Screen
        name="DriverWelcome"
        component={DriverWelcomeScreen}
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen name="DriverDashboard" component={DriverDashboard} />
      <Drawer.Screen name="MyTasks" component={TasksStack} />
      <Drawer.Screen name="Navigation" component={DriverRouteMapScreen} />
      <Drawer.Screen name="FuelEntry" component={FuelEntryScreen} />
      <Drawer.Screen name="MyVehicle" component={DriverVehicle} />
      <Drawer.Screen
        name="DeviceSetup"
        component={SetupFlowStack}
        options={{ headerShown: false, drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen name="Profile" component={ProfileStack} />
      <Drawer.Screen name="DriverSettings" component={SettingsStack} />
      <Drawer.Screen name="SOS" component={DriverSOSScreen} />
    </Drawer.Navigator>
  );
};

// ============================================================================
// PLACEHOLDER SCREENS (THEMED)
// ============================================================================
const PlaceholderScreen = ({ titleKey, icon, descriptionKey }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.placeholderContainer}>
      <Ionicons
        name={icon || "construct-outline"}
        size={64}
        color={COLORS.PRIMARY}
      />
      <Text style={styles.placeholderTitle}>{t(titleKey)}</Text>
      <Text style={styles.placeholderDesc}>
        {t(descriptionKey) || "Yakýnda..."}
      </Text>
    </View>
  );
};

const PlatformReportsScreen = () => (
  <PlaceholderScreen
    titleKey="Platform Raporlarý"
    icon="bar-chart-outline"
    descriptionKey="Platform istatistikleri"
  />
);

const PlatformSettingsScreen = () => (
  <PlaceholderScreen
    titleKey="Platform Ayarlarý"
    icon="settings-outline"
    descriptionKey="Sistem konfigürasyonu"
  />
);

const DriverSOSScreen = () => (
  <PlaceholderScreen
    titleKey="Acil Durum"
    icon="warning-outline"
    descriptionKey="SOS gönder"
  />
);

// ============================================================================
// NAVIGATORS
// ============================================================================

const Drawer = createDrawerNavigator();

// ============================================================================
// SUPER ADMIN STACK NAVIGATORS
// ============================================================================
const CompaniesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CompaniesMain" component={CompaniesScreen} />
    <Stack.Screen name="CreateCompany" component={CreateCompanyScreen} />
    <Stack.Screen name="CompanyEdit" component={CompanyEditScreen} />
  </Stack.Navigator>
);

const SADevicesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DevicesMain" component={DevicesScreen} />
    <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
    <Stack.Screen name="DeviceQRManagement" component={DeviceQRManagement} />
  </Stack.Navigator>
);

// ============================================================================
// SUPER ADMIN NAVIGATOR
// ============================================================================
const SuperAdminNavigator = () => {
  const { COLORS } = useTheme();
  const { t } = useTranslation();

  const headerColor = COLORS.ERROR; // önce #F5365C
  const menuItems = [
    {
      name: "SADashboard",
      i18nKey: "navigation.dashboard",
      icon: "speedometer-outline",
    },
    {
      name: "Companies",
      i18nKey: "navigation.companies",
      icon: "business-outline",
    },
    {
      name: "SADevices",
      i18nKey: "navigation.devices",
      icon: "hardware-chip-outline",
    },
    {
      name: "PlatformUsers",
      i18nKey: "navigation.platformUsers",
      icon: "people-outline",
    },
    {
      name: "PlatformSettings",
      i18nKey: "navigation.settings",
      icon: "settings-outline",
    },
  ];

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={menuItems}
          headerColor={headerColor}
        />
      )}
      screenOptions={({ route }) => {
        const titles = {
          SADashboard: t("navigation.dashboard"),
          Companies: t("navigation.companies"),
          SADevices: t("navigation.devices"),
          PlatformUsers: t("navigation.platformUsers"),
          SystemHealth: t("navigation.systemHealth"),
          PlatformReports: t("navigation.reports"),
          PlatformSettings: t("navigation.settings"),
        };
        return {
          headerStyle: { backgroundColor: headerColor, elevation: 4 },
          headerTintColor: COLORS.WHITE,
          headerTitleStyle: { fontWeight: "600" },
          drawerType: "front",
          swipeEnabled: true,
          drawerStyle: { width: 280 },
          title: titles[route.name] || route.name,
        };
      }}
    >
      <Drawer.Screen name="SADashboard" component={SuperAdminDashboard} />
      <Drawer.Screen name="Companies" component={CompaniesStack} />
      <Drawer.Screen name="SADevices" component={SADevicesStack} />
      <Drawer.Screen name="PlatformUsers" component={PlatformUsersScreen} />
      <Drawer.Screen name="SystemHealth" component={SystemHealthScreen} />
      <Drawer.Screen name="PlatformReports" component={PlatformReportsScreen} />
      <Drawer.Screen
        name="PlatformSettings"
        component={PlatformSettingsScreen}
      />
    </Drawer.Navigator>
  );
};

// ============================================================================
// COMPANY ADMIN STACK NAVIGATORS
// ============================================================================
const AdminVehiclesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VehiclesMain" component={AdminVehicles} />
    <Stack.Screen name="CreateVehicle" component={CreateVehicleScreen} />
    <Stack.Screen name="EditVehicle" component={EditVehicleScreen} />
  </Stack.Navigator>
);

const AdminDriversStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriversMain" component={AdminDrivers} />
    <Stack.Screen name="CreateDriver" component={CreateDriverScreen} />
    <Stack.Screen name="EditDriver" component={EditDriverScreen} />
  </Stack.Navigator>
);

const AdminTasksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TasksMain" component={AdminTasks} />
    <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
    <Stack.Screen name="EditTask" component={EditTaskScreen} />
  </Stack.Navigator>
);

const AdminFleetMapStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FleetMapMain" component={FleetMapScreen} />
    <Stack.Screen name="VehicleTrack" component={VehicleTrackScreen} />
  </Stack.Navigator>
);

// ============================================================================
// COMPANY ADMIN NAVIGATOR
// ============================================================================
const CompanyAdminNavigator = () => {
  const { COLORS } = useTheme();
  const { t } = useTranslation();

  const headerColor = COLORS.WARNING; // önce #FB6340
  const menuItems = [
    {
      name: "AdminDashboard",
      i18nKey: "navigation.dashboard",
      icon: "speedometer-outline",
    },
    {
      name: "Vehicles",
      i18nKey: "navigation.vehicles",
      icon: "car-sport-outline",
    },
    { name: "Drivers", i18nKey: "navigation.drivers", icon: "people-outline" },
    { name: "Tasks", i18nKey: "navigation.tasks", icon: "clipboard-outline" },
    { name: "FleetMap", i18nKey: "navigation.fleetMap", icon: "map-outline" },
    {
      name: "Reports",
      i18nKey: "navigation.reports",
      icon: "bar-chart-outline",
    },
    {
      name: "FuelDashboard",
      i18nKey: "navigation.fuelAnalysis",
      icon: "analytics-outline",
    },
    {
      name: "Alerts",
      i18nKey: "navigation.alerts",
      icon: "notifications-outline",
    },
    {
      name: "Settings",
      i18nKey: "navigation.settings",
      icon: "settings-outline",
    },
  ];

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={menuItems}
          headerColor={headerColor}
        />
      )}
      screenOptions={({ route }) => {
        const titles = {
          AdminDashboard: t("navigation.dashboard"),
          Vehicles: t("navigation.vehicles"),
          Drivers: t("navigation.drivers"),
          Tasks: t("navigation.tasks"),
          FleetMap: t("navigation.fleetMap"),
          Reports: t("navigation.reports"),
          FuelDashboard: t("navigation.fuelAnalysis"),
          Alerts: t("navigation.alerts"),
          Settings: t("navigation.settings"),
        };
        return {
          headerStyle: { backgroundColor: headerColor, elevation: 4 },
          headerTintColor: COLORS.WHITE,
          headerTitleStyle: { fontWeight: "600" },
          drawerType: "front",
          swipeEnabled: true,
          drawerStyle: { width: 280 },
          title: titles[route.name] || route.name,
        };
      }}
    >
      <Drawer.Screen name="AdminDashboard" component={AdminDashboard} />
      <Drawer.Screen name="Vehicles" component={AdminVehiclesStack} />
      <Drawer.Screen name="Drivers" component={AdminDriversStack} />
      <Drawer.Screen name="Tasks" component={AdminTasksStack} />
      <Drawer.Screen name="FleetMap" component={AdminFleetMapStack} />
      <Drawer.Screen name="Reports" component={AdminReportsScreen} />
      <Drawer.Screen name="FuelDashboard" component={AdminFuelDashboard} />
      <Drawer.Screen name="Alerts" component={AdminAlerts} />
      <Drawer.Screen name="Settings" component={AdminSettingsStack} />
    </Drawer.Navigator>
  );
};

// ============================================================================
// DRIVER STACK NAVIGATORS
// ============================================================================
const TasksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TasksMain" component={DriverTasks} />
    <Stack.Screen name="TaskDetail" component={DriverTaskDetail} />
    <Stack.Screen name="RouteMap" component={DriverRouteMapScreen} />
    <Stack.Screen name="TaskOffers" component={TaskOffers} />
    <Stack.Screen name="TaskOfferDetail" component={TaskOfferDetail} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={DriverProfile} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </Stack.Navigator>
);

// Settings Stack - DriverSettings + Help Screens
const SettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SettingsMain" component={DriverSettings} />
    <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
    <Stack.Screen
      name="TroubleshootingScreen"
      component={TroubleshootingScreen}
    />
    <Stack.Screen name="LEDIndicatorsScreen" component={LEDIndicatorsScreen} />
  </Stack.Navigator>
);

// Admin Settings Stack - AdminSettings + Help Screens
const AdminSettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SettingsMain" component={AdminSettings} />
    <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
    <Stack.Screen
      name="TroubleshootingScreen"
      component={TroubleshootingScreen}
    />
    <Stack.Screen name="LEDIndicatorsScreen" component={LEDIndicatorsScreen} />
  </Stack.Navigator>
);

// ============================================================================
// MAIN APP NAVIGATOR
// ============================================================================
const AppNavigator = () => {
  const { user } = useAuth();

  console.log("?? AppNavigator - User:", user?.email, "Role:", user?.role);

  switch (user?.role) {
    case "super_admin":
      console.log("?? Loading SuperAdmin Navigator");
      return <SuperAdminNavigator />;

    case "company_admin":
      console.log("?? Loading CompanyAdmin Navigator");
      return <CompanyAdminNavigator />;

    case "driver":
      console.log("?? Loading Driver Navigator");
      return <DriverNavigator />;

    default:
      console.log("?? Unknown role:", user?.role, "- defaulting to Driver");
      return <DriverNavigator />;
  }
};

export default AppNavigator;
