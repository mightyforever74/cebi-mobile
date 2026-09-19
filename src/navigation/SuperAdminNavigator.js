// src/navigation/SuperAdminNavigator.js
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği
// Note: Yapı korundu (CompaniesStack, DevicesStack + Drawer)

import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="CompaniesList"
        component={CompaniesScreen}
        options={{ title: t("navigation.companies") }}
      />
      <Stack.Screen
        name="CreateCompany"
        component={CreateCompanyScreen}
        options={{ title: t("superadmin.nav.newCompany") }}
      />
    </Stack.Navigator>
  );
};

// Devices Stack
const DevicesStack = () => {
  const headerOptions = useHeaderOptions();
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="DevicesList"
        component={DevicesScreen}
        options={{ title: t("navigation.devices") }}
      />
      <Stack.Screen
        name="DeviceDetail"
        component={DeviceDetailScreen}
        options={{ title: t("superadmin.nav.deviceDetail") }}
      />
      <Stack.Screen
        name="DeviceQRManagement"
        component={DeviceQRManagement}
        options={{ title: t("navigation.qrManagement") }}
      />
    </Stack.Navigator>
  );
};

export default function SuperAdminNavigator() {
  const { COLORS } = useTheme();
  const { t } = useTranslation();
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
        options={{ title: t("navigation.dashboard") }}
      />
      <Drawer.Screen
        name="Companies"
        component={CompaniesStack}
        options={{ title: t("navigation.companies") }}
      />
      <Drawer.Screen
        name="Devices"
        component={DevicesStack}
        options={{ title: t("navigation.devices") }}
      />
      <Drawer.Screen
        name="Users"
        component={PlatformUsersScreen}
        options={{ title: t("navigation.platformUsers") }}
      />
      <Drawer.Screen
        name="Settings"
        component={PlatformSettingsScreen}
        options={{ title: t("navigation.settings") }}
      />
      {/* ❌ Abonelikler menüsü yok - şirketler içinde */}
    </Drawer.Navigator>
  );
}
