// src/navigation/AppNavigator.js
// TulipFleet - Role-Based Navigation
// Updated: 16 Aralık 2025 - GERÇEK EKRANLARLA

import { Ionicons } from "@expo/vector-icons";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
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
import CreateCompanyScreen from "../screens/superadmin/CreateCompanyScreen";
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";

// ============================================================================
// COMPANY ADMIN SCREENS
// ============================================================================
import AdminAlerts from "../screens/admin/AdminAlerts";
import AdminDashboard from "../screens/admin/AdminDashboard";
import AdminDrivers from "../screens/admin/AdminDrivers";
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

// ============================================================================
// DRIVER SCREENS
// ============================================================================
import DriverDashboard from "../screens/driver/DriverDashboard";
import DriverProfile from "../screens/driver/DriverProfile";
import DriverRouteMapScreen from "../screens/driver/DriverRouteMapScreen";
import DriverSettings from "../screens/driver/DriverSettings";
import DriverTasks from "../screens/driver/DriverTasks";
import DriverVehicle from "../screens/driver/DriverVehicle";

// ============================================================================
// SHARED SCREENS
// ============================================================================
import ChangePasswordScreen from "../screens/shared/ChangePasswordScreen";
import EditProfileScreen from "../screens/shared/EditProfileScreen";

// ============================================================================
// PLACEHOLDER SCREENS (Henüz oluşturulmamış ekranlar için)
// ============================================================================
const PlaceholderScreen = ({ title, icon, description }) => (
  <View style={styles.placeholderContainer}>
    <Ionicons name={icon || "construct-outline"} size={64} color="#5E72E4" />
    <Text style={styles.placeholderTitle}>{title}</Text>
    <Text style={styles.placeholderDesc}>
      {description || "Bu ekran yakında eklenecek"}
    </Text>
  </View>
);

// Super Admin Placeholders
const PlatformUsersScreen = () => (
  <PlaceholderScreen
    title="Tüm Kullanıcılar"
    icon="people-outline"
    description="Platform genelindeki tüm kullanıcılar"
  />
);
const SystemHealthScreen = () => (
  <PlaceholderScreen
    title="Sistem Health"
    icon="pulse-outline"
    description="API, MQTT, Database durumları"
  />
);
const PlatformReportsScreen = () => (
  <PlaceholderScreen
    title="Platform Raporları"
    icon="bar-chart-outline"
    description="Aggregate istatistikler"
  />
);
const PlatformSettingsScreen = () => (
  <PlaceholderScreen
    title="Platform Ayarları"
    icon="settings-outline"
    description="Sistem konfigürasyonu"
  />
);

// Company Admin Placeholders
const AdminReportsScreen = () => (
  <PlaceholderScreen
    title="Raporlar"
    icon="analytics-outline"
    description="Filo raporları ve analizler"
  />
);

// Driver Placeholders
const DriverHistoryScreen = () => (
  <PlaceholderScreen
    title="Görev Geçmişi"
    icon="time-outline"
    description="Tamamlanan görevler"
  />
);
const DriverSOSScreen = () => (
  <PlaceholderScreen
    title="Acil Durum"
    icon="warning-outline"
    description="SOS gönder"
  />
);

// ============================================================================
// CUSTOM DRAWER CONTENT
// ============================================================================
const CustomDrawerContent = ({ navigation, state, menuItems, headerColor }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
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
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={styles.versionText}>TulipFleet v1.0.0</Text>
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
  { name: "PlatformUsers", label: "Tüm Kullanıcılar", icon: "people-outline" },
  { name: "SystemHealth", label: "Sistem Health", icon: "pulse-outline" },
  {
    name: "PlatformReports",
    label: "Platform Raporları",
    icon: "bar-chart-outline",
  },
  {
    name: "PlatformSettings",
    label: "Platform Ayarları",
    icon: "settings-outline",
  },
];

const SuperAdminStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CompaniesMain" component={CompaniesScreen} />
    <Stack.Screen name="CreateCompany" component={CreateCompanyScreen} />
  </Stack.Navigator>
);

const SuperAdminNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={superAdminMenuItems}
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
        component={SuperAdminStack}
        options={{ title: "Şirket Yönetimi" }}
      />
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
        name="PlatformReports"
        component={PlatformReportsScreen}
        options={{ title: "Platform Raporları" }}
      />
      <Drawer.Screen
        name="PlatformSettings"
        component={PlatformSettingsScreen}
        options={{ title: "Platform Ayarları" }}
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
  { name: "Reports", label: "Raporlar", icon: "analytics-outline" },
  { name: "Settings", label: "Şirket Ayarları", icon: "cog-outline" },
];

// Vehicle Stack (List + Create + Edit)
const VehicleStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VehicleList" component={AdminVehicles} />
    <Stack.Screen name="CreateVehicle" component={CreateVehicleScreen} />
    <Stack.Screen name="EditVehicle" component={EditVehicleScreen} />
  </Stack.Navigator>
);

// Driver Stack
const DriverAdminStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriverList" component={AdminDrivers} />
    <Stack.Screen name="CreateDriver" component={CreateDriverScreen} />
    <Stack.Screen name="EditDriver" component={EditDriverScreen} />
  </Stack.Navigator>
);

// Task Stack
const TaskStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TaskList" component={AdminTasks} />
    <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
    <Stack.Screen name="EditTask" component={EditTaskScreen} />
  </Stack.Navigator>
);

const CompanyAdminNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={companyAdminMenuItems}
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
        options={{ title: "Fleet Dashboard" }}
      />
      <Drawer.Screen
        name="FleetMap"
        component={FleetMapScreen}
        options={{ title: "Canlı Harita" }}
      />
      <Drawer.Screen
        name="Vehicles"
        component={VehicleStack}
        options={{ title: "Araç Yönetimi" }}
      />
      <Drawer.Screen
        name="Drivers"
        component={DriverAdminStack}
        options={{ title: "Sürücü Yönetimi" }}
      />
      <Drawer.Screen
        name="Tasks"
        component={TaskStack}
        options={{ title: "Görev Yönetimi" }}
      />
      <Drawer.Screen
        name="Alerts"
        component={AdminAlerts}
        options={{ title: "Uyarılar" }}
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
  { name: "TaskHistory", label: "Görev Geçmişi", icon: "time-outline" },
  { name: "Profile", label: "Profilim", icon: "person-outline" },
  { name: "DriverSettings", label: "Ayarlar", icon: "settings-outline" },
  { name: "SOS", label: "Acil Durum", icon: "warning-outline" },
];

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={DriverProfile} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </Stack.Navigator>
);

const DriverNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          menuItems={driverMenuItems}
          headerColor="#2DCE89"
        />
      )}
      screenOptions={{
        headerStyle: { backgroundColor: "#2DCE89", elevation: 4 },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "600" },
        drawerType: "front",
        swipeEnabled: true,
        drawerStyle: { width: 280 },
      }}
    >
      <Drawer.Screen
        name="DriverDashboard"
        component={DriverDashboard}
        options={{ title: "Sürücü Paneli" }}
      />
      <Drawer.Screen
        name="MyTasks"
        component={DriverTasks}
        options={{ title: "Görevlerim" }}
      />
      <Drawer.Screen
        name="Navigation"
        component={DriverRouteMapScreen}
        options={{ title: "Navigasyon" }}
      />
      <Drawer.Screen
        name="MyVehicle"
        component={DriverVehicle}
        options={{ title: "Araç Durumu" }}
      />
      <Drawer.Screen
        name="TaskHistory"
        component={DriverHistoryScreen}
        options={{ title: "Görev Geçmişi" }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileStack}
        options={{ title: "Profilim" }}
      />
      <Drawer.Screen
        name="DriverSettings"
        component={DriverSettings}
        options={{ title: "Ayarlar" }}
      />
      <Drawer.Screen
        name="SOS"
        component={DriverSOSScreen}
        options={{ title: "Acil Durum" }}
      />
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
