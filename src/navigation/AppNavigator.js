// src/navigation/AppNavigator.js
// TulipFleet - Role-Based Navigation
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği
// Updated: 21 Ocak 2026 - Hardcoded labels (no i18n prefixes) (korundu)

import { Ionicons } from "@expo/vector-icons";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

// ============================================================================
// SHARED SCREENS
// ============================================================================
import ChangePasswordScreen from "../screens/shared/ChangePasswordScreen";
import EditProfileScreen from "../screens/shared/EditProfileScreen";

// ============================================================================
// HELPERS
// ============================================================================
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

// ============================================================================
// THEMED STYLES (Rehber Pattern)
// ============================================================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    // Placeholder
    placeholderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: 20,
    },
    placeholderTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 16,
      textAlign: "center",
    },
    placeholderDesc: {
      fontSize: 14,
      color: COLORS.MUTED,
      marginTop: 8,
      textAlign: "center",
    },

    // Drawer
    drawerContainer: {
      flex: 1,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
    },
    drawerHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      paddingTop: 50,
      paddingBottom: 20,
    },
    avatarContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: withAlpha(COLORS.WHITE, 0.25),
    },
    avatarText: {
      fontSize: 24,
      fontWeight: "bold",
      color: COLORS.WHITE,
    },
    userInfo: {
      marginLeft: 14,
      flex: 1,
    },
    userName: {
      fontSize: 17,
      fontWeight: "600",
      color: COLORS.WHITE,
    },
    roleBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 6,
      backgroundColor: withAlpha(COLORS.WHITE, 0.25),
    },
    roleText: {
      fontSize: 11,
      fontWeight: "600",
      color: COLORS.WHITE,
    },
    companyName: {
      fontSize: 12,
      color: withAlpha(COLORS.WHITE, 0.8),
      marginTop: 4,
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
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.08),
    },
    menuText: {
      fontSize: 15,
      color: COLORS.HEADER ?? COLORS.MUTED ?? COLORS.SECONDARY,
      marginLeft: 14,
      fontWeight: "500",
      flex: 1,
    },
    menuTextActive: {
      color: COLORS.PRIMARY,
      fontWeight: "600",
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.DIVIDER ?? COLORS.BORDER_COLOR ?? COLORS.BORDER,
      marginHorizontal: 20,
      marginVertical: 16,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 20,
      marginBottom: 10,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: COLORS.ERROR,
      shadowColor: COLORS.ERROR,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: "600",
      color: COLORS.WHITE,
      marginLeft: 12,
    },
    versionText: {
      textAlign: "center",
      color: COLORS.MUTED,
      fontSize: 11,
      marginBottom: 20,
      marginTop: 10,
    },
  });

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
        {t(descriptionKey) || "Yakında..."}
      </Text>
    </View>
  );
};

const PlatformReportsScreen = () => (
  <PlaceholderScreen
    titleKey="Platform Raporları"
    icon="bar-chart-outline"
    descriptionKey="Platform istatistikleri"
  />
);

const PlatformSettingsScreen = () => (
  <PlaceholderScreen
    titleKey="Platform Ayarları"
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
// CUSTOM DRAWER CONTENT (THEMED)
// ============================================================================
const CustomDrawerContent = ({ navigation, state, menuItems, headerColor }) => {
  const { user, logout } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Çıkış yapmak istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
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
        return "Super Admin";
      case "company_admin":
        return "Yönetici";
      case "driver":
        return "Sürücü";
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
              : user?.email?.split("@")[0] || "Kullanıcı"}
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
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.WHITE} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>TulipFleet v2.0.0</Text>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// NAVIGATORS
// ============================================================================
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

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

  const headerColor = COLORS.ERROR; // önce #F5365C
  const menuItems = [
    { name: "SADashboard", label: "Dashboard", icon: "speedometer-outline" },
    { name: "Companies", label: "Şirketler", icon: "business-outline" },
    { name: "SADevices", label: "Cihazlar", icon: "hardware-chip-outline" },
    { name: "PlatformUsers", label: "Kullanıcılar", icon: "people-outline" },
    { name: "PlatformSettings", label: "Ayarlar", icon: "settings-outline" },
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
          SADashboard: "Dashboard",
          Companies: "Şirketler",
          SADevices: "Cihazlar",
          PlatformUsers: "Kullanıcılar",
          SystemHealth: "Sistem Sağlığı",
          PlatformReports: "Raporlar",
          PlatformSettings: "Ayarlar",
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

  const headerColor = COLORS.WARNING; // önce #FB6340
  const menuItems = [
    { name: "AdminDashboard", label: "Dashboard", icon: "speedometer-outline" },
    { name: "Vehicles", label: "Araçlar", icon: "car-sport-outline" },
    { name: "Drivers", label: "Sürücüler", icon: "people-outline" },
    { name: "Tasks", label: "Görevler", icon: "clipboard-outline" },
    { name: "FleetMap", label: "Canlı Harita", icon: "map-outline" },
    { name: "Reports", label: "Raporlar", icon: "bar-chart-outline" },
    {
      name: "FuelDashboard",
      label: "Yakıt Analizi",
      icon: "analytics-outline",
    },
    { name: "Alerts", label: "Uyarılar", icon: "notifications-outline" },
    { name: "Settings", label: "Ayarlar", icon: "settings-outline" },
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
          AdminDashboard: "Dashboard",
          Vehicles: "Araçlar",
          Drivers: "Sürücüler",
          Tasks: "Görevler",
          FleetMap: "Canlı Harita",
          Reports: "Raporlar",
          FuelDashboard: "Yakıt Analizi",
          Alerts: "Uyarılar",
          Settings: "Ayarlar",
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
      <Drawer.Screen name="Settings" component={AdminSettings} />
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

// ============================================================================
// DRIVER NAVIGATOR
// ============================================================================
const DriverNavigator = () => {
  const { COLORS } = useTheme();

  const headerColor = COLORS.SUCCESS; // önce #2DCE89
  const menuItems = [
    {
      name: "DriverDashboard",
      label: "Ana Sayfa",
      icon: "speedometer-outline",
    },
    { name: "MyTasks", label: "Görevlerim", icon: "list-outline" },
    { name: "Navigation", label: "Navigasyon", icon: "navigate-outline" },
    { name: "FuelEntry", label: "Yakıt Girişi", icon: "flame-outline" },
    { name: "MyVehicle", label: "Aracım", icon: "car-sport-outline" },
    { name: "DeviceSetup", label: "Cihaz Kurulumu", icon: "bluetooth-outline" },
    { name: "Profile", label: "Profil", icon: "person-outline" },
    { name: "DriverSettings", label: "Ayarlar", icon: "settings-outline" },
    { name: "SOS", label: "Acil Durum", icon: "warning-outline" },
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
          DriverDashboard: "Ana Sayfa",
          MyTasks: "Görevlerim",
          Navigation: "Navigasyon",
          FuelEntry: "Yakıt Girişi",
          MyVehicle: "Aracım",
          DeviceSetup: "Cihaz Kurulumu",
          Profile: "Profil",
          DriverSettings: "Ayarlar",
          SOS: "Acil Durum",
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
        component={DeviceSetupScreen}
        options={{ headerShown: false }}
      />
      <Drawer.Screen name="Profile" component={ProfileStack} />
      <Drawer.Screen name="DriverSettings" component={SettingsStack} />
      <Drawer.Screen name="SOS" component={DriverSOSScreen} />
    </Drawer.Navigator>
  );
};

// ============================================================================
// MAIN APP NAVIGATOR
// ============================================================================
const AppNavigator = () => {
  const { user } = useAuth();

  console.log("📱 AppNavigator - User:", user?.email, "Role:", user?.role);

  switch (user?.role) {
    case "super_admin":
      console.log("🔴 Loading SuperAdmin Navigator");
      return <SuperAdminNavigator />;

    case "company_admin":
      console.log("🟠 Loading CompanyAdmin Navigator");
      return <CompanyAdminNavigator />;

    case "driver":
      console.log("🟢 Loading Driver Navigator");
      return <DriverNavigator />;

    default:
      console.log("⚠️ Unknown role:", user?.role, "- defaulting to Driver");
      return <DriverNavigator />;
  }
};

export default AppNavigator;
