// src/navigation/SuperAdminNavigator.js
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği
// Note: Yapı korundu (CompaniesStack, DevicesStack + Drawer)

import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { StyleSheet } from "react-native";

import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";

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

const makeStyles = (COLORS) =>
  StyleSheet.create({
    // Şu dosyada View style yok ama rehbere uyum için şablon bırakıyoruz
    // (ileride custom drawer content vs eklersen kullanırsın)
    noop: {},
  });

/**
 * Super Admin tarafında header rengi olarak:
 * - PRIMARY kullanılabilir (Argon default)
 * - ya da "SuperAdmin = ERROR" gibi bir convention varsa onu kullan
 * Burada, orijinalde PRIMARY (#5E72E4) kullanıldığı için PRIMARY ile devam ettim.
 */
const useHeaderOptions = () => {
  const { COLORS } = useTheme();

  return React.useMemo(
    () => ({
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: {
        fontWeight: "bold",
      },
    }),
    [COLORS]
  );
};

// Companies Stack (CompanyDetail now handled as modal elsewhere)
const CompaniesStack = () => {
  const headerOptions = useHeaderOptions();

  return (
    <Stack.Navigator screenOptions={headerOptions}>
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
};

// Devices Stack
const DevicesStack = () => {
  const headerOptions = useHeaderOptions();

  return (
    <Stack.Navigator screenOptions={headerOptions}>
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
};

export default function SuperAdminNavigator() {
  const { COLORS } = useTheme();
  useThemedStyles(makeStyles); // rehber standardı: themed styles hook'u (şu an noop)

  const drawerScreenOptions = React.useMemo(
    () => ({
      headerStyle: { backgroundColor: COLORS.PRIMARY },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: { fontWeight: "bold" },
      drawerType: "front",
    }),
    [COLORS]
  );

  return (
    <Drawer.Navigator screenOptions={drawerScreenOptions}>
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
