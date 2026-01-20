// src/navigation/SuperAdminNavigator.js
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";

// Super Admin Screens
import CompaniesScreen from "../screens/superadmin/CompaniesScreen";
import CreateCompanyScreen from "../screens/superadmin/CreateCompanyScreen";
import DeviceDetailScreen from "../screens/superadmin/DeviceDetailScreen";
import DeviceQRManagement from "../screens/superadmin/DeviceQRManagement";
import DevicesScreen from "../screens/superadmin/DevicesScreen";
import PlatformSettingsScreen from "../screens/superadmin/PlatformSettingsScreen";
import PlatformUsersScreen from "../screens/superadmin/PlatformUsersScreen";
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Companies Stack (CompanyDetail now handled as modal elsewhere)
const CompaniesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: "#5E72E4" },
      headerTintColor: "#FFF",
      headerTitleStyle: { fontWeight: "bold" },
    }}
  >
    <Stack.Screen
      name="CompaniesList"
      component={CompaniesScreen}
      options={{ title: "🏢 Şirketler" }}
    />
    <Stack.Screen
      name="CreateCompany"
      component={CreateCompanyScreen}
      options={{ title: "➕ Yeni Şirket" }}
    />
  </Stack.Navigator>
);

// Devices Stack
const DevicesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: "#5E72E4" },
      headerTintColor: "#FFF",
      headerTitleStyle: { fontWeight: "bold" },
    }}
  >
    <Stack.Screen
      name="DevicesList"
      component={DevicesScreen}
      options={{ title: "📦 Cihazlar" }}
    />
    <Stack.Screen
      name="DeviceDetail"
      component={DeviceDetailScreen}
      options={{ title: "🔎 Cihaz Detayı" }}
    />
    <Stack.Screen
      name="DeviceQRManagement"
      component={DeviceQRManagement}
      options={{ title: "🧾 QR Yönetimi" }}
    />
  </Stack.Navigator>
);

export default function SuperAdminNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#5E72E4" },
        headerTintColor: "#FFF",
        headerTitleStyle: { fontWeight: "bold" },
        drawerType: "front",
      }}
    >
      {/* Ana ekranlar */}
      <Drawer.Screen
        name="Dashboard"
        component={SuperAdminDashboard}
        options={{ title: "📊 Dashboard" }}
      />
      <Drawer.Screen
        name="Companies"
        component={CompaniesStack}
        options={{ title: "🏢 Şirketler" }}
      />
      <Drawer.Screen
        name="Devices"
        component={DevicesStack}
        options={{ title: "📦 Cihazlar" }}
      />
      <Drawer.Screen
        name="Users"
        component={PlatformUsersScreen}
        options={{ title: "👥 Kullanıcılar" }}
      />
      <Drawer.Screen
        name="Settings"
        component={PlatformSettingsScreen}
        options={{ title: "⚙️ Ayarlar" }}
      />
      {/* ❌ Abonelikler menüsü yok - şirketler içinde */}
    </Drawer.Navigator>
  );
}
