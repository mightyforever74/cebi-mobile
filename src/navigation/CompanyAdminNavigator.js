// C:\argon\src\navigation\CompanyAdminNavigator.js

import AdminFuelDashboard from "../screens/admin/fuel/AdminFuelDashboard";

// Drawer.Screen ekle (Settings'den önce)
<Drawer.Screen
  name="FuelDashboard"
  component={AdminFuelDashboard}
  options={{
    drawerIcon: ({ color }) => (
      <Ionicons name="speedometer-outline" size={22} color={color} />
    ),
    drawerLabel: t("navigator.fuelManagement"),
  }}
/>;
