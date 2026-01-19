// src/navigation/AppNavigator.js
// TulipFleet - Role-Based Navigation
// Updated: 01 Ocak 2026 - FAZ 4 CİHAZ KURULUMU EKLENDİ

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
import DriverWelcomeScreen from "../screens/driver/DriverWelcomeScreen"; // ← BU SATIRI EKLE
import TaskOfferDetail from "../screens/driver/TaskOfferDetail";
import TaskOffers from "../screens/driver/TaskOffers";

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
// PLACEHOLDER SCREENS (Henüz oluşturulmamış ekranlar için)
// ============================================================================
const PlaceholderScreen = ({ titleKey, icon, descriptionKey }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name={icon || "construct-outline"} size={64} color="#5E72E4" />
      <Text style={styles.placeholderTitle}>{t(titleKey)}</Text>
      <Text style={styles.placeholderDesc}>
        {t(descriptionKey) || t("navigator.placeholder.comingSoon")}
      </Text>
    </View>
  );
};

const PlatformReportsScreen = () => (
  <PlaceholderScreen
    titleKey="navigator.placeholder.platformReports"
    icon="bar-chart-outline"
    descriptionKey="navigator.placeholder.aggregateStats"
  />
);
const PlatformSettingsScreen = () => (
  <PlaceholderScreen
    titleKey="navigator.placeholder.platformSettings"
    icon="settings-outline"
    descriptionKey="navigator.placeholder.systemConfig"
  />
);

// Company Admin Placeholders

// Driver Placeholders
const DriverHistoryScreen = () => (
  <PlaceholderScreen
    titleKey="navigator.placeholder.taskHistory"
    icon="time-outline"
    descriptionKey="navigator.placeholder.completedTasks"
  />
);
const DriverSOSScreen = () => (
  <PlaceholderScreen
    titleKey="navigator.placeholder.emergency"
    icon="warning-outline"
    descriptionKey="navigator.placeholder.sendSOS"
  />
);

// ============================================================================
// CUSTOM DRAWER CONTENT
// ============================================================================
const CustomDrawerContent = ({ navigation, state, menuItems, headerColor }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = () => {
    Alert.alert(t("navigator.logout"), t("navigator.logoutConfirm"), [
      { text: t("navigator.cancel"), style: "cancel" },
      {
        text: t("navigator.logout"),
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
        return t("navigator.roles.super_admin");
      case "company_admin":
        return t("navigator.roles.company_admin");
      case "driver":
        return t("navigator.roles.driver");
      default:
        return user?.role;
    }
  };

  // Get current route name
  const currentRoute = state.routes[state.index]?.name;

  return (
    <View style={styles.drawerContainer}>
      {/* Header - User Info */}
      <View
        style={[
          styles.drawerHeader,
          { backgroundColor: headerColor || "#5E72E4" },
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
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: "rgba(255,255,255,0.25)" },
            ]}
          >
            <Text style={styles.roleText}>{getRoleDisplayName()}</Text>
          </View>
          {user?.company?.name && (
            <Text style={styles.companyName} numberOfLines={1}>
              {user.company.name}
            </Text>
          )}
        </View>
      </View>

      {/* Menu Items */}
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
                color={isActive ? "#5E72E4" : "#525F7F"}
              />
              <Text
                style={[styles.menuText, isActive && styles.menuTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          <Text style={styles.logoutText}>{t("navigator.logout")}</Text>
        </TouchableOpacity>

        {/* Version Info */}
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
// SUPER ADMIN NAVIGATOR
// ============================================================================
const superAdminMenuItems = [
  {
    name: "SuperAdminDashboard",
    label: "Platform Dashboard",
    icon: "globe-outline",
  },
  { name: "Companies", label: "Şirket Yönetimi", icon: "business-outline" },
  { name: "Devices", label: "Cihaz Yönetimi", icon: "hardware-chip-outline" },
  { name: "DeviceQRManagement", label: "QR Yönetimi", icon: "qr-code-outline" },
  { name: "DeviceSetup", label: "Cihaz Kurulumu", icon: "bluetooth-outline" }, // FAZ 4
  { name: "PlatformUsers", label: "Tüm Kullanıcılar", icon: "people-outline" },
  { name: "SystemHealth", label: "Sistem Health", icon: "pulse-outline" },
];

const SuperAdminNavigator = () => {
  const { t } = useTranslation();
  const menuItems = [
    {
      name: "SuperAdminDashboard",
      label: t("navigator.superAdmin.dashboard"),
      icon: "globe-outline",
    },
    {
      name: "Companies",
      label: t("navigator.superAdmin.companies"),
      icon: "business-outline",
    },
    {
      name: "Devices",
      label: t("navigator.superAdmin.devices"),
      icon: "hardware-chip-outline",
    },
    {
      name: "DeviceQRManagement",
      label: t("navigator.superAdmin.qrManagement"),
      icon: "qr-code-outline",
    },
    {
      name: "DeviceSetup",
      label: t("navigator.superAdmin.deviceSetup"),
      icon: "bluetooth-outline",
    },
    {
      name: "PlatformUsers",
      label: t("navigator.superAdmin.platformUsers"),
      icon: "people-outline",
    },
    {
      name: "SystemHealth",
      label: t("navigator.superAdmin.systemHealth"),
      icon: "pulse-outline",
    },
  ];
  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={menuItems}
          headerColor="#F5365C"
        />
      )}
      screenOptions={{
        headerStyle: { backgroundColor: "#F5365C", elevation: 4 },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "600" },
        drawerType: "front",
        swipeEnabled: true,
        drawerStyle: { width: 280 },
      }}
    >
      <Drawer.Screen
        name="SuperAdminDashboard"
        component={SuperAdminDashboard}
        options={{ title: "Platform Dashboard" }}
      />
      <Drawer.Screen
        name="Companies"
        component={CompaniesScreen}
        options={{ title: "Şirket Yönetimi" }}
      />
      <Drawer.Screen
        name="CreateCompany"
        component={CreateCompanyScreen}
        options={{ title: "Yeni Şirket" }}
      />
      {/* CİHAZ YÖNETİMİ */}
      <Drawer.Screen
        name="Devices"
        component={DevicesScreen}
        options={{ title: "Cihaz Yönetimi" }}
      />
      <Drawer.Screen
        name="DeviceDetail"
        component={DeviceDetailScreen}
        options={{ title: "Cihaz Detay" }}
      />
      <Drawer.Screen
        name="DeviceQRManagement"
        component={DeviceQRManagement}
        options={{ title: "QR Yönetimi" }}
      />
      {/* FAZ 4: CİHAZ KURULUMU (BLE + QR) */}
      <Drawer.Screen
        name="DeviceSetup"
        component={DeviceSetupScreen}
        options={{
          title: "Cihaz Kurulumu",
          headerShown: false,
        }}
      />
      {/* Placeholder Screens */}
      <Drawer.Screen
        name="PlatformUsers"
        component={PlatformUsersScreen}
        options={{ title: "Tüm Kullanıcılar" }}
      />
      <Drawer.Screen
        name="SystemHealth"
        component={SystemHealthScreen}
        options={{ title: "Sistem Health" }}
      />
      <Drawer.Screen
        name="CompanyEdit"
        component={CompanyEditScreen}
        options={{
          title: "Şirket Düzenle",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer.Navigator>
  );
};

// ============================================================================
// COMPANY ADMIN NAVIGATOR
// ============================================================================
const companyAdminMenuItems = [
  { name: "AdminDashboard", label: "Dashboard", icon: "speedometer-outline" },
  { name: "FleetMap", label: "Canlı Harita", icon: "map-outline" },
  { name: "Vehicles", label: "Araç Yönetimi", icon: "car-outline" },
  { name: "Drivers", label: "Sürücü Yönetimi", icon: "people-outline" },
  { name: "Tasks", label: "Görev Yönetimi", icon: "clipboard-outline" },
  { name: "Alerts", label: "Uyarılar", icon: "notifications-outline" },
  { name: "DeviceSetup", label: "Cihaz Kurulumu", icon: "bluetooth-outline" }, // FAZ 4
  { name: "Reports", label: "Raporlar", icon: "bar-chart-outline" },
  { name: "Settings", label: "Şirket Ayarları", icon: "settings-outline" },
];

const CompanyAdminNavigator = () => {
  const { t } = useTranslation();
  const menuItems = [
    {
      name: "AdminDashboard",
      label: t("navigator.companyAdmin.dashboard"),
      icon: "speedometer-outline",
    },
    {
      name: "FleetMap",
      label: t("navigator.companyAdmin.fleetMap"),
      icon: "map-outline",
    },
    {
      name: "Vehicles",
      label: t("navigator.companyAdmin.vehicles"),
      icon: "car-outline",
    },
    {
      name: "Drivers",
      label: t("navigator.companyAdmin.drivers"),
      icon: "people-outline",
    },
    {
      name: "Tasks",
      label: t("navigator.companyAdmin.tasks"),
      icon: "clipboard-outline",
    },
    {
      name: "Alerts",
      label: t("navigator.companyAdmin.alerts"),
      icon: "notifications-outline",
    },
    {
      name: "DeviceSetup",
      label: t("navigator.companyAdmin.deviceSetup"),
      icon: "bluetooth-outline",
    },
    {
      name: "Reports",
      label: t("navigator.companyAdmin.reports"),
      icon: "bar-chart-outline",
    },
    {
      name: "Settings",
      label: t("navigator.companyAdmin.settings"),
      icon: "settings-outline",
    },
  ];
  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={menuItems}
          headerColor="#5E72E4"
        />
      )}
      screenOptions={{
        headerStyle: { backgroundColor: "#5E72E4", elevation: 4 },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "600" },
        drawerType: "front",
        swipeEnabled: true,
        drawerStyle: { width: 280 },
      }}
    >
      <Drawer.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: "Dashboard" }}
      />
      <Drawer.Screen
        name="FleetMap"
        component={FleetMapScreen}
        options={{ title: "Canlı Harita" }}
      />
      <Drawer.Screen
        name="VehicleTrack"
        component={VehicleTrackScreen}
        options={{ headerShown: false, drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen
        name="Vehicles"
        component={AdminVehicles}
        options={{ title: "Araç Yönetimi" }}
      />
      <Drawer.Screen
        name="CreateVehicle"
        component={CreateVehicleScreen}
        options={{ title: "Yeni Araç" }}
      />
      <Drawer.Screen
        name="EditVehicle"
        component={EditVehicleScreen}
        options={{ title: "Araç Düzenle" }}
      />
      <Drawer.Screen
        name="Drivers"
        component={AdminDrivers}
        options={{ title: "Sürücü Yönetimi" }}
      />
      <Drawer.Screen
        name="CreateDriver"
        component={CreateDriverScreen}
        options={{ title: "Yeni Sürücü" }}
      />
      <Drawer.Screen
        name="EditDriver"
        component={EditDriverScreen}
        options={{ title: "Sürücü Düzenle" }}
      />
      <Drawer.Screen
        name="Tasks"
        component={AdminTasks}
        options={{ title: "Görev Yönetimi" }}
      />
      <Drawer.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ title: "Yeni Görev" }}
      />
      <Drawer.Screen
        name="EditTask"
        component={EditTaskScreen}
        options={{ title: "Görev Düzenle" }}
      />
      <Drawer.Screen
        name="Alerts"
        component={AdminAlerts}
        options={{ title: "Uyarılar" }}
      />
      {/* FAZ 4: CİHAZ KURULUMU (BLE + QR) */}
      <Drawer.Screen
        name="DeviceSetup"
        component={DeviceSetupScreen}
        options={{
          title: "Cihaz Kurulumu",
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={AdminReportsScreen}
        options={{ title: "Raporlar" }}
      />
      <Drawer.Screen
        name="Settings"
        component={AdminSettings}
        options={{ title: "Şirket Ayarları" }}
      />
    </Drawer.Navigator>
  );
};

// ============================================================================
// DRIVER NAVIGATOR
// ============================================================================
const driverMenuItems = [
  { name: "DriverDashboard", label: "Dashboard", icon: "speedometer-outline" },
  { name: "MyTasks", label: "Görevlerim", icon: "list-outline" },
  { name: "Navigation", label: "Navigasyon", icon: "navigate-outline" },
  { name: "MyVehicle", label: "Araç Durumu", icon: "car-sport-outline" },
  { name: "DeviceSetup", label: "Cihaz Kurulumu", icon: "bluetooth-outline" }, // FAZ 4
  { name: "TaskHistory", label: "Görev Geçmişi", icon: "time-outline" },
  { name: "Profile", label: "Profilim", icon: "person-outline" },
  { name: "DriverSettings", label: "Ayarlar", icon: "settings-outline" },
  { name: "SOS", label: "Acil Durum", icon: "warning-outline" },
];

// Tasks Stack - Görev teklifleri (liste) ve detay + aktif görevler
const TasksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {/* Ana ekran: Aktif Görevler */}
    <Stack.Screen name="TasksList" component={DriverTasks} />
    {/* Görev teklifleri listesi */}
    <Stack.Screen name="TaskOffers" component={TaskOffers} />
    {/* Detay ekranları */}
    <Stack.Screen name="TaskDetail" component={DriverTaskDetail} />
    <Stack.Screen
      name="DriverTasksScreen"
      component={DriverTasks}
      options={{ title: "Aktif Görevler" }}
    />
    <Stack.Screen
      name="TaskOfferDetail"
      component={TaskOfferDetail}
      options={{ title: "Teklif Detayı" }}
    />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={DriverProfile} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </Stack.Navigator>
);

const DriverNavigator = () => {
  const { t } = useTranslation();
  const menuItems = [
    {
      name: "DriverDashboard",
      label: t("navigator.driver.dashboard"),
      icon: "speedometer-outline",
    },
    {
      name: "MyTasks",
      label: t("navigator.driver.myTasks"),
      icon: "list-outline",
    },
    {
      name: "Navigation",
      label: t("navigator.driver.navigation"),
      icon: "navigate-outline",
    },
    {
      name: "MyVehicle",
      label: t("navigator.driver.myVehicle"),
      icon: "car-sport-outline",
    },
    {
      name: "DeviceSetup",
      label: t("navigator.driver.deviceSetup"),
      icon: "bluetooth-outline",
    },
    {
      name: "TaskHistory",
      label: t("navigator.driver.taskHistory"),
      icon: "time-outline",
    },
    {
      name: "Profile",
      label: t("navigator.driver.profile"),
      icon: "person-outline",
    },
    {
      name: "DriverSettings",
      label: t("navigator.driver.settings"),
      icon: "settings-outline",
    },
    { name: "SOS", label: t("navigator.driver.sos"), icon: "warning-outline" },
  ];
  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={menuItems}
          headerColor="#2DCE89"
        />
      )}
      screenOptions={({ route }) => {
        const titles = {
          DriverDashboard: t("navigator.driver.dashboard"),
          MyTasks: t("navigator.driver.myTasks"),
          Navigation: t("navigator.driver.navigation"),
          MyVehicle: t("navigator.driver.myVehicle"),
          DeviceSetup: t("navigator.driver.deviceSetup"),
          TaskHistory: t("navigator.driver.taskHistory"),
          Profile: t("navigator.driver.profile"),
          DriverSettings: t("navigator.driver.settings"),
          SOS: t("navigator.driver.sos"),
        };
        return {
          headerStyle: { backgroundColor: "#2DCE89", elevation: 4 },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "600" },
          drawerType: "front",
          swipeEnabled: true,
          drawerStyle: { width: 280 },
          title: titles[route.name] || route.name,
        };
      }}
    >
      {/* Welcome Screen - Giriş sonrası ilk gösterilen */}
      <Drawer.Screen
        name="DriverWelcome"
        component={DriverWelcomeScreen}
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="DriverDashboard"
        component={DriverDashboard}
        options={{}}
      />
      <Drawer.Screen name="MyTasks" component={TasksStack} options={{}} />
      <Drawer.Screen
        name="Navigation"
        component={DriverRouteMapScreen}
        options={{}}
      />
      <Drawer.Screen name="MyVehicle" component={DriverVehicle} options={{}} />
      {/* FAZ 4: CİHAZ KURULUMU (BLE + QR) */}
      <Drawer.Screen
        name="DeviceSetup"
        component={DeviceSetupScreen}
        options={{
          title: "Cihaz Kurulumu",
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="TaskHistory"
        component={DriverHistoryScreen}
        options={{}}
      />
      <Drawer.Screen name="Profile" component={ProfileStack} options={{}} />
      <Drawer.Screen
        name="DriverSettings"
        component={DriverSettings}
        options={{}}
      />
      <Drawer.Screen name="SOS" component={DriverSOSScreen} options={{}} />
    </Drawer.Navigator>
  );
};

// ============================================================================
// MAIN APP NAVIGATOR - Role-based routing
// ============================================================================
const AppNavigator = () => {
  const { user } = useAuth();

  console.log("📱 AppNavigator - User:", user?.email, "Role:", user?.role);

  // Role'e göre doğru navigator'ı döndür
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

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Placeholder Screen
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#32325D",
    marginTop: 16,
  },
  placeholderDesc: {
    fontSize: 14,
    color: "#8898AA",
    marginTop: 8,
    textAlign: "center",
  },

  // Drawer
  drawerContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  companyName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },

  // Menu
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
    backgroundColor: "#F6F9FC",
  },
  menuText: {
    fontSize: 15,
    color: "#525F7F",
    marginLeft: 14,
    fontWeight: "500",
    flex: 1,
  },
  menuTextActive: {
    color: "#5E72E4",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E9ECEF",
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
    backgroundColor: "#F5365C",
    borderRadius: 8,
    shadowColor: "#F5365C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  versionText: {
    textAlign: "center",
    color: "#ADB5BD",
    fontSize: 11,
    marginBottom: 20,
    marginTop: 10,
  },
});

export default AppNavigator;
