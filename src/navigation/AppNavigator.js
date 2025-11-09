// src/navigation/AppNavigator.js
// TulipFleet - Main App Navigator (Role-based)

import { createDrawerNavigator } from "@react-navigation/drawer";
import { COLORS } from "../constants/config";
import { useAuth } from "../context/AuthContext";

// Driver Screens (Placeholder - Aşama 3'te dolacak)
import DriverDashboard from "../screens/driver/DriverDashboard";

// Admin Screens (Placeholder - Aşama 7'de dolacak)
import AdminDashboard from "../screens/admin/AdminDashboard";

const Drawer = createDrawerNavigator();

/**
 * Driver Navigation Stack
 */
const DriverNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerType: "front", // Reanimated 3 uyumluluğu için eklendi
        swipeEnabled: true, // Gesture'ları etkin tut
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Drawer.Screen
        name="DriverDashboard"
        component={DriverDashboard}
        options={{
          title: "Ana Sayfa",
          drawerLabel: "Ana Sayfa",
        }}
      />
      {/* TODO: Aşama 3'te eklenecek diğer driver ekranları:
        - ActiveTasks
        - TaskDetails
        - VehicleStatus
        - Profile
        - Settings
      */}
    </Drawer.Navigator>
  );
};

/**
 * Admin Navigation Stack
 */
const AdminNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerType: "front", // Reanimated 3 uyumluluğu için eklendi
        swipeEnabled: true, // Gesture'ları etkin tut
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Drawer.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          title: "Kontrol Paneli",
          drawerLabel: "Kontrol Paneli",
        }}
      />
      {/* TODO: Aşama 7'de eklenecek diğer admin ekranları:
        - FleetOverview
        - DriverManagement
        - VehicleManagement
        - TaskManagement
        - Reports
        - Settings
      */}
    </Drawer.Navigator>
  );
};

/**
 * Main App Navigator - Role'e göre yönlendirme
 */
const AppNavigator = () => {
  const { user } = useAuth();

  console.log("📱 AppNavigator - User role:", user?.role);

  // Role'e göre doğru navigator'ı döndür
  if (user?.role === "DRIVER") {
    return <DriverNavigator />;
  } else if (user?.role === "ADMIN") {
    return <AdminNavigator />;
  }

  // Fallback (bu duruma gelmemeli, ama güvenlik için)
  return <DriverNavigator />;
};

export default AppNavigator;
